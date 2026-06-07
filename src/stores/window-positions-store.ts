import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { DetachedWindow } from '../services/detached-windows-api';
import { WINDOW_LABEL_PREFIX } from '../types/window';

interface WindowPosition {
  position: [number, number];
  size: [number, number];
}

interface WindowPositionsState {
  // Core state - just a map of noteId -> position/size
  windowPositions: Record<string, WindowPosition>;
  error: string | null;

  // Simple operations
  openWindow: (noteId: string, x?: number, y?: number, width?: number, height?: number) => Promise<boolean>;
  closeWindow: (noteId: string) => Promise<void>;
  moveWindow: (noteId: string, x: number, y: number) => void;
  resizeWindow: (noteId: string, width: number, height: number) => void;
  isOpen: (noteId: string) => boolean;
  getPosition: (noteId: string) => WindowPosition | undefined;
  focusWindow: (noteId: string) => Promise<boolean>;

  // Initialization
  loadPositions: () => Promise<void>;
}

export const useWindowPositionsStore = create<WindowPositionsState>((set, get) => ({
  windowPositions: {},
  error: null,

  loadPositions: async () => {
    try {
      set({ error: null });
      // Load existing window positions from backend on startup
      const windows = await invoke<{[key: string]: DetachedWindow}>('get_detached_windows');
      const positions: Record<string, WindowPosition> = {};

      Object.values(windows).forEach((window) => {
        if (window.note_id && window.position && window.size) {
          positions[window.note_id] = {
            position: window.position,
            size: window.size
          };
        }
      });

      set({ windowPositions: positions, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WINDOW-POSITIONS] Failed to load positions:', error);
      set({ error: message });
    }
  },

  openWindow: async (noteId: string, x = 100, y = 100, width = 800, height = 600): Promise<boolean> => {
    try {
      set({ error: null });
      // Create the actual window via backend
      await invoke('create_detached_window', {
        request: { note_id: noteId, x, y, width, height }
      });

      // Add to our position map
      const { windowPositions } = get();
      set({
        windowPositions: {
          ...windowPositions,
          [noteId]: { position: [x, y], size: [width, height] }
        },
        error: null
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WINDOW-POSITIONS] Failed to open window:', error);
      set({ error: message });
      return false;
    }
  },

  closeWindow: async (noteId: string): Promise<void> => {
    try {
      set({ error: null });
      // Close the actual window via backend
      await invoke('close_detached_window', { noteId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WINDOW-POSITIONS] Failed to close window:', error);
      set({ error: message });
    }

    // Remove from local state regardless of API result
    const { windowPositions } = get();
    const { [noteId]: _, ...rest } = windowPositions;
    set({ windowPositions: rest });
  },

  moveWindow: (noteId: string, x: number, y: number): void => {
    const { windowPositions } = get();
    const current = windowPositions[noteId];

    if (current) {
      set({
        windowPositions: {
          ...windowPositions,
          [noteId]: { ...current, position: [x, y] }
        }
      });

      // Update backend position (fire and forget)
      invoke('update_detached_window_position', {
        windowLabel: `${WINDOW_LABEL_PREFIX}${noteId}`,
        x,
        y
      }).catch(() => {}); // Ignore errors
    }
  },

  resizeWindow: (noteId: string, width: number, height: number): void => {
    const { windowPositions } = get();
    const current = windowPositions[noteId];

    if (current) {
      set({
        windowPositions: {
          ...windowPositions,
          [noteId]: { ...current, size: [width, height] }
        }
      });

      // Update backend size (fire and forget)
      invoke('update_detached_window_size', {
        windowLabel: `${WINDOW_LABEL_PREFIX}${noteId}`,
        width,
        height
      }).catch(() => {}); // Ignore errors
    }
  },

  isOpen: (noteId: string): boolean => {
    return noteId in get().windowPositions;
  },

  getPosition: (noteId: string): WindowPosition | undefined => {
    return get().windowPositions[noteId];
  },

  focusWindow: async (noteId: string): Promise<boolean> => {
    try {
      return await invoke<boolean>('focus_detached_window', { noteId });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[WINDOW-POSITIONS] Failed to focus window:', error);
      set({ error: message });
      return false;
    }
  },
}));