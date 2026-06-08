export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  position?: number; // Manual ordering position
}

export interface CreateNoteRequest {
  title: string;
  content: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
}