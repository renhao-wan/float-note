import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsStore } from '../../stores/tags-store';
import { Note } from '../../types';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface TagPanelProps {
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
  notes: Note[];
}

export function TagPanel({
  selectedTag,
  onTagSelect,
  notes,
}: TagPanelProps) {
  const { t } = useTranslation();
  const { tags, loadTags } = useTagsStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Reset selected note when tag changes
  useEffect(() => {
    setSelectedNoteId(null);
  }, [selectedTag]);

  // Filter notes by selected tag
  const filteredNotes = useMemo(() => {
    if (!selectedTag) return [];
    return notes.filter(note => note.tags?.includes(selectedTag));
  }, [notes, selectedTag]);

  // Get selected note for preview
  const selectedNote = useMemo(() => {
    if (!selectedNoteId) return null;
    return notes.find(n => n.id === selectedNoteId) || null;
  }, [selectedNoteId, notes]);

  // Sort tags by note count (descending)
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => b.noteCount - a.noteCount);
  }, [tags]);

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Left: Tag list */}
      <div className="w-56 bg-card/80 border-r border-border/30 flex flex-col h-full overflow-hidden">
        <div className="h-[76px] flex flex-col justify-center px-4 border-b border-border/20 pt-5">
          <div className="flex items-center gap-2 pt-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary/80">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <h2 className="text-sm font-medium text-foreground/90">{t('sidebar.tags')}</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {sortedTags.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground/60 text-xs">
              {t('tags.noTags')}
            </div>
          ) : (
            <div className="space-y-1">
              {sortedTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => onTagSelect(tag.name === selectedTag ? null : tag.name)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    selectedTag === tag.name
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-primary/5 text-foreground/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium truncate">{tag.name}</span>
                    <span className="text-[10px] text-muted-foreground/50 font-mono ml-2">
                      {tag.noteCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes under selected tag */}
        {selectedTag && filteredNotes.length > 0 && (
          <div className="border-t border-border/30 max-h-48 overflow-y-auto p-2">
            <div className="text-[10px] text-muted-foreground/50 font-mono px-3 py-1 mb-1">
              {selectedTag} ({filteredNotes.length})
            </div>
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                onClick={() => setSelectedNoteId(note.id)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  selectedNoteId === note.id
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-primary/5 text-foreground/60'
                }`}
              >
                <div className="truncate">{note.title || 'Untitled'}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Note preview */}
      <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
        {selectedNote ? (
          <div className="flex-1 overflow-y-auto">
            <MarkdownRenderer
              content={selectedNote.content || ''}
              syntaxHighlighting={true}
              className="w-full h-full overflow-y-auto scrollbar-hide prose max-w-none content-font text-foreground"
              style={{ padding: '1.5rem' }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground/30">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <p className="text-sm">
                {selectedTag ? t('tags.selectNote') : t('tags.selectTag')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
