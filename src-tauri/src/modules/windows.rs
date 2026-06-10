use std::fs;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::modules::storage::{
    get_default_notes_directory, save_config_to_disk, save_detached_windows_to_disk,
};
use crate::types::window::{CreateDetachedWindowRequest, DetachedWindow};
use crate::{log_debug, log_error, log_info};
use crate::{ConfigState, DetachedWindowsState, NotesState, ToggleState};

#[cfg(target_os = "macos")]
use cocoa::base::id;
#[cfg(target_os = "macos")]
use objc::{msg_send, sel, sel_impl};

// ============================================================================
// CORE WINDOW CONTROL FUNCTIONS
// ============================================================================

#[tauri::command]
pub async fn toggle_window_visibility(app: AppHandle) -> Result<bool, String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    let is_visible = window.is_visible().map_err(|e| e.to_string())?;

    if is_visible {
        window.hide().map_err(|e| e.to_string())?;
    } else {
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }

    Ok(!is_visible)
}

#[tauri::command]
pub async fn set_window_opacity(app: AppHandle, opacity: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;

    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;
        unsafe {
            let _: () = msg_send![ns_window, setAlphaValue: opacity];
        }
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        Err("Opacity control not implemented for this platform".to_string())
    }
}

#[tauri::command]
pub async fn set_window_always_on_top(app: AppHandle, always_on_top: bool) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("Window not found")?;
    window
        .set_always_on_top(always_on_top)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn set_window_focus(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    window.set_focus().map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn force_main_window_visible(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    log_info!(
        "DEBUG",
        "Forcing main window to be visible and properly positioned"
    );

    // Show the window
    window.show().map_err(|e| {
        log_error!("DEBUG", "Failed to show window: {}", e);
        e.to_string()
    })?;

    // Center the window
    window.center().map_err(|e| {
        log_error!("DEBUG", "Failed to center window: {}", e);
        e.to_string()
    })?;

    // Set proper size (match tauri.conf.json defaults)
    window
        .set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: 1000,
            height: 700,
        }))
        .map_err(|e| {
            log_error!("DEBUG", "Failed to set window size: {}", e);
            e.to_string()
        })?;

    // Ensure it's not minimized
    if window.is_minimized().unwrap_or(false) {
        window.unminimize().map_err(|e| {
            log_error!("DEBUG", "Failed to unminimize window: {}", e);
            e.to_string()
        })?;
    }

    // Set focus
    window.set_focus().map_err(|e| {
        log_error!("DEBUG", "Failed to set focus: {}", e);
        e.to_string()
    })?;

    // Force opacity to be fully visible on macOS
    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let ns_window = window.ns_window().map_err(|e| e.to_string())? as id;
        unsafe {
            let _: () = msg_send![ns_window, setAlphaValue: 1.0];
        }
    }

    log_info!("DEBUG", "Main window forced to visible state");
    Ok(())
}

