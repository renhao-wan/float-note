import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Note } from '../../types';

interface SortableNoteItemProps {
  note: Note;
  index: number;
  isSelected: boolean;
  isOpenInWindow: boolean;
  showNotePreviews?: boolean;
  onSelect: (noteId: string) => void;
  onDelete: (noteId: string) => void;
  onContextMenu: (x: number, y: number, noteId: string) => void;
  onStartDrag: (e: React.MouseEvent, noteId: string) => void;
  getFirstLine: (content: string) => string;
}

export function SortableNoteItem({
  note,
  index,
  isSelected,
  isOpenInWindow,
  showNotePreviews,
  onSelect,
  onDelete,
  onContextMenu,
  onStartDrag,
  getFirstLine,
}: SortableNoteItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-note-id={note.id}
      className={`group relative transition-all duration-200 ${
        isDragging ? 'shadow-lg ring-2 ring-primary/20' : ''
      } ${index > 0 ? 'border-t border-border/8' : ''}`}
    >
      <div className="flex">
        {/* Left: Drag handle for reordering */}
        <div
          {...listeners}
          className={`w-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none transition-colors ${
            isSelected
              ? 'bg-primary/8'
              : 'hover:bg-primary/4'
          }`}
          title="Drag to reorder"
        >
          <svg width="8" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground opacity-30 group-hover:opacity-60 transition-opacity">
            <circle cx="9" cy="5" r="1"/>
            <circle cx="9" cy="12" r="1"/>
            <circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/>
            <circle cx="15" cy="12" r="1"/>
            <circle cx="15" cy="19" r="1"/>
          </svg>
        </div>

        {/* Right: Note content area - click to select, drag to detach */}
        <div
          className={`flex-1 cursor-pointer transition-all duration-200 ${
            isSelected
              ? 'bg-primary/8 border-l-2 border-l-primary pl-3 pr-4 py-3 shadow-glow'
              : 'hover:bg-primary/4 border-l-2 border-l-transparent pl-3 pr-4 py-3'
          }`}
          onClick={() => onSelect(note.id)}
          onContextMenu={(e) => onContextMenu(e.clientX, e.clientY, note.id)}
          onMouseDown={(e) => {
            // Drag-to-detach on note content area (left mouse button only)
            if (e.button === 0) {
              onStartDrag(e, note.id);
            }
          }}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <h3 className={`text-sm font-medium leading-tight transition-colors flex-1 ${
                  isSelected
                    ? 'text-primary'
                    : 'text-foreground/80 group-hover:text-foreground'
                }`}>
                  {note.title || 'Untitled'}
                </h3>
                <div className="flex items-center gap-1">
                  {isOpenInWindow && (
                    <div className="w-1 h-1 rounded-full bg-primary/40 mt-1" title="Open in window" />
                  )}
                </div>
              </div>

              {showNotePreviews && note.content && (
                <p className="text-xs text-muted-foreground/50 mt-1.5 line-clamp-1 leading-relaxed">
                  {getFirstLine(note.content)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note.id);
                }}
                className="text-muted-foreground/40 hover:text-red-400 p-1 rounded transition-colors"
                title="Delete note"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
