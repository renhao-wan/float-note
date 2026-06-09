use super::note::Note;
use serde::{Deserialize, Serialize};

/// Represents a note in the trash
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TrashedNote {
    pub note: Note,
    pub deleted_at: String,
    pub original_path: String,
}

/// Statistics about the trash
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct TrashStats {
    pub total_count: usize,
    pub total_size: u64,
}
