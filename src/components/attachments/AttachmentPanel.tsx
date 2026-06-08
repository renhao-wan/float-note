import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAttachments } from '../../hooks/use-attachments';
import { Attachment } from '../../types/attachment';
import { toast } from '../../stores/toast-store';

interface AttachmentPanelProps {
  noteId: string | null;
  onInsertReference?: (reference: string) => void;
}

export function AttachmentPanel({ noteId, onInsertReference }: AttachmentPanelProps) {
  const { t } = useTranslation();
  const {
    attachments,
    isLoading,
    uploadFile,
    deleteAttachment,
    pasteFromClipboard,
    getMarkdownReference,
  } = useAttachments(noteId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        // Get the file path from the file input
        // Note: In Tauri, we need to use the file path, not the File object
        const filePath = (file as any).path || file.name;
        await uploadFile(filePath);
        toast.success(t('attachments.uploadSuccess', { name: file.name }));
      } catch (error) {
        console.error('[FLOATNOTE] Failed to upload file:', error);
        toast.error(t('attachments.uploadFailed'));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePaste = async () => {
    try {
      const attachment = await pasteFromClipboard();
      const reference = getMarkdownReference(attachment);
      onInsertReference?.(reference);
      toast.success(t('attachments.pasteSuccess'));
    } catch (error) {
      console.error('[FLOATNOTE] Failed to paste from clipboard:', error);
      toast.error(t('attachments.pasteFailed'));
    }
  };

  const handleDelete = async (attachment: Attachment) => {
    if (!window.confirm(t('attachments.confirmDelete', { name: attachment.original_filename }))) {
      return;
    }

    try {
      await deleteAttachment(attachment.id);
      toast.success(t('attachments.deleteSuccess'));
    } catch (error) {
      console.error('[FLOATNOTE] Failed to delete attachment:', error);
      toast.error(t('attachments.deleteFailed'));
    }
  };

  const handleInsert = (attachment: Attachment) => {
    const reference = getMarkdownReference(attachment);
    onInsertReference?.(reference);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mimeType: string): boolean => {
    return mimeType.startsWith('image/');
  };

  if (!noteId) {
    return null;
  }

  return (
    <div className="border-t border-border/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/60">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          <span className="text-xs font-medium text-foreground/70">
            {t('attachments.title')} ({attachments.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="p-1 text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-50"
            title={t('attachments.upload')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17,8 12,3 7,8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <button
            onClick={handlePaste}
            disabled={isLoading}
            className="p-1 text-muted-foreground/60 hover:text-primary transition-colors disabled:opacity-50"
            title={t('attachments.paste')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="px-4 pb-3 space-y-1">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2 p-1.5 rounded hover:bg-primary/5 group"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {isImage(attachment.mime_type) ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/60">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/60">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14,2 14,8 20,8"/>
                  </svg>
                )}
              </div>

              {/* Filename */}
              <button
                onClick={() => handleInsert(attachment)}
                className="flex-1 min-w-0 text-xs text-foreground/70 hover:text-primary truncate text-left"
                title={attachment.original_filename}
              >
                {attachment.original_filename}
              </button>

              {/* Size */}
              <span className="text-[10px] text-muted-foreground/50 font-mono flex-shrink-0">
                {formatFileSize(attachment.size)}
              </span>

              {/* Delete */}
              <button
                onClick={() => handleDelete(attachment)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground/40 hover:text-red-500 transition-all flex-shrink-0"
                title={t('attachments.delete')}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {attachments.length === 0 && !isLoading && (
        <div className="px-4 pb-3 text-[10px] text-muted-foreground/40">
          {t('attachments.empty')}
        </div>
      )}
    </div>
  );
}