#[tauri::command]
pub async fn recreate_missing_windows(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<String, String> {
    let mut result = String::new();
    let webview_windows = app.webview_windows();

    result.push_str("=== RECREATING MISSING WINDOWS ===\n");

    let detached_windows_lock = detached_windows.lock().await;
    let windows_to_recreate: Vec<_> = detached_windows_lock
        .iter()
        .filter(|(label, _)| !label.starts_with("hybrid-drag-")) // Skip hybrid drag windows
        .filter(|(label, _)| !webview_windows.contains_key(*label)) // Only missing windows
        .map(|(label, window_data)| (label.clone(), window_data.clone()))
        .collect();

    result.push_str(&format!(
        "Found {} missing windows to recreate\n\n",
        windows_to_recreate.len()
    ));

    for (label, window_data) in windows_to_recreate {
        result.push_str(&format!("Recreating window: {}\n", label));
        result.push_str(&format!("  Note ID: {}\n", window_data.note_id));
        result.push_str(&format!(
            "  Stored position: ({}, {})\n",
            window_data.position.0, window_data.position.1
        ));

        // Create the window URL
        let window_url = format!("/?note={}", window_data.note_id);

        // Create the webview window
        match WebviewWindowBuilder::new(&app, &label, WebviewUrl::App(window_url.into()))
            .title(format!("Note - {}", window_data.note_id))
            .inner_size(window_data.size.0, window_data.size.1)
            .position(100.0, 100.0) // Use safe position instead of stored position
            .visible(true)
            .resizable(true)
            .decorations(false)
            .transparent(cfg!(target_os = "macos") || cfg!(target_os = "linux"))
            .shadow(true)
            .min_inner_size(400.0, 300.0)
            .build()
        {
            Ok(window) => {
                result.push_str("  ✓ Window created successfully\n");

                // Show and focus the window
                if let Err(e) = window.show() {
                    result.push_str(&format!("  ⚠ Failed to show window: {}\n", e));
                }

                if let Err(e) = window.set_focus() {
                    result.push_str(&format!("  ⚠ Failed to focus window: {}\n", e));
                }

                // Set full opacity
                #[cfg(target_os = "macos")]
                {
                    match window.ns_window() {
                        Ok(ns_window) => {
                            let ns_window = ns_window as id;
                            unsafe {
                                let _: () = msg_send![ns_window, setAlphaValue: 1.0f64];
                            }
                            result.push_str("  ✓ Set to full opacity\n");
                        }
                        Err(e) => result.push_str(&format!("  ⚠ Failed to set opacity: {}\n", e)),
                    }
                }

                result.push_str("  ✓ Window recreated and configured\n");
            }
            Err(e) => {
                result.push_str(&format!("  ✗ Failed to create window: {}\n", e));
            }
        }

        result.push('\n');
    }

    // Clean up hybrid drag windows from state
    let hybrid_windows: Vec<_> = detached_windows_lock
        .keys()
        .filter(|label| label.starts_with("hybrid-drag-"))
        .cloned()
        .collect();

    drop(detached_windows_lock); // Release lock before modification

    if !hybrid_windows.is_empty() {
        result.push_str(&format!(
            "Cleaning up {} hybrid drag windows from state\n",
            hybrid_windows.len()
        ));
        let mut detached_windows_lock = detached_windows.lock().await;
        for label in hybrid_windows {
            detached_windows_lock.remove(&label);
            result.push_str(&format!("  ✓ Removed hybrid window: {}\n", label));
        }
        save_detached_windows_to_disk(&detached_windows_lock).await?;
    }

    result.push_str("=== RECREATION COMPLETE ===\n");
    log_info!("DEBUG", "Recreate windows result: {}", result);
    Ok(result)
}

#[tauri::command]
pub async fn cleanup_stale_hybrid_windows(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<String, String> {
    let mut result = String::new();
    result.push_str("=== CLEANING UP STALE HYBRID WINDOWS ===\n");

    let mut windows_lock = detached_windows.lock().await;
    let hybrid_labels: Vec<String> = windows_lock
        .keys()
        .filter(|k| k.starts_with("hybrid-drag-"))
        .cloned()
        .collect();

    result.push_str(&format!(
        "Found {} hybrid windows to clean up\n",
        hybrid_labels.len()
    ));

    for window_label in hybrid_labels {
        // Close the Tauri window
        if let Some(window) = app.get_webview_window(&window_label) {
            window
                .close()
                .map_err(|e| format!("Failed to close window: {}", e))?;
            result.push_str(&format!("✓ Closed Tauri window: {}\n", window_label));
        }

        // Remove from backend state
        windows_lock.remove(&window_label);
        result.push_str(&format!("✓ Removed from backend state: {}\n", window_label));
    }

    // Save state
    save_detached_windows_to_disk(&windows_lock).await?;
    result.push_str("✓ Saved state to disk\n");

    result.push_str("=== CLEANUP COMPLETE ===\n");
    Ok(result)
}

#[tauri::command]
pub async fn list_all_windows(app: AppHandle) -> Result<Vec<String>, String> {
    let webview_windows = app.webview_windows();
    let mut window_list = Vec::new();

    for (label, window) in webview_windows.iter() {
        let mut info = label.to_string();

        // Add visibility status
        if let Ok(visible) = window.is_visible() {
            info.push_str(if visible { " (visible)" } else { " (hidden)" });
        }

        // Add position if available
        if let Ok(pos) = window.outer_position() {
            info.push_str(&format!(" at ({}, {})", pos.x, pos.y));
        }

        // Add size if available
        if let Ok(size) = window.inner_size() {
            info.push_str(&format!(" size {}x{}", size.width, size.height));
        }

        window_list.push(info);
    }

    log_info!("DEBUG", "Listed {} windows", window_list.len());
    Ok(window_list)
}

#[tauri::command]
pub async fn cleanup_stale_windows(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<usize, String> {
    let mut count = 0;
    let webview_windows = app.webview_windows();
    let mut windows_lock = detached_windows.lock().await;

    // Find windows in state that don't exist in Tauri
    let stale_windows: Vec<String> = windows_lock
        .keys()
        .filter(|label| !webview_windows.contains_key(*label))
        .cloned()
        .collect();

    for label in stale_windows {
        windows_lock.remove(&label);
        count += 1;
        log_info!("DEBUG", "Removed stale window from state: {}", label);
    }

    if count > 0 {
        save_detached_windows_to_disk(&windows_lock).await?;
    }

    Ok(count)
}

#[tauri::command]
pub async fn reload_main_window(app: AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    log_info!("DEBUG", "Reloading main window webview...");

    // Force window to reload its content
    window.eval("window.location.reload()").map_err(|e| {
        log_error!("DEBUG", "Failed to reload window: {}", e);
        e.to_string()
    })?;

    // Also try showing and focusing after reload
    window.show().map_err(|e| e.to_string())?;
    window.set_focus().map_err(|e| e.to_string())?;

    log_info!("DEBUG", "Window reload completed");
    Ok(())
}

// ============================================================================
// MULTI-WINDOW MANAGEMENT
// ============================================================================

#[tauri::command]
pub async fn toggle_all_windows_hover(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
    notes: State<'_, NotesState>,
    toggle_state: State<'_, ToggleState>,
) -> Result<bool, String> {
    // Check if a toggle is already in progress
    let mut is_toggling = toggle_state.lock().await;
    if *is_toggling {
        log_info!("HOVER", "Toggle already in progress, skipping...");
        return Ok(false);
    }
    *is_toggling = true;
    drop(is_toggling);

    // Perform the toggle operation
    let result = {
        log_info!("HOVER", "Toggling visibility for all windows...");

        // Add a small delay to debounce rapid toggles
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

        // Check if main window is visible
        let main_window = app
            .get_webview_window("main")
            .ok_or("Main window not found")?;
        let main_visible = main_window
            .is_visible()
            .map_err(|e| format!("Failed to check main window visibility: {}", e))?;

        if main_visible {
            // Hide all windows
            log_info!("HOVER", "Hiding all windows...");
            main_window
                .hide()
                .map_err(|e| format!("Failed to hide main window: {}", e))?;

            // Hide all detached windows
            let windows_lock = detached_windows.lock().await;
            let labels: Vec<String> = windows_lock.keys().cloned().collect();
            drop(windows_lock);

            for window_label in labels {
                if let Some(window) = app.get_webview_window(&window_label) {
                    if let Err(e) = window.hide() {
                        log_error!("WINDOW", "Failed to hide window {}: {}", window_label, e);
                    }
                }
            }
            Ok(false)
        } else {
            // Show all windows
            log_info!("HOVER", "Showing all windows...");
            main_window
                .show()
                .map_err(|e| format!("Failed to show main window: {}", e))?;
            main_window
                .set_focus()
                .map_err(|e| format!("Failed to focus main window: {}", e))?;

            // Show or restore all detached windows
            let windows_lock = detached_windows.lock().await;
            let windows_to_restore: Vec<DetachedWindow> = windows_lock.values().cloned().collect();
            drop(windows_lock);

            for window_data in windows_to_restore {
                // Check if window exists
                if let Some(window) = app.get_webview_window(&window_data.window_label) {
                    // Window exists, just show it
                    if let Err(e) = window.show() {
                        log_error!(
                            "WINDOW",
                            "Failed to show window {}: {}",
                            window_data.window_label,
                            e
                        );
                    }
                } else {
                    // Window doesn't exist, recreate it
                    log_info!(
                        "HOVER",
                        "Restoring window for note: {}",
                        window_data.note_id
                    );
                    let request = CreateDetachedWindowRequest {
                        note_id: window_data.note_id.clone(),
                        x: Some(window_data.position.0),
                        y: Some(window_data.position.1),
                        width: Some(window_data.size.0),
                        height: Some(window_data.size.1),
                    };
                    let _ = create_detached_window(
                        request,
                        app.clone(),
                        detached_windows.clone(),
                        notes.clone(),
                    )
                    .await;
                }
            }
            Ok(true)
        }
    };

    // Reset the toggle state
    let mut is_toggling = toggle_state.lock().await;
    *is_toggling = false;
    drop(is_toggling);

    result
}

// ============================================================================
// DRAG GHOST WINDOW OPERATIONS
// ============================================================================

#[tauri::command]
pub async fn create_drag_ghost(
    app: AppHandle,
    note_title: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    // Force close any existing ghost windows
    let windows: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|k| k.starts_with("drag-ghost"))
        .cloned()
        .collect();

    for window_label in windows {
        if let Some(ghost_window) = app.get_webview_window(&window_label) {
            let _ = ghost_window.close();
        }
    }

    // Small delay to ensure cleanup (use async sleep to avoid blocking Tokio runtime)
    tokio::time::sleep(std::time::Duration::from_millis(100)).await;

    // Create a temporary drag ghost window with unique label
    let ghost_label = format!(
        "drag-ghost-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );

    let ghost_window = WebviewWindowBuilder::new(
        &app,
        &ghost_label,
        WebviewUrl::App(
            format!(
                "index.html?ghost=true&title={}",
                urlencoding::encode(&note_title)
            )
            .into(),
        ),
    )
    .title("Drag Ghost")
    .inner_size(320.0, 240.0)
    .position(x, y)
    .resizable(false)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .visible(false)
    .shadow(false)
    .build()
    .map_err(|e| format!("Failed to create drag ghost window: {}", e))?;

    // Show the window immediately
    ghost_window.show().map_err(|e| e.to_string())?;

    log_debug!(
        "DRAG",
        "Ghost window created with label {} at position ({}, {})",
        ghost_label,
        x,
        y
    );

    Ok(())
}

#[tauri::command]
pub async fn update_drag_ghost_position(app: AppHandle, x: f64, y: f64) -> Result<(), String> {
    // Find any ghost window
    let windows: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|k| k.starts_with("drag-ghost"))
        .cloned()
        .collect();

    for window_label in windows {
        if let Some(ghost_window) = app.get_webview_window(&window_label) {
            ghost_window
                .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                    x: x as i32,
                    y: y as i32,
                }))
                .map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn destroy_drag_ghost(app: AppHandle) -> Result<(), String> {
    // Find and close all ghost windows
    let windows: Vec<String> = app
        .webview_windows()
        .keys()
        .filter(|k| k.starts_with("drag-ghost"))
        .cloned()
        .collect();

    let count = windows.len();
    for window_label in windows {
        if let Some(ghost_window) = app.get_webview_window(&window_label) {
            ghost_window.close().map_err(|e| e.to_string())?;
        }
    }

    if count > 0 {
        log_debug!("DRAG", "Destroyed {} ghost window(s)", count);
    }

    Ok(())
}

// ============================================================================
// HYBRID DRAG WINDOW OPERATIONS
// ============================================================================

#[tauri::command]
pub async fn create_hybrid_drag_window(
    app: AppHandle,
    note_id: String,
    x: f64,
    y: f64,
    hidden: Option<bool>,
) -> Result<String, String> {
    let window_label = format!("hybrid-drag-{}", note_id);

    // 先关闭已存在的窗口（如果有的话）
    if let Some(existing_window) = app.get_webview_window(&window_label) {
        log_info!("DRAG", "Closing existing hybrid window: {}", window_label);
        let _ = existing_window.close();
        // 等待一小段时间确保窗口完全关闭
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    // Create a window that follows the mouse
    let window_url = format!("index.html?note={}", note_id);
    log_info!(
        "DRAG",
        "Creating hybrid drag window with URL: {}",
        window_url
    );
    log_info!("DRAG", "Window label: {}", window_label);

    // Windows 上 transparent=true 会导致 webview 不渲染，macOS/Linux 正常
    #[cfg(target_os = "windows")]
    let transparent = false;
    #[cfg(not(target_os = "windows"))]
    let transparent = true;

    let drag_window =
        WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(window_url.into()))
            .title("Dragging...")
            .inner_size(400.0, 300.0) // Match HTML preview size
            .position(x, y)
            .resizable(false)
            .transparent(transparent)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .visible(!hidden.unwrap_or(false)) // Set initial visibility based on hidden parameter
            .shadow(true)
            .build()
            .map_err(|e| {
                log_info!("DRAG", "Failed to create window: {:?}", e);
                format!("Failed to create hybrid drag window: {}", e)
            })?;

    log_info!(
        "DRAG",
        "Created hybrid drag window '{}' for note '{}' at ({}, {}), hidden={:?}",
        window_label,
        note_id,
        x,
        y,
        hidden
    );

    // Set up lifecycle tracking for hybrid windows
    let window_label_for_events = window_label.clone();
    let app_for_events = app.clone();

    drag_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            log_info!(
                "WINDOW_LIFECYCLE",
                "Hybrid window {} destroyed",
                window_label_for_events
            );
            let label = window_label_for_events.clone();
            let app = app_for_events.clone();

            // Emit event to frontend
            app.emit("hybrid-window-destroyed", &label)
                .unwrap_or_else(|e| {
                    log_error!(
                        "WINDOW_LIFECYCLE",
                        "Failed to emit hybrid-window-destroyed event: {}",
                        e
                    );
                });
        }
    });

    // If showing immediately, ensure it's visible and on top
    if !hidden.unwrap_or(false) {
        if let Some(window) = app.get_webview_window(&window_label) {
            window
                .show()
                .map_err(|e| format!("Failed to show window: {}", e))?;
            window
                .set_always_on_top(true)
                .map_err(|e| format!("Failed to set always on top: {}", e))?;
            window
                .set_focus()
                .map_err(|e| format!("Failed to set focus: {}", e))?;
            log_info!("DRAG", "Window shown and set to always on top");
        }
    } else {
        // For hidden windows, ensure they're actually hidden
        if let Some(window) = app.get_webview_window(&window_label) {
            window
                .hide()
                .map_err(|e| format!("Failed to hide window: {}", e))?;
            log_info!("DRAG", "Window explicitly hidden");
        }
    }

    Ok(window_label)
}

