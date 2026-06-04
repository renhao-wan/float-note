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
      console.log('[FLOATNOTE] [FRONTEND] Setting up Tauri event listeners...');
      const unlisteners: (() => void)[] = [];
      
      try {
        // Listen for new note event
        const unlistenNewNote = await listen('menu-new-note', async (event) => {
          console.log('[FLOATNOTE] [FRONTEND] 🔥 Received menu-new-note event!', event);
          onCreateNewNoteRef.current();
        });
        unlisteners.push(unlistenNewNote);
        
        // Listen for chord window mode event
        console.log('[FLOATNOTE] [FRONTEND] Setting up chord-window-mode listener...');
        const unlistenChordWindow = await listen('chord-window-mode', async (event) => {
          console.log('[FLOATNOTE] [FRONTEND] 🔥🔥🔥 RECEIVED CHORD-WINDOW-MODE EVENT! 🔥🔥🔥', event);
          console.log('[CHORD] Starting window mode from global shortcut');
          onStartWindowModeRef.current();
        });
        unlisteners.push(unlistenChordWindow);
        console.log('[FLOATNOTE] [FRONTEND] ✅ chord-window-mode listener set up successfully');
        
        // Listen for direct note deployment events
        console.log('[FLOATNOTE] [FRONTEND] Setting up deploy-note-window listener...');
        const unlistenDeployWindow = await listen('deploy-note-window', async (event) => {
          const noteIndex = event.payload as number;
          console.log('[FLOATNOTE] [FRONTEND] 🚀🚀🚀 DEPLOY NOTE WINDOW EVENT RECEIVED! 🚀🚀🚀');
          console.log('[FLOATNOTE] [FRONTEND] Event details:', { event, noteIndex, payload: event.payload });
          
          // Retry mechanism for when notes haven't loaded yet
          const attemptDeploy = async (retries = 3) => {
            const currentNotes = notesRef.current;
            const windowsStore = useDetachedWindowsStore.getState();
            
            console.log('[DEPLOY] === DEPLOYMENT STATE DEBUG ===');
            console.log('[DEPLOY] Checking notes - index:', noteIndex, 'available:', currentNotes.length);
            console.log('[DEPLOY] Available notes:', currentNotes.map(n => ({ id: n.id, title: n.title })));
            console.log('[DEPLOY] Current windows in frontend state:', Array.isArray(windowsStore.windows) ? windowsStore.windows.map(w => ({ 
              note_id: w.note_id, 
              window_label: w.window_label,
              position: w.position 
            })) : windowsStore.windows);
            
            if (currentNotes[noteIndex]) {
              const targetNote = currentNotes[noteIndex];
              const slotNumber = noteIndex + 1; // Convert 0-based to 1-based
              const gridPos = getGridPosition(slotNumber);
              
              console.log('[DEPLOY] Target note:', { id: targetNote.id, title: targetNote.title });
              console.log('[DEPLOY] Grid position for slot', slotNumber, ':', gridPos);
              
              try {
                // Get current windows state
                console.log('[DEPLOY] Checking current windows state...');
                const windowsStore = useDetachedWindowsStore.getState();
                console.log('[DEPLOY] Current windows:', Array.isArray(windowsStore.windows) ? windowsStore.windows.map(w => ({ 
                  note_id: w.note_id, 
                  window_label: w.window_label,
                  position: w.position 
                })) : windowsStore.windows);
                
                // Simple algorithm: Try to focus detached window, if that fails create new one
                const windowExists = windowsStore.isWindowOpen(targetNote.id);
                console.log('[DEPLOY] Window exists in state:', windowExists);
                
                if (windowExists) {
                  console.log('[DEPLOY] Attempting to focus existing detached window...');
                  const focused = await windowsStore.focusWindow(targetNote.id);
                  console.log('[DEPLOY] Focus result:', focused);
                  
                  if (focused) {
                    console.log('[DEPLOY] ✅ Successfully focused existing window');
                  } else {
                    console.log('[DEPLOY] ❌ Focus failed - window may not actually exist, creating new one');
                    const result = await windowsStore.createWindow(targetNote.id, gridPos.x, gridPos.y, gridPos.width, gridPos.height);
                    console.log('[DEPLOY] Created new window:', result ? '✅ Success' : '❌ Failed');
                  }
                } else {
                  console.log('[DEPLOY] No detached window found, creating new one at grid position', slotNumber);
                  const result = await windowsStore.createWindow(targetNote.id, gridPos.x, gridPos.y, gridPos.width, gridPos.height);
                  console.log('[DEPLOY] Created new window:', result ? '✅ Success' : '❌ Failed');
                }
              } catch (error) {
                console.error('[DEPLOY] ❌ Error deploying window:', error);
              }
            } else if (retries > 0) {
              console.log('[DEPLOY] ⏳ Notes not loaded yet, retrying in 200ms... (retries left:', retries, ')');
              setTimeout(() => attemptDeploy(retries - 1), 200);
            } else {
              console.log('[DEPLOY] ❌ No note at index:', noteIndex, 'available notes:', currentNotes.length, 'after all retries');
            }
          };
          
          await attemptDeploy();
        });
        unlisteners.push(unlistenDeployWindow);
        console.log('[FLOATNOTE] [FRONTEND] ✅ deploy-note-window listener set up successfully');
        
        // Listen for window closed events
        const unlistenWindowClosed = await listen('window-closed', async (event) => {
          console.log('[FLOATNOTE] Window closed event received for note:', event.payload);
          // Window positions store will be updated automatically when window closes
        });
        unlisteners.push(unlistenWindowClosed);
        
        // Listen for window created events
        const unlistenWindowCreated = await listen('window-created', async (event) => {
          console.log('[FLOATNOTE] Window created event received for note:', event.payload);
          // For now, just log - the frontend store should be updated directly when creating windows
        });
        unlisteners.push(unlistenWindowCreated);
        
        // Listen for window destroyed events
        const unlistenWindowDestroyed = await listen('window-destroyed', async (event) => {
          console.log('[FLOATNOTE] Window destroyed event received for note:', event.payload);
          
          // Clean up backend state
          try {
            await invoke('cleanup_destroyed_window', { noteId: event.payload as string });
            console.log('[FLOATNOTE] Backend state cleaned up for destroyed window');
          } catch (error) {
            console.error('[FLOATNOTE] Failed to cleanup backend state:', error);
          }
          
          // Window positions store will be updated automatically when window is destroyed
        });
        unlisteners.push(unlistenWindowDestroyed);
        
        // Listen for hybrid window destroyed events
        const unlistenHybridDestroyed = await listen('hybrid-window-destroyed', async (event) => {
          console.log('[FLOATNOTE] Hybrid window destroyed event received:', event.payload);
          // Window positions store will be updated automatically when hybrid window is destroyed
        });
        unlisteners.push(unlistenHybridDestroyed);
        
        console.log('[FLOATNOTE] [FRONTEND] ✅ All listeners setup complete');
        
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
        console.error('[FLOATNOTE] [FRONTEND] ❌ Failed to setup listeners:', error);
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