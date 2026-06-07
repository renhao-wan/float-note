import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDetachedWindowsStore } from '../stores';
import { getGridPosition } from '../utils/window-positioning';
import { Note } from '../types';

interface GlobalEventListenersProps {
  notes: Note[];
  onCreateNewNote: () => void;
}

export function useGlobalEventListeners({
  notes,
  onCreateNewNote,
}: GlobalEventListenersProps) {
  // Keep stable references to current values for event listeners
  const notesRef = useRef(notes);
  const onCreateNewNoteRef = useRef(onCreateNewNote);

  // Update refs when props change
  notesRef.current = notes;
  onCreateNewNoteRef.current = onCreateNewNote;

  useEffect(() => {
    const setupListeners = async () => {
      const unlisteners: (() => void)[] = [];

      try {
        // Listen for new note event
        const unlistenNewNote = await listen('menu-new-note', async () => {
          onCreateNewNoteRef.current();
        });
        unlisteners.push(unlistenNewNote);

        // Listen for direct note deployment events
        const unlistenDeployWindow = await listen('deploy-note-window', async (event) => {
          const noteIndex = event.payload as number;

          // Retry mechanism for when notes haven't loaded yet
          const attemptDeploy = async (retries = 3) => {
            const currentNotes = notesRef.current;
            const windowsStore = useDetachedWindowsStore.getState();

            if (currentNotes[noteIndex]) {
              const targetNote = currentNotes[noteIndex];
              const slotNumber = noteIndex + 1; // Convert 0-based to 1-based
              const gridPos = getGridPosition(slotNumber);

              try {
                const windowExists = windowsStore.isWindowOpen(targetNote.id);

                if (windowExists) {
                  const focused = await windowsStore.focusWindow(targetNote.id);

                  if (!focused) {
                    await windowsStore.createWindow(targetNote.id, gridPos.x, gridPos.y, gridPos.width, gridPos.height);
                  }
                } else {
                  await windowsStore.createWindow(targetNote.id, gridPos.x, gridPos.y, gridPos.width, gridPos.height);
                }
              } catch (error) {
                console.error('[DEPLOY] Error deploying window:', error);
              }
            } else if (retries > 0) {
              setTimeout(() => attemptDeploy(retries - 1), 200);
            }
          };

          await attemptDeploy();
        });
        unlisteners.push(unlistenDeployWindow);

        // Note: window-closed and window-created events are handled
        // directly by the stores when they perform the operations

        // Listen for window destroyed events
        const unlistenWindowDestroyed = await listen('window-destroyed', async (event) => {
          // Clean up backend state
          try {
            await invoke('cleanup_destroyed_window', { noteId: event.payload as string });
          } catch (error) {
            console.error('[FLOATNOTE] Failed to cleanup backend state:', error);
          }
        });
        unlisteners.push(unlistenWindowDestroyed);

        // Listen for hybrid window destroyed events
        const unlistenHybridDestroyed = await listen('hybrid-window-destroyed', async () => {
          // Window positions store will be updated automatically when hybrid window is destroyed
        });
        unlisteners.push(unlistenHybridDestroyed);

        return () => {
          unlisteners.forEach(fn => {
            try {
              fn();
            } catch (error) {
              console.warn('[FLOATNOTE] Failed to unlisten event:', error);
            }
          });
        };
      } catch (error) {
        console.error('[FLOATNOTE] Failed to setup event listeners:', error);
        return () => {};
      }
    };
    
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setupListeners().then(fn => {
      if (cancelled) {
        fn();
      } else {
        cleanup = fn;
      }
    });

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Empty dependency array since we use refs for callbacks
}