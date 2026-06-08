// Core imports
use std::collections::HashMap;

// Module declarations
mod error;
mod handlers;
mod modules;
mod services;
mod startup;
mod state;
mod types;
mod utils;

#[cfg(test)]
mod tests;

// Re-export commonly used types and functions
pub use error::{FloatNoteError, FloatNoteResult};

// Re-export state types explicitly to avoid ambiguity
pub use state::{
    AppState,
    NotesState,
    ConfigState,
    DetachedWindowsState,
    ToggleState,
    ModifiedStateTrackerState,
};

// Re-export from modules for backward compatibility
pub use modules::{
    logging::*,
    commands::*,
    tags::*,
    trash::*,
    attachments::*,
    links::*,
    templates::*,
    storage::{get_default_notes_directory, get_configured_notes_directory,
             get_config, update_config, get_detached_windows},
    windows::*,
    file_operations::*,
    system_commands::*,
};

// Re-export from types (excluding the state type aliases to avoid ambiguity)
pub use types::{
    note::*,
    config::*,
    window::{DetachedWindow, CreateDetachedWindowRequest},
};


// Main entry point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use modules::logging::init_file_logging;
    use startup::{setup_app, build_shortcut_handler, build_menu_handler};
    
    // Initialize file logging
    match init_file_logging() {
        Ok(log_path) => {
            log_info!("STARTUP", "File logging initialized at: {}", log_path.display());
        },
        Err(e) => {
            eprintln!("Failed to initialize file logging: {}", e);
        }
    }
    
    // Initialize with empty states - data will be loaded after app starts
    let notes_state = NotesState::new(HashMap::new());
    let config_state = ConfigState::new(AppConfig::default());
    let detached_windows_state = DetachedWindowsState::new(HashMap::new());
    let modified_state_tracker = ModifiedStateTrackerState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_fs::init())
        .plugin({
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(build_shortcut_handler())
                .build()
        })
        .manage(notes_state)
        .manage(config_state)
        .manage(detached_windows_state)
        .manage(ToggleState::new(false))
        .manage(modified_state_tracker)
        .invoke_handler(tauri::generate_handler![
            // Note operations
            get_notes,
            get_note,
            create_note,
            update_note,
            rename_note,
            delete_note,
            reorder_notes,

            // File operations
            import_notes_from_directory,
            import_single_file,
            export_note_to_file,
            export_all_notes_to_directory,
            set_notes_directory,
            reload_notes_from_directory,
            get_current_notes_directory,

            // Config operations
            get_config,
            update_config,

            // Window operations
            toggle_window_visibility,
            create_detached_window,
            close_detached_window,
            focus_detached_window,
            get_detached_windows,
            update_detached_window_position,
            update_detached_window_size,
            save_detached_windows_state,
            toggle_window_shade,
            toggle_main_window_shade,
            restore_detached_windows,
            clear_all_detached_windows,
            cleanup_destroyed_window,

            // Detached window opacity commands
            set_detached_window_opacity_macos,
            get_detached_window_opacity_macos,
            set_detached_window_opacity_windows,
            get_detached_window_opacity_windows,
            set_detached_window_opacity_linux,
            get_detached_window_opacity_linux,

            // Drag and drop operations
            create_hybrid_drag_window,
            show_hybrid_drag_window,
            update_hybrid_drag_position,
            close_hybrid_drag_window,
            finalize_hybrid_drag_window,

            // Tag operations
            get_all_tags,
            update_note_tags,
            delete_tag,
            get_notes_by_tag,
            create_tag,

            // Trash operations
            move_to_trash,
            restore_from_trash,
            permanently_delete,
            empty_trash,
            get_trash_stats,
            list_trashed_notes,

            // Attachment operations
            upload_attachment,
            delete_attachment,
            get_note_attachments,
            get_attachment_path,
            paste_image_from_clipboard,
            save_clipboard_image,

            // Link operations
            rebuild_link_index,
            get_backlinks,
            get_outgoing_links,
            search_notes_for_link,

            // Template operations
            get_all_templates,
            get_template,
            create_template,
            update_template,
            delete_template,
            create_note_from_template,

            // System operations
            open_system_settings,
            open_directory_in_finder,
            open_directory_dialog,
            pick_file_dialog,
        ])
        .on_menu_event(build_menu_handler())
        .setup(|app| {
            setup_app(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}