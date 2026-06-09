import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { DetachedNoteWindow, DragGhost } from './components/windows';
import { SettingsPanel, SettingsNavigation } from './components/settings';
import {
  CustomTitleBar,
  WindowWrapper,
  NavigationSidebar,
  AppFooter,
} from './components/layout';
import { NotesPanel, EditorArea } from './components/notes';
import { ToastContainer } from './components/ui/Toast';
import { useDetachedWindowsStore, useConfigStore } from './stores';
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
  useGlobalEventListeners,
} from './hooks';
import { getThemeById } from './types';
import { getWordCount } from './lib/utils';
import { getCenterPosition } from './utils/window-positioning';
import { TrashPanel } from './components/trash';
import { TagPanel } from './components/tags';
import { TemplateSelector, TemplatePanel } from './components/templates';
import { MarkdownRenderer } from './components/common/MarkdownRenderer';
import type { ViewType } from './components/layout/NavigationSidebar';
import type { NoteTemplate } from './types/template';
import { templatesApi } from './services/templates-api';

function App() {
  const { t, i18n } = useTranslation();
  const { config } = useConfigStore();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false); // Start in edit mode
  const [currentView, setCurrentView] = useState<ViewType>('notes');
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<
    'general' | 'appearance' | 'editor'
  >('general');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [selectedTemplateForPreview, setSelectedTemplateForPreview] =
    useState<NoteTemplate | null>(null);
  const [editingTemplateContent, setEditingTemplateContent] = useState<{
    name: string;
    description: string;
    content: string;
  } | null>(null);

  // 预加载模板
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const data = await templatesApi.getAllTemplates();
        setTemplates(data);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, []);

  // 同步语言设置
  useEffect(() => {
    if (config.language && i18n.language !== config.language) {
      i18n.changeLanguage(config.language);
    }
  }, [config.language, i18n]);

  // Window detection from hook
  const { isDetachedWindow, detachedNoteId, isDragGhost, dragGhostTitle } =
    useWindowManager();

  // App initialization
  useAppInitialization({ isDetachedWindow });

  // Detached windows store
  const { createWindow, isWindowOpen } = useDetachedWindowsStore();

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

  const onSaveComplete = useCallback(
    (savedContent: string) => {
      saveStatus.saveSuccess();
      modifiedState.markSaved(savedContent);
    },
    [saveStatus, modifiedState]
  );

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
  const handleCreateFromTemplate = useCallback(
    async (template: NoteTemplate) => {
      try {
        const title =
          template.name === '日记'
            ? `${new Date().toLocaleDateString()} 日记`
            : template.name === '周报'
              ? `${new Date().toLocaleDateString()} 周报`
              : template.name;

        const newNote = await templatesApi.createNoteFromTemplate({
          template_id: template.id,
          title,
        });

        // Reload notes and select the new note
        await loadNotes();
        selectNote(newNote.id);
        setShowTemplateSelector(false);
      } catch (error) {
        console.error(
          '[FLOATNOTE] Failed to create note from template:',
          error
        );
      }
    },
    [loadNotes, selectNote]
  );

  // Show template selector when creating new note
  const handleCreateNewNote = useCallback(() => {
    setShowTemplateSelector(true);
  }, []);

  // Drag-to-detach functionality - stable callback to prevent re-renders
  const onDropCallback = useCallback(
    async (noteId: string, x: number, y: number) => {
      if (!isWindowOpen(noteId)) {
        // Force save before detaching to ensure the detached window loads latest content
        await saveNoteImmediately();
        await createWindow(noteId, x, y);
      }
    },
    [isWindowOpen, createWindow, saveNoteImmediately]
  );

  const { startDrag, isDragging } = useDragToDetach({
    onDrop: onDropCallback,
    beforeDetach: saveNoteImmediately,
  });

  // Context menu hook
  const onDetachNote = useCallback(
    async (noteId: string) => {
      await saveNoteImmediately();
      const { x, y } = getCenterPosition();
      await createWindow(noteId, x, y);
    },
    [saveNoteImmediately, createWindow]
  );

  const { showContextMenu } = useContextMenu({
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

  const handleTemplatesClick = useCallback(() => {
    if (currentView === 'templates') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('templates');
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
    return (
      <DragGhost noteTitle={dragGhostTitle} distance={100} threshold={60} />
    );
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
          ? ({
              ['--font-ui']: config.appearance.appFontFamily,
            } as React.CSSProperties)
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
            lastSaved: selectedNote?.updated_at
              ? new Date(selectedNote.updated_at).toLocaleString()
              : undefined,
          }}
        />

        <div className="flex min-h-0 overflow-hidden">
          <NavigationSidebar
            currentView={currentView}
            sidebarVisible={sidebarVisible}
            onNotesClick={handleNotesClick}
            onTagsClick={handleTagsClick}
            onTemplatesClick={handleTemplatesClick}
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
                    isModified: modifiedState.isModified,
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
                    notePaperStyle: config?.appearance?.notePaperStyle,
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
            ) : currentView === 'templates' ? (
              /* Templates view - Template panel + Preview */
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <div className="w-64 bg-card/80 border-r border-border/30 flex flex-col h-full overflow-hidden">
                  <TemplatePanel
                    templates={templates}
                    onTemplatesChange={setTemplates}
                    selectedTemplateId={selectedTemplateForPreview?.id || null}
                    onTemplateSelect={setSelectedTemplateForPreview}
                    onEditingContentChange={setEditingTemplateContent}
                  />
                </div>

                {/* Template preview area */}
                <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
                  {editingTemplateContent ? (
                    /* Editing preview - real-time */
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-6 pt-6 pb-4 border-b border-border/20">
                        <h1 className="text-2xl font-semibold text-foreground mb-2">
                          {editingTemplateContent.name ||
                            t('templates.untitled')}
                        </h1>
                        {editingTemplateContent.description && (
                          <p className="text-sm text-muted-foreground">
                            {editingTemplateContent.description}
                          </p>
                        )}
                        <span className="text-xs text-primary/60 font-mono mt-2 inline-block">
                          {t('templates.editing')}
                        </span>
                      </div>
                      <div className="p-6">
                        <MarkdownRenderer
                          content={editingTemplateContent.content || ''}
                          syntaxHighlighting={true}
                          className="prose max-w-none content-font text-foreground"
                        />
                      </div>
                    </div>
                  ) : selectedTemplateForPreview ? (
                    /* Selected template preview */
                    <div className="flex-1 overflow-y-auto">
                      <div className="px-6 pt-6 pb-4 border-b border-border/20">
                        <h1 className="text-2xl font-semibold text-foreground mb-2">
                          {selectedTemplateForPreview.name}
                        </h1>
                        {selectedTemplateForPreview.description && (
                          <p className="text-sm text-muted-foreground">
                            {selectedTemplateForPreview.description}
                          </p>
                        )}
                        <span className="text-xs text-muted-foreground/50 font-mono mt-2 inline-block">
                          {selectedTemplateForPreview.is_builtin
                            ? t('templates.builtin')
                            : t('templates.custom')}
                        </span>
                      </div>
                      <div className="p-6">
                        <MarkdownRenderer
                          content={selectedTemplateForPreview.content || ''}
                          syntaxHighlighting={true}
                          className="prose max-w-none content-font text-foreground"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Empty state */
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center text-muted-foreground/30">
                        <svg
                          width="64"
                          height="64"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="mx-auto mb-4"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <line x1="9" y1="9" x2="15" y2="9" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                          <line x1="9" y1="17" x2="12" y2="17" />
                        </svg>
                        <p className="text-sm">
                          {t('templates.selectToPreview')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
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

        <AppFooter theme={theme || null} themeId={themeId} config={config} />
      </div>

      {/* Toast notifications */}
      <ToastContainer />

      {/* Template selector modal */}
      {showTemplateSelector && (
        <TemplateSelector
          templates={templates}
          onSelect={handleCreateFromTemplate}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}
    </WindowWrapper>
  );
}

export default App;
