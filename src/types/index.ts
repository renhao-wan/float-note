export type { AppConfig } from './config';
export type { Note, CreateNoteRequest, UpdateNoteRequest, Tag, CreateTagRequest, UpdateNoteTagsRequest } from './note';
export type { Theme } from './theme';
export type { TrashedNote, TrashStats } from './trash';
export { defaultConfig } from './config';
export { themes, applyTheme, getThemeById } from './theme';