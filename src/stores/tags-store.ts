import { create } from 'zustand';
import { Tag, CreateTagRequest, Note } from '../types/note';
import { tagsApi } from '../services/tags-api';

interface TagsState {
  tags: Tag[];
  selectedTag: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTags: () => Promise<void>;
  createTag: (request: CreateTagRequest) => Promise<void>;
  deleteTag: (tagName: string) => Promise<void>;
  setSelectedTag: (tagName: string | null) => void;
  updateNoteTags: (noteId: string, tags: string[]) => Promise<Note>;
  getNotesByTag: (tagName: string) => Promise<Note[]>;
}

export const useTagsStore = create<TagsState>((set, get) => ({
  tags: [],
  selectedTag: null,
  isLoading: false,
  error: null,

  loadTags: async () => {
    set({ isLoading: true, error: null });
    try {
      const tags = await tagsApi.getAllTags();
      set({ tags, isLoading: false });
    } catch (error) {
      console.error('[FLOATNOTE] Failed to load tags:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  createTag: async (request: CreateTagRequest) => {
    set({ isLoading: true, error: null });
    try {
      await tagsApi.createTag(request);
      // Reload tags after creation
      await get().loadTags();
    } catch (error) {
      console.error('[FLOATNOTE] Failed to create tag:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  deleteTag: async (tagName: string) => {
    set({ isLoading: true, error: null });
    try {
      await tagsApi.deleteTag(tagName);
      // Remove from local state
      set((state) => ({
        tags: state.tags.filter((tag) => tag.name !== tagName),
        selectedTag: state.selectedTag === tagName ? null : state.selectedTag,
        isLoading: false,
      }));
    } catch (error) {
      console.error('[FLOATNOTE] Failed to delete tag:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  setSelectedTag: (tagName: string | null) => {
    set({ selectedTag: tagName });
  },

  updateNoteTags: async (noteId: string, tags: string[]) => {
    set({ isLoading: true, error: null });
    try {
      const updatedNote = await tagsApi.updateNoteTags({ noteId, tags });
      // Reload tags after update
      await get().loadTags();
      set({ isLoading: false });
      return updatedNote;
    } catch (error) {
      console.error('[FLOATNOTE] Failed to update note tags:', error);
      set({ error: String(error), isLoading: false });
      throw error;
    }
  },

  getNotesByTag: async (tagName: string) => {
    try {
      return await tagsApi.getNotesByTag(tagName);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to get notes by tag:', error);
      throw error;
    }
  },
}));
