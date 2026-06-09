import { invoke } from '@tauri-apps/api/core';
import {
  Note,
  Tag,
  CreateTagRequest,
  UpdateNoteTagsRequest,
} from '../types/note';

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

export const tagsApi = {
  /**
   * Get all unique tags from all notes
   */
  async getAllTags(): Promise<Tag[]> {
    return invokeWithLogging<Tag[]>('get_all_tags');
  },

  /**
   * Update tags for a specific note
   */
  async updateNoteTags(request: UpdateNoteTagsRequest): Promise<Note> {
    return invokeWithLogging<Note>('update_note_tags', {
      request: {
        noteId: request.noteId,
        tags: request.tags,
      },
    });
  },

  /**
   * Remove a tag from all notes
   */
  async deleteTag(tagName: string): Promise<void> {
    return invokeWithLogging<void>('delete_tag', { tagName });
  },

  /**
   * Get all notes that have a specific tag
   */
  async getNotesByTag(tagName: string): Promise<Note[]> {
    return invokeWithLogging<Note[]>('get_notes_by_tag', { tagName });
  },

  /**
   * Create a new tag (validates tag name)
   */
  async createTag(request: CreateTagRequest): Promise<Tag> {
    return invokeWithLogging<Tag>('create_tag', { request });
  },
};
