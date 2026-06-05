import { useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { useDetachedWindowsStore } from '../stores';
import { getGridPosition } from '../utils/window-positioning';
import { Note } from '../types';

interface GlobalEventListenersProps {
  notes: Note[];
  onCreateNewNote: () => void;
  onStartWindowMode: () => void;
}

export function useGlobalEventListeners({
  notes,
  onCreateNewNote,
  onStartWindowMode,
}: GlobalEventListenersProps) {
  // Keep stable references to current values for event listeners
  const notesRef = useRef(notes);
  const onCreateNewNoteRef = useRef(onCreateNewNote);
  const onStartWindowModeRef = useRef(onStartWindowMode);
  
  // Update refs when props change
  notesRef.current = notes;
  onCreateNewNoteRef.current = onCreateNewNote;
  onStartWindowModeRef.current = onStartWindowMode;

  useEffect(() => {
    const setupListeners = async () => {
      const unlisteners: (() => void)[] = [];

      try {
        // Listen for new note event
        const unlistenNewNote = await listen('menu-new-note', async () => {
          onCreateNewNoteRef.current();
        });
        unlisteners.push(unlistenNewNote);

        // Listen for chord window mode event
        const unlistenChordWindow = await listen('chord-window-mode', async () => {
          onStartWindowModeRef.current();
        });
        unlisteners.push(unlistenChordWindow);

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

        // Listen for window closed events
        const unlistenWindowClosed = await listen('window-closed', async () => {
          // Window positions store will be updated automatically when window closes
        });
        unlisteners.push(unlistenWindowClosed);

        // Listen for window created events
        const unlistenWindowCreated = await listen('window-created', async () => {
          // Frontend store should be updated directly when creating windows
        });
        unlisteners.push(unlistenWindowCreated);

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
    
    let cleanup: (() => void) | undefined;
    setupListeners().then(fn => {
      cleanup = fn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Empty dependency array since we use refs for callbacks
}