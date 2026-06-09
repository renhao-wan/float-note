use serde::{Deserialize, Serialize};

/// Represents an attachment (image, file, etc.)
#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Attachment {
    pub id: String,
    pub note_id: String,
    pub filename: String,
    pub original_filename: String,
    pub mime_type: String,
    pub size: u64,
    pub created_at: String,
}

/// Request to upload an attachment
#[derive(Debug, Deserialize, Serialize)]
pub struct UploadAttachmentRequest {
    pub note_id: String,
    pub file_path: String,
}

/// Response for attachment upload
#[derive(Debug, Deserialize, Serialize)]
#[allow(dead_code)]
pub struct AttachmentData {
    pub attachment: Attachment,
    pub data: Vec<u8>,
}
