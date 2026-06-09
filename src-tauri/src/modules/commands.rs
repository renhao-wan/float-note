use std::collections::HashSet;
use tauri::{AppHandle, Emitter, State};

use crate::error::{storage_error, FloatNoteError};
use crate::modules::file_notes_storage::FileNotesStorage;
use crate::modules::modified_state_tracker::ModifiedStateTracker;
use crate::types::note::{CreateNoteRequest, Note, UpdateNoteRequest};
use crate::utils::generate_unique_slug;
use crate::{log_debug, log_error, log_info};
use crate::{ConfigState, NotesState};

// ============================================================================
// 锁顺序约束：notes -> config -> detached_windows
// 同时获取多个锁时必须按此顺序，否则会导致死锁
// ============================================================================

/// Helper function to save all notes using FileNotesStorage
async fn save_all_notes_using_file_storage(
    notes: &std::collections::HashMap<String, Note>,
    config: &crate::types::config::AppConfig,
) -> Result<(), String> {
    let file_storage = FileNotesStorage::new(config)?;
    file_storage.save_all_notes(notes).await
}

/// Helper function to save a single note using FileNotesStorage
async fn save_note_using_file_storage(
    note: &Note,
    config: &crate::types::config::AppConfig,
) -> Result<(), String> {
    let file_storage = FileNotesStorage::new(config)?;
    file_storage.save_note(note).await
}

/// Get the current notes directory path
#[tauri::command]
pub async fn get_notes_directory(config: State<'_, ConfigState>) -> Result<String, FloatNoteError> {
    let config_lock = config.lock().await;
    let notes_dir = crate::modules::storage::get_configured_notes_directory(&config_lock)
        .map_err(storage_error)?;
    Ok(notes_dir.to_string_lossy().to_string())
}

/// Get all notes, sorted by position (manual ordering)
#[tauri::command]
pub async fn get_notes(notes: State<'_, NotesState>) -> Result<Vec<Note>, FloatNoteError> {
    log_info!("GET_NOTES", "🔍 Frontend requested notes list");

    let notes_lock = notes.lock().await;
    let mut notes_vec: Vec<Note> = notes_lock.values().cloned().collect();

    log_info!("GET_NOTES", "📋 Found {} notes in memory", notes_vec.len());

    // Sort by position (ascending), with None values at the end
    notes_vec.sort_by(|a, b| match (a.position, b.position) {
        (Some(pos_a), Some(pos_b)) => pos_a.cmp(&pos_b),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    });

    log_info!(
        "GET_NOTES",
        "✅ Returning {} notes to frontend (sorted by position)",
        notes_vec.len()
    );
    Ok(notes_vec)
}

/// Get a specific note by ID
#[tauri::command]
pub async fn get_note(
    id: String,
    notes: State<'_, NotesState>,
) -> Result<Option<Note>, FloatNoteError> {
    let notes_lock = notes.lock().await;
    Ok(notes_lock.get(&id).cloned())
}

/// Generate a unique title by appending (N) if needed
fn generate_unique_title(base_title: &str, existing_titles: &HashSet<String>) -> String {
    if !existing_titles.contains(base_title) {
        return base_title.to_string();
    }

    const MAX_TITLE_ATTEMPTS: u32 = 10000;
    let mut counter = 2;
    while counter < MAX_TITLE_ATTEMPTS {
        let title = format!("{} ({})", base_title, counter);
        if !existing_titles.contains(&title) {
            return title;
        }
        counter += 1;
    }
    // Fallback: append timestamp to guarantee uniqueness
    format!("{} ({})", base_title, chrono::Utc::now().timestamp_millis())
}

/// Create a new note
#[tauri::command]
pub async fn create_note(
    app: AppHandle,
    request: CreateNoteRequest,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
    modified_tracker: State<'_, ModifiedStateTracker>,
) -> Result<Note, String> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    // Find the highest position to place new note at the end
    let max_position = notes_lock
        .values()
        .filter_map(|n| n.position)
        .max()
        .unwrap_or(-1);

    // Generate unique title and slug
    let existing_titles: HashSet<String> = notes_lock.values().map(|n| n.title.clone()).collect();
    let title = generate_unique_title(&request.title, &existing_titles);

    let existing_ids: HashSet<String> = notes_lock.keys().cloned().collect();
    let id = generate_unique_slug(&title, &existing_ids);

    let now = chrono::Utc::now().to_rfc3339();
    let note = Note {
        id: id.clone(),
        title,
        content: request.content,
        created_at: now.clone(),
        updated_at: now,
        position: Some(max_position + 1),
        tags: None,
    };

    notes_lock.insert(note.id.clone(), note.clone());

    // Save only the new note
    save_note_using_file_storage(&note, &config_lock).await?;

    // Initialize tracking for the new note
    modified_tracker.initialize_note(&note).await;

    log_info!("NOTES", "Created note: {} ({})", note.title, note.id);

    // Emit event to all windows for synchronization
    app.emit("note-created", &note).unwrap_or_else(|e| {
        log_error!("NOTES", "Failed to emit note-created event: {}", e);
    });

    Ok(note)
}