// ============================================================================
// HYBRID DRAG WINDOW OPERATIONS (CONTINUED)
// ============================================================================

#[tauri::command]
pub async fn show_hybrid_drag_window(
    app: AppHandle,
    window_label: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    log_info!(
        "DRAG",
        "show_hybrid_drag_window called for '{}' at ({}, {})",
        window_label,
        x,
        y
    );

    if let Some(window) = app.get_webview_window(&window_label) {
        log_info!("DRAG", "Window found, updating position and showing");

        // Update position
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: x as i32,
                y: y as i32,
            }))
            .map_err(|e| {
                log_error!("DRAG", "Failed to set position: {}", e);
                e.to_string()
            })?;

        // Show the window
        window.show().map_err(|e| {
            log_error!("DRAG", "Failed to show window: {}", e);
            e.to_string()
        })?;

        // Ensure it's on top
        window.set_always_on_top(true).map_err(|e| {
            log_error!("DRAG", "Failed to set always on top: {}", e);
            e.to_string()
        })?;

        // Try to set focus
        window.set_focus().map_err(|e| {
            log_error!("DRAG", "Failed to set focus: {}", e);
            e.to_string()
        })?;

        log_info!("DRAG", "Window successfully shown and positioned");
    } else {
        log_error!("DRAG", "Window '{}' not found", window_label);
        return Err(format!("Window '{}' not found", window_label));
    }
    Ok(())
}

