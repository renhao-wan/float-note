import { invoke } from '@tauri-apps/api/core';
import { Note } from '../types/note';
import { NoteTemplate, CreateTemplateRequest, CreateNoteFromTemplateRequest } from '../types/template';

const LOG_PREFIX = '[FLOATNOTE]';

/**
 * 统一的 invoke 包装函数，添加错误处理和日志
 */
async function invokeWithLogging<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`${LOG_PREFIX} Tauri command '${command}' failed:`, error);
    throw error;
  }
}

export const templatesApi = {
  /**
   * Get all templates (builtin + custom)
   */
  async getAllTemplates(): Promise<NoteTemplate[]> {
    return invokeWithLogging<NoteTemplate[]>('get_all_templates');
  },

  /**
   * Get a specific template
   */
  async getTemplate(templateId: string): Promise<NoteTemplate> {
    return invokeWithLogging<NoteTemplate>('get_template', { templateId });
  },

  /**
   * Create a custom template
   */
  async createTemplate(request: CreateTemplateRequest): Promise<NoteTemplate> {
    return invokeWithLogging<NoteTemplate>('create_template', { request });
  },

  /**
   * Update a custom template
   */
  async updateTemplate(templateId: string, request: CreateTemplateRequest): Promise<NoteTemplate> {
    return invokeWithLogging<NoteTemplate>('update_template', { templateId, request });
  },

  /**
   * Delete a custom template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    return invokeWithLogging<void>('delete_template', { templateId });
  },

  /**
   * Create a note from a template
   */
  async createNoteFromTemplate(request: CreateNoteFromTemplateRequest): Promise<Note> {
    return invokeWithLogging<Note>('create_note_from_template', { request });
  },
};
