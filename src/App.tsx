import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DetachedNoteWindow,
  DragGhost
} from './components/windows';
import {
  SettingsPanel,
  SettingsNavigation
} from './components/settings';
import {
  CustomTitleBar,
  WindowWrapper,
  NavigationSidebar,
  AppFooter
} from './components/layout';
import {
  NotesPanel,
  EditorArea
} from './components/notes';
import { ToastContainer } from './components/ui/Toast';
import {
  useDetachedWindowsStore,
  useConfigStore
} from './stores';
import {
  useAppInitialization,
  useSaveStatus,
  useModifiedState,
  useTypewriterMode,
  useDragToDetach,
  useWindowShade,
  useNoteManagement,
  useContextMenu,
  useWindowManager,
  useGlobalEventListeners
} from './hooks';
import { getThemeById } from './types';
import { getWordCount } from './lib/utils';
import { getCenterPosition } from './utils/window-positioning';
import { TrashPanel } from './components/trash';
import { TagPanel } from './components/tags';
import { TemplateSelector } from './components/templates';
import type { ViewType } from './components/layout/NavigationSidebar';
import type { NoteTemplate } from './types/template';
import { templatesApi } from './services/templates-api';


function App() {
  const { t, i18n } = useTranslation();
  const { config } = useConfigStore();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Start in edit mode
  const [currentView, setCurrentView] = useState<ViewType>('notes');
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<'general' | 'appearance' | 'editor'>('general');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // 同步语言设置
  useEffect(() => {
    if (config.language && i18n.language !== config.language) {
      i18n.changeLanguage(config.language);
    }
  }, [config.language, i18n]);

  // Window detection from hook
  const { isDetachedWindow, detachedNoteId, isDragGhost, dragGhostTitle } = useWindowManager();
  
  // App initialization
  useAppInitialization({ isDetachedWindow });

  // Detached windows store
  const {
    createWindow,
    isWindowOpen,
  } = useDetachedWindowsStore();

  // Save status tracking
  const saveStatus = useSaveStatus();
  const modifiedState = useModifiedState();

  // Typewriter mode hook
  const textareaRef = useTypewriterMode();

  // Window shade hook - tracks if window is shaded
  const isShaded = useWindowShade();

  // Stable callbacks for note management
  const onSaveStart = useCallback(() => {
    saveStatus.startSaving();
  }, [saveStatus]);

  const onSaveComplete = useCallback((savedContent: string) => {
    saveStatus.saveSuccess();
    modifiedState.markSaved(savedContent);
  }, [saveStatus, modifiedState]);

  const onSaveError = useCallback(() => {
    saveStatus.setSaveError('Failed to save note');
  }, [saveStatus]);

  // Note management hook
  const {
    notes,
    selectedNoteId,
    currentContent,
    loading,
    selectedNote,
    createNewNote,
    selectNote,
    updateNoteContent,
    saveNoteImmediately,
    deleteNote,
    renameNote,
    updateNoteTags: _updateNoteTags,
    loadNotes,
    setCurrentContent,
    setNotes,
  } = useNoteManagement({
    onSaveStart,
    onSaveComplete,
    onSaveError,
  });

  // Create note from template
  const handleCreateFromTemplate = useCallback(async (template: NoteTemplate) => {
    try {
      const title = template.name === '日记' ? `${new Date().toLocaleDateString()} 日记` :
                    template.name === '周报' ? `${new Date().toLocaleDateString()} 周报` :
                    template.name;

      const newNote = await templatesApi.createNoteFromTemplate({
        template_id: template.id,
        title,
      });

      // Reload notes and select the new note
      await loadNotes();
      selectNote(newNote.id);
      setShowTemplateSelector(false);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to create note from template:', error);
    }
  }, [loadNotes, selectNote]);

  // Create new note directly (without template selector)
  const handleCreateNewNote = useCallback(async () => {
    try {
      await createNewNote();
    } catch (error) {
      console.error('[FLOATNOTE] Failed to create new note:', error);
    }
  }, [createNewNote]);

  // Drag-to-detach functionality - stable callback to prevent re-renders
  const onDropCallback = useCallback(async (noteId: string, x: number, y: number) => {
    if (!isWindowOpen(noteId)) {
      // Force save before detaching to ensure the detached window loads latest content
      await saveNoteImmediately();
      await createWindow(noteId, x, y);
    }
  }, [isWindowOpen, createWindow, saveNoteImmediately]);

  const { startDrag, isDragging } = useDragToDetach({
    onDrop: onDropCallback,
    beforeDetach: saveNoteImmediately
  });

  // Context menu hook
  const onDetachNote = useCallback(async (noteId: string) => {
    await saveNoteImmediately();
    const { x, y } = getCenterPosition();
    await createWindow(noteId, x, y);
  }, [saveNoteImmediately, createWindow]);

  const {
    showContextMenu,
  } = useContextMenu({
    onDeleteNote: deleteNote,
    onDetachNote,
  });

  // Global event listeners
  useGlobalEventListeners({
    notes,
    onCreateNewNote: createNewNote,
  });
  
  // Debug logging
  // console.log('Config loaded:', config);
  // console.log('Focus mode:', config.appearance?.focusMode);
  // console.log('Current notes count:', notes.length);
  // console.log('Selected note ID:', selectedNoteId);




  // Animation handlers
  const handleNotesClick = useCallback(() => {
    if (currentView === 'notes') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('notes');
      setSidebarVisible(true);
    }
  }, [currentView, sidebarVisible]);

  const handleTagsClick = useCallback(() => {
    if (currentView === 'tags') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('tags');
      setSidebarVisible(true);
    }
  }, [currentView, sidebarVisible]);

  const handleTrashClick = useCallback(() => {
    if (currentView === 'trash') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('trash');
      setSidebarVisible(true);
    }
  }, [currentView, sidebarVisible]);

  const handleSettingsClick = useCallback(() => {
    if (currentView === 'settings') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('settings');
      setSidebarVisible(true);
    }
  }, [currentView, sidebarVisible]);

  // If this is a detached window, render the detached note component
  if (isDetachedWindow && detachedNoteId) {
    return <DetachedNoteWindow noteId={detachedNoteId} />;
  }

  // If this is a drag ghost window, render the drag ghost component
  if (isDragGhost && dragGhostTitle) {
    return <DragGhost noteTitle={dragGhostTitle} distance={100} threshold={60} />;
  }

  // Calculate word count for current content
  const wordCount = getWordCount(currentContent);
  
  // Remove loading screen - show UI immediately with defaults

  const themeId = config?.appearance?.themeId || 'midnight-ink';
  const theme = getThemeById(themeId);
  
  return (
    <WindowWrapper
      className={`main-window transition-all duration-300 ${
        isDragging ? 'bg-blue-500/5' : ''
      } ${config?.appearance?.focusMode ? 'focus-mode' : ''}`}
      style={
        config?.appearance?.appFontFamily
          ? ({ ['--font-ui']: config.appearance.appFontFamily } as any)
          : undefined
      }
    >
      <div className="h-full grid grid-rows-[auto_1fr_auto]">
        <CustomTitleBar
          title={t('titlebar.title')}
          isMainWindow={true}
          isShaded={isShaded}
          stats={{
            wordCount: selectedNote ? wordCount : undefined,
            lastSaved: selectedNote?.updated_at ? new Date(selectedNote.updated_at).toLocaleString() : undefined
          }}
        />
        
        <div className="flex min-h-0 overflow-hidden">
          <NavigationSidebar
            currentView={currentView}
            sidebarVisible={sidebarVisible}
            onNotesClick={handleNotesClick}
            onTagsClick={handleTagsClick}
            onTrashClick={handleTrashClick}
            onSettingsClick={handleSettingsClick}
          />
        {/* Main content area (notes, tags, trash, or settings) */}
        <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
          {currentView === 'notes' ? (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <NotesPanel
                sidebarVisible={sidebarVisible}
                notes={notes}
                selectedNoteId={selectedNoteId}
                loading={loading}
                showNotePreviews={config?.appearance?.showNotePreviews}
                onCreateNewNote={handleCreateNewNote}
                onSelectNote={selectNote}
                onDeleteNote={deleteNote}
                onShowContextMenu={showContextMenu}
                onStartDrag={startDrag}
                isWindowOpen={isWindowOpen}
                onNotesReordered={setNotes}
              />

              <EditorArea
                selectedNote={selectedNote || null}
                selectedNoteId={selectedNoteId}
                currentContent={currentContent}
                isPreviewMode={isPreviewMode}
                saveStatus={{
                  isSaving: saveStatus.isSaving,
                  lastSaved: saveStatus.lastSaved,
                  isModified: modifiedState.isModified
                }}
                wordCount={wordCount}
                textareaRef={textareaRef}
                editorConfig={{
                  fontSize: config?.appearance?.fontSize,
                  editorFontFamily: config?.appearance?.editorFontFamily,
                  contentFontSize: config?.appearance?.contentFontSize,
                  previewFontFamily: config?.appearance?.previewFontFamily,
                  lineHeight: config?.appearance?.lineHeight,
                  syntaxHighlighting: config?.appearance?.syntaxHighlighting,
                  notePaperStyle: config?.appearance?.notePaperStyle
                }}
                onContentChange={(content) => {
                  setCurrentContent(content);
                  updateNoteContent(content);
                  // Mark as modified if content changed
                  if (selectedNote && content !== selectedNote.content) {
                    modifiedState.markModified();
                  }
                }}
                onTitleChange={async (newTitle) => {
                  if (selectedNoteId) {
                    return await renameNote(selectedNoteId, newTitle);
                  }
                  return false;
                }}
                onSave={saveNoteImmediately}
                onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
                onTagsChange={_updateNoteTags}
              />
            </div>
          ) : currentView === 'tags' ? (
            /* Tags view - Tag list | Notes by tag | Preview */
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <TagPanel
                selectedTag={selectedTag}
                onTagSelect={setSelectedTag}
                notes={notes}
              />
            </div>
          ) : currentView === 'trash' ? (
            /* Trash view */
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <TrashPanel
                onNoteRestored={() => {
                  loadNotes();
                }}
              />
            </div>
          ) : (
            /* Settings view */
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <SettingsNavigation
                sidebarVisible={sidebarVisible}
                selectedSection={selectedSettingsSection}
                onSectionChange={setSelectedSettingsSection}
              />

              {/* Settings content area */}
              <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
                <SettingsPanel selectedSection={selectedSettingsSection} />
              </div>
            </div>
          )}
        </div>
        </div>
        
        <AppFooter 
          theme={theme || null} 
          themeId={themeId} 
          config={config} 
        />
      </div>

      {/* Toast notifications */}
      <ToastContainer />

      {/* Template selector modal */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </WindowWrapper>
  );
}

export default App;