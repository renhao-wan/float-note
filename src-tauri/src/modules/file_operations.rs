use crate::modules::file_notes_storage::FileNotesStorage;
use crate::ModifiedStateTrackerState;
use crate::modules::storage::{get_configured_notes_directory, save_config_to_disk};
use crate::ConfigState;
use crate::types::note::Note;
use crate::NotesState;
use crate::{log_error, log_info};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter, State};

/// Import notes from a directory
#[tauri::command]
pub async fn import_notes_from_directory(
    app: AppHandle,
    directory_path: String,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
    modified_tracker: State<'_, ModifiedStateTrackerState>,
) -> Result<Vec<Note>, String> {
    log_info!("FILE_IMPORT", "Importing notes from directory: {}", directory_path);

    let mut imported_notes = Vec::new();
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    let dir_path = Path::new(&directory_path);
    if !dir_path.exists() {
        return Err("Directory does not exist".to_string());
    }

    // Create FileNotesStorage instance
    let file_storage = FileNotesStorage::new(&config_lock)?;

    // Read all markdown files in the directory
    let entries = fs::read_dir(dir_path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
        let path = entry.path();

        if path.extension().and_then(|s| s.to_str()) == Some("md") {
            match parse_markdown_file(&path).await {
                Ok(note) => {
                    log_info!("FILE_IMPORT", "Imported note: {} from {}", note.title, path.display());
                    notes_lock.insert(note.id.clone(), note.clone());
                    // Initialize dirty tracking for imported note
                    modified_tracker.initialize_note(&note).await;
                    imported_notes.push(note);
                },
                Err(e) => {
                    log_error!("FILE_IMPORT", "Failed to import {}: {}", path.display(), e);
                }
            }
        }
    }

    // Save all notes using FileNotesStorage
    file_storage.save_all_notes(&notes_lock).await?;

    drop(notes_lock);
    drop(config_lock);

    // Emit events for imported notes
    for note in &imported_notes {
        app.emit("note-created", note).unwrap_or_else(|e| {
            log_error!("FILE_IMPORT", "Failed to emit note-created event: {}", e);
        });
    }

    log_info!("FILE_IMPORT", "Successfully imported {} notes", imported_notes.len());
    Ok(imported_notes)
}

/// Import a single markdown file as a note
#[tauri::command]
pub async fn import_single_file(
    app: AppHandle,
    file_path: String,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
) -> Result<Note, String> {
    log_info!("FILE_IMPORT", "Importing single file: {}", file_path);

    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("File does not exist".to_string());
    }

    let note = parse_markdown_file(path).await?;

    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    // Create FileNotesStorage instance
    let file_storage = FileNotesStorage::new(&config_lock)?;

    notes_lock.insert(note.id.clone(), note.clone());

    // Save all notes using FileNotesStorage
    file_storage.save_all_notes(&notes_lock).await?;

    drop(notes_lock);
    drop(config_lock);

    // Emit event for imported note
    app.emit("note-created", &note).unwrap_or_else(|e| {
        log_error!("FILE_IMPORT", "Failed to emit note-created event: {}", e);
    });

    log_info!("FILE_IMPORT", "Successfully imported note: {}", note.title);
    Ok(note)
}

/// Export a note to a markdown file
#[tauri::command]
pub async fn export_note_to_file(
    note_id: String,
    file_path: String,
    notes: State<'_, NotesState>,
) -> Result<(), String> {
    log_info!("FILE_EXPORT", "Exporting note {} to {}", note_id, file_path);
    
    let notes_lock = notes.lock().await;
    let note = notes_lock.get(&note_id)
        .ok_or("Note not found")?;
    
    write_note_to_file(note, &file_path).await?;
    
    log_info!("FILE_EXPORT", "Successfully exported note to {}", file_path);
    Ok(())
}

/// Export all notes to a directory
#[tauri::command]
pub async fn export_all_notes_to_directory(
    directory_path: String,
    notes: State<'_, NotesState>,
) -> Result<Vec<String>, String> {
    log_info!("FILE_EXPORT", "Exporting all notes to directory: {}", directory_path);

    let dir_path = Path::new(&directory_path);

    // Validate path: ensure it's absolute and not a system-critical directory
    if !dir_path.is_absolute() {
        return Err("Export path must be absolute".to_string());
    }
    let canonical = dir_path.canonicalize().or_else(|_| {
        fs::create_dir_all(dir_path).map_err(|e| format!("Failed to create directory: {}", e))?;
        dir_path.canonicalize().map_err(|e| format!("Failed to resolve path: {}", e))
    })?;

    // Reject system-critical directories
    let path_str = canonical.to_string_lossy().to_lowercase();
    let restricted = ["/windows", "/system32", "/etc", "/usr", "/bin", "/sbin", "/boot"];
    for r in restricted {
        if path_str.contains(r) && !path_str.contains("documents") && !path_str.contains("desktop") {
            return Err("Cannot export to system-critical directories".to_string());
        }
    }
    
    let notes_lock = notes.lock().await;
    let mut exported_files = Vec::new();
    
    for note in notes_lock.values() {
        // Use the note ID as the filename since it's now a slug
        let file_name = format!("{}.md", note.id);
        let file_path = dir_path.join(&file_name);
        
        let file_path_str = file_path.to_string_lossy().to_string();
        match write_note_to_file(note, &file_path_str).await {
            Ok(_) => {
                exported_files.push(file_name);
                log_info!("FILE_EXPORT", "Exported note: {}", note.title);
            },
            Err(e) => {
                log_error!("FILE_EXPORT", "Failed to export {}: {}", note.title, e);
            }
        }
    }
    
    log_info!("FILE_EXPORT", "Successfully exported {} notes", exported_files.len());
    Ok(exported_files)
}

