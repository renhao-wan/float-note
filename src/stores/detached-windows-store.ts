import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import {
  DetachedWindow,
  DetachedWindowsAPI,
} from '../services/detached-windows-api';

/** 窗口位置信息 */
interface WindowPosition {
  position: [number, number];
  size: [number, number];
}

interface DetachedWindowsState {
  windows: DetachedWindow[];
  windowPositions: Record<string, WindowPosition>;
  loading: boolean;
  error: string | null;

  // Actions
  loadWindows: () => Promise<void>;
  createWindow: (
    noteId: string,
    x?: number,
    y?: number,
    width?: number,
    height?: number
  ) => Promise<DetachedWindow | null>;
  closeWindow: (noteId: string) => Promise<boolean>;
  forceCloseWindow: (noteId: string) => Promise<void>;
  refreshWindows: () => Promise<void>;
  updateWindowPosition: (
    windowLabel: string,
    x: number,
    y: number
  ) => Promise<void>;
  updateWindowSize: (
    windowLabel: string,
    width: number,
    height: number
  ) => Promise<void>;
  moveWindow: (noteId: string, x: number, y: number) => void;
  resizeWindow: (noteId: string, width: number, height: number) => void;
  isWindowOpen: (noteId: string) => boolean;
  getWindowByNoteId: (noteId: string) => DetachedWindow | undefined;
  getPosition: (noteId: string) => WindowPosition | undefined;
  focusWindow: (noteId: string) => Promise<boolean>;
}

export const useDetachedWindowsStore = create<DetachedWindowsState>(
  (set, get) => ({
    windows: [],
    windowPositions: {},
    loading: false,
    error: null,

    loadWindows: async () => {
      set({ loading: true, error: null });
      try {
        if (typeof window !== 'undefined' && window.__TAURI__) {
          const windows = await DetachedWindowsAPI.getDetachedWindows();

          // 同时构建 positions map
          const positions: Record<string, WindowPosition> = {};
          windows.forEach((w) => {
            if (w.note_id && w.position && w.size) {
              positions[w.note_id] = { position: w.position, size: w.size };
            }
          });

          set({ windows, windowPositions: positions, loading: false });
        } else {
          set({ windows: [], windowPositions: {}, loading: false });
        }
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to load detached windows:',
          error
        );
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
      }
    },

    createWindow: async (
      noteId: string,
      x?: number,
      y?: number,
      width?: number,
      height?: number
    ): Promise<DetachedWindow | null> => {
      const { windows, forceCloseWindow } = get();

      if (windows.some((w) => w.note_id === noteId)) {
        await forceCloseWindow(noteId);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      set({ loading: true, error: null });
      try {
        const newWindow = await DetachedWindowsAPI.createDetachedWindow({
          note_id: noteId,
          x,
          y,
          width,
          height,
        });

        await get().refreshWindows();
        set({ loading: false });

        return newWindow;
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to create detached window:',
          error
        );
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
        return null;
      }
    },

    closeWindow: async (noteId: string): Promise<boolean> => {
      const { windows } = get();

      set({ loading: true, error: null });
      try {
        const success = await DetachedWindowsAPI.closeDetachedWindow(noteId);

        if (success) {
          const restPositions = { ...get().windowPositions };
          delete restPositions[noteId];
          set({
            windows: windows.filter((w) => w.note_id !== noteId),
            windowPositions: restPositions,
            loading: false,
          });
        } else {
          set({ loading: false });
        }

        return success;
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to close detached window:',
          error
        );
        set({
          error: error instanceof Error ? error.message : String(error),
          loading: false,
        });
        return false;
      }
    },

    forceCloseWindow: async (noteId: string): Promise<void> => {
      const { windows } = get();

      try {
        await DetachedWindowsAPI.closeDetachedWindow(noteId);
      } catch {
        // API close failed, removing from state anyway
      }

      const restPositions = { ...get().windowPositions };
      delete restPositions[noteId];
      set({
        windows: windows.filter((w) => w.note_id !== noteId),
        windowPositions: restPositions,
      });
    },

    refreshWindows: async (): Promise<void> => {
      try {
        if (typeof window !== 'undefined' && window.__TAURI__) {
          const windows = await DetachedWindowsAPI.getDetachedWindows();

          const positions: Record<string, WindowPosition> = {};
          windows.forEach((w) => {
            if (w.note_id && w.position && w.size) {
              positions[w.note_id] = { position: w.position, size: w.size };
            }
          });

          set({ windows, windowPositions: positions });
        }
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to refresh windows:',
          error
        );
      }
    },

    updateWindowPosition: async (windowLabel: string, x: number, y: number) => {
      const { windows } = get();

      try {
        await DetachedWindowsAPI.updateWindowPosition(windowLabel, x, y);

        set({
          windows: windows.map((w) =>
            w.window_label === windowLabel
              ? { ...w, position: [x, y] as [number, number] }
              : w
          ),
        });
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to update window position:',
          error
        );
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    updateWindowSize: async (
      windowLabel: string,
      width: number,
      height: number
    ) => {
      const { windows } = get();

      try {
        await DetachedWindowsAPI.updateWindowSize(windowLabel, width, height);

        set({
          windows: windows.map((w) =>
            w.window_label === windowLabel
              ? { ...w, size: [width, height] as [number, number] }
              : w
          ),
        });
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to update window size:',
          error
        );
        set({ error: error instanceof Error ? error.message : String(error) });
      }
    },

    // 快速移动窗口（fire-and-forget，用于拖拽场景）
    moveWindow: (noteId: string, x: number, y: number): void => {
      const { windowPositions, windows } = get();
      const current = windowPositions[noteId];

      if (current) {
        set({
          windowPositions: {
            ...windowPositions,
            [noteId]: { ...current, position: [x, y] },
          },
        });

        // 使用实际的窗口标签（可能是 note- 或 hybrid-drag-）
        const window = windows.find((w) => w.note_id === noteId);
        if (window) {
          invoke('update_detached_window_position', {
            windowLabel: window.window_label,
            x,
            y,
          }).catch(() => {});
        }
      }
    },

    // 快速调整窗口大小（fire-and-forget，用于拖拽场景）
    resizeWindow: (noteId: string, width: number, height: number): void => {
      const { windowPositions, windows } = get();
      const current = windowPositions[noteId];

      if (current) {
        set({
          windowPositions: {
            ...windowPositions,
            [noteId]: { ...current, size: [width, height] },
          },
        });

        // 使用实际的窗口标签（可能是 note- 或 hybrid-drag-）
        const window = windows.find((w) => w.note_id === noteId);
        if (window) {
          invoke('update_detached_window_size', {
            windowLabel: window.window_label,
            width,
            height,
          }).catch(() => {});
        }
      }
    },

    isWindowOpen: (noteId: string): boolean => {
      return get().windows.some((w) => w.note_id === noteId);
    },

    getWindowByNoteId: (noteId: string): DetachedWindow | undefined => {
      return get().windows.find((w) => w.note_id === noteId);
    },

    getPosition: (noteId: string): WindowPosition | undefined => {
      return get().windowPositions[noteId];
    },

    focusWindow: async (noteId: string): Promise<boolean> => {
      try {
        return await DetachedWindowsAPI.focusDetachedWindow(noteId);
      } catch (error) {
        console.error(
          '[DETACHED-WINDOWS-STORE] Failed to focus detached window:',
          error
        );
        return false;
      }
    },
  })
);
