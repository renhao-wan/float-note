use tauri::{AppHandle, State};
use tokio::sync::Mutex;

use crate::services::window_service::WindowService;
use crate::types::window::DetachedWindow;
use crate::log_info;

/// Tauri commands for window management using the new persistent system

#[allow(dead_code)]
type WindowServiceState = Mutex<WindowService>;

#[allow(dead_code)]
#[tauri::command]
pub async fn create_detached_window_v2(
    note_id: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
    grid_position: Option<u8>,
    window_service: State<'_, WindowServiceState>,
) -> Result<DetachedWindow, String> {
    log_info!("WINDOW_COMMANDS", "Creating detached window (v2) for note: {}", note_id);
    
    let service = window_service.lock().await;
    service.create_detached_window(&note_id, x, y, width, height, grid_position).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn close_detached_window_v2(
    note_id: String,
    window_service: State<'_, WindowServiceState>,
) -> Result<bool, String> {
    log_info!("WINDOW_COMMANDS", "Closing detached window (v2) for note: {}", note_id);
    
    let service = window_service.lock().await;
    service.close_detached_window(&note_id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn focus_detached_window_v2(
    note_id: String,
    window_service: State<'_, WindowServiceState>,
) -> Result<bool, String> {
    log_info!("WINDOW_COMMANDS", "Focusing detached window (v2) for note: {}", note_id);
    
    let service = window_service.lock().await;
    service.focus_detached_window(&note_id).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_detached_windows_v2(
    window_service: State<'_, WindowServiceState>,
) -> Result<Vec<DetachedWindow>, String> {
    log_info!("WINDOW_COMMANDS", "Getting detached windows (v2)");
    
    let service = window_service.lock().await;
    service.get_detached_windows().await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn update_window_position_v2(
    note_id: String,
    x: f64,
    y: f64,
    window_service: State<'_, WindowServiceState>,
) -> Result<(), String> {
    log_info!("WINDOW_COMMANDS", "Updating window position (v2) for note: {}", note_id);
    
    let service = window_service.lock().await;
    service.update_window_position(&note_id, x, y).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn assign_grid_position_v2(
    note_id: String,
    grid_position: u8,
    window_service: State<'_, WindowServiceState>,
) -> Result<(), String> {
    log_info!("WINDOW_COMMANDS", "Assigning grid position (v2) {} to note: {}", grid_position, note_id);
    
    let service = window_service.lock().await;
    service.assign_grid_position(&note_id, grid_position).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn get_grid_assignment_v2(
    grid_position: u8,
    window_service: State<'_, WindowServiceState>,
) -> Result<Option<String>, String> {
    log_info!("WINDOW_COMMANDS", "Getting grid assignment (v2) for position: {}", grid_position);
    
    let service = window_service.lock().await;
    service.get_grid_assignment(grid_position).await
}

#[allow(dead_code)]
#[tauri::command]
pub async fn deploy_note_to_grid_v2(
    grid_position: u8,
    window_service: State<'_, WindowServiceState>,
    app: AppHandle,
) -> Result<Option<String>, String> {
    log_info!("WINDOW_COMMANDS", "Deploying note to grid position (v2): {}", grid_position);

    let service = window_service.lock().await;

    // Get the note ID assigned to this grid position
    let note_id = match service.get_grid_assignment(grid_position).await? {
        Some(id) => id,
        None => {
            log_info!("WINDOW_COMMANDS", "No note assigned to grid position: {}", grid_position);
            return Ok(None);
        }
    };

    // Try to focus existing window, or create new one
    let focused = service.focus_detached_window(&note_id).await?;

    if !focused {
        // Get actual screen dimensions from primary monitor
        let (screen_width, screen_height) = get_screen_dimensions(&app);

        // Calculate grid position coordinates
        let (x, y) = calculate_grid_coordinates(grid_position, screen_width, screen_height);

        // Create new detached window
        service.create_detached_window(
            &note_id,
            Some(x),
            Some(y),
            Some(600.0),
            Some(400.0),
            Some(grid_position),
        ).await?;
    }

    Ok(Some(note_id))
}

/// Get screen dimensions from the primary monitor
fn get_screen_dimensions(app: &AppHandle) -> (f64, f64) {
    use tauri::Manager;

    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let size = monitor.size();
            (size.width as f64, size.height as f64)
        }
        _ => {
            // Fallback to common screen size if monitor info unavailable
            log_info!("WINDOW_COMMANDS", "Could not get primary monitor, using fallback dimensions");
            (1920.0, 1080.0)
        }
    }
}

/// Calculate screen coordinates for grid position (1-9)
#[allow(dead_code)]
fn calculate_grid_coordinates(grid_position: u8, screen_width: f64, screen_height: f64) -> (f64, f64) {
    // This should match the frontend grid calculation
    let cols = 3;
    let rows = 3;
    let padding = 100.0;
    let window_width = 600.0;
    let window_height = 400.0;

    let usable_width = screen_width - 2.0 * padding - window_width;
    let usable_height = screen_height - 2.0 * padding - window_height;

    let col = ((grid_position - 1) % cols) as f64;
    let row = ((grid_position - 1) / cols) as f64;

    let x = padding + (col * usable_width / (cols as f64 - 1.0));
    let y = padding + (row * usable_height / (rows as f64 - 1.0));

    (x.round(), y.round())
}