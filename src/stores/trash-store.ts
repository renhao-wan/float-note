import { create } from 'zustand';
import { TrashedNote, TrashStats } from '../types/trash';
import { Note } from '../types/note';
import { trashApi } from '../services/trash-api';

interface TrashState {
  trashedNotes: TrashedNote[];
  trashStats: TrashStats | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTrash: () => Promise<void>;
  moveToTrash: (noteId: string) => Promise<void>;
  restoreFromTrash: (noteId: string) => Promise<Note>;
  permanentlyDelete: (noteId: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
}

export const useTrashStore = create<TrashState>((set, get) => ({
  trashedNotes: [],
  trashStats: null,
  isLoading: false,
  error: null,

  loadTrash: async () => {
    set({ isLoading: true, error: null });
    try {
      const [trashedNotes, trashStats] = await Promise.all([
        trashApi.listTrashedNotes(),
        trashApi.getTrashStats(),
      ]);
      set({ trashedNotes, trashStats, isLoading: false });
    } catch (error) {
      console.error('[FLOATNOTE] Failed to load trash:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  moveToTrash: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      await trashApi.moveToTrash(noteId);
      // Reload trash after moving
      await get().loadTrash();
    } catch (error) {
      console.error('[FLOATNOTE] Failed to move to trash:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  restoreFromTrash: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      const restoredNote = await trashApi.restoreFromTrash(noteId);
      // Remove from local state
      set((state) => ({
        trashedNotes: state.trashedNotes.filter((t) => t.note.id !== noteId),
        isLoading: false,
      }));
      // Reload stats
      const trashStats = await trashApi.getTrashStats();
      set({ trashStats });
      return restoredNote;
    } catch (error) {
      console.error('[FLOATNOTE] Failed to restore from trash:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  permanentlyDelete: async (noteId: string) => {
    set({ isLoading: true, error: null });
    try {
      await trashApi.permanentlyDelete(noteId);
      // Remove from local state
      set((state) => ({
        trashedNotes: state.trashedNotes.filter((t) => t.note.id !== noteId),
        isLoading: false,
      }));
      // Reload stats
      const trashStats = await trashApi.getTrashStats();
      set({ trashStats });
    } catch (error) {
      console.error('[FLOATNOTE] Failed to permanently delete:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  emptyTrash: async () => {
    set({ isLoading: true, error: null });
    try {
      await trashApi.emptyTrash();
      set({
        trashedNotes: [],
        trashStats: { total_count: 0, total_size: 0 },
        isLoading: false,
      });
    } catch (error) {
      console.error('[FLOATNOTE] Failed to empty trash:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },
}));