/// Update an existing note
#[tauri::command]
pub async fn update_note(
    app: AppHandle,
    id: String,
    request: UpdateNoteRequest,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
    modified_tracker: State<'_, ModifiedStateTracker>,
) -> Result<Option<Note>, String> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    if let Some(note) = notes_lock.get_mut(&id) {
        // Check if content has actually changed
        let content_changed = if let Some(ref new_content) = request.content {
            modified_tracker.has_content_changed(&id, new_content).await
        } else {
            false
        };

        // Check if other fields changed
        let title_changed = request.title.as_ref().is_some_and(|t| t != &note.title);

        // Only update if something actually changed
        if content_changed || title_changed {
            if let Some(title) = request.title {
                note.title = title;
            }
            if let Some(content) = request.content {
                note.content = content;
            }
            note.updated_at = chrono::Utc::now().to_rfc3339();

            let updated_note = note.clone();

            // If title changed, need to rename file and update ID
            if title_changed {
                // Generate new slug from new title
                let mut existing_ids: HashSet<String> = notes_lock.keys().cloned().collect();
                existing_ids.remove(&id);
                let new_id = generate_unique_slug(&updated_note.title, &existing_ids);

                if new_id != id {
                    // Create updated note with new ID
                    let renamed_note = Note {
                        id: new_id.clone(),
                        title: updated_note.title,
                        content: updated_note.content,
                        created_at: updated_note.created_at,
                        updated_at: updated_note.updated_at,
                        position: updated_note.position,
                        tags: updated_note.tags,
                    };

                    // Perform disk operations first, before modifying in-memory state
                    let file_storage = FileNotesStorage::new(&config_lock)?;
                    file_storage.rename_note(&id, &new_id).await?;
                    save_note_using_file_storage(&renamed_note, &config_lock).await?;

                    // Only update in-memory state after successful disk operations
                    notes_lock.remove(&id);
                    notes_lock.insert(new_id.clone(), renamed_note.clone());

                    log_info!(
                        "NOTES",
                        "Renamed note via update: {} -> {} (title: {})",
                        id,
                        new_id,
                        renamed_note.title
                    );

                    // Update modified state tracker: remove old entry and initialize new one
                    modified_tracker.remove_note(&id).await;
                    modified_tracker.initialize_note(&renamed_note).await;

                    // Emit events for synchronization
                    app.emit("note-deleted", &id).unwrap_or_else(|e| {
                        log_error!("NOTES", "Failed to emit note-deleted event: {}", e);
                    });
                    app.emit("note-created", &renamed_note).unwrap_or_else(|e| {
                        log_error!("NOTES", "Failed to emit note-created event: {}", e);
                    });

                    return Ok(Some(renamed_note));
                }
            }

            // Save if content changed or metadata changed
            if content_changed {
                log_info!(
                    "NOTES",
                    "📝 Content changed for note: {} ({})",
                    updated_note.title,
                    updated_note.id
                );
                save_note_using_file_storage(&updated_note, &config_lock).await?;
                // Update the content hash after successful save
                modified_tracker
                    .update_content_hash(&id, &updated_note.content)
                    .await;
                modified_tracker.clear_modified(&id).await;
            } else if title_changed {
                log_info!(
                    "NOTES",
                    "📝 Metadata changed for note: {} ({})",
                    updated_note.title,
                    updated_note.id
                );
                save_note_using_file_storage(&updated_note, &config_lock).await?;
            }

            // Emit event to all windows for synchronization
            app.emit("note-updated", &updated_note).unwrap_or_else(|e| {
                log_error!("NOTES", "Failed to emit note-updated event: {}", e);
            });

            Ok(Some(updated_note))
        } else {
            log_debug!(
                "NOTES",
                "No changes detected for note: {} ({})",
                note.title,
                note.id
            );
            Ok(Some(note.clone()))
        }
    } else {
        log_error!("NOTES", "Attempted to update non-existent note: {}", id);
        Ok(None)
    }
}

