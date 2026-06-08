use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

use crate::types::attachment::{Attachment, UploadAttachmentRequest};
use crate::modules::storage::get_configured_notes_directory;
use crate::log_info;
use crate::error::FloatNoteError;

/// Get the attachments directory for a note
fn get_attachments_dir(config: &crate::types::config::AppConfig, note_id: &str) -> Result<PathBuf, String> {
    let notes_dir = get_configured_notes_directory(config)?;
    let attachments_dir = notes_dir.join("attachments").join(note_id);

    // Create directory if it doesn't exist
    if !attachments_dir.exists() {
        fs::create_dir_all(&attachments_dir)
            .map_err(|e| format!("Failed to create attachments directory: {}", e))?;
    }

    Ok(attachments_dir)
}

/// Get the metadata file path for note attachments
fn get_metadata_path(config: &crate::types::config::AppConfig, note_id: &str) -> Result<PathBuf, String> {
    let attachments_dir = get_attachments_dir(config, note_id)?;
    Ok(attachments_dir.join("metadata.json"))
}

/// Load attachments metadata from disk
fn load_metadata(config: &crate::types::config::AppConfig, note_id: &str) -> Result<Vec<Attachment>, String> {
    let metadata_path = get_metadata_path(config, note_id)?;

    if !metadata_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read attachments metadata: {}", e))?;

    let metadata: Vec<Attachment> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse attachments metadata: {}", e))?;

    Ok(metadata)
}

/// Save attachments metadata to disk
fn save_metadata(
    config: &crate::types::config::AppConfig,
    note_id: &str,
    metadata: &[Attachment],
) -> Result<(), String> {
    let metadata_path = get_metadata_path(config, note_id)?;

    let content = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("Failed to serialize attachments metadata: {}", e))?;

    fs::write(&metadata_path, content)
        .map_err(|e| format!("Failed to write attachments metadata: {}", e))?;

    Ok(())
}

/// Get MIME type from file extension
fn get_mime_type(filename: &str) -> String {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg".to_string(),
        "png" => "image/png".to_string(),
        "gif" => "image/gif".to_string(),
        "webp" => "image/webp".to_string(),
        "svg" => "image/svg+xml".to_string(),
        "bmp" => "image/bmp".to_string(),
        "ico" => "image/x-icon".to_string(),
        "pdf" => "application/pdf".to_string(),
        "txt" => "text/plain".to_string(),
        "md" => "text/markdown".to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

/// Upload an attachment for a note
#[tauri::command]
pub async fn upload_attachment(
    request: UploadAttachmentRequest,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Attachment, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("ATTACHMENTS", "Uploading attachment for note: {}", request.note_id);

    // Check if source file exists
    let source_path = PathBuf::from(&request.file_path);
    if !source_path.exists() {
        return Err(FloatNoteError::NotFound(format!("File not found: {}", request.file_path)));
    }

    // Get file info
    let file_metadata = fs::metadata(&source_path)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to read file metadata: {}", e)))?;

    let original_filename = source_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let extension = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();

    // Generate unique filename
    let attachment_id = Uuid::new_v4().to_string();
    let filename = format!("{}.{}", attachment_id, extension);

    // Get attachments directory
    let attachments_dir = get_attachments_dir(&config_lock, &request.note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let dest_path = attachments_dir.join(&filename);

    // Copy file to attachments directory
    fs::copy(&source_path, &dest_path)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to copy file: {}", e)))?;

    // Create attachment record
    let now = chrono::Utc::now().to_rfc3339();
    let attachment = Attachment {
        id: attachment_id,
        note_id: request.note_id.clone(),
        filename,
        original_filename,
        mime_type: get_mime_type(&extension),
        size: file_metadata.len(),
        created_at: now,
    };

    // Load existing metadata
    let mut metadata = load_metadata(&config_lock, &request.note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Add new attachment
    metadata.push(attachment.clone());

    // Save metadata
    save_metadata(&config_lock, &request.note_id, &metadata)
        .map_err(|e| FloatNoteError::Storage(e))?;

    log_info!("ATTACHMENTS", "Uploaded attachment: {} for note: {}", attachment.id, request.note_id);

    Ok(attachment)
}

/// Delete an attachment
#[tauri::command]
pub async fn delete_attachment(
    attachment_id: String,
    note_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("ATTACHMENTS", "Deleting attachment: {} from note: {}", attachment_id, note_id);

    // Load metadata
    let mut metadata = load_metadata(&config_lock, &note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Find attachment
    let attachment = metadata.iter()
        .find(|a| a.id == attachment_id)
        .cloned()
        .ok_or_else(|| FloatNoteError::NotFound(format!("Attachment not found: {}", attachment_id)))?;

    // Delete file
    let attachments_dir = get_attachments_dir(&config_lock, &note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let file_path = attachments_dir.join(&attachment.filename);

    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to delete file: {}", e)))?;
    }

    // Remove from metadata
    metadata.retain(|a| a.id != attachment_id);

    // Save metadata
    save_metadata(&config_lock, &note_id, &metadata)
        .map_err(|e| FloatNoteError::Storage(e))?;

    log_info!("ATTACHMENTS", "Deleted attachment: {}", attachment_id);

    Ok(())
}

/// Get all attachments for a note
#[tauri::command]
pub async fn get_note_attachments(
    note_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Vec<Attachment>, FloatNoteError> {
    let config_lock = config.lock().await;

    let metadata = load_metadata(&config_lock, &note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;

    Ok(metadata)
}

/// Get attachment file data (for reading)
#[tauri::command]
pub async fn get_attachment_path(
    attachment_id: String,
    note_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<String, FloatNoteError> {
    let config_lock = config.lock().await;

    // Load metadata
    let metadata = load_metadata(&config_lock, &note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Find attachment
    let attachment = metadata.iter()
        .find(|a| a.id == attachment_id)
        .ok_or_else(|| FloatNoteError::NotFound(format!("Attachment not found: {}", attachment_id)))?;

    // Get file path
    let attachments_dir = get_attachments_dir(&config_lock, &note_id)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let file_path = attachments_dir.join(&attachment.filename);

    Ok(file_path.to_string_lossy().to_string())
}

/// Paste image from clipboard
/// Note: This is a placeholder implementation. Full clipboard support requires platform-specific code.
#[tauri::command]
pub async fn paste_image_from_clipboard(
    note_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Attachment, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("ATTACHMENTS", "Pasting image from clipboard for note: {}", note_id);

    // TODO: Implement proper clipboard image paste
    // This requires platform-specific implementation for macOS/Windows/Linux
    // For now, return an error indicating this feature is not yet implemented
    Err(FloatNoteError::Storage("Clipboard paste not yet implemented. Please use file upload instead.".to_string()))
}
