export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  content: string;
}

export interface CreateNoteFromTemplateRequest {
  template_id: string;
  title: string;
}
