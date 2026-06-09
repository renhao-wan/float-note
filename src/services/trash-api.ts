import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types/note';
import { TrashedNote, TrashStats } from '../types/trash';

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

export const trashApi = {
  /**
   * Move a note to trash
   */
  async moveToTrash(noteId: string): Promise<void> {
    return invokeWithLogging<void>('move_to_trash', { noteId });
  },

  /**
   * Restore a note from trash
   */
  async restoreFromTrash(noteId: string): Promise<Note> {
    return invokeWithLogging<Note>('restore_from_trash', { noteId });
  },

  /**
   * Permanently delete a note from trash
   */
  async permanentlyDelete(noteId: string): Promise<void> {
    return invokeWithLogging<void>('permanently_delete', { noteId });
  },

  /**
   * Empty the trash (delete all trashed notes)
   */
  async emptyTrash(): Promise<TrashStats> {
    return invokeWithLogging<TrashStats>('empty_trash');
  },

  /**
   * Get trash statistics
   */
  async getTrashStats(): Promise<TrashStats> {
    return invokeWithLogging<TrashStats>('get_trash_stats');
  },

  /**
   * List all trashed notes
   */
  async listTrashedNotes(): Promise<TrashedNote[]> {
    return invokeWithLogging<TrashedNote[]>('list_trashed_notes');
  },
};
