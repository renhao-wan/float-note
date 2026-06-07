// Type definitions for Tauri window extensions
declare global {
  interface Window {
    __TAURI__?: boolean;
  }
}

/** 分离窗口 label 前缀，与后端 windows.rs 保持一致 */
export const WINDOW_LABEL_PREFIX = 'note-';

/** 根据 noteId 生成窗口 label */
export function getWindowLabel(noteId: string): string {
  return `${WINDOW_LABEL_PREFIX}${noteId}`;
}

export {};