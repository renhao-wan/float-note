use crate::{log_error, log_info};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// Open system settings (accessibility preferences)
#[tauri::command]
pub async fn open_system_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| format!("Failed to open System Settings: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Windows 10/11 设置 URI - 打开键盘辅助功能设置
        std::process::Command::new("cmd")
            .args(["/C", "start", "ms-settings:easeofaccess-keyboard"])
            .spawn()
            .map_err(|e| format!("Failed to open System Settings: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        // 尝试打开通用设置，不同桌面环境可能不同
        std::process::Command::new("xdg-open")
            .arg("settings://privacy")
            .spawn()
            .map_err(|e| format!("Failed to open System Settings: {}", e))?;
    }

    Ok(())
}

/// Open a directory in the system file manager
#[tauri::command]
pub async fn open_directory_in_finder(directory_path: String) -> Result<(), String> {
    log_info!("FINDER", "Opening directory in Finder: {}", directory_path);

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&directory_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory in Finder: {}", e))?;

        log_info!("FINDER", "Successfully opened directory in Finder");
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&directory_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory in Explorer: {}", e))?;

        log_info!("FINDER", "Successfully opened directory in Explorer");
        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        // Linux and other platforms - try xdg-open
        std::process::Command::new("xdg-open")
            .arg(&directory_path)
            .spawn()
            .map_err(|e| format!("Failed to open directory: {}", e))?;

        log_info!("FINDER", "Successfully opened directory with xdg-open");
        Ok(())
    }
}

/// Open a native directory picker dialog
#[tauri::command]
pub async fn open_directory_dialog(
    app: AppHandle,
    initial_dir: Option<String>,
) -> Result<Option<String>, String> {
    use std::path::PathBuf;
    use tokio::sync::oneshot;

    log_info!(
        "DIRECTORY",
        "Opening native directory picker dialog, initial_dir: {:?}",
        initial_dir
    );

    // Use channel for proper async handling
    let (tx, rx) = oneshot::channel();

    // Build the dialog with optional initial directory
    let mut dialog_builder = app.dialog().file().set_title("Select Notes Directory");

    // Set initial directory if provided
    if let Some(ref dir) = initial_dir {
        let path = PathBuf::from(dir);
        if path.exists() && path.is_dir() {
            log_info!("DIRECTORY", "Setting initial directory to: {:?}", path);
            dialog_builder = dialog_builder.set_directory(&path);
        }
    }

    // Use callback-based API since pick_folder is not async
    dialog_builder.pick_folder(move |folder_path| {
        // Convert FilePath to string, using simplified() to remove Windows UNC prefix
        let result = folder_path.map(|path| {
            let simplified = path.simplified();
            simplified.to_string()
        });
        let _ = tx.send(result); // Ignore send errors (receiver might be dropped)
    });

    // Wait for the dialog result
    match rx.await {
        Ok(result) => match result {
            Some(path) => {
                log_info!("DIRECTORY", "Selected directory: {}", path);
                Ok(Some(path))
            }
            None => {
                log_info!("DIRECTORY", "User canceled directory selection");
                Ok(None)
            }
        },
        Err(_) => {
            log_error!(
                "DIRECTORY",
                "Dialog callback channel was closed unexpectedly"
            );
            Err("Dialog was closed unexpectedly".to_string())
        }
    }
}

/// Open a native file picker dialog for markdown files
#[tauri::command]
pub async fn pick_file_dialog(app: AppHandle) -> Result<Option<String>, String> {
    use tokio::sync::oneshot;

    log_info!("FILE_PICKER", "Opening native file picker dialog");

    // Use channel for proper async handling
    let (tx, rx) = oneshot::channel();

    // Use callback-based API since pick_file is not async
    app.dialog()
        .file()
        .set_title("Select Markdown File")
        .add_filter("Markdown", &["md"])
        .pick_file(move |file_path| {
            // Convert FilePath to string, using simplified() to remove Windows UNC prefix
            let result = file_path.map(|path| {
                let simplified = path.simplified();
                simplified.to_string()
            });
            let _ = tx.send(result); // Ignore send errors (receiver might be dropped)
        });

    // Wait for the dialog result
    match rx.await {
        Ok(result) => match result {
            Some(path) => {
                log_info!("FILE_PICKER", "Selected file: {}", path);
                Ok(Some(path))
            }
            None => {
                log_info!("FILE_PICKER", "User canceled file selection");
                Ok(None)
            }
        },
        Err(_) => {
            log_error!(
                "FILE_PICKER",
                "Dialog callback channel was closed unexpectedly"
            );
            Err("Dialog was closed unexpectedly".to_string())
        }
    }
}
