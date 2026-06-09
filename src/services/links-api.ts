import { invoke } from '@tauri-apps/api/core';
import { NoteLink, Backlink, LinkSuggestion } from '../types/link';

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

export const linksApi = {
  /**
   * Rebuild the link index for all notes
   */
  async rebuildLinkIndex(): Promise<void> {
    return invokeWithLogging<void>('rebuild_link_index');
  },

  /**
   * Get backlinks for a note
   */
  async getBacklinks(noteId: string): Promise<Backlink[]> {
    return invokeWithLogging<Backlink[]>('get_backlinks', { noteId });
  },

  /**
   * Get outgoing links from a note
   */
  async getOutgoingLinks(noteId: string): Promise<NoteLink[]> {
    return invokeWithLogging<NoteLink[]>('get_outgoing_links', { noteId });
  },

  /**
   * Search notes for link autocomplete
   */
  async searchNotesForLink(query: string): Promise<LinkSuggestion[]> {
    return invokeWithLogging<LinkSuggestion[]>('search_notes_for_link', {
      query,
    });
  },
};
