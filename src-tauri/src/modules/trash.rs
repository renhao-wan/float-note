use tauri::{State, AppHandle, Emitter};
use std::fs;
use std::path::PathBuf;

use crate::types::note::Note;
use crate::types::trash::{TrashedNote, TrashStats};
use crate::NotesState;
use crate::modules::storage::get_configured_notes_directory;
use crate::{log_info, log_error};
use crate::error::FloatNoteError;

/// Get the trash directory path
fn get_trash_dir(config: &crate::types::config::AppConfig) -> Result<PathBuf, String> {
    let notes_dir = get_configured_notes_directory(config)?;
    let trash_dir = notes_dir.join(".trash");

    // Create trash directory if it doesn't exist
    if !trash_dir.exists() {
        fs::create_dir_all(&trash_dir)
            .map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }

    Ok(trash_dir)
}

/// Get the metadata file path for trash
fn get_trash_metadata_path(config: &crate::types::config::AppConfig) -> Result<PathBuf, String> {
    let trash_dir = get_trash_dir(config)?;
    Ok(trash_dir.join("metadata.json"))
}

/// Load trash metadata from disk
fn load_trash_metadata(config: &crate::types::config::AppConfig) -> Result<Vec<TrashedNote>, String> {
    let metadata_path = get_trash_metadata_path(config)?;

    if !metadata_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read trash metadata: {}", e))?;

    let metadata: Vec<TrashedNote> = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse trash metadata: {}", e))?;

    Ok(metadata)
}

/// Save trash metadata to disk
fn save_trash_metadata(
    config: &crate::types::config::AppConfig,
    metadata: &[TrashedNote],
) -> Result<(), String> {
    let metadata_path = get_trash_metadata_path(config)?;

    let content = serde_json::to_string_pretty(metadata)
        .map_err(|e| format!("Failed to serialize trash metadata: {}", e))?;

    fs::write(&metadata_path, content)
        .map_err(|e| format!("Failed to write trash metadata: {}", e))?;

    Ok(())
}

/// Move a note to trash
#[tauri::command]
pub async fn move_to_trash(
    app: AppHandle,
    note_id: String,
    notes: State<'_, NotesState>,
    config: State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("TRASH", "Moving note to trash: {}", note_id);

    // Get the note from memory
    let note = notes_lock.get(&note_id)
        .ok_or_else(|| FloatNoteError::NotFound(format!("Note not found: {}", note_id)))?
        .clone();

    // Get the file path
    let notes_dir = get_configured_notes_directory(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let note_file = notes_dir.join(format!("{}.md", note_id));

    // Get trash directory
    let trash_dir = get_trash_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let trash_file = trash_dir.join(format!("{}.md", note_id));

    // Move file to trash
    if note_file.exists() {
        fs::rename(&note_file, &trash_file)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to move note to trash: {}", e)))?;
    }

    // Move attachments to trash
    let attachments_dir = notes_dir.join("attachments").join(&note_id);
    if attachments_dir.exists() {
        let trash_attachments_dir = trash_dir.join("attachments").join(&note_id);
        // Create parent directories if they don't exist
        if let Some(parent) = trash_attachments_dir.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| FloatNoteError::Storage(format!("Failed to create trash attachments directory: {}", e)))?;
        }
        fs::rename(&attachments_dir, &trash_attachments_dir)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to move attachments to trash: {}", e)))?;
        log_info!("TRASH", "Moved attachments to trash for note: {}", note_id);
    }

    // Add to trash metadata
    let mut metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let trashed_note = TrashedNote {
        note: note.clone(),
        deleted_at: chrono::Utc::now().to_rfc3339(),
        original_path: note_file.to_string_lossy().to_string(),
    };

    metadata.push(trashed_note);
    save_trash_metadata(&config_lock, &metadata)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Remove from memory
    notes_lock.remove(&note_id);

    log_info!("TRASH", "Moved note to trash: {}", note_id);

    // Emit event to all windows for synchronization
    app.emit("note-deleted", &note_id).unwrap_or_else(|e| {
        log_error!("TRASH", "Failed to emit note-deleted event: {}", e);
    });

    Ok(())
}

