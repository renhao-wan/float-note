import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Note } from '../../types';
import { useConfigStore } from '../../stores/config-store';
import { NoteEditor, VimModeIndicator, type VimStatus, type EditorConfig } from '../editor/NoteEditor';
import { TitleEditor } from './TitleEditor';
import { NoteTagSelector } from '../tags/NoteTagSelector';
import { AttachmentPanel } from '../attachments/AttachmentPanel';
import { BacklinksPanel } from '../links/BacklinksPanel';

interface SaveStatus {
  isSaving: boolean;
  lastSaved?: Date | null;
  isModified?: boolean;
  saveError?: string | null;
}

interface EditorAreaProps {
  selectedNote: Note | null;
  selectedNoteId?: string | null;
  currentContent: string;
  isPreviewMode: boolean;
  saveStatus: SaveStatus;
  wordCount: number;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  editorConfig: {
    fontSize?: number;
    editorFontFamily?: string;
    contentFontSize?: number;
    previewFontFamily?: string;
    lineHeight?: number;
    syntaxHighlighting?: boolean;
    notePaperStyle?: 'none' | 'dotted-grid' | 'lines' | 'ruled';
  };
  onContentChange: (content: string) => void;
  onTitleChange?: (newTitle: string) => Promise<boolean>;
  onSave?: () => void;
  onPreviewToggle: () => void;
  onTagsChange?: (noteId: string, tags: string[]) => Promise<void>;
}

