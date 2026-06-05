import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { createRoot } from 'react-dom/client';
import { DragCancelEffect } from '../components/windows';

interface UseDragToDetachOptions {
  onDrop: (noteId: string, x: number, y: number) => Promise<void>;
  dragThreshold?: number;
}

// Helper function to show drag cancel effect
const showDragCancelEffect = (x: number, y: number) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  root.render(
    <DragCancelEffect
      x={x}
      y={y}
      onComplete={() => {
        root.unmount();
        document.body.removeChild(container);
      }}
    />
  );
};

export function useDragToDetach({ onDrop: _onDrop, dragThreshold = 5 }: UseDragToDetachOptions) {
  // Only isDragging and noteId are exposed to consumers; positions stay in refs
  const [isDragging, setIsDragging] = useState(false);
  const [isOutsideSidebar, setIsOutsideSidebar] = useState(false);
  const [realWindowCreated, setRealWindowCreated] = useState(false);

  // Single ref for all drag-related mutable state (avoids frequent setState in mousemove)
  const dragRef = useRef({
    noteId: null as string | null,
    startX: 0,
    startY: 0,
    hasMovedEnough: false,
    realWindowLabel: null as string | null,
    lastMousePosition: { x: 0, y: 0 },
    wasOutsideSidebar: false,
    // State mirrors for event listeners
    isOutsideSidebar: false,
    realWindowCreated: false,
    isDragging: false,
    // Cached DOM elements (avoid repeated querySelector in mousemove)
    sidebarElement: null as Element | null,
    draggedElement: null as Element | null,
    // rAF throttle for position updates
    positionRafId: 0,
    pendingPosition: null as { x: number; y: number } | null,
  });

  // Merge all ref-sync into a single useEffect
  useEffect(() => {
    dragRef.current.isOutsideSidebar = isOutsideSidebar;
    dragRef.current.realWindowCreated = realWindowCreated;
    dragRef.current.isDragging = isDragging;
  }, [isOutsideSidebar, realWindowCreated, isDragging]);

  // Cleanup helper: reset all drag state
  const cleanupDrag = useCallback(() => {
    document.body.style.cursor = '';
    document.body.classList.remove('is-dragging');

    const ref = dragRef.current;
    if (ref.draggedElement) {
      ref.draggedElement.classList.remove('dragging');
    }

    ref.noteId = null;
    ref.hasMovedEnough = false;
    ref.wasOutsideSidebar = false;
    ref.sidebarElement = null;
    ref.draggedElement = null;

    // Cancel any pending rAF position update
    if (ref.positionRafId) {
      cancelAnimationFrame(ref.positionRafId);
      ref.positionRafId = 0;
    }
    ref.pendingPosition = null;

    setIsDragging(false);
    setIsOutsideSidebar(false);
    setRealWindowCreated(false);
  }, []);

  // Start drag operation
  const startDrag = useCallback((e: React.MouseEvent, noteId: string) => {
    // Only handle left click
    if (e.button !== 0) return;

    e.preventDefault();

    // Set grabbing cursor immediately on mousedown
    document.body.style.cursor = 'grabbing';
    document.body.classList.add('is-dragging');

    // Store drag origin in ref (no setState for positions)
    const ref = dragRef.current;
    ref.noteId = noteId;
    ref.startX = e.clientX;
    ref.startY = e.clientY;
    ref.hasMovedEnough = false;
    ref.lastMousePosition = { x: e.screenX, y: e.screenY };
    ref.wasOutsideSidebar = false;
    ref.sidebarElement = null;
    ref.draggedElement = null;

    // Reset visual state
    setIsDragging(false);
    setIsOutsideSidebar(false);
    setRealWindowCreated(false);

    // Clean up any existing hybrid drag window for this note first
    if (ref.realWindowLabel) {
      console.log('[DRAG] Cleaning up existing hybrid window before creating new one');
      invoke('close_hybrid_drag_window', {
        windowLabel: ref.realWindowLabel,
      }).catch(() => {});
    }

    ref.realWindowLabel = null;

    // Pre-create the window immediately on mousedown (hidden)
    const screenX = e.screenX - 200;
    const screenY = e.screenY - 20;

    invoke<string>('create_hybrid_drag_window', {
      noteId,
      x: screenX,
      y: screenY,
      hidden: true,
    }).then(windowLabel => {
      ref.realWindowLabel = windowLabel;
    }).catch(async (error) => {
      console.error('[DRAG] Failed to pre-create window:', error);

      if (error.toString().includes('already exists')) {
        const existingLabel = `hybrid-drag-${noteId}`;
        try {
          await invoke('close_hybrid_drag_window', { windowLabel: existingLabel });
          const windowLabel = await invoke<string>('create_hybrid_drag_window', {
            noteId,
            x: screenX,
            y: screenY,
            hidden: true,
          });
          ref.realWindowLabel = windowLabel;
        } catch (retryError) {
          console.error('[DRAG] Failed to create window even after cleanup:', retryError);
        }
      }
    });
  }, []);

  // Register event listeners once, use refs to access latest state
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const ref = dragRef.current;
      if (!ref.noteId) return;

      // Ensure cursor stays as grabbing during drag
      if (document.body.style.cursor !== 'grabbing') {
        document.body.style.cursor = 'grabbing';
      }

      const deltaX = Math.abs(e.clientX - ref.startX);
      const deltaY = Math.abs(e.clientY - ref.startY);

      // Store last mouse position in ref (no setState needed for positions)
      ref.lastMousePosition = { x: e.screenX, y: e.screenY };

      // If real window is visible, throttle position updates via rAF
      if (ref.realWindowCreated && ref.realWindowLabel) {
        ref.pendingPosition = { x: e.screenX - 200, y: e.screenY - 20 };

        if (!ref.positionRafId) {
          ref.positionRafId = requestAnimationFrame(() => {
            ref.positionRafId = 0;
            const pos = ref.pendingPosition;
            if (pos && ref.realWindowLabel) {
              invoke('update_hybrid_drag_position', {
                windowLabel: ref.realWindowLabel,
                x: pos.x,
                y: pos.y,
              }).catch(() => {});
            }
          });
        }
      }

      // Check if we've moved enough to start dragging
      if (!ref.hasMovedEnough && (deltaX > dragThreshold || deltaY > dragThreshold)) {
        ref.hasMovedEnough = true;
        setIsDragging(true);

        // Add visual feedback and cache the element
        const draggedElement = document.querySelector(`[data-note-id="${ref.noteId}"]`);
        if (draggedElement) {
          draggedElement.classList.add('dragging');
          ref.draggedElement = draggedElement;
        }

        // Show the pre-created window
        if (ref.realWindowLabel) {
          const screenX = e.screenX - 200;
          const screenY = e.screenY - 20;

          invoke('show_hybrid_drag_window', {
            windowLabel: ref.realWindowLabel,
            x: screenX,
            y: screenY,
          }).then(() => {
            setRealWindowCreated(true);
          }).catch(err => {
            console.error('[DRAG] Error showing window:', err);
          });
        }
      }

      // Check if cursor is outside sidebar (cache sidebar element)
      if (ref.hasMovedEnough) {
        if (!ref.sidebarElement) {
          ref.sidebarElement = document.querySelector('[data-notes-sidebar]');
        }
        const rect = ref.sidebarElement?.getBoundingClientRect();

        if (rect) {
          const outside =
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom;

          // Only update state when value changes (avoids redundant re-renders)
          if (outside !== ref.isOutsideSidebar) {
            setIsOutsideSidebar(outside);

            if (outside && !ref.wasOutsideSidebar) {
              console.log('[DRAG] Cursor left sidebar boundary:', {
                mouseX: e.clientX,
                mouseY: e.clientY,
                exitDirection:
                  e.clientX < rect.left ? 'left' :
                  e.clientX > rect.right ? 'right' :
                  e.clientY < rect.top ? 'top' : 'bottom'
              });
            }
          }

          ref.wasOutsideSidebar = outside;
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      const ref = dragRef.current;

      if (ref.noteId && ref.realWindowLabel) {
        if (ref.isDragging && ref.isOutsideSidebar) {
          // Actually dragged and dropped outside sidebar - finalize the window in place
          try {
            await invoke('finalize_hybrid_drag_window', {
              windowLabel: ref.realWindowLabel,
              noteId: ref.noteId,
            });

            // Import and update the window positions store directly
            const { useWindowPositionsStore } = await import('../stores/window-positions-store');
            const store = useWindowPositionsStore.getState();

            const newPositions = new Map(store.windowPositions);
            newPositions.set(ref.noteId, {
              position: [ref.lastMousePosition.x - 200, ref.lastMousePosition.y - 20],
              size: [800, 600],
            });

            useWindowPositionsStore.setState({ windowPositions: newPositions });
          } catch (error) {
            console.error('[DRAG] Failed to finalize window:', error);
          }
        } else {
          // Either didn't drag or dropped inside sidebar - close the window
          if (ref.isDragging && !ref.isOutsideSidebar) {
            showDragCancelEffect(e.clientX, e.clientY);
          }

          await invoke('close_hybrid_drag_window', {
            windowLabel: ref.realWindowLabel,
          }).catch(() => {});
        }
      }

      // Always clean up
      cleanupDrag();
      ref.realWindowLabel = null;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragRef.current.noteId) {
        if (dragRef.current.realWindowLabel) {
          invoke('close_hybrid_drag_window', {
            windowLabel: dragRef.current.realWindowLabel,
          }).catch(() => {});
          dragRef.current.realWindowLabel = null;
        }

        cleanupDrag();
      }
    };

    // Add listeners — only one mouseup on window (events bubble from document)
    document.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);

      // Cancel any pending rAF on cleanup
      if (dragRef.current.positionRafId) {
        cancelAnimationFrame(dragRef.current.positionRafId);
        dragRef.current.positionRafId = 0;
      }
    };
  }, [dragThreshold, cleanupDrag]);

  return {
    startDrag,
    isDragging,
  };
}