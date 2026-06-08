import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { ResizablePanel } from '../windows/ResizablePanel';
import { markdownToPlainText, truncateText } from '../../lib/utils';
import { Note } from '../../types';
import { getModifierSymbol } from '../../lib/platform';
import { SortableNoteItem } from './SortableNoteItem';
import { notesApi } from '../../services/tauri-api';
import { useTagsStore } from '../../stores/tags-store';

interface NotesPanelProps {
  sidebarVisible: boolean;
  notes: Note[];
  selectedNoteId: string | null;
  loading: boolean;
  showNotePreviews?: boolean;
  showTagFilter?: boolean;
  selectedTag?: string | null;
  onTagSelect?: (tagName: string | null) => void;
  onCreateNewNote: () => void;
  onSelectNote: (noteId: string) => void;
  onDeleteNote: (noteId: string) => void;
  onShowContextMenu: (x: number, y: number, noteId: string) => void;
  onStartDrag: (e: React.MouseEvent, noteId: string) => void;
  isWindowOpen: (noteId: string) => boolean;
  onNotesReordered?: (notes: Note[]) => void;
}

export function NotesPanel({
  sidebarVisible,
  notes,
  selectedNoteId,
  loading,
  showNotePreviews,
  showTagFilter = false,
  selectedTag = null,
  onTagSelect,
  onCreateNewNote,
  onSelectNote,
  onDeleteNote,
  onShowContextMenu,
  onStartDrag,
  isWindowOpen,
  onNotesReordered,
}: NotesPanelProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isReordering, setIsReordering] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const { tags, loadTags } = useTagsStore();

  // Load tags if tag filter is enabled
  useEffect(() => {
    if (showTagFilter) {
      loadTags();
    }
  }, [showTagFilter, loadTags]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Require 5px movement before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Debounce search input
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => setDebouncedQuery(value), 200);
  };

  // Track open windows using ref to avoid dependency on notes array
  const openWindowIdsRef = useRef<Set<string>>(new Set());

  // Compute open window IDs (pure computation, no side effects)
  const openWindowIds = useMemo(() => {
    const openIds = new Set<string>();
    notes.forEach(note => {
      if (isWindowOpen(note.id)) {
        openIds.add(note.id);
      }
    });
    return openIds;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, isWindowOpen]);

  // Sync to ref in useEffect (side effect)
  useEffect(() => {
    openWindowIdsRef.current = openWindowIds;
  }, [openWindowIds]);

  // Filter notes based on debounced search query
  const filteredNotes = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return notes;
    }

    const query = debouncedQuery.toLowerCase();
    return notes.filter(note =>
      note.title.toLowerCase().includes(query) ||
      markdownToPlainText(note.content).toLowerCase().includes(query)
    );
  }, [notes, debouncedQuery]);

  // Helper function to get just the first line of text
  const getFirstLine = (text: string): string => {
    const plainText = markdownToPlainText(text);
    const firstLine = plainText.split('\n')[0].trim();
    return truncateText(firstLine, 60); // Shorter for single line
  };

  // Handle drag end event
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    console.log('[FLOATNOTE] DragEnd event:', { activeId: active.id, overId: over?.id });

    if (!over || active.id === over.id) {
      console.log('[FLOATNOTE] Drag cancelled - same position or no target');
      return;
    }

    // Find positions in the full notes array
    const activeNoteId = active.id as string;
    const overNoteId = over.id as string;

    const activeFullIndex = notes.findIndex((note) => note.id === activeNoteId);
    const overFullIndex = notes.findIndex((note) => note.id === overNoteId);

    console.log('[FLOATNOTE] Drag indices:', { activeFullIndex, overFullIndex });

    if (activeFullIndex === -1 || overFullIndex === -1) {
      console.log('[FLOATNOTE] Drag cancelled - note not found');
      return;
    }

    // Create new order using the full notes array
    const newOrder = arrayMove(notes, activeFullIndex, overFullIndex);
    const noteIds = newOrder.map(note => note.id);

    console.log('[FLOATNOTE] New order:', noteIds);

    // Call API to persist the new order
    setIsReordering(true);
    try {
      console.log('[FLOATNOTE] Calling reorderNotes API...');
      const reorderedNotes = await notesApi.reorderNotes(noteIds);
      console.log('[FLOATNOTE] API returned:', reorderedNotes.length, 'notes');
      if (onNotesReordered) {
        console.log('[FLOATNOTE] Calling onNotesReordered callback');
        onNotesReordered(reorderedNotes);
      }
    } catch (error) {
      console.error('[FLOATNOTE] Failed to reorder notes:', error);
    } finally {
      setIsReordering(false);
    }
  }, [notes, onNotesReordered]);

  if (!sidebarVisible) {
    return (
      <div className="w-0 h-full overflow-hidden" data-notes-sidebar />
    );
  }

  return (
    <ResizablePanel
      defaultWidth={320}
      minWidth={240}
      maxWidth={480}
      className="h-full"
    >
      <div className="h-full bg-card/80 border-r border-border/30 flex flex-col" data-notes-sidebar>
          {/* Header - Standardized 76px height */}
          <div className="h-[76px] flex flex-col justify-center px-4 border-b border-border/20 pt-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 pt-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/80">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <line x1="10" y1="9" x2="8" y2="9"/>
                </svg>
                <h2 className="text-sm font-medium text-foreground/90">{t('sidebar.notes')}</h2>
              </div>
              <button
                onClick={onCreateNewNote}
                className="text-muted-foreground hover:text-primary p-1 rounded-md transition-all duration-200 hover:bg-primary/10"
                title={`${t('notes.create')} (${getModifierSymbol()}N)`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/60">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                type="text"
                placeholder={t('commandPalette.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-background/60 border border-border/30 rounded-lg text-xs placeholder-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-background/80 transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-colors"
                  title={t('common.clear')}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Tag filter */}
            {showTagFilter && tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                <button
                  onClick={() => onTagSelect?.(null)}
                  className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                    selectedTag === null
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t('tags.allNotes')}
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => onTagSelect?.(tag.name === selectedTag ? null : tag.name)}
                    className={`text-[10px] px-2 py-0.5 rounded-full transition-colors ${
                      selectedTag === tag.name
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background/60 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden mt-3">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground/60 text-sm">
                {t('common.loading')}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground/60 text-sm">
                <div className="space-y-1">
                  {searchQuery.trim() ? (
                    <>
                      <div>{t('commandPalette.noResults')}</div>
                      <div className="text-xs text-muted-foreground/40">{t('notes.searchHint')}</div>
                    </>
                  ) : (
                    <>
                      <div>{t('notes.noNotes')}</div>
                      <div className="text-xs text-muted-foreground/40">{t('notes.noNotesDescription')}</div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredNotes.map(note => note.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col">
                    {filteredNotes.map((note, index) => (
                      <SortableNoteItem
                        key={note.id}
                        note={note}
                        index={index}
                        isSelected={selectedNoteId === note.id}
                        isOpenInWindow={openWindowIds.has(note.id)}
                        showNotePreviews={showNotePreviews}
                        onSelect={onSelectNote}
                        onDelete={onDeleteNote}
                        onContextMenu={onShowContextMenu}
                        onStartDrag={onStartDrag}
                        getFirstLine={getFirstLine}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Reordering indicator */}
            {isReordering && (
              <div className="px-4 py-2 text-center text-muted-foreground/60 text-xs">
                Saving order...
              </div>
            )}
          </div>
      </div>
    </ResizablePanel>
  );
}
