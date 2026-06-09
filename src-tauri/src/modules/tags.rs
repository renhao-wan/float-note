use std::collections::HashMap;
use tauri::{AppHandle, Emitter, State};

use crate::error::FloatNoteError;
use crate::modules::file_notes_storage::FileNotesStorage;
use crate::types::note::{CreateTagRequest, Note, Tag, UpdateNoteTagsRequest};
use crate::NotesState;
use crate::{log_error, log_info};

/// Helper function to save a single note using FileNotesStorage
async fn save_note_using_file_storage(
    note: &Note,
    config: &crate::types::config::AppConfig,
) -> Result<(), String> {
    let file_storage = FileNotesStorage::new(config)?;
    file_storage.save_note(note).await
}

/// Get all unique tags from all notes
#[tauri::command]
pub async fn get_all_tags(notes: State<'_, NotesState>) -> Result<Vec<Tag>, FloatNoteError> {
    log_info!("TAGS", "Getting all tags");

    let notes_lock = notes.lock().await;
    let mut tag_counts: HashMap<String, usize> = HashMap::new();

    // Count notes per tag
    for note in notes_lock.values() {
        if let Some(ref tags) = note.tags {
            for tag in tags {
                *tag_counts.entry(tag.clone()).or_insert(0) += 1;
            }
        }
    }

    // Convert to Tag objects
    let tags: Vec<Tag> = tag_counts
        .into_iter()
        .map(|(name, count)| Tag {
            name,
            color: None, // TODO: Support tag colors in config
            note_count: count,
        })
        .collect();

    log_info!("TAGS", "Found {} unique tags", tags.len());
    Ok(tags)
}

/// Update tags for a specific note
#[tauri::command]
pub async fn update_note_tags(
    app: AppHandle,
    request: UpdateNoteTagsRequest,
    notes: State<'_, NotesState>,
    config: State<'_, crate::ConfigState>,
) -> Result<Note, FloatNoteError> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("TAGS", "Updating tags for note: {}", request.note_id);

    if let Some(note) = notes_lock.get_mut(&request.note_id) {
        note.tags = Some(request.tags.clone());
        note.updated_at = chrono::Utc::now().to_rfc3339();

        let updated_note = note.clone();

        // Save to disk
        save_note_using_file_storage(&updated_note, &config_lock)
            .await
            .map_err(FloatNoteError::Storage)?;

        log_info!(
            "TAGS",
            "Updated tags for note: {} -> {:?}",
            request.note_id,
            request.tags
        );

        // Emit event to all windows for synchronization
        app.emit("note-updated", &updated_note).unwrap_or_else(|e| {
            log_error!("TAGS", "Failed to emit note-updated event: {}", e);
        });

        Ok(updated_note)
    } else {
        log_error!("TAGS", "Note not found: {}", request.note_id);
        Err(FloatNoteError::NotFound(format!(
            "Note not found: {}",
            request.note_id
        )))
    }
}

/// Remove a tag from all notes
#[tauri::command]
pub async fn delete_tag(
    app: AppHandle,
    tag_name: String,
    notes: State<'_, NotesState>,
    config: State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    let mut notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("TAGS", "Deleting tag: {}", tag_name);

    let mut updated_notes = Vec::new();

    // Remove the tag from all notes
    for note in notes_lock.values_mut() {
        if let Some(ref mut tags) = note.tags {
            if let Some(pos) = tags.iter().position(|t| t == &tag_name) {
                tags.remove(pos);
                note.updated_at = chrono::Utc::now().to_rfc3339();
                updated_notes.push(note.clone());
            }
        }
    }

    // Save all updated notes
    for note in &updated_notes {
        save_note_using_file_storage(note, &config_lock)
            .await
            .map_err(FloatNoteError::Storage)?;
    }

    log_info!(
        "TAGS",
        "Removed tag '{}' from {} notes",
        tag_name,
        updated_notes.len()
    );

    // Emit events for each updated note
    for note in &updated_notes {
        app.emit("note-updated", note).unwrap_or_else(|e| {
            log_error!("TAGS", "Failed to emit note-updated event: {}", e);
        });
    }

    Ok(())
}

/// Get all notes that have a specific tag
#[tauri::command]
pub async fn get_notes_by_tag(
    tag_name: String,
    notes: State<'_, NotesState>,
) -> Result<Vec<Note>, FloatNoteError> {
    log_info!("TAGS", "Getting notes with tag: {}", tag_name);

    let notes_lock = notes.lock().await;
    let filtered_notes: Vec<Note> = notes_lock
        .values()
        .filter(|note| {
            note.tags
                .as_ref()
                .is_some_and(|tags| tags.contains(&tag_name))
        })
        .cloned()
        .collect();

    log_info!(
        "TAGS",
        "Found {} notes with tag '{}'",
        filtered_notes.len(),
        tag_name
    );
    Ok(filtered_notes)
}

/// Create a new tag (adds it to the tag index)
/// Note: Tags are stored on notes themselves, this just validates the tag name
#[tauri::command]
pub async fn create_tag(request: CreateTagRequest) -> Result<Tag, FloatNoteError> {
    log_info!("TAGS", "Creating tag: {}", request.name);

    // Validate tag name
    if request.name.trim().is_empty() {
        return Err(FloatNoteError::Validation(
            "Tag name cannot be empty".to_string(),
        ));
    }

    // Tags are stored on notes, so we just return a Tag object
    // The actual persistence happens when tags are assigned to notes
    Ok(Tag {
        name: request.name,
        color: request.color,
        note_count: 0,
    })
}
