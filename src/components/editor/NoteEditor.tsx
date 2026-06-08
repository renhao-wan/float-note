import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CodeMirrorEditor } from './CodeMirrorEditor';
import { MarkdownRenderer } from '../common/MarkdownRenderer';
import { attachmentsApi } from '../../services/attachments-api';

// Convert File to Uint8Array
async function fileToUint8Array(file: File): Promise<Uint8Array> {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

// Shared utility function for paper styles
export const getPaperStyleClass = (style?: string) => {
  switch (style) {
    case 'dotted-grid':
      return 'note-paper-dotted-grid';
    case 'lines':
      return 'note-paper-lines';
    case 'ruled':
      return 'note-paper-ruled';
    default:
      return '';
  }
};

export interface EditorConfig {
  fontSize: number;
  fontFamily?: string;
  lineHeight: number;
  editorFontFamily?: string;
  previewFontFamily?: string;
  contentFontSize?: number;
  syntaxHighlighting?: boolean;
  vimMode?: boolean;
  typewriterMode?: boolean;
  backgroundPattern?: string;
  notePaperStyle?: string;
  wordWrap?: boolean;
}

export interface VimStatus {
  mode: string;
  subMode?: string;
}

export interface NoteEditorProps {
  // Content
  content: string;
  onContentChange: (content: string) => void;
  onSave?: () => void;

  // Preview mode
  isPreviewMode: boolean;
  onPreviewToggle?: () => void;

  // Configuration
  config: EditorConfig;

  // Vim mode
  vimStatus?: VimStatus;
  onVimStatusChange?: (status: VimStatus) => void;

  // Optional props
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  noteId?: string;

  // Render props for custom UI elements
  renderHeader?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;

  // Style options
  editorClassName?: string;
  previewClassName?: string;
}

export function NoteEditor({
  content,
  onContentChange,
  onSave,
  isPreviewMode,
  onPreviewToggle,
  config,
  onVimStatusChange,
  placeholder,
  autoFocus = false,
  className = "",
  textareaRef,
  noteId: _noteId,
  renderHeader,
  renderFooter,
  editorClassName = "",
  previewClassName = ""
}: NoteEditorProps) {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('editor.placeholder');

  // Sync hidden textarea value with CodeMirror content
  useEffect(() => {
    if (textareaRef?.current && content !== undefined) {
      textareaRef.current.value = content;
    }
  }, [content, textareaRef]);

  // Handle image paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    if (!_noteId) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();

        const file = item.getAsFile();
        if (!file) continue;

        try {
          // Save to temp file using Tauri fs API
          const { writeFile, BaseDirectory } = await import('@tauri-apps/plugin-fs');
          const imageBytes = await fileToUint8Array(file);
          const ext = file.name.split('.').pop() || 'png';
          const timestamp = Date.now();
          const tempFilename = `clipboard-${timestamp}.${ext}`;

          // Write to temp directory
          await writeFile(tempFilename, imageBytes, { baseDir: BaseDirectory.Temp });

          // Upload attachment using the temp file
          const attachment = await attachmentsApi.uploadAttachment({
            note_id: _noteId,
            file_path: tempFilename,
          });

          // Create markdown image reference with relative path
          const reference = `![${attachment.original_filename}](./attachments/${_noteId}/${attachment.filename})`;

          // Get current cursor position from the hidden textarea
          const textarea = textareaRef?.current;
          if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newContent = content.substring(0, start) + reference + content.substring(end);
            onContentChange(newContent);
          } else {
            // Fallback: append to content
            onContentChange(content + '\n' + reference);
          }
        } catch (error) {
          console.error('[FLOATNOTE] Failed to paste image:', error);
        }

        break;
      }
    }
  }, [_noteId, content, onContentChange, textareaRef]);

  // Shared paper style logic
  const paperStyleClass = getPaperStyleClass(config.notePaperStyle);

  return (
    <div className={`flex flex-col h-full ${className}`} onPaste={handlePaste}>
      {/* Optional custom header */}
      {renderHeader && renderHeader()}

      {/* Editor/Preview area */}
      <div className={`flex-1 relative overflow-hidden ${
        config.backgroundPattern && config.backgroundPattern !== 'none'
          ? `bg-pattern-${config.backgroundPattern}`
          : ''
      } ${paperStyleClass} ${editorClassName}`}>
        {!isPreviewMode ? (
          <>
            <CodeMirrorEditor
              value={content}
              onChange={onContentChange}
              onSave={onSave}
              placeholder={resolvedPlaceholder}
              vimMode={config.vimMode || false}
              fontSize={config.fontSize}
              fontFamily={config.editorFontFamily || config.fontFamily || 'system-ui'}
              lineHeight={config.lineHeight}
              typewriterMode={config.typewriterMode || false}
              wordWrap={config.wordWrap !== false}
              autoFocus={autoFocus}
              className={paperStyleClass}
              onVimStatusChange={onVimStatusChange}
            />
            {/* Hidden textarea for maintaining ref compatibility */}
            {textareaRef && (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                className="sr-only"
                tabIndex={-1}
              />
            )}
          </>
        ) : (
          <MarkdownRenderer
            content={content}
            syntaxHighlighting={config.syntaxHighlighting}
            className={`w-full h-full overflow-y-auto scrollbar-hide prose max-w-none content-font cursor-text text-foreground ${paperStyleClass} ${previewClassName}`}
            onDoubleClick={onPreviewToggle}
            title="Double-click to edit"
            style={{ 
              fontSize: `${config.contentFontSize || config.fontSize || 16}px`,
              fontFamily: config.previewFontFamily || 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              lineHeight: config.lineHeight || 1.6,
              padding: '1.5rem'
            }}
          />
        )}
      </div>
      
      {/* Optional custom footer */}
      {renderFooter && renderFooter()}
    </div>
  );
}

// Vim mode indicator component for reuse
export interface VimModeIndicatorProps {
  vimStatus: VimStatus;
  className?: string;
}

export function VimModeIndicator({ vimStatus, className = "" }: VimModeIndicatorProps) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md ${
      vimStatus.mode === 'INSERT' ? 'bg-green-500/10' : 
      vimStatus.mode === 'VISUAL' ? 'bg-purple-500/10' : 
      'bg-primary/10'
    } ${className}`}>
      <div className={`w-2 h-2 rounded-full ${
        vimStatus.mode === 'INSERT' ? 'bg-green-500' : 
        vimStatus.mode === 'VISUAL' ? 'bg-purple-500' : 
        'bg-primary'
      }`} />
      <span className={`text-xs font-mono ${
        vimStatus.mode === 'INSERT' ? 'text-green-500/70' : 
        vimStatus.mode === 'VISUAL' ? 'text-purple-500/70' : 
        'text-primary/70'
      }`}>
        {vimStatus.mode}
      </span>
    </div>
  );
}