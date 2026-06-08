import { useState, useEffect, useRef } from 'react';
import { LinkSuggestion } from '../../types/link';
import { linksApi } from '../../services/links-api';

interface LinkSuggestionPopupProps {
  query: string;
  position: { x: number; y: number };
  onSelect: (suggestion: LinkSuggestion) => void;
  onClose: () => void;
}

export function LinkSuggestionPopup({
  query,
  position,
  onSelect,
  onClose,
}: LinkSuggestionPopupProps) {
  const [suggestions, setSuggestions] = useState<LinkSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for suggestions when query changes
  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    const search = async () => {
      setIsLoading(true);
      try {
        const results = await linksApi.searchNotesForLink(query);
        setSuggestions(results);
        setSelectedIndex(0);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to search notes:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(search, 150); // Debounce
    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (suggestions.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-card border border-border/30 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{
        left: position.x,
        top: position.y,
        minWidth: 200,
      }}
    >
      {isLoading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground/60">
          搜索中...
        </div>
      ) : (
        suggestions.map((suggestion, index) => (
          <button
            key={suggestion.note_id}
            onClick={() => onSelect(suggestion)}
            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
              index === selectedIndex
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-primary/5 text-foreground/70'
            }`}
          >
            <div className="font-medium truncate">{suggestion.title}</div>
          </button>
        ))
      )}
    </div>
  );
}
