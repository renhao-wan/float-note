use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::error::FloatNoteError;
use crate::log_info;
use crate::modules::storage::get_configured_notes_directory;
use crate::types::link::{Backlink, LinkSuggestion, NoteLink};
use crate::NotesState;

/// Link index stored in .floatnote/links.json
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LinkIndex {
    pub links: Vec<NoteLink>,
    pub last_rebuild: String,
}

/// Get the link index file path
fn get_link_index_path(config: &crate::types::config::AppConfig) -> Result<PathBuf, String> {
    let notes_dir = get_configured_notes_directory(config)?;
    let floatnote_dir = notes_dir.join(".floatnote");

    // Create directory if it doesn't exist
    if !floatnote_dir.exists() {
        fs::create_dir_all(&floatnote_dir)
            .map_err(|e| format!("Failed to create .floatnote directory: {}", e))?;
    }

    Ok(floatnote_dir.join("links.json"))
}

/// Load link index from disk
fn load_link_index(config: &crate::types::config::AppConfig) -> Result<LinkIndex, String> {
    let index_path = get_link_index_path(config)?;

    if !index_path.exists() {
        return Ok(LinkIndex {
            links: Vec::new(),
            last_rebuild: String::new(),
        });
    }

    let content =
        fs::read_to_string(&index_path).map_err(|e| format!("Failed to read link index: {}", e))?;

    let index: LinkIndex =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse link index: {}", e))?;

    Ok(index)
}

/// Save link index to disk
fn save_link_index(
    config: &crate::types::config::AppConfig,
    index: &LinkIndex,
) -> Result<(), String> {
    let index_path = get_link_index_path(config)?;

    let content = serde_json::to_string_pretty(index)
        .map_err(|e| format!("Failed to serialize link index: {}", e))?;

    fs::write(&index_path, content).map_err(|e| format!("Failed to write link index: {}", e))?;

    Ok(())
}

/// Extract wikilinks from content
/// Format: [[note title]] or [[note title|display text]]
fn extract_wikilinks(content: &str) -> Vec<String> {
    let re = Regex::new(r"\[\[([^\]|]+)(?:\|[^\]]+)?\]\]").unwrap();
    let mut links = Vec::new();

    for cap in re.captures_iter(content) {
        if let Some(title) = cap.get(1) {
            links.push(title.as_str().trim().to_string());
        }
    }

    links
}

/// Get context around a link (the line containing the link)
fn get_link_context(content: &str, link_text: &str) -> String {
    for line in content.lines() {
        if line.contains(&format!("[[{}]]", link_text))
            || line.contains(&format!("[[{}|", link_text))
        {
            return line.trim().to_string();
        }
    }
    String::new()
}

/// Rebuild the link index for all notes
#[tauri::command]
pub async fn rebuild_link_index(
    notes: tauri::State<'_, NotesState>,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    let notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    log_info!("LINKS", "Rebuilding link index...");

    let mut all_links = Vec::new();

    // Get all note titles for matching
    let note_titles: Vec<(String, String)> = notes_lock
        .values()
        .map(|n| (n.id.clone(), n.title.clone()))
        .collect();

    // Extract links from each note
    for note in notes_lock.values() {
        let wikilinks = extract_wikilinks(&note.content);

        for link_text in wikilinks {
            // Find the target note by title
            if let Some((target_id, _)) = note_titles.iter().find(|(_, title)| title == &link_text)
            {
                let now = chrono::Utc::now().to_rfc3339();
                let link = NoteLink {
                    source_id: note.id.clone(),
                    target_id: target_id.clone(),
                    link_text,
                    created_at: now,
                };
                all_links.push(link);
            }
        }
    }

    let index = LinkIndex {
        links: all_links,
        last_rebuild: chrono::Utc::now().to_rfc3339(),
    };

    save_link_index(&config_lock, &index).map_err(FloatNoteError::Storage)?;

    log_info!(
        "LINKS",
        "Link index rebuilt with {} links",
        index.links.len()
    );

    Ok(())
}

/// Get backlinks for a note
#[tauri::command]
pub async fn get_backlinks(
    note_id: String,
    notes: tauri::State<'_, NotesState>,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Vec<Backlink>, FloatNoteError> {
    let notes_lock = notes.lock().await;
    let config_lock = config.lock().await;

    let index = load_link_index(&config_lock).map_err(FloatNoteError::Storage)?;

    let mut backlinks = Vec::new();

    // Find all links that point to this note
    for link in &index.links {
        if link.target_id == note_id {
            // Get the source note title and context
            if let Some(source_note) = notes_lock.get(&link.source_id) {
                let context = get_link_context(&source_note.content, &link.link_text);
                backlinks.push(Backlink {
                    note_id: link.source_id.clone(),
                    note_title: source_note.title.clone(),
                    link_context: context,
                });
            }
        }
    }

    Ok(backlinks)
}

/// Get outgoing links from a note
#[tauri::command]
pub async fn get_outgoing_links(
    note_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Vec<NoteLink>, FloatNoteError> {
    let config_lock = config.lock().await;

    let index = load_link_index(&config_lock).map_err(FloatNoteError::Storage)?;

    let outgoing: Vec<NoteLink> = index
        .links
        .iter()
        .filter(|link| link.source_id == note_id)
        .cloned()
        .collect();

    Ok(outgoing)
}

/// Search notes for link autocomplete
#[tauri::command]
pub async fn search_notes_for_link(
    query: String,
    notes: tauri::State<'_, NotesState>,
) -> Result<Vec<LinkSuggestion>, FloatNoteError> {
    let notes_lock = notes.lock().await;

    let query_lower = query.to_lowercase();
    let mut suggestions: Vec<LinkSuggestion> = Vec::new();

    for note in notes_lock.values() {
        let title_lower = note.title.to_lowercase();

        // Calculate match score
        let score = if title_lower == query_lower {
            1.0
        } else if title_lower.starts_with(&query_lower) {
            0.9
        } else if title_lower.contains(&query_lower) {
            0.7
        } else {
            continue; // No match
        };

        suggestions.push(LinkSuggestion {
            note_id: note.id.clone(),
            title: note.title.clone(),
            match_score: score,
        });
    }

    // Sort by score (descending)
    suggestions.sort_by(|a, b| b.match_score.partial_cmp(&a.match_score).unwrap());

    // Limit to 10 results
    suggestions.truncate(10);

    Ok(suggestions)
}