#[tauri::command]
pub async fn update_hybrid_drag_position(
    app: AppHandle,
    window_label: String,
    x: f64,
    y: f64,
) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window
            .set_position(tauri::Position::Physical(tauri::PhysicalPosition {
                x: x as i32,
                y: y as i32,
            }))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn finalize_hybrid_drag_window(
    app: AppHandle,
    window_label: String,
    note_id: String,
    detached_windows: State<'_, DetachedWindowsState>,
    _notes: State<'_, NotesState>,
) -> Result<(), String> {
    log_info!(
        "DRAG",
        "Finalizing hybrid drag window '{}' for note '{}'",
        window_label,
        note_id
    );

    if let Some(window) = app.get_webview_window(&window_label) {
        let pos = window.outer_position().map_err(|e| e.to_string())?;
        let size = window.inner_size().map_err(|e| e.to_string())?;

        // 将 hybrid 窗口注册为 detached 窗口（不修改任何窗口属性，避免触发重建）
        let detached_window = DetachedWindow {
            note_id: note_id.clone(),
            window_label: window_label.clone(),
            position: (pos.x as f64, pos.y as f64),
            size: (size.width as f64, size.height as f64),
            always_on_top: true, // 保持与 hybrid 窗口一致
            opacity: 1.0,
            is_shaded: false,
            original_height: None,
        };

        // 保存到状态
        let mut windows_lock = detached_windows.lock().await;
        windows_lock.insert(window_label.clone(), detached_window);
        save_detached_windows_to_disk(&windows_lock).await?;
        drop(windows_lock);

        app.emit("window-created", note_id.clone())
            .map_err(|e| e.to_string())?;
        log_info!("DRAG", "Window finalized with label '{}'", window_label);
        Ok(())
    } else {
        log_error!("DRAG", "Hybrid window '{}' not found!", window_label);
        Err("Drag window not found".to_string())
    }
}

#[tauri::command]
pub async fn close_hybrid_drag_window(app: AppHandle, window_label: String) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ============================================================================
// DETACHED WINDOW MANAGEMENT
// ============================================================================

#[tauri::command]
pub async fn restore_detached_windows(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
    _notes: State<'_, NotesState>,
) -> Result<Vec<String>, String> {
    let mut windows_lock = detached_windows.lock().await;
    let mut restored_windows = Vec::new();
    let mut windows_to_remove = Vec::new();

    log_info!(
        "RESTORE_WINDOWS",
        "Checking {} windows in state",
        windows_lock.len()
    );

    for (window_label, window_data) in windows_lock.iter() {
        if let Some(window) = app.get_webview_window(window_label) {
            // Window exists, check if it's visible
            match window.is_visible() {
                Ok(visible) => {
                    if !visible {
                        log_info!("RESTORE_WINDOWS", "Showing hidden window: {}", window_label);
                        window.show().map_err(|e| e.to_string())?;
                        window.set_focus().map_err(|e| e.to_string())?;
                        restored_windows.push(window_label.clone());
                    } else {
                        log_info!(
                            "RESTORE_WINDOWS",
                            "Window already visible: {}",
                            window_label
                        );
                    }
                }
                Err(e) => {
                    log_info!(
                        "RESTORE_WINDOWS",
                        "Failed to check visibility for {}: {}",
                        window_label,
                        e
                    );
                }
            }
        } else {
            // Window doesn't exist, recreate it
            log_info!(
                "RESTORE_WINDOWS",
                "Recreating missing window: {}",
                window_label
            );
            let _request = CreateDetachedWindowRequest {
                note_id: window_data.note_id.clone(),
                x: Some(window_data.position.0),
                y: Some(window_data.position.1),
                width: Some(window_data.size.0),
                height: Some(window_data.size.1),
            };

            // Don't recreate windows in restore - just remove them from state
            log_info!(
                "RESTORE_WINDOWS",
                "Removing missing window from state: {}",
                window_label
            );
            windows_to_remove.push(window_label.clone());
        }
    }

    // Remove windows that couldn't be restored
    for window_label in windows_to_remove {
        windows_lock.remove(&window_label);
    }

    if !restored_windows.is_empty() {
        save_detached_windows_to_disk(&windows_lock).await?;
    }

    log_info!(
        "RESTORE_WINDOWS",
        "Restored {} windows",
        restored_windows.len()
    );
    Ok(restored_windows)
}

