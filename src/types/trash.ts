import { Note } from './note';

export interface TrashedNote {
  note: Note;
  deletedAt: string;
  originalPath: string;
}

export interface TrashStats {
  totalCount: number;
  totalSize: number;
}
