import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { DetachedWindowsAPI } from '../../services/detached-windows-api';

interface CustomTitleBarProps {
  title: string;
  isMainWindow?: boolean;
  noteId?: string;
  showTrafficLights?: boolean;
  showMinimize?: boolean;
  rightContent?: React.ReactNode;
  onClose?: () => Promise<void>;
  isShaded?: boolean;
  stats?: {
    wordCount?: number;
    lastSaved?: string;
  };
}

export function CustomTitleBar({
  title,
  isMainWindow = false,
  noteId,
  showTrafficLights = true,
  showMinimize = true,
  rightContent,
  onClose,
  isShaded = false,
  stats
}: CustomTitleBarProps) {
  const { t } = useTranslation();
  // Get the current window directly - getCurrentWebviewWindow() handles Tauri context internally
  const appWindow = useMemo(() => getCurrentWebviewWindow(), []);
  const [isMaximized, setIsMaximized] = useState(false);

  // Check initial maximized state and listen for changes
  useEffect(() => {
    if (!appWindow) return;

    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check maximized state:', error);
      }
    };

    checkMaximized();

    // Listen for resize events to update maximized state
    const unlisten = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlisten.then(fn => fn());
    };
  }, [appWindow]);

  const handleClose = async () => {
    if (onClose) {
      await onClose();
    } else if (appWindow) {
      await appWindow.close();
    }
  };

  const handleMinimize = async () => {
    if (appWindow) {
      await appWindow.minimize();
    }
  };

  const handleMaximize = async () => {
    if (appWindow) {
      const isMaximized = await appWindow.isMaximized();
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    }
  };

  const handleDoubleClick = async () => {
    await handleMaximize();
  };

  const handleMiddleClick = async (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      try {
        if (isMainWindow) {
          await DetachedWindowsAPI.toggleMainWindowShade();
        } else if (noteId) {
          // Get the current window label - it might be note-* or hybrid-drag-*
          const currentWindow = getCurrentWebviewWindow();
          const windowLabel = currentWindow.label;
          await DetachedWindowsAPI.toggleWindowShade(windowLabel);
        }
      } catch (error) {
        console.error('Failed to toggle shade:', error);
      }
    }
  };

  // Manual drag implementation using Tauri API
  const handleMouseDown = async (e: React.MouseEvent) => {
    // Handle middle click for shade
    if (e.button === 1) {
      e.preventDefault();
      await handleMiddleClick(e);
      return;
    }

    // Only start drag on left click
    if (e.button !== 0) return;

    // Start dragging immediately on mousedown
    if (appWindow) {
      try {
        await appWindow.startDragging();
      } catch (error) {
        console.error('Failed to start dragging:', error);
      }
    }
  };

  return (
    <div
      className="h-8 flex items-center px-4 border-b border-border/30 bg-card/40 backdrop-blur-md"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      {/* Left side content */}
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}

      {/* Center title area - draggable */}
      <div
        className="flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
      >
        {isShaded && stats ? (
          <div className="flex items-center gap-4 text-xs text-foreground/70 font-medium select-none">
            <span title={t('titlebar.middleClickUnshade')}>{title}</span>
            <div className="flex items-center gap-3 text-[10px] text-foreground/50">
              {stats.wordCount !== undefined && (
                <span>{t('titlebar.wordCountWithCount', { count: stats.wordCount })}</span>
              )}
              {stats.lastSaved && (
                <span>• {t('titlebar.savedWithTime', { time: stats.lastSaved })}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-foreground/70 font-medium select-none tracking-wide" style={{ fontSize: '13px', fontFamily: 'var(--font-ui)' }} title={t('titlebar.middleClickShade')}>
            {title}
          </span>
        )}
      </div>

      {/* Window controls */}
      {showTrafficLights && (
        <div className="flex items-center gap-0.5 ml-2">
          {showMinimize && (
            <button
              onClick={handleMinimize}
              className="w-6 h-6 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5 transition-all duration-150"
              title={t('titlebar.minimize')}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="1.5" y1="5" x2="8.5" y2="5" />
              </svg>
            </button>
          )}

          <button
            onClick={handleMaximize}
            className="w-6 h-6 flex items-center justify-center rounded-md text-foreground/40 hover:text-foreground/80 hover:bg-foreground/5 transition-all duration-150"
            title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
          >
            {isMaximized ? (
              // Restore icon (two overlapping rectangles)
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2.5" y="0.5" width="6" height="6" rx="1" />
                <path d="M0.5 3.5 L0.5 8.5 L5.5 8.5 L5.5 7.5" />
              </svg>
            ) : (
              // Maximize icon (single rectangle)
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1.5" y="1.5" width="7" height="7" rx="1" />
              </svg>
            )}
          </button>

          <button
            onClick={handleClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
            title={t('titlebar.close')}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}