#[tauri::command]
pub async fn clear_all_detached_windows(
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<i32, String> {
    let mut windows_lock = detached_windows.lock().await;
    let window_count = windows_lock.len() as i32;

    log_info!(
        "CLEAR_WINDOWS",
        "Clearing {} detached windows",
        window_count
    );

    // Close all actual Tauri windows
    for (window_label, _) in windows_lock.iter() {
        if let Some(window) = app.get_webview_window(window_label) {
            log_info!("WINDOW", "Closing window: {}", window_label);
            if let Err(e) = window.close() {
                log_error!("WINDOW", "Failed to close window {}: {}", window_label, e);
            }
        }
    }

    // Clear all from state
    windows_lock.clear();

    // Save empty state to disk
    save_detached_windows_to_disk(&windows_lock).await?;

    drop(windows_lock);

    // Emit event to notify frontend
    app.emit("all-detached-windows-cleared", window_count)
        .unwrap_or_else(|e| {
            log_error!(
                "WINDOW",
                "Failed to emit all-detached-windows-cleared event: {}",
                e
            );
        });

    log_info!(
        "CLEAR_WINDOWS",
        "All {} detached windows cleared",
        window_count
    );
    Ok(window_count)
}

#[tauri::command]
pub async fn focus_detached_window(
    note_id: String,
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<bool, String> {
    let windows_lock = detached_windows.lock().await;
    log_info!("FOCUS_DETACHED_WINDOW", "Looking for note: {}", note_id);

    // Find window by note_id (only in note-* windows, not hybrid-drag)
    if let Some((window_label, _window_data)) = windows_lock
        .iter()
        .find(|(label, w)| label.starts_with("note-") && w.note_id == note_id)
    {
        log_info!(
            "FOCUS_DETACHED_WINDOW",
            "Found window in state: {} -> {}",
            window_label,
            note_id
        );

        if let Some(window) = app.get_webview_window(window_label) {
            log_info!(
                "FOCUS_DETACHED_WINDOW",
                "✅ Tauri window found, attempting to focus..."
            );

            // Show and focus the window
            window
                .show()
                .map_err(|e| format!("Failed to show window: {}", e))?;
            window
                .set_focus()
                .map_err(|e| format!("Failed to focus window: {}", e))?;

            // If window is minimized, restore it
            if window.is_minimized().unwrap_or(false) {
                window
                    .unminimize()
                    .map_err(|e| format!("Failed to unminimize window: {}", e))?;
            }

            log_info!(
                "FOCUS_DETACHED_WINDOW",
                "✅ Successfully focused window for note: {}",
                note_id
            );
            log_info!(
                "WINDOW",
                "Focused existing detached window for note: {}",
                note_id
            );
            return Ok(true);
        } else {
            log_info!(
                "FOCUS_DETACHED_WINDOW",
                "❌ Window found in state but Tauri window doesn't exist: {}",
                window_label
            );
            log_info!(
                "FOCUS_DETACHED_WINDOW",
                "❌ Window may have been closed but not cleaned up from state"
            );
        }
    } else {
        log_info!(
            "FOCUS_DETACHED_WINDOW",
            "❌ No note window found in state for note: {}",
            note_id
        );
    }

    log_info!(
        "FOCUS_DETACHED_WINDOW",
        "❌ Failed to focus window for note: {}",
        note_id
    );
    log_info!(
        "WINDOW",
        "No existing detached window found for note: {}",
        note_id
    );
    Ok(false)
}

#[tauri::command]
pub async fn create_detached_window(
    request: CreateDetachedWindowRequest,
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
    notes: State<'_, NotesState>,
) -> Result<DetachedWindow, String> {
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Starting window creation for note: {}",
        request.note_id
    );
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Request params: x={:?}, y={:?}, width={:?}, height={:?}",
        request.x,
        request.y,
        request.width,
        request.height
    );

    // Clean up any existing drag ghost window first
    if let Some(ghost_window) = app.get_webview_window("drag-ghost") {
        log_info!(
            "CREATE_DETACHED_WINDOW",
            "Found existing drag ghost window, closing it..."
        );
        let _ = ghost_window.close();
    }

    // Check if note exists
    {
        log_info!("CREATE_DETACHED_WINDOW", "Checking if note exists...");
        let notes_lock = notes.lock().await;
        if !notes_lock.contains_key(&request.note_id) {
            log_info!(
                "CREATE_DETACHED_WINDOW",
                "ERROR: Note not found: {}",
                request.note_id
            );
            return Err("Note not found".to_string());
        }
        log_info!("CREATE_DETACHED_WINDOW", "Note exists ✓");
    }

    // Check if window already exists for this note
    let mut windows_lock = detached_windows.lock().await;
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Current windows count: {}",
        windows_lock.len()
    );
    log_info!("CREATE_DETACHED_WINDOW", "=== BACKEND WINDOWS STATE ===");
    for (window_label, window) in windows_lock.iter() {
        log_info!(
            "CREATE_DETACHED_WINDOW",
            "Backend window: {} -> note_id: {}, position: ({}, {})",
            window_label,
            window.note_id,
            window.position.0,
            window.position.1
        );
    }
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "=== END BACKEND WINDOWS STATE ==="
    );

    // Only check for actual note windows (not hybrid-drag windows)
    let existing_note_window = windows_lock.iter().find(|(window_label, window)| {
        window_label.starts_with("note-") && window.note_id == request.note_id
    });

    if existing_note_window.is_some() {
        log_info!(
            "CREATE_DETACHED_WINDOW",
            "ERROR: Note window already exists for note: {}",
            request.note_id
        );
        return Err("Window already exists for this note".to_string());
    }
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "No existing note window for this note ✓"
    );

    let window_label = format!("note-{}", request.note_id);
    log_info!("CREATE_DETACHED_WINDOW", "Window label: {}", window_label);

    // Check if we have a saved position for this note
    log_info!("CREATE_DETACHED_WINDOW", "Loading saved spatial data...");
    let saved_window = load_spatial_data(&request.note_id).await;

    // Use requested dimensions first, then defaults (ignore saved dimensions for new windows)
    // Default to sticky note proportions: narrow width, tall height
    let width = request.width.unwrap_or(400.0);
    let height = request.height.unwrap_or(600.0);

    // For position: if provided in request, use it; otherwise use saved position or calculate offset
    let (mut x, mut y) = match (request.x, request.y) {
        (Some(x_val), Some(y_val)) => (x_val, y_val),
        _ => {
            if let Some(saved) = saved_window.as_ref() {
                (saved.position.0, saved.position.1)
            } else {
                // Calculate position to avoid overlapping with existing windows
                let offset = windows_lock.len() as f64 * 30.0;
                (100.0 + offset, 100.0 + offset)
            }
        }
    };

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Window dimensions: {}x{} at ({}, {})",
        width,
        height,
        x,
        y
    );

    // Check if the position would overlap with existing windows
    let mut needs_offset = false;
    for (_, window) in windows_lock.iter() {
        let dx = (window.position.0 - x).abs();
        let dy = (window.position.1 - y).abs();
        // If windows are too close (within 50 pixels), offset the new window
        if dx < 50.0 && dy < 50.0 {
            needs_offset = true;
            break;
        }
    }

    if needs_offset {
        // Offset by 30 pixels from the requested position
        x += 30.0;
        y += 30.0;
        log_info!(
            "CREATE_DETACHED_WINDOW",
            "Offsetting window position to avoid overlap"
        );
    }

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Window dimensions: {}x{} at ({}, {})",
        width,
        height,
        x,
        y
    );

    // Create the window
    log_info!("CREATE_DETACHED_WINDOW", "Creating WebviewWindow...");
    let window_url = format!("index.html?note={}", request.note_id);
    log_info!("CREATE_DETACHED_WINDOW", "Window URL: {}", window_url);

    // Create window with custom title bar
    log_info!("CREATE_DETACHED_WINDOW", "Building window...");
    let webview_window =
        WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::App(window_url.into()))
            .title(format!("Note - {}", request.note_id))
            .inner_size(width, height)
            .position(x, y)
            .visible(true)
            .resizable(true) // Enable window resizing
            .decorations(false) // Disable native decorations for custom title bar
            .transparent(cfg!(target_os = "macos") || cfg!(target_os = "linux")) // Windows 上 transparent=true 会导致 webview 不渲染
            .shadow(true) // Enable window shadow
            .min_inner_size(400.0, 300.0) // Minimum size for proper display
            .build()
            .map_err(|e| {
                log_info!(
                    "CREATE_DETACHED_WINDOW",
                    "ERROR: Failed to create window: {:?}",
                    e
                );
                format!("Failed to create window: {}", e)
            })?;

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "WebviewWindow created successfully ✓"
    );

    // Ensure the window is visible
    log_info!("CREATE_DETACHED_WINDOW", "Showing window...");
    webview_window.show().map_err(|e| {
        log_info!(
            "CREATE_DETACHED_WINDOW",
            "ERROR: Failed to show window: {:?}",
            e
        );
        format!("Failed to show window: {}", e)
    })?;
    log_info!("CREATE_DETACHED_WINDOW", "Window shown ✓");

    // Set focus to ensure it's brought to front
    webview_window
        .set_focus()
        .map_err(|e| {
            log_info!(
                "CREATE_DETACHED_WINDOW",
                "WARNING: Failed to set focus: {:?}",
                e
            );
            e.to_string()
        })
        .unwrap_or_else(|e| {
            log_info!("CREATE_DETACHED_WINDOW", "Focus warning: {}", e);
        });

    // Verify window is actually visible
    match webview_window.is_visible() {
        Ok(visible) => log_info!(
            "CREATE_DETACHED_WINDOW",
            "Window visibility check: {}",
            visible
        ),
        Err(e) => log_info!(
            "CREATE_DETACHED_WINDOW",
            "ERROR: Failed to check visibility: {:?}",
            e
        ),
    }

    let detached_window = DetachedWindow {
        note_id: request.note_id.clone(),
        window_label: window_label.clone(),
        position: (x, y),
        size: (width, height),
        always_on_top: false,
        opacity: 1.0,
        is_shaded: false,
        original_height: None,
    };
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "DetachedWindow struct created: {:?}",
        detached_window
    );

    log_info!("CREATE_DETACHED_WINDOW", "Inserting window into state...");
    windows_lock.insert(window_label.clone(), detached_window.clone());
    log_info!("CREATE_DETACHED_WINDOW", "Window inserted into state ✓");

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Saving detached windows to disk..."
    );
    save_detached_windows_to_disk(&windows_lock)
        .await
        .map_err(|e| {
            log_info!(
                "CREATE_DETACHED_WINDOW",
                "ERROR: Failed to save windows to disk: {}",
                e
            );
            e
        })?;
    log_info!("CREATE_DETACHED_WINDOW", "Windows saved to disk ✓");

    // Update the app menu to include the new window
    drop(windows_lock);
    log_info!("CREATE_DETACHED_WINDOW", "App menu updated ✓");

    // Set up window event listeners for lifecycle tracking
    let window_label_for_events = window_label.clone();
    let app_handle_for_events = app.clone();
    let note_id_for_events = request.note_id.clone();

    webview_window.on_window_event(move |event| {
        match event {
            tauri::WindowEvent::Destroyed => {
                log_info!(
                    "WINDOW_LIFECYCLE",
                    "Window {} destroyed via OS",
                    window_label_for_events
                );
                let note_id = note_id_for_events.clone();
                let app = app_handle_for_events.clone();

                // Simply emit the event - let the frontend handle state cleanup
                // This avoids the lifetime issue with accessing state in the closure
                app.emit("window-destroyed", &note_id).unwrap_or_else(|e| {
                    log_error!(
                        "WINDOW_LIFECYCLE",
                        "Failed to emit window-destroyed event: {}",
                        e
                    );
                });

                log_info!(
                    "WINDOW_LIFECYCLE",
                    "Emitted window-destroyed event for note {}",
                    note_id
                );
            }
            tauri::WindowEvent::CloseRequested { api: _, .. } => {
                log_info!(
                    "WINDOW_LIFECYCLE",
                    "Window {} close requested",
                    window_label_for_events
                );
                // Allow the close - the Destroyed event will handle cleanup
            }
            _ => {}
        }
    });

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Window lifecycle listeners attached ✓"
    );

    // Note: Window position/size tracking is now handled by the frontend useWindowTracking hook
    // with proper debouncing to avoid excessive file I/O operations
    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Window tracking delegated to frontend (debounced) ✓"
    );

    log_info!(
        "CREATE_DETACHED_WINDOW",
        "Window creation completed successfully! Returning: {:?}",
        detached_window
    );
    Ok(detached_window)
}

