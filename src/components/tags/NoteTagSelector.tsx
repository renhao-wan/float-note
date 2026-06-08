import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsStore } from '../../stores/tags-store';
import { TagBadge } from './TagBadge';
import { Note } from '../../types';

interface NoteTagSelectorProps {
  note: Note;
  onTagsChange: (noteId: string, tags: string[]) => Promise<void>;
}

export function NoteTagSelector({ note, onTagsChange }: NoteTagSelectorProps) {
  const { t } = useTranslation();
  const { tags, loadTags } = useTagsStore();
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  // Filter suggestions based on input
  useEffect(() => {
    if (inputValue.trim()) {
      const filtered = tags
        .map((tag) => tag.name)
        .filter((name) =>
          name.toLowerCase().includes(inputValue.toLowerCase()) &&
          !note.tags?.includes(name)
        );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, tags, note.tags]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
        setIsEditing(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = async (tagName: string) => {
    const trimmedTag = tagName.trim();
    if (!trimmedTag) return;

    const currentTags = note.tags || [];
    if (currentTags.includes(trimmedTag)) return;

    const newTags = [...currentTags, trimmedTag];
    await onTagsChange(note.id, newTags);
    setInputValue('');
    setSuggestions([]);
  };

  const handleRemoveTag = async (tagName: string) => {
    const currentTags = note.tags || [];
    const newTags = currentTags.filter((t) => t !== tagName);
    await onTagsChange(note.id, newTags);
  };

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        await handleAddTag(suggestions[0]);
      } else if (inputValue.trim()) {
        await handleAddTag(inputValue);
      }
    } else if (e.key === 'Escape') {
      setInputValue('');
      setSuggestions([]);
      setIsEditing(false);
    } else if (e.key === 'Backspace' && !inputValue && note.tags && note.tags.length > 0) {
      await handleRemoveTag(note.tags[note.tags.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5">
        {/* Existing tags */}
        {note.tags?.map((tag) => (
          <TagBadge
            key={tag}
            name={tag}
            size="sm"
            removable
            onRemove={handleRemoveTag}
          />
        ))}

        {/* Add tag button or input */}
        {isEditing ? (
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Clear input and exit editing when focus is lost
                setInputValue('');
                setSuggestions([]);
                setIsEditing(false);
              }}
              placeholder={t('tags.addTag')}
              className="text-[10px] px-1.5 py-0.5 bg-background/60 border border-border/30 rounded-full outline-none focus:border-primary/40 w-20 font-mono"
            />

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-card border border-border/30 rounded-lg shadow-lg z-50 max-h-32 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleAddTag(suggestion);
                    }}
                    className="w-full px-2 py-1 text-xs text-left hover:bg-primary/10 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="text-[10px] px-1.5 py-0.5 text-muted-foreground/50 hover:text-muted-foreground border border-dashed border-border/30 rounded-full transition-colors"
            title={t('tags.addTag')}
          >
            + tag
          </button>
        )}
      </div>
    </div>
  );
}
