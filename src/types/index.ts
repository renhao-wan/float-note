export type { AppConfig } from './config';
export type { Note, CreateNoteRequest, UpdateNoteRequest } from './note';
export type { Theme } from './theme';
export { defaultConfig } from './config';
export { themes, applyTheme, getThemeById } from './theme';
export { WINDOW_LABEL_PREFIX, getWindowLabel } from './window-constants';