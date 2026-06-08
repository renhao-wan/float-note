import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsStore } from '../../stores/tags-store';
import { TagBadge } from './TagBadge';

interface TagListProps {
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
}

export function TagList({ selectedTag, onTagSelect }: TagListProps) {
  const { t } = useTranslation();
  const { tags, isLoading, loadTags } = useTagsStore();

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-center text-muted-foreground/60 text-xs">
        {t('common.loading')}
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="px-4 py-2 text-center text-muted-foreground/60 text-xs">
        {t('tags.noTags')}
      </div>
    );
  }

  // Sort tags by note count (descending)
  const sortedTags = [...tags].sort((a, b) => b.noteCount - a.noteCount);

  return (
    <div className="space-y-1">
      {/* All notes option */}
      <button
        onClick={() => onTagSelect(null)}
        className={`w-full px-3 py-1.5 text-left text-xs transition-colors rounded-md ${
          selectedTag === null
            ? 'bg-primary/10 text-primary'
            : 'text-foreground/70 hover:bg-primary/5'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono">{t('tags.allNotes')}</span>
        </div>
      </button>

      {/* Tag list */}
      {sortedTags.map((tag) => (
        <button
          key={tag.name}
          onClick={() => onTagSelect(tag.name === selectedTag ? null : tag.name)}
          className={`w-full px-3 py-1.5 text-left text-xs transition-colors rounded-md ${
            selectedTag === tag.name
              ? 'bg-primary/10 text-primary'
              : 'text-foreground/70 hover:bg-primary/5'
          }`}
        >
          <div className="flex items-center justify-between">
            <TagBadge
              name={tag.name}
              color={tag.color}
              size="sm"
            />
            <span className="text-muted-foreground/50 text-[10px] font-mono">
              {tag.noteCount}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
