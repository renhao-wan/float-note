import { invoke } from '@tauri-apps/api/core';
import { Note, CreateNoteRequest, UpdateNoteRequest } from '../types/note';

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

export const notesApi = {
  async getNotes(): Promise<Note[]> {
    return invokeWithLogging<Note[]>('get_notes');
  },

  async getNote(id: string): Promise<Note | null> {
    return invokeWithLogging<Note | null>('get_note', { id });
  },

  async createNote(request: CreateNoteRequest): Promise<Note> {
    return invokeWithLogging<Note>('create_note', { request });
  },

  async updateNote(
    id: string,
    request: UpdateNoteRequest
  ): Promise<Note | null> {
    return invokeWithLogging<Note | null>('update_note', { id, request });
  },

  async deleteNote(id: string): Promise<boolean> {
    return invokeWithLogging<boolean>('delete_note', { id });
  },

  async reorderNotes(noteIds: string[]): Promise<Note[]> {
    return invokeWithLogging<Note[]>('reorder_notes', { request: { note_ids: noteIds } });
  },

  // File import/export operations
  async importNotesFromDirectory(directoryPath: string): Promise<Note[]> {
    return invokeWithLogging<Note[]>('import_notes_from_directory', { directoryPath });
  },

  async importSingleFile(filePath: string): Promise<Note> {
    return invokeWithLogging<Note>('import_single_file', { filePath });
  },

  async exportNoteToFile(noteId: string, filePath: string): Promise<void> {
    return invokeWithLogging<void>('export_note_to_file', { noteId, filePath });
  },

  async exportAllNotesToDirectory(directoryPath: string): Promise<string[]> {
    return invokeWithLogging<string[]>('export_all_notes_to_directory', { directoryPath });
  },

  // Notes directory management
  async setNotesDirectory(directoryPath: string): Promise<void> {
    return invokeWithLogging<void>('set_notes_directory', { directoryPath });
  },

  async reloadNotesFromDirectory(): Promise<Note[]> {
    return invokeWithLogging<Note[]>('reload_notes_from_directory');
  },

  async getCurrentNotesDirectory(): Promise<string> {
    return invokeWithLogging<string>('get_current_notes_directory');
  },

  // Directory dialog
  async openDirectoryDialog(initialDir?: string): Promise<string | null> {
    return invokeWithLogging<string | null>('open_directory_dialog', { initialDir: initialDir || null });
  },

  // File picker dialog
  async pickFileDialog(): Promise<string | null> {
    return invokeWithLogging<string | null>('pick_file_dialog');
  },

  // Open directory in Finder/Explorer
  async openDirectoryInFinder(directoryPath: string): Promise<void> {
    return invokeWithLogging<void>('open_directory_in_finder', { directoryPath });
  },
};
