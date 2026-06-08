import { Note } from './note';

export interface TrashedNote {
  note: Note;
  deleted_at: string;
  original_path: string;
}

export interface TrashStats {
  total_count: number;
  total_size: number;
}
