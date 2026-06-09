export interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  position?: number; // Manual ordering position
  tags?: string[]; // Tags for categorization
}

export interface CreateNoteRequest {
  title: string;
  content: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  tags?: string[];
}

// Tag types
export interface Tag {
  name: string;
  color?: string;
  noteCount: number;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}

export interface UpdateNoteTagsRequest {
  noteId: string;
  tags: string[];
}