/// Set the notes directory
#[tauri::command]
pub async fn set_notes_directory(
    app: AppHandle,
    directory_path: String,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    log_info!("STORAGE", "Setting notes directory to: {}", directory_path);

    let path = PathBuf::from(&directory_path);
    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    // Canonicalize the path to resolve symlinks and prevent path traversal
    let canonical_path = path.canonicalize()
        .map_err(|e| format!("Failed to resolve path: {}", e))?;

    // Validate the canonicalized path is still a valid directory
    if !canonical_path.is_dir() {
        return Err("Resolved path is not a directory".to_string());
    }

    let canonical_str = canonical_path.to_string_lossy().to_string();
    log_info!("STORAGE", "Canonicalized path: {}", canonical_str);

    let mut config_lock = config.lock().await;
    config_lock.storage.notes_directory = Some(canonical_str);
    config_lock.storage.use_custom_directory = true;

    let config_clone = config_lock.clone();
    drop(config_lock);

    save_config_to_disk(&config_clone).await?;

    // Emit event to notify all windows about config change
    app.emit("config-updated", &config_clone).unwrap_or_else(|e| {
        log_error!("STORAGE", "Failed to emit config-updated event: {}", e);
    });

    log_info!("STORAGE", "Notes directory updated successfully");
    Ok(())
}

/// Reload notes from the configured directory
#[tauri::command]
pub async fn reload_notes_from_directory(
    app: AppHandle,
    config: State<'_, ConfigState>,
    notes: State<'_, NotesState>,
    modified_tracker: State<'_, ModifiedStateTrackerState>,
) -> Result<Vec<Note>, String> {
    log_info!("STORAGE", "Reloading notes from configured directory");

    let config_lock = config.lock().await;

    // Create FileNotesStorage instance
    let file_storage = FileNotesStorage::new(&config_lock)?;

    // Load all notes using FileNotesStorage
    let loaded_notes_map = file_storage.load_notes().await?;

    // Convert HashMap to Vec for return value
    let loaded_notes: Vec<Note> = loaded_notes_map.values().cloned().collect();

    // Update the notes state (replaces all existing notes)
    let mut notes_lock = notes.lock().await;

    // Get old note IDs for cleanup
    let old_ids: Vec<String> = notes_lock.keys().cloned().collect();

    // Replace all notes with loaded ones
    *notes_lock = loaded_notes_map;

    // Clear and reinitialize dirty tracking for all notes
    modified_tracker.clear_all().await;
    for note in notes_lock.values() {
        modified_tracker.initialize_note(note).await;
    }

    drop(notes_lock);
    drop(config_lock);

    // Emit events to notify frontend
    // First, emit delete events for old notes that may have been removed
    for old_id in old_ids {
        app.emit("note-deleted", &old_id).unwrap_or_else(|e| {
            log_error!("STORAGE", "Failed to emit note-deleted event: {}", e);
        });
    }

    // Then, emit create events for all loaded notes
    for note in &loaded_notes {
        app.emit("note-created", note).unwrap_or_else(|e| {
            log_error!("STORAGE", "Failed to emit note-created event: {}", e);
        });
    }

    log_info!("STORAGE", "Successfully loaded {} notes from directory", loaded_notes.len());
    Ok(loaded_notes)
}

/// Get the current notes directory path
#[tauri::command]
pub async fn get_current_notes_directory(config: State<'_, ConfigState>) -> Result<String, String> {
    let config_lock = config.lock().await;
    let notes_dir = get_configured_notes_directory(&config_lock)?;
    Ok(notes_dir.to_string_lossy().to_string())
}

// Helper functions

/// Parse a markdown file into a Note
async fn parse_markdown_file(path: &Path) -> Result<Note, String> {
    let content = fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;
    
    // ID is the filename without extension
    let id = path.file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid filename")?  
        .to_string();
    
    // Extract title from first heading or use filename
    let title = if let Some(first_line) = content.lines().next() {
        if first_line.starts_with('#') {
            first_line.trim_start_matches('#').trim().to_string()
        } else {
            // If no heading, use first non-empty line or filename
            content.lines()
                .find(|line| !line.trim().is_empty())
                .map(|line| line.trim().to_string())
                .unwrap_or_else(|| id.replace('-', " ").to_string())
        }
    } else {
        id.replace('-', " ").to_string()
    };
    
    // Handle migration: if content has frontmatter, extract just the body
    // Support both Unix (\n) and Windows (\r\n) line endings
    let actual_content = if content.starts_with("---\n") || content.starts_with("---\r\n") {
        let separator = if content.starts_with("---\r\n") { "---\r\n" } else { "---\n" };
        let parts: Vec<&str> = content.splitn(3, separator).collect();
        if parts.len() >= 3 {
            parts[2].to_string()
        } else {
            content
        }
    } else {
        content
    };
    
    let now = chrono::Utc::now().to_rfc3339();
    Ok(Note {
        id,
        title,
        content: actual_content,
        created_at: now.clone(),
        updated_at: now,
        position: None,
    })
}


/// Write a note to a markdown file
async fn write_note_to_file(note: &Note, file_path: &str) -> Result<(), String> {
    // Write pure markdown content - no frontmatter
    fs::write(file_path, &note.content)
        .map_err(|e| format!("Failed to write file: {}", e))?;
    
    Ok(())
}

