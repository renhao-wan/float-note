import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { noteSyncService, useNoteSync } from '../services/note-sync';
import { Note } from '../types';
import { extractTitleFromContent } from '../lib/utils';

interface UseNoteManagementReturn {
  // State
  notes: Note[];
  selectedNoteId: string | null;
  currentContent: string;
  loading: boolean;
  selectedNote: Note | undefined;

  // Actions
  loadNotes: () => Promise<void>;
  createNewNote: () => Promise<void>;
  selectNote: (noteId: string | null) => void;
  updateNoteContent: (content: string) => void;
  saveNoteImmediately: () => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  renameNote: (noteId: string, newTitle: string) => Promise<boolean>;
  updateNoteTags: (noteId: string, tags: string[]) => Promise<void>;
  extractTitleFromContent: (content: string) => string;

  // Setters for external control
  setCurrentContent: (content: string) => void;
  setSelectedNoteId: (id: string | null) => void;
  setNotes: (notes: Note[] | ((prev: Note[]) => Note[])) => void;
}

interface UseNoteManagementOptions {
  onSaveStart?: () => void;
  onSaveComplete?: (savedContent: string) => void;
  onSaveError?: (error: unknown) => void;
}

export function useNoteManagement(
  options?: UseNoteManagementOptions
): UseNoteManagementReturn {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState('');
  const currentContentRef = useRef(currentContent);
  currentContentRef.current = currentContent;
  const [loading, setLoading] = useState(true);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  const notesRef = useRef(notes);

  // Update refs when values change
  selectedNoteIdRef.current = selectedNoteId;
  optionsRef.current = options;
  notesRef.current = notes;

  const selectedNote = useMemo(
    () => notes.find((note) => note.id === selectedNoteId),
    [notes, selectedNoteId]
  );

  // Real-time sync for selected note
  useNoteSync(selectedNoteId, (updatedNote) => {
    if (updatedNote && selectedNoteId === updatedNote.id) {
      setCurrentContent(updatedNote.content);
    }
  });

  // Load notes from backend
  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      // Try to load notes from Tauri - if this fails, we'll fall back to demo data
      const loadedNotes = await invoke<Note[]>('get_notes');
      setNotes(loadedNotes);

      // If we have notes but no selected note, select the first one by position
      if (loadedNotes.length > 0 && !selectedNoteIdRef.current) {
        // Select the note with the lowest position value, or the first in array if no positions
        const noteWithLowestPosition = loadedNotes.reduce((lowest, current) => {
          // If current has a position and lowest doesn't, use current
          if (
            current.position !== undefined &&
            current.position !== null &&
            (lowest.position === undefined || lowest.position === null)
          ) {
            return current;
          }
          // If both have positions, use the one with lower position
          if (
            current.position !== undefined &&
            current.position !== null &&
            lowest.position !== undefined &&
            lowest.position !== null
          ) {
            return current.position < lowest.position ? current : lowest;
          }
          // Otherwise keep lowest
          return lowest;
        }, loadedNotes[0]);

        setSelectedNoteId(noteWithLowestPosition.id);
        setCurrentContent(noteWithLowestPosition.content);
      }
    } catch (error) {
      console.warn(
        '[FLOATNOTE] Failed to load notes from Tauri, falling back to demo data:',
        error
      );
      // Demo data for browser context or when Tauri fails
      const demoNotes: Note[] = [
        {
          id: 'demo-1',
          title: 'Welcome to FloatNote',
          content:
            '# Welcome to FloatNote\n\nThis is a demo note running in browser mode.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-2',
          title: 'Demo Note 2',
          content:
            '# Demo Note\n\nYou can see the interface, but Tauri features require the desktop app.',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
      setNotes(demoNotes);
      if (!selectedNoteIdRef.current) {
        setSelectedNoteId('demo-1');
        setCurrentContent(demoNotes[0].content);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new note
  const createNewNote = useCallback(async () => {
    try {
      const newNote = await invoke<Note>('create_note', {
        request: {
          title: 'Untitled',
          content: '',
        },
      });

      // Add the new note to the list and select it
      setNotes((prev) => {
        const updated = [...prev, newNote];
        // Sort by position (backend-assigned), with None values at the end
        const sorted = updated.sort((a, b) => {
          if (a.position !== undefined && b.position !== undefined) {
            return a.position - b.position;
          }
          if (a.position !== undefined) return -1;
          if (b.position !== undefined) return 1;
          // Both have no position - maintain original order (don't sort by updated_at)
          return 0;
        });
        // Update notesRef immediately so selectNote can find the new note
        notesRef.current = sorted;
        return sorted;
      });

      // Update ref and state to select the new note
      selectedNoteIdRef.current = newNote.id;
      setSelectedNoteId(newNote.id);
      setCurrentContent(newNote.content || '');
    } catch (error) {
      console.error('[FLOATNOTE] Failed to create note:', error);
    }
  }, []);

  // Select a note
  const selectNote = useCallback((noteId: string | null) => {
    if (!noteId) {
      selectedNoteIdRef.current = null;
      setSelectedNoteId(null);
      setCurrentContent('');
      return;
    }

    // Clear any pending save for the previous note
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Use notesRef to avoid dependency on notes array
    const note = notesRef.current.find((n) => n.id === noteId);
    if (note) {
      // Update ref immediately to prevent race conditions
      selectedNoteIdRef.current = noteId;
      setSelectedNoteId(noteId);
      setCurrentContent(note.content);
    }
  }, []);

  // Update note content with debouncing
  const updateNoteContent = useCallback((content: string) => {
    // Use ref to get the latest selectedNoteId
    const currentNoteId = selectedNoteIdRef.current;
    if (!currentNoteId) return;

    // Update local state immediately for responsiveness
    setCurrentContent(content);

    // Update the note content in local state (title is now independent)
    setNotes((prev) => {
      // Update the note without re-sorting to preserve order
      const updated = prev.map((note) =>
        note.id === currentNoteId
          ? { ...note, content, updated_at: new Date().toISOString() }
          : note
      );
      // Update notesRef immediately so selectNote can find updated content
      notesRef.current = updated;
      // Don't re-sort here - preserve the original order from the backend
      return updated;
    });

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for saving to backend (debounced)
    saveTimeoutRef.current = setTimeout(async () => {
      // Notify save is starting
      optionsRef.current?.onSaveStart?.();

      try {
        // Update in backend - only content, title is managed separately
        const updatedNote = await invoke<Note>('update_note', {
          id: currentNoteId,
          request: {
            content,
          },
        });

        // Notify save completed
        optionsRef.current?.onSaveComplete?.(content);

        // Notify other windows about the update
        noteSyncService.noteUpdated(updatedNote);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to save note:', error);
        optionsRef.current?.onSaveError?.(error);
        // Note: We don't revert local changes here since the user may have continued typing
      }
    }, 3000); // 3 second save interval
  }, []); // No dependencies - uses refs for all dynamic values

  // Save note immediately (for Cmd+S)
  const saveNoteImmediately = useCallback(async () => {
    const content = currentContentRef.current;
    if (!selectedNoteIdRef.current || content === undefined) return;

    // Clear any pending debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Notify save is starting
    optionsRef.current?.onSaveStart?.();

    try {
      // Update in backend - only content, title is managed separately
      const updatedNote = await invoke<Note>('update_note', {
        id: selectedNoteIdRef.current,
        request: {
          content,
          tags: undefined, // Keep existing tags
        },
      });

      // Update local state to reflect saved state
      setNotes((prev) => {
        const updated = prev.map((note) =>
          note.id === selectedNoteIdRef.current
            ? { ...note, content, updated_at: updatedNote.updated_at }
            : note
        );
        // Don't re-sort here - preserve the original order from the backend
        return updated;
      });

      // Notify save completed
      optionsRef.current?.onSaveComplete?.(content);

      // Notify other windows about the update
      noteSyncService.noteUpdated(updatedNote);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to save note immediately:', error);
      optionsRef.current?.onSaveError?.(error);
    }
  }, []);

  // Rename a note (change title)
  const renameNote = useCallback(
    async (noteId: string, newTitle: string): Promise<boolean> => {
      try {
        const updatedNote = await invoke<Note>('rename_note', {
          id: noteId,
          newTitle,
        });

        // Update local state
        setNotes((prev) => {
          // Remove old note if ID changed
          const filtered = prev.filter((n) => n.id !== noteId);
          const updated = [...filtered, updatedNote].sort((a, b) => {
            if (a.position !== undefined && b.position !== undefined) {
              return a.position - b.position;
            }
            if (a.position !== undefined) return -1;
            if (b.position !== undefined) return 1;
            return 0;
          });
          notesRef.current = updated;
          return updated;
        });

        // If the renamed note was selected, update selectedNoteId
        if (selectedNoteIdRef.current === noteId && updatedNote.id !== noteId) {
          selectedNoteIdRef.current = updatedNote.id;
          setSelectedNoteId(updatedNote.id);
        }

        return true;
      } catch (error) {
        console.error('[FLOATNOTE] Failed to rename note:', error);
        return false;
      }
    },
    []
  );

  // Delete a note (move to trash)
  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        // Use notesRef to avoid dependency on notes array
        const currentNotes = notesRef.current;
        const currentIndex = currentNotes.findIndex(
          (note) => note.id === noteId
        );
        const remainingNotes = currentNotes.filter(
          (note) => note.id !== noteId
        );
        const nextNote =
          remainingNotes.length > 0
            ? remainingNotes[Math.min(currentIndex, remainingNotes.length - 1)]
            : null;

        // Move to trash instead of permanent delete
        await invoke('move_to_trash', { noteId });

        // 更新笔记列表
        setNotes(remainingNotes);
        // Update notesRef immediately
        notesRef.current = remainingNotes;

        // 如果删除的是当前选中的笔记，选择下一个
        if (selectedNoteIdRef.current === noteId) {
          selectNote(nextNote?.id || null);
        }
      } catch (error) {
        console.error('[FLOATNOTE] Failed to move note to trash:', error);
      }
    },
    [selectNote]
  );

  // Update note tags
  const updateNoteTags = useCallback(
    async (noteId: string, tags: string[]): Promise<void> => {
      try {
        const updatedNote = await invoke<Note>('update_note_tags', {
          request: { note_id: noteId, tags },
        });

        // Update local state
        setNotes((prev) => {
          const updated = prev.map((note) =>
            note.id === noteId ? updatedNote : note
          );
          notesRef.current = updated;
          return updated;
        });

        // Notify other windows about the update
        noteSyncService.noteUpdated(updatedNote);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to update note tags:', error);
        throw error;
      }
    },
    []
  );

  // Load notes on mount and listen for data-loaded event
  useEffect(() => {
    loadNotes();

    // Listen for data-loaded event from backend
    const setupListener = async () => {
      const unlisten = await listen('data-loaded', () => {
        loadNotes();
      });
      return unlisten;
    };

    let cancelled = false;
    let unlisten: (() => void) | undefined;
    setupListener().then((fn) => {
      if (cancelled) {
        fn();
      } else {
        unlisten = fn;
      }
    });

    return () => {
      cancelled = true;
      if (unlisten) unlisten();
      // Clear any pending save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [loadNotes]);

  return {
    // State
    notes,
    selectedNoteId,
    currentContent,
    loading,
    selectedNote,

    // Actions
    loadNotes,
    createNewNote,
    selectNote,
    updateNoteContent,
    saveNoteImmediately,
    deleteNote,
    renameNote,
    updateNoteTags,
    extractTitleFromContent,

    // Setters for external control
    setCurrentContent,
    setSelectedNoteId,
    setNotes,
  };
}