export function EditorArea({
  selectedNote,
  selectedNoteId: _selectedNoteId,
  currentContent,
  isPreviewMode,
  saveStatus,
  wordCount,
  textareaRef,
  editorConfig,
  onContentChange,
  onTitleChange,
  onSave,
  onPreviewToggle,
  onTagsChange
}: EditorAreaProps) {
  const { t } = useTranslation();
  const { config } = useConfigStore();
  const [vimStatus, setVimStatus] = useState<VimStatus>({ mode: 'NORMAL' });

  // Create a unified config object for NoteEditor
  const noteEditorConfig: EditorConfig = useMemo(() => ({
    fontSize: editorConfig.fontSize || 15,
    fontFamily: editorConfig.editorFontFamily || 'system-ui',
    lineHeight: editorConfig.lineHeight || 1.6,
    editorFontFamily: editorConfig.editorFontFamily,
    previewFontFamily: editorConfig.previewFontFamily,
    contentFontSize: editorConfig.contentFontSize,
    syntaxHighlighting: editorConfig.syntaxHighlighting,
    vimMode: config?.appearance?.vimMode,
    typewriterMode: config?.appearance?.typewriterMode,
    wordWrap: config?.appearance?.wordWrap,
    notePaperStyle: editorConfig.notePaperStyle
  }), [editorConfig, config?.appearance?.vimMode, config?.appearance?.typewriterMode, config?.appearance?.wordWrap]);

  // Handle title change
  const handleTitleChange = useCallback(async (newTitle: string) => {
    if (!onTitleChange) return;
    await onTitleChange(newTitle);
  }, [onTitleChange]);

  // Header component with mode toggle
  const renderHeader = () => (
    <div className="px-5 py-3 border-b border-border/15">
      <div className="flex items-center justify-between mb-2">
        <div className="flex-1 min-w-0 mr-4">
          <TitleEditor
            title={selectedNote?.title || ''}
            onTitleChange={handleTitleChange}
            placeholder="Untitled"
            className="text-lg font-medium text-foreground/85 truncate"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex items-center bg-card/30 border border-border/20 rounded-lg p-0.5 flex-shrink-0">
          <button
            onClick={() => onPreviewToggle()}
            className={`px-2.5 py-1 flex items-center gap-1.5 rounded-md transition-all duration-150 text-xs font-medium ${
              !isPreviewMode
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground/50 hover:text-foreground/70'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {t('editor.edit')}
          </button>
          <button
            onClick={() => onPreviewToggle()}
            className={`px-2.5 py-1 flex items-center gap-1.5 rounded-md transition-all duration-150 text-xs font-medium ${
              isPreviewMode
                ? 'bg-primary/15 text-primary shadow-sm'
                : 'text-muted-foreground/50 hover:text-foreground/70'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            {t('editor.preview')}
          </button>
        </div>
      </div>

      {/* Tag selector */}
      {selectedNote && onTagsChange && (
        <NoteTagSelector
          note={selectedNote}
          onTagsChange={onTagsChange}
        />
      )}
    </div>
  );

  // Footer component
  const renderFooter = () => (
    <div className="status-footer bg-card/40 border-t border-border/20 px-6 h-8 flex items-center justify-between backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* Save status */}
        <div className="flex items-center gap-1.5">
          {saveStatus.isSaving ? (
            <>
              <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.saving')}</span>
              <div className="w-1 h-1 bg-yellow-500/60 rounded-full animate-pulse"></div>
            </>
          ) : saveStatus.isModified ? (
            <>
              <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.modified')}</span>
              <div className="w-1 h-1 bg-orange-500/60 rounded-full"></div>
            </>
          ) : saveStatus.saveError ? (
            <>
              <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.errorSaving')}</span>
              <div className="w-1 h-1 bg-red-500/60 rounded-full"></div>
            </>
          ) : saveStatus.lastSaved ? (
            <>
              <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.saved')}</span>
              <div className="w-1 h-1 bg-green-500/60 rounded-full"></div>
            </>
          ) : (
            <>
              <span className="text-xs text-muted-foreground/50" style={{ fontSize: '10px' }}>{t('editor.ready')}</span>
              <div className="w-1 h-1 bg-gray-500/60 rounded-full"></div>
            </>
          )}
        </div>
        
        {/* Vim mode indicator */}
        {config?.appearance?.vimMode && !isPreviewMode && (
          <VimModeIndicator vimStatus={vimStatus} />
        )}
      </div>
      
      {/* Word count */}
      <div className="text-xs text-muted-foreground/60 font-medium">
        {wordCount} {t('editor.words')}
      </div>
    </div>
  );

  // Handle inserting attachment reference into editor
  const handleInsertReference = useCallback((reference: string) => {
    // Insert at current cursor position
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = currentContent.substring(0, start) + reference + currentContent.substring(end);
      onContentChange(newContent);

      // Set cursor position after inserted text
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + reference.length, start + reference.length);
      }, 0);
    }
  }, [currentContent, onContentChange, textareaRef]);

  // Handle navigating to a note from backlinks
  const handleNavigateToNote = useCallback((noteId: string) => {
    // This will be handled by the parent component
    // For now, we'll just log it
    console.log('[FLOATNOTE] Navigate to note:', noteId);
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-background">
      {selectedNote ? (
        <>
          <NoteEditor
            content={currentContent}
            onContentChange={onContentChange}
            onSave={onSave}
            isPreviewMode={isPreviewMode}
            onPreviewToggle={onPreviewToggle}
            config={noteEditorConfig}
            vimStatus={vimStatus}
            onVimStatusChange={setVimStatus}
            placeholder="Your thoughts, unfiltered..."
            autoFocus={true}
            textareaRef={textareaRef}
            renderHeader={renderHeader}
            renderFooter={renderFooter}
            previewClassName="absolute inset-0 bg-background z-10"
          />

          {/* Bottom panels: Attachments and Backlinks */}
          <div className="border-t border-border/20 max-h-48 overflow-y-auto">
            <AttachmentPanel
              noteId={selectedNote.id}
              onInsertReference={handleInsertReference}
            />
            <BacklinksPanel
              noteId={selectedNote.id}
              onNavigateToNote={handleNavigateToNote}
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/40">
          <p style={{ fontFamily: 'var(--font-ui)' }}>{t('editor.selectNote')}</p>
        </div>
      )}
    </div>
  );
}