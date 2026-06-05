import { useState, useEffect, useCallback, useRef } from 'react';

interface UseChordShortcutsProps {
  notes: Array<{ id: string; title: string }>;
  onSelectNote: (noteId: string) => void;
  onCreateNewNote: () => void;
  onToggleCommandPalette: () => void;
  onCreateDetachedWindow: (noteId: string) => void;
  onFocusWindow: (noteId: string) => void;
}

type ChordMode = 'none' | 'note' | 'window';

export function useChordShortcuts({
  notes,
  onSelectNote,
  onCreateNewNote,
  onToggleCommandPalette,
  onCreateDetachedWindow,
  onFocusWindow,
}: UseChordShortcutsProps) {
  const [chordMode, setChordMode] = useState<ChordMode>('none');
  const [showChordHint, setShowChordHint] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Use refs to access latest values in stable callback
  const notesRef = useRef(notes);
  const onSelectNoteRef = useRef(onSelectNote);
  const onCreateNewNoteRef = useRef(onCreateNewNote);
  const onToggleCommandPaletteRef = useRef(onToggleCommandPalette);
  const onCreateDetachedWindowRef = useRef(onCreateDetachedWindow);
  const onFocusWindowRef = useRef(onFocusWindow);
  
  // Update refs when props change
  notesRef.current = notes;
  onSelectNoteRef.current = onSelectNote;
  onCreateNewNoteRef.current = onCreateNewNote;
  onToggleCommandPaletteRef.current = onToggleCommandPalette;
  onCreateDetachedWindowRef.current = onCreateDetachedWindow;
  onFocusWindowRef.current = onFocusWindow;

  // Clear chord mode after timeout
  const clearChordMode = useCallback(() => {
    setChordMode('none');
    setShowChordHint(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Start chord mode with timeout
  const startChordMode = useCallback((mode: ChordMode) => {
    // If we're already in the same chord mode, ignore duplicate activation
    if (chordMode === mode) {
      return;
    }

    setChordMode(mode);
    setShowChordHint(true);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout (5 seconds to complete chord)
    timeoutRef.current = setTimeout(() => {
      clearChordMode();
    }, 5000);
  }, [clearChordMode, notes]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;

    // Always handle chord completions (when we're already in chord mode)
    if (chordMode !== 'none') {
      // Don't return here - let the chord completion logic handle it
    } else {
      // Only block chord initiators when typing in input fields
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }
    }

    // Handle chord initiators (Hyper+Key combinations)
    if (e.metaKey && e.ctrlKey && e.altKey && e.shiftKey) {
      // Note: Hyper = Primary modifier+Ctrl+Alt+Shift
      // Hyper+N is reserved for quick new note creation
      switch (e.key.toLowerCase()) {
        case 'o': // Hyper+O for "Open note mode"
          e.preventDefault();
          startChordMode('note');
          return;
        case 'b': // Hyper+B for "Bring/detach window mode"
          e.preventDefault();
          startChordMode('window');
          return;
      }
    }

    // Handle ESC to cancel chord mode
    if (chordMode !== 'none' && e.key === 'Escape') {
      e.preventDefault();
      clearChordMode();
      return;
    }

    // Handle chord completions
    if (chordMode !== 'none') {
      // Allow common shortcuts to pass through even in chord mode
      if (e.metaKey && (e.key === 'v' || e.key === 'c' || e.key === 'x' || e.key === 'a' || e.key === 'z')) {
        clearChordMode(); // Exit chord mode when using system shortcuts
        return; // Don't prevent default for cut/copy/paste/select all/undo
      }

      e.preventDefault();

      switch (chordMode) {
        case 'note':
          // Check e.code instead of e.key to handle shifted numbers
          if (e.code >= 'Digit1' && e.code <= 'Digit9') {
            // Select note by number
            const noteIndex = parseInt(e.code.replace('Digit', '')) - 1;
            if (notes[noteIndex]) {
              onSelectNote(notes[noteIndex].id);
            }
          } else if (e.key.toLowerCase() === 'n') {
            // Create new note
            onCreateNewNote();
          } else if (e.key.toLowerCase() === 's') {
            // Open search/command palette
            onToggleCommandPalette();
          }
          break;

        case 'window': {
          // QWERTY layout mapping for notes (Q=1, W=2, E=3, etc.)
          const qwertyKeys = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
          const keyLower = e.key.toLowerCase();
          const noteIndex = qwertyKeys.indexOf(keyLower);

          if (noteIndex !== -1) {
            if (notes[noteIndex]) {
              onFocusWindow(notes[noteIndex].id);
            }
          }
          break;
        }
      }

      clearChordMode();
    }
  }, [chordMode, notes, onSelectNote, onCreateNewNote, onToggleCommandPalette, onCreateDetachedWindow, onFocusWindow, startChordMode, clearChordMode]);

  // Store the handler in a ref to avoid recreating it
  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  // Set up event listeners - only once
  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    
    // Only log once on mount
    if (process.env.NODE_ENV === 'development') {
      console.log('[CHORD] Setting up event listener (mount)');
    }
    document.addEventListener('keydown', handler);
    return () => {
      // Only log once on unmount
      if (process.env.NODE_ENV === 'development') {
        console.log('[CHORD] Removing event listener (unmount)');
      }
      document.removeEventListener('keydown', handler);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []); // Empty dependency array - only run once

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    chordMode,
    showChordHint,
    clearChordMode,
    startWindowMode: () => startChordMode('window'),
  };
}