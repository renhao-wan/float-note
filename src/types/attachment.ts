export interface Attachment {
  id: string;
  note_id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
  size: number;
  created_at: string;
}

export interface UploadAttachmentRequest {
  note_id: string;
  file_path: string;
}
