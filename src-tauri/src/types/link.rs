use serde::{Deserialize, Serialize};

/// Represents a link between two notes
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct NoteLink {
    pub source_id: String,
    pub target_id: String,
    pub link_text: String,
    pub created_at: String,
}

/// Represents a backlink (a note that links to the current note)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Backlink {
    pub note_id: String,
    pub note_title: String,
    pub link_context: String,
}

/// Represents a link suggestion for autocomplete
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct LinkSuggestion {
    pub note_id: String,
    pub title: String,
    pub match_score: f64,
}