#[tauri::command]
pub async fn cleanup_destroyed_window(
    note_id: String,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let mut windows_lock = detached_windows.lock().await;

    // 查找并移除与该 note_id 关联的所有窗口（兼容 note- 和 hybrid-drag- 前缀）
    let labels_to_remove: Vec<String> = windows_lock
        .iter()
        .filter(|(_, w)| w.note_id == note_id)
        .map(|(label, _)| label.clone())
        .collect();

    for label in &labels_to_remove {
        windows_lock.remove(label);
    }

    if !labels_to_remove.is_empty() {
        log_info!(
            "WINDOW_LIFECYCLE",
            "Cleaned up destroyed window state for note {} (labels: {:?})",
            note_id,
            labels_to_remove
        );
        save_detached_windows_to_disk(&windows_lock).await?;
    }

    Ok(())
}

#[tauri::command]
pub async fn close_detached_window(
    note_id: String,
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
    _notes: State<'_, NotesState>,
) -> Result<bool, String> {
    let mut windows_lock = detached_windows.lock().await;

    // Find window by note_id
    let window_label =
        if let Some((label, _)) = windows_lock.iter().find(|(_, w)| w.note_id == note_id) {
            label.clone()
        } else {
            return Ok(false);
        };

    // Close the actual window
    if let Some(window) = app.get_webview_window(&window_label) {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
    }

    // Remove from state
    windows_lock.remove(&window_label);
    save_detached_windows_to_disk(&windows_lock).await?;

    drop(windows_lock);

    // Emit event to all windows to notify frontend
    app.emit("window-closed", note_id.clone())
        .map_err(|e| e.to_string())?;
    log_info!(
        "WINDOW",
        "Emitted window-closed event for note: {}",
        note_id
    );

    Ok(true)
}

