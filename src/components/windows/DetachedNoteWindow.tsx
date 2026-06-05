import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { listen } from '@tauri-apps/api/event';
import { useDetachedWindowsStore } from '../../stores/detached-windows-store';
import { useConfigStore } from '../../stores/config-store';
import { useSaveStatus } from '../../hooks/use-save-status';
import { useModifiedState } from '../../hooks/use-modified-state';
import { useWindowShade } from '../../hooks/use-window-shade';
import { useWindowTracking } from '../../hooks/use-window-tracking';
import { noteSyncService, useNoteSync } from '../../services/note-sync';
import { CustomTitleBar } from '../layout/CustomTitleBar';
import { WindowWrapper } from '../layout/WindowWrapper';
import { extractTitleFromContent, getWordCount } from '../../lib/utils';
import { isPrimaryModifier } from '../../lib/platform';
import { NoteEditor, VimModeIndicator, type VimStatus, type EditorConfig } from '../editor/NoteEditor';

import { Note } from '../../types';

interface DetachedNoteWindowProps {
  noteId: string;
}

export function DetachedNoteWindow({ noteId }: DetachedNoteWindowProps) {
  const { t } = useTranslation();
  const { config, loadConfig } = useConfigStore();
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vimStatus, setVimStatus] = useState<VimStatus>({ mode: 'NORMAL' });

  const appWindow = getCurrentWebviewWindow();
  const { closeWindow } = useDetachedWindowsStore();
  const saveStatus = useSaveStatus();
  const modifiedState = useModifiedState();
  const isShaded = useWindowShade();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Track window position/size changes with proper debouncing
  useWindowTracking(noteId);

  // Real-time sync for this note
  useNoteSync(noteId, (updatedNote) => {
    setNote(updatedNote);
    setContent(updatedNote.content);
  });


  useEffect(() => {
    loadNote();
    
    // Listen for note update events from other windows
    const setupListeners = async () => {
      const unlistenNoteUpdated = await listen<Note>('note-updated', (event) => {
        if (event.payload.id === noteId) {
          console.log('[FLOATNOTE] Detached window received note-updated event:', event.payload);
          setNote(event.payload);
          setContent(event.payload.content);
          modifiedState.markSaved(event.payload.content);
        }
      });
      
      const unlistenNoteDeleted = await listen<string>('note-deleted', (event) => {
        if (event.payload === noteId) {
          console.log('[FLOATNOTE] Detached window received note-deleted event, closing window');
          appWindow.close();
        }
      });
      
      return () => {
        unlistenNoteUpdated();
        unlistenNoteDeleted();
      };
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

    // Cleanup function to clear save timeout on unmount
    return () => {
      cancelled = true;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (cleanup) {
        cleanup();
      }
    };
  }, [noteId]);

  useEffect(() => {
    // Update window title when content changes
    if (note) {
      const title = extractTitleFromContent(content);
      appWindow.setTitle(title);
    }
  }, [content, note, appWindow]);

  const loadNote = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedNote = await invoke<Note>('get_note', { id: noteId });
      
      if (loadedNote) {
        setNote(loadedNote);
        setContent(loadedNote.content);
      } else {
        setError('Note not found');
      }
    } catch (err) {
      setError(err as string);
    } finally {
      setLoading(false);
    }
  };

  const updateNoteContent = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Mark as modified when content changes
    if (note && newContent !== note.content) {
      modifiedState.markModified();
    }
    
    // Show saving indicator after a short delay to prevent flickering
    const savingIndicatorTimeout = setTimeout(() => {
      saveStatus.startSaving();
    }, 300);
    
    // Debounce the actual save operation to 1 second
    saveTimeoutRef.current = setTimeout(async () => {
      clearTimeout(savingIndicatorTimeout);
      
      if (note) {
        try {
          saveStatus.startSaving();
          
          const updatedNote = await invoke<Note>('update_note', {
            id: noteId,
            request: {
              content: newContent
            }
          });
          
          if (updatedNote) {
            setNote(updatedNote);
            saveStatus.saveSuccess();
            modifiedState.markSaved(newContent);
            
            // Notify other windows of the update
            noteSyncService.noteUpdated(updatedNote);
          }
        } catch (error) {
          console.error('Failed to update note:', error);
          saveStatus.setSaveError('Failed to save note');
        }
      }
    }, 3000); // 3 second save interval, same as main window
  }, [note, noteId, saveStatus]);

  const handleCloseWindow = async () => {
    console.log('[DETACHED-WINDOW] Closing window for note:', noteId);
    try {
      // Update the detached windows store to remove this window
      console.log('[DETACHED-WINDOW] Updating store...');
      await closeWindow(noteId);
      console.log('[DETACHED-WINDOW] Store updated, closing window...');
      // Close the actual window
      await appWindow.close();
      console.log('[DETACHED-WINDOW] Window close command sent');
    } catch (error) {
      console.error('[DETACHED-WINDOW] Failed to close window:', error);
      // Fallback: just close the window
      console.log('[DETACHED-WINDOW] Attempting fallback close...');
      await appWindow.close();
    }
  };

  useEffect(() => {
    console.log('[DETACHED-WINDOW] Setting up keyboard event listeners for note:', noteId);
    
    // Define the keyboard handler inside useEffect to avoid stale closures
    const handleKeyDown = (e: KeyboardEvent) => {
      // Log all primary modifier key combinations for debugging
      if (isPrimaryModifier(e)) {
        console.log('[DETACHED-WINDOW] Primary modifier key combo detected:', {
          key: e.key,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey
        });
      }

      // Primary+Shift+P to toggle preview mode
      if (isPrimaryModifier(e) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        console.log('[DETACHED-WINDOW] Toggling preview mode');
        setIsPreviewMode(prev => !prev);
      }

      // Primary+W to close window
      if (isPrimaryModifier(e) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        e.stopPropagation(); // Stop event from bubbling
        console.log('[DETACHED-WINDOW] Primary+W pressed, closing window...');

        // Ensure we're in the right window context
        if (window.location.search.includes(`note=${noteId}`)) {
          console.log('[DETACHED-WINDOW] Confirmed this is the correct window');
          // Call handleCloseWindow asynchronously to avoid blocking
          handleCloseWindow().catch(error => {
            console.error('[DETACHED-WINDOW] Error closing window:', error);
            // Ensure window closes even if there's an error
            appWindow.close().catch(() => {});
          });
        } else {
          console.warn('[DETACHED-WINDOW] Window context mismatch, ignoring Primary+W');
        }
      }
    };

    // Add event listener with capture phase to ensure we get the event first
    window.addEventListener('keydown', handleKeyDown, true);
    
    // Listen for window close events to clean up state
    const handleWindowClose = async () => {
      try {
        await closeWindow(noteId);
      } catch (error) {
        console.error('Failed to update window state on close:', error);
      }
    };

    // Set up beforeunload handler to clean up state
    window.addEventListener('beforeunload', handleWindowClose);
    
    // Log when listeners are being removed
    return () => {
      console.log('[DETACHED-WINDOW] Removing keyboard event listeners for note:', noteId);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('beforeunload', handleWindowClose);
    };
  }, [noteId, handleCloseWindow]);

  // Listen for config updates to sync across windows
  useEffect(() => {
    const setupConfigListener = async () => {
      console.log('[DETACHED-WINDOW] Setting up config update listener...');
      
      const unlisten = await listen('config-updated', (event) => {
        console.log('[DETACHED-WINDOW] Config updated event received:', event.payload);
        // Force reload the config in this window
        loadConfig();
      });
      
      return unlisten;
    };
    
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    setupConfigListener().then(fn => {
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
  }, [loadConfig]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">{t('editor.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-red-400">{t('editor.error')}{error}</div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background text-foreground">
        <div className="text-sm text-muted-foreground">{t('editor.notFound')}</div>
      </div>
    );
  }

  // Mode toggle component for the title bar
  const modeToggle = (
    <div className="flex items-center bg-card/50 border border-border/30 rounded-xl">
      <button
        onClick={() => setIsPreviewMode(false)}
        className={`w-5 h-4 flex items-center justify-center rounded-2xl transition-all duration-200 ${
          !isPreviewMode
            ? 'bg-primary/20 text-primary shadow-sm'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-primary/5'
        }`}
        title={t('editor.editMode')}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
      <button
        onClick={() => setIsPreviewMode(true)}
        className={`w-5 h-4 flex items-center justify-center rounded-2xl transition-all duration-200 ${
          isPreviewMode
            ? 'bg-primary/20 text-primary shadow-sm'
            : 'text-muted-foreground/60 hover:text-foreground hover:bg-primary/5'
        }`}
        title={t('editor.previewMode')}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      </button>
    </div>
  );

  // Calculate word count
  const wordCount = getWordCount(content);

  // Create a unified config object for NoteEditor
  const noteEditorConfig: EditorConfig = useMemo(() => ({
    fontSize: config.appearance?.fontSize || 15,
    fontFamily: config.appearance?.appFontFamily || 'system-ui',
    lineHeight: config.appearance?.lineHeight || 1.6,
    editorFontFamily: config.appearance?.editorFontFamily,
    previewFontFamily: config.appearance?.previewFontFamily,
    contentFontSize: config.appearance?.contentFontSize,
    syntaxHighlighting: config.appearance?.syntaxHighlighting,
    vimMode: config.appearance?.vimMode,
    typewriterMode: config.appearance?.typewriterMode,
    wordWrap: config.appearance?.wordWrap,
    notePaperStyle: config.appearance?.notePaperStyle,
    backgroundPattern: config.appearance?.backgroundPattern
  }), [config.appearance]);

  return (
    <WindowWrapper className="detached-note-window">
      <CustomTitleBar 
        title={extractTitleFromContent(content)}
        noteId={noteId}
        rightContent={!isShaded ? modeToggle : undefined}
        onClose={handleCloseWindow}
        isShaded={isShaded}
        stats={{
          wordCount,
          lastSaved: saveStatus.lastSaved ? saveStatus.getRelativeTime || undefined : undefined
        }}
      />

      {/* Content area - hide when shaded */}
      {!isShaded && (
        <NoteEditor
          content={content}
          onContentChange={updateNoteContent}
          isPreviewMode={isPreviewMode}
          onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
          config={noteEditorConfig}
          vimStatus={vimStatus}
          onVimStatusChange={setVimStatus}
          placeholder={t('editor.placeholder')}
          autoFocus={true}
          className="flex-1 flex flex-col overflow-hidden"
          editorClassName="p-6 pt-5"
          renderFooter={() => (
            <div className="bg-card/40 border-t border-border/20 px-4 py-2 flex items-center justify-between backdrop-blur-md">
              <div className="flex items-center gap-3">
                {/* Vim mode indicator */}
                {config?.appearance?.vimMode && !isPreviewMode && (
                  <VimModeIndicator vimStatus={vimStatus} />
                )}
                
                {/* Save status */}
                <div className="flex items-center gap-1.5">
                  {saveStatus.isSaving ? (
                    <>
                      <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.saving')}</span>
                      <div className="w-1 h-1 bg-yellow-500/60 rounded-full animate-pulse"></div>
                    </>
                  ) : saveStatus.saveError ? (
                    <>
                      <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.errorSaving')}</span>
                      <div className="w-1 h-1 bg-red-500/60 rounded-full"></div>
                    </>
                  ) : modifiedState.isModified ? (
                    <>
                      <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.modified')}</span>
                      <div className="w-1 h-1 bg-orange-500/60 rounded-full"></div>
                    </>
                  ) : saveStatus.lastSaved ? (
                    <>
                      <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.saved')} {saveStatus.getRelativeTime}</span>
                      <div className="w-1 h-1 bg-green-500/60 rounded-full"></div>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.ready')}</span>
                      <div className="w-1 h-1 bg-gray-500/60 rounded-full"></div>
                    </>
                  )}
                </div>
              </div>
              
              {content && (
                <span className="text-xs text-muted-foreground/40 font-light" style={{ fontSize: '10px' }}>
                  {getWordCount(content)} {t('editor.words')}
                </span>
              )}
            </div>
          )}
        />
      )}
    </WindowWrapper>
  );
}