/// Restore a note from trash
#[tauri::command]
pub async fn restore_from_trash(
    app: AppHandle,
    note_id: String,
    notes: State<'_, NotesState>,
    config: State<'_, crate::ConfigState>,
) -> Result<Note, FloatNoteError> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("TRASH", "Restoring note from trash: {}", note_id);

    // Load trash metadata
    let mut metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Find the trashed note
    let trashed_index = metadata.iter()
        .position(|t| t.note.id == note_id)
        .ok_or_else(|| FloatNoteError::NotFound(format!("Note not found in trash: {}", note_id)))?;

    let trashed_note = metadata.remove(trashed_index);

    // Get paths
    let trash_dir = get_trash_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let trash_file = trash_dir.join(format!("{}.md", note_id));

    let notes_dir = get_configured_notes_directory(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let note_file = notes_dir.join(format!("{}.md", note_id));

    // Move file back from trash
    if trash_file.exists() {
        fs::rename(&trash_file, &note_file)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to restore note from trash: {}", e)))?;
    }

    // Restore attachments from trash
    let trash_attachments_dir = trash_dir.join("attachments").join(&note_id);
    if trash_attachments_dir.exists() {
        let attachments_dir = notes_dir.join("attachments").join(&note_id);
        // Create parent directories if they don't exist
        if let Some(parent) = attachments_dir.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| FloatNoteError::Storage(format!("Failed to create attachments directory: {}", e)))?;
        }
        fs::rename(&trash_attachments_dir, &attachments_dir)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to restore attachments from trash: {}", e)))?;
        log_info!("TRASH", "Restored attachments from trash for note: {}", note_id);
    }

    // Update trash metadata
    save_trash_metadata(&config_lock, &metadata)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Add back to memory
    let note = trashed_note.note.clone();
    notes_lock.insert(note_id.clone(), note.clone());

    log_info!("TRASH", "Restored note from trash: {}", note_id);

    // Emit event to all windows for synchronization
    app.emit("note-created", &note).unwrap_or_else(|e| {
        log_error!("TRASH", "Failed to emit note-created event: {}", e);
    });

    Ok(note)
}

/// Permanently delete a note from trash
#[tauri::command]
pub async fn permanently_delete(
    app: AppHandle,
    note_id: String,
    config: State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("TRASH", "Permanently deleting note: {}", note_id);

    // Load trash metadata
    let mut metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Find and remove the trashed note
    let trashed_index = metadata.iter()
        .position(|t| t.note.id == note_id)
        .ok_or_else(|| FloatNoteError::NotFound(format!("Note not found in trash: {}", note_id)))?;

    metadata.remove(trashed_index);

    // Delete the file from trash
    let trash_dir = get_trash_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    let trash_file = trash_dir.join(format!("{}.md", note_id));

    if trash_file.exists() {
        fs::remove_file(&trash_file)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to delete note from trash: {}", e)))?;
    }

    // Delete attachments from trash
    let trash_attachments_dir = trash_dir.join("attachments").join(&note_id);
    if trash_attachments_dir.exists() {
        fs::remove_dir_all(&trash_attachments_dir)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to delete attachments from trash: {}", e)))?;
        log_info!("TRASH", "Deleted attachments from trash for note: {}", note_id);
    }

    // Update trash metadata
    save_trash_metadata(&config_lock, &metadata)
        .map_err(|e| FloatNoteError::Storage(e))?;

    log_info!("TRASH", "Permanently deleted note: {}", note_id);

    // Emit event to all windows for synchronization
    app.emit("note-permanently-deleted", &note_id).unwrap_or_else(|e| {
        log_error!("TRASH", "Failed to emit note-permanently-deleted event: {}", e);
    });

    Ok(())
}

/// Empty the trash (delete all trashed notes)
#[tauri::command]
pub async fn empty_trash(
    app: AppHandle,
    config: State<'_, crate::ConfigState>,
) -> Result<TrashStats, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("TRASH", "Emptying trash");

    // Load trash metadata
    let metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let count = metadata.len();

    // Delete all files from trash
    let trash_dir = get_trash_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    for trashed_note in &metadata {
        let trash_file = trash_dir.join(format!("{}.md", trashed_note.note.id));
        if trash_file.exists() {
            fs::remove_file(&trash_file)
                .map_err(|e| FloatNoteError::Storage(format!("Failed to delete note from trash: {}", e)))?;
        }
    }

    // Clear metadata
    save_trash_metadata(&config_lock, &[])
        .map_err(|e| FloatNoteError::Storage(e))?;

    log_info!("TRASH", "Emptied trash, deleted {} notes", count);

    // Emit event to all windows for synchronization
    app.emit("trash-emptied", &count).unwrap_or_else(|e| {
        log_error!("TRASH", "Failed to emit trash-emptied event: {}", e);
    });

    Ok(TrashStats {
        total_count: 0,
        total_size: 0,
    })
}

/// Get trash statistics
#[tauri::command]
pub async fn get_trash_stats(
    config: State<'_, crate::ConfigState>,
) -> Result<TrashStats, FloatNoteError> {
    let config_lock = config.lock().await;

    let metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let trash_dir = get_trash_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    // Calculate total size
    let mut total_size = 0u64;
    for trashed_note in &metadata {
        let trash_file = trash_dir.join(format!("{}.md", trashed_note.note.id));
        if let Ok(file_metadata) = fs::metadata(&trash_file) {
            total_size += file_metadata.len();
        }
    }

    Ok(TrashStats {
        total_count: metadata.len(),
        total_size,
    })
}

/// List all trashed notes
#[tauri::command]
pub async fn list_trashed_notes(
    config: State<'_, crate::ConfigState>,
) -> Result<Vec<TrashedNote>, FloatNoteError> {
    let config_lock = config.lock().await;

    let metadata = load_trash_metadata(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    Ok(metadata)
}