#[tauri::command]
pub async fn update_detached_window_position(
    window_label: String,
    x: f64,
    y: f64,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let mut windows_lock = detached_windows.lock().await;

    if let Some(window) = windows_lock.get_mut(&window_label) {
        window.position = (x, y);
        // Note: No longer saving to disk on every position update.
        // The frontend uses debouncing and saves on component unmount.
    }

    Ok(())
}

#[tauri::command]
pub async fn update_detached_window_size(
    window_label: String,
    width: f64,
    height: f64,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let mut windows_lock = detached_windows.lock().await;

    if let Some(window) = windows_lock.get_mut(&window_label) {
        window.size = (width, height);
        // Note: No longer saving to disk on every size update.
        // The frontend uses debouncing and saves on component unmount.
    }

    Ok(())
}

#[tauri::command]
pub async fn save_detached_windows_state(
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let windows_lock = detached_windows.lock().await;
    save_detached_windows_to_disk(&windows_lock).await?;
    Ok(())
}

// ============================================================================
// WINDOW SHADING FUNCTIONALITY
// ============================================================================

#[tauri::command]
pub async fn toggle_window_shade(
    window_label: String,
    app: AppHandle,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<bool, String> {
    let mut windows_lock = detached_windows.lock().await;

    if let Some(window_data) = windows_lock.get_mut(&window_label) {
        let window = app
            .get_webview_window(&window_label)
            .ok_or_else(|| format!("Window {} not found", window_label))?;

        let current_size = window
            .inner_size()
            .map_err(|e| format!("Failed to get window size: {}", e))?;

        if window_data.is_shaded {
            // Unshade: restore to original height
            if let Some(original_height) = window_data.original_height {
                window
                    .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                        width: current_size.width,
                        height: original_height as u32,
                    }))
                    .map_err(|e| format!("Failed to restore window size: {}", e))?;

                window_data.is_shaded = false;
                window_data.original_height = None;
                window_data.size.1 = original_height;
            }
        } else {
            // Shade: minimize to title bar height (48px to match h-12)
            window_data.original_height = Some(current_size.height as f64);
            window_data.is_shaded = true;

            window
                .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: current_size.width,
                    height: 48,
                }))
                .map_err(|e| format!("Failed to shade window: {}", e))?;
        }

        let is_shaded = window_data.is_shaded;
        save_detached_windows_to_disk(&windows_lock).await?;
        Ok(is_shaded)
    } else {
        Err(format!("Window data not found for {}", window_label))
    }
}

#[tauri::command]
pub async fn toggle_main_window_shade(
    app: AppHandle,
    config: State<'_, ConfigState>,
) -> Result<bool, String> {
    let window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;

    let current_size = window
        .inner_size()
        .map_err(|e| format!("Failed to get window size: {}", e))?;

    // Check if window is currently shaded (height <= 50 to account for rounding)
    let is_currently_shaded = current_size.height <= 50;

    if is_currently_shaded {
        // Unshade: restore to config height
        let config_lock = config.lock().await;
        let restore_height = config_lock.window.height;
        drop(config_lock);

        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: current_size.width,
                height: restore_height as u32,
            }))
            .map_err(|e| format!("Failed to restore window size: {}", e))?;

        Ok(false)
    } else {
        // Shade: minimize to title bar height
        // First save current height to config
        let mut config_lock = config.lock().await;
        config_lock.window.height = current_size.height as f64;
        let config_clone = config_lock.clone();
        drop(config_lock);
        save_config_to_disk(&config_clone).await?;

        // Emit event to notify all windows about config change
        app.emit("config-updated", &config_clone)
            .unwrap_or_else(|e| {
                log_error!("WINDOWS", "Failed to emit config-updated event: {}", e);
            });

        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: current_size.width,
                height: 48,
            }))
            .map_err(|e| format!("Failed to shade window: {}", e))?;

        Ok(true)
    }
}

// ============================================================================
// SPATIAL DATA FUNCTIONS
// ============================================================================

/// Load spatial data for a specific note
async fn load_spatial_data(note_id: &str) -> Option<DetachedWindow> {
    let notes_dir = get_default_notes_directory().ok()?;
    let spatial_file = notes_dir.join(format!("spatial_{}.json", note_id));

    if !spatial_file.exists() {
        return None;
    }

    let spatial_json = fs::read_to_string(spatial_file).ok()?;
    serde_json::from_str(&spatial_json).ok()
}