/// Rename a note (change title and filename)
#[tauri::command]
pub async fn rename_note(
    app: AppHandle,
    id: String,
    new_title: String,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
    modified_tracker: State<'_, ModifiedStateTracker>,
) -> Result<Note, String> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    // Check if the note exists
    let old_note = notes_lock
        .get(&id)
        .ok_or_else(|| format!("Note not found: {}", id))?
        .clone();

    // Check for duplicate titles (excluding current note)
    let existing_titles: HashSet<String> = notes_lock
        .values()
        .filter(|n| n.id != id)
        .map(|n| n.title.clone())
        .collect();
    if existing_titles.contains(&new_title) {
        return Err(format!(
            "A note with the title '{}' already exists",
            new_title
        ));
    }

    // Generate new slug from new title, excluding current note from existing IDs
    let mut existing_ids: HashSet<String> = notes_lock.keys().cloned().collect();
    existing_ids.remove(&id);
    let new_id = generate_unique_slug(&new_title, &existing_ids);

    // Create updated note with new ID
    let updated_note = Note {
        id: new_id.clone(),
        title: new_title,
        content: old_note.content,
        created_at: old_note.created_at,
        updated_at: chrono::Utc::now().to_rfc3339(),
        position: old_note.position,
        tags: old_note.tags,
    };

    // Perform disk operations first, before modifying in-memory state
    // This ensures data consistency if disk operations fail
    if new_id != id {
        let file_storage = FileNotesStorage::new(&config_lock)?;
        file_storage.rename_note(&id, &new_id).await?;
    }
    save_note_using_file_storage(&updated_note, &config_lock).await?;

    // Only update in-memory state after successful disk operations
    notes_lock.remove(&id);
    notes_lock.insert(new_id.clone(), updated_note.clone());

    // Update modified state tracker: remove old entry and initialize new one
    modified_tracker.remove_note(&id).await;
    modified_tracker.initialize_note(&updated_note).await;

    log_info!(
        "NOTES",
        "Renamed note: {} -> {} (title: {})",
        id,
        new_id,
        updated_note.title
    );

    // Emit events for synchronization
    app.emit("note-deleted", &id).unwrap_or_else(|e| {
        log_error!("NOTES", "Failed to emit note-deleted event: {}", e);
    });
    app.emit("note-created", &updated_note).unwrap_or_else(|e| {
        log_error!("NOTES", "Failed to emit note-created event: {}", e);
    });

    Ok(updated_note)
}

/// Delete a note
#[tauri::command]
pub async fn delete_note(
    app: AppHandle,
    id: String,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
    modified_tracker: State<'_, ModifiedStateTracker>,
) -> Result<bool, String> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;
    let removed = notes_lock.remove(&id).is_some();

    if removed {
        // Delete using file storage (this handles everything including index updates)
        let file_storage = FileNotesStorage::new(&config_lock)?;
        file_storage.delete_note(&id).await?;

        // Remove from modified tracker
        modified_tracker.remove_note(&id).await;

        log_info!("NOTES", "Deleted note: {}", id);

        // Emit event to all windows for synchronization
        app.emit("note-deleted", &id).unwrap_or_else(|e| {
            log_error!("NOTES", "Failed to emit note-deleted event: {}", e);
        });
    } else {
        log_error!("NOTES", "Attempted to delete non-existent note: {}", id);
    }

    Ok(removed)
}

/// Request to reorder notes
#[derive(Debug, serde::Deserialize, serde::Serialize)]
pub struct ReorderNotesRequest {
    /// Note IDs in the new order
    pub note_ids: Vec<String>,
}

/// Reorder notes by updating their position values
#[tauri::command]
pub async fn reorder_notes(
    app: AppHandle,
    request: ReorderNotesRequest,
    notes: State<'_, NotesState>,
    config: State<'_, ConfigState>,
) -> Result<Vec<Note>, String> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("NOTES", "Reordering {} notes", request.note_ids.len());

    // Update position for each note based on the new order
    let mut updated_notes = Vec::new();
    for (index, note_id) in request.note_ids.iter().enumerate() {
        if let Some(note) = notes_lock.get_mut(note_id) {
            note.position = Some(index as i32);
            note.updated_at = chrono::Utc::now().to_rfc3339();
            updated_notes.push(note.clone());
        } else {
            log_error!("NOTES", "Note not found during reorder: {}", note_id);
            return Err(format!("Note not found: {}", note_id));
        }
    }

    // Save all updated notes to disk
    save_all_notes_using_file_storage(&notes_lock, &config_lock).await?;

    log_info!(
        "NOTES",
        "Successfully reordered {} notes",
        updated_notes.len()
    );

    // Emit event to all windows for synchronization
    app.emit("notes-reordered", &updated_notes)
        .unwrap_or_else(|e| {
            log_error!("NOTES", "Failed to emit notes-reordered event: {}", e);
        });

    // Return all notes sorted by new position
    let mut all_notes: Vec<Note> = notes_lock.values().cloned().collect();
    all_notes.sort_by(|a, b| match (a.position, b.position) {
        (Some(pos_a), Some(pos_b)) => pos_a.cmp(&pos_b),
        (Some(_), None) => std::cmp::Ordering::Less,
        (None, Some(_)) => std::cmp::Ordering::Greater,
        (None, None) => std::cmp::Ordering::Equal,
    });

    Ok(all_notes)
}
