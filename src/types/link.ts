export interface NoteLink {
  source_id: string;
  target_id: string;
  link_text: string;
  created_at: string;
}

export interface Backlink {
  note_id: string;
  note_title: string;
  link_context: string;
}

export interface LinkSuggestion {
  note_id: string;
  title: string;
  match_score: number;
}
