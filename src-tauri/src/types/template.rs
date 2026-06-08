use serde::{Deserialize, Serialize};

/// Represents a note template
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct NoteTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub content: String,
    pub is_builtin: bool,
    pub created_at: String,
    pub updated_at: String,
}

/// Request to create a template
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub description: String,
    pub content: String,
}

/// Request to create a note from a template
#[derive(Debug, Deserialize, Serialize)]
pub struct CreateNoteFromTemplateRequest {
    pub template_id: String,
    pub title: String,
}