/// Save spatial data for a specific note
async fn save_spatial_data(note_id: &str, window_data: &DetachedWindow) -> Result<(), String> {
    let notes_dir = get_default_notes_directory()?;
    fs::create_dir_all(&notes_dir)
        .map_err(|e| format!("Failed to create notes directory: {}", e))?;

    let spatial_file = notes_dir.join(format!("spatial_{}.json", note_id));
    let spatial_json = serde_json::to_string_pretty(window_data)
        .map_err(|e| format!("Failed to serialize spatial data: {}", e))?;

    fs::write(spatial_file, spatial_json)
        .map_err(|e| format!("Failed to write spatial data to disk: {}", e))?;

    Ok(())
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// ============================================================================
// DEPRECATED FUNCTIONS (KEPT FOR COMPATIBILITY)
// ============================================================================

/// Currently unused - position tracking handled by frontend with debouncing
#[allow(dead_code)]
async fn save_window_position(note_id: String, x: f64, y: f64) -> Result<(), String> {
    if let Some(mut window_data) = load_spatial_data(&note_id).await {
        window_data.position = (x, y);
        save_spatial_data(&note_id, &window_data).await?;
    } else {
        // Create new spatial data if none exists
        let window_data = DetachedWindow {
            note_id: note_id.clone(),
            window_label: format!("note-{}", note_id),
            position: (x, y),
            size: (400.0, 600.0), // Default to sticky note proportions
            always_on_top: false,
            opacity: 1.0,
            is_shaded: false,
            original_height: None,
        };
        save_spatial_data(&note_id, &window_data).await?;
    }
    Ok(())
}

/// Currently unused - size tracking handled by frontend with debouncing
#[allow(dead_code)]
async fn save_window_size(note_id: String, width: f64, height: f64) -> Result<(), String> {
    if let Some(mut window_data) = load_spatial_data(&note_id).await {
        window_data.size = (width, height);
        save_spatial_data(&note_id, &window_data).await?;
    } else {
        // Create new spatial data if none exists
        let window_data = DetachedWindow {
            note_id: note_id.clone(),
            window_label: format!("note-{}", note_id),
            position: (100.0, 100.0), // Default position
            size: (width, height),
            always_on_top: false,
            opacity: 1.0,
            is_shaded: false,
            original_height: None,
        };
        save_spatial_data(&note_id, &window_data).await?;
    }
    Ok(())
}

// ============================================================================
// DETACHED WINDOW OPACITY COMMANDS
// ============================================================================

/// 设置分离窗口透明度（macOS）
#[tauri::command]
pub async fn set_detached_window_opacity_macos(
    app: AppHandle,
    window_label: String,
    opacity: f64,
) -> Result<(), String> {
    let _window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let ns_window = _window.ns_window().map_err(|e| e.to_string())? as id;
        unsafe {
            let _: () = msg_send![ns_window, setAlphaValue: opacity];
        }
        Ok(())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = opacity;
        Err("Not implemented for this platform".to_string())
    }
}

/// 获取分离窗口透明度（macOS）
#[tauri::command]
pub async fn get_detached_window_opacity_macos(
    app: AppHandle,
    window_label: String,
) -> Result<f64, String> {
    let _window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let ns_window = _window.ns_window().map_err(|e| e.to_string())? as id;
        let opacity: f64 = unsafe { msg_send![ns_window, alphaValue] };
        Ok(opacity)
    }

    #[cfg(not(target_os = "macos"))]
    {
        // 其他平台从配置中读取
        Ok(1.0) // 默认不透明
    }
}

/// 设置分离窗口透明度（Windows）
#[tauri::command]
pub async fn set_detached_window_opacity_windows(
    app: AppHandle,
    window_label: String,
    opacity: f64,
) -> Result<(), String> {
    log_debug!(
        "OPACITY",
        "Setting opacity for window: {} to {}",
        window_label,
        opacity
    );

    let window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "windows")]
    {
        use windows::Win32::Foundation::{COLORREF, HWND};
        use windows::Win32::UI::WindowsAndMessaging::{
            GetWindowLongW, SetLayeredWindowAttributes, SetWindowLongW, GWL_EXSTYLE, LWA_ALPHA,
            WS_EX_LAYERED,
        };

        // 获取窗口句柄
        let hwnd = window.hwnd().map_err(|e| e.to_string())?;
        let hwnd = HWND(hwnd.0 as _);
        log_debug!("OPACITY", "Window HWND: {:?}", hwnd);

        // 获取当前扩展样式
        let ex_style = unsafe { GetWindowLongW(hwnd, GWL_EXSTYLE) };
        log_debug!("OPACITY", "Current ex_style: {}", ex_style);

        // 添加 WS_EX_LAYERED 样式（如果还没有）
        if (ex_style & WS_EX_LAYERED.0 as i32) == 0 {
            log_debug!("OPACITY", "Adding WS_EX_LAYERED style");
            unsafe {
                SetWindowLongW(hwnd, GWL_EXSTYLE, ex_style | WS_EX_LAYERED.0 as i32);
            }
        }

        // 设置透明度（0-255）
        let alpha = (opacity * 255.0) as u8;
        log_debug!("OPACITY", "Setting alpha to: {}", alpha);
        unsafe {
            match SetLayeredWindowAttributes(hwnd, COLORREF(0), alpha, LWA_ALPHA) {
                Ok(_) => {
                    log_debug!("OPACITY", "Successfully set opacity");
                    Ok(())
                }
                Err(e) => {
                    log_debug!("OPACITY", "Failed to set opacity: {}", e);
                    Err(format!("Failed to set opacity: {}", e))
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = (window, opacity);
        Err("Not Windows platform".to_string())
    }
}

/// 获取分离窗口透明度（Windows）
#[tauri::command]
pub async fn get_detached_window_opacity_windows(
    app: AppHandle,
    window_label: String,
) -> Result<f64, String> {
    let _window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "windows")]
    {
        // 从配置中读取
        Ok(1.0) // 默认不透明
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Not Windows platform".to_string())
    }
}

/// 设置分离窗口透明度（Linux）
#[tauri::command]
pub async fn set_detached_window_opacity_linux(
    app: AppHandle,
    window_label: String,
    _opacity: f64,
) -> Result<(), String> {
    let _window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "linux")]
    {
        // TODO: 实现 Linux 透明度控制
        // 需要在 Cargo.toml 中添加 gtk 依赖
        log_debug!(
            "OPACITY",
            "Linux opacity control not yet implemented: {}",
            _opacity
        );
        Ok(())
    }

    #[cfg(not(target_os = "linux"))]
    {
        Err("Not Linux platform".to_string())
    }
}

/// 获取分离窗口透明度（Linux）
#[tauri::command]
pub async fn get_detached_window_opacity_linux(
    app: AppHandle,
    window_label: String,
) -> Result<f64, String> {
    let _window = app
        .get_webview_window(&window_label)
        .ok_or("Window not found")?;

    #[cfg(target_os = "linux")]
    {
        // TODO: 实现 Linux 透明度获取
        // 需要在 Cargo.toml 中添加 gtk 依赖
        Ok(1.0) // 默认不透明
    }

    #[cfg(not(target_os = "linux"))]
    {
        Err("Not Linux platform".to_string())
    }
}
