import { useState, useEffect, useCallback } from 'react';
import { Attachment } from '../types/attachment';
import { attachmentsApi } from '../services/attachments-api';

interface UseAttachmentsReturn {
  attachments: Attachment[];
  isLoading: boolean;
  error: string | null;
  loadAttachments: () => Promise<void>;
  uploadFile: (filePath: string) => Promise<Attachment>;
  deleteAttachment: (attachmentId: string) => Promise<void>;
  pasteFromClipboard: () => Promise<Attachment>;
  getMarkdownReference: (attachment: Attachment) => string;
}

export function useAttachments(noteId: string | null): UseAttachmentsReturn {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAttachments = useCallback(async () => {
    if (!noteId) {
      setAttachments([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await attachmentsApi.getNoteAttachments(noteId);
      setAttachments(data);
    } catch (err) {
      console.error('[FLOATNOTE] Failed to load attachments:', err);
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  // Load attachments on mount and when noteId changes
  useEffect(() => {
    loadAttachments();
  }, [loadAttachments]);

  const uploadFile = useCallback(
    async (filePath: string): Promise<Attachment> => {
      if (!noteId) {
        throw new Error('No note selected');
      }

      setIsLoading(true);
      setError(null);
      try {
        const attachment = await attachmentsApi.uploadAttachment({
          note_id: noteId,
          file_path: filePath,
        });
        setAttachments((prev) => [...prev, attachment]);
        return attachment;
      } catch (err) {
        console.error('[FLOATNOTE] Failed to upload attachment:', err);
        setError(String(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [noteId]
  );

  const deleteAttachment = useCallback(
    async (attachmentId: string): Promise<void> => {
      if (!noteId) {
        throw new Error('No note selected');
      }

      setIsLoading(true);
      setError(null);
      try {
        await attachmentsApi.deleteAttachment(attachmentId, noteId);
        setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      } catch (err) {
        console.error('[FLOATNOTE] Failed to delete attachment:', err);
        setError(String(err));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [noteId]
  );

  const pasteFromClipboard = useCallback(async (): Promise<Attachment> => {
    if (!noteId) {
      throw new Error('No note selected');
    }

    setIsLoading(true);
    setError(null);
    try {
      const attachment = await attachmentsApi.pasteImageFromClipboard(noteId);
      setAttachments((prev) => [...prev, attachment]);
      return attachment;
    } catch (err) {
      console.error('[FLOATNOTE] Failed to paste from clipboard:', err);
      setError(String(err));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [noteId]);

  const getMarkdownReference = useCallback(
    (attachment: Attachment): string => {
      // Use relative path to attachments directory
      const isImage = attachment.mime_type.startsWith('image/');
      const path = `./attachments/${noteId}/${attachment.filename}`;

      if (isImage) {
        return `![${attachment.original_filename}](${path})`;
      } else {
        return `[${attachment.original_filename}](${path})`;
      }
    },
    [noteId]
  );

  return {
    attachments,
    isLoading,
    error,
    loadAttachments,
    uploadFile,
    deleteAttachment,
    pasteFromClipboard,
    getMarkdownReference,
  };
}
