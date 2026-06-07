import { useEffect } from 'react';
import { useConfigStore } from '../stores/config-store';
import { useDetachedWindowsStore } from '../stores/detached-windows-store';
import { applyTheme, getThemeById } from '../types';
import { listen } from '@tauri-apps/api/event';

interface AppInitializationProps {
  isDetachedWindow: boolean;
}

export function useAppInitialization({ isDetachedWindow }: AppInitializationProps) {
  const { config, loadConfig } = useConfigStore();
  const { loadWindows } = useDetachedWindowsStore();

  // Load config and windows on startup
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const initializeApp = async () => {
      // Load config and windows concurrently
      await Promise.all([
        loadConfig().catch(err => console.warn('[FLOATNOTE] Config load failed:', err)),
        loadWindows().catch(err => console.warn('[FLOATNOTE] Windows load failed:', err))
      ]);

      // Listen for data-loaded event from backend
      const unlisten = await listen('data-loaded', () => {
        loadConfig();
        loadWindows();
      });

      // If component already unmounted, clean up immediately
      if (cancelled) {
        unlisten();
      } else {
        cleanup = () => unlisten();
      }
    };

    initializeApp();

    return () => {
      cancelled = true;
      if (cleanup) cleanup();
    };
  }, [isDetachedWindow, loadWindows, loadConfig]);

  // Apply theme on startup and when config changes
  useEffect(() => {
    const themeId = config?.appearance?.themeId || 'midnight-ink';
    const theme = getThemeById(themeId);
    
    if (theme) {
      applyTheme(theme);
    } else {
      console.error('[FLOATNOTE] Theme not found:', themeId);
    }
  }, [config]);
}