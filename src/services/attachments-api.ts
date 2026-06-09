import { invoke } from '@tauri-apps/api/core';
import { Attachment, UploadAttachmentRequest } from '../types/attachment';

const LOG_PREFIX = '[FLOATNOTE]';

/**
 * 统一的 invoke 包装函数，添加错误处理和日志
 */
async function invokeWithLogging<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`${LOG_PREFIX} Tauri command '${command}' failed:`, error);
    throw error;
  }
}

export const attachmentsApi = {
  /**
   * Upload an attachment for a note
   */
  async uploadAttachment(
    request: UploadAttachmentRequest
  ): Promise<Attachment> {
    return invokeWithLogging<Attachment>('upload_attachment', { request });
  },

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string, noteId: string): Promise<void> {
    return invokeWithLogging<void>('delete_attachment', {
      attachmentId,
      noteId,
    });
  },

  /**
   * Get all attachments for a note
   */
  async getNoteAttachments(noteId: string): Promise<Attachment[]> {
    return invokeWithLogging<Attachment[]>('get_note_attachments', { noteId });
  },

  /**
   * Get attachment file path
   */
  async getAttachmentPath(
    attachmentId: string,
    noteId: string
  ): Promise<string> {
    return invokeWithLogging<string>('get_attachment_path', {
      attachmentId,
      noteId,
    });
  },

  /**
   * Paste image from clipboard
   */
  async pasteImageFromClipboard(noteId: string): Promise<Attachment> {
    return invokeWithLogging<Attachment>('paste_image_from_clipboard', {
      noteId,
    });
  },
};
