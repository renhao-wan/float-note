use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Note {
    pub id: String,
    pub title: String,
    pub content: String,
    pub created_at: String,
    pub updated_at: String,
    pub position: Option<i32>, // Manual ordering position
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>, // Tags for categorization
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateNoteRequest {
    pub title: String,
    pub content: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateNoteRequest {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}

// Internal type for parsing frontmatter
#[derive(Debug, Deserialize, Serialize)]
pub struct NoteFrontmatter {
    pub id: String,
    pub title: String,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
}

// Tag types
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Tag {
    pub name: String,
    pub color: Option<String>,
    pub note_count: usize,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateTagRequest {
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateNoteTagsRequest {
    pub note_id: String,
    pub tags: Vec<String>,
}