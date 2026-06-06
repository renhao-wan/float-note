import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface UsePermissionsReturn {
  // State
  showPermissionPrompt: boolean;

  // Actions
  requestPermissions: () => void;
  dismissPermissionPrompt: () => void;
  openSystemSettings: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Request permissions with a delay to let the app settle
  const requestPermissions = useCallback(() => {
    console.log('[FLOATNOTE] Requesting permissions...');

    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Show permission prompt after a short delay to let the app settle
    timerRef.current = setTimeout(() => {
      setShowPermissionPrompt(true);
      timerRef.current = null;
    }, 2000);
  }, []);

  // Dismiss the permission prompt
  const dismissPermissionPrompt = useCallback(() => {
    setShowPermissionPrompt(false);
  }, []);

  // Open system settings for accessibility permissions
  const openSystemSettings = useCallback(async () => {
    try {
      await invoke('open_system_settings');
      console.log('[FLOATNOTE] Opened system settings');
    } catch (error) {
      console.error('[FLOATNOTE] Failed to open system settings:', error);
    }
  }, []);

  return {
    // State
    showPermissionPrompt,
    
    // Actions
    requestPermissions,
    dismissPermissionPrompt,
    openSystemSettings,
  };
}