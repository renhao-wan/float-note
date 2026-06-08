import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTagsStore } from '../../stores/tags-store';
import { TagList } from './TagList';
import { toast } from '../../stores/toast-store';

interface TagPanelProps {
  selectedTag: string | null;
  onTagSelect: (tagName: string | null) => void;
}

export function TagPanel({ selectedTag, onTagSelect }: TagPanelProps) {
  const { t } = useTranslation();
  const { tags, createTag } = useTagsStore();
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleCreateTag = async () => {
    const trimmedName = newTagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists
    if (tags.some((tag) => tag.name === trimmedName)) {
      toast.error(t('tags.tagExists'));
      return;
    }

    try {
      await createTag({ name: trimmedName });
      setNewTagName('');
      setIsCreating(false);
      toast.success(t('tags.tagCreated'));
    } catch (error) {
      console.error('[FLOATNOTE] Failed to create tag:', error);
      toast.error(t('tags.createFailed'));
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium text-foreground/90 uppercase tracking-wide">
          {t('sidebar.tags')}
        </h3>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="text-muted-foreground hover:text-primary p-1 rounded-md transition-all duration-200 hover:bg-primary/10"
          title={t('tags.createTag')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      {/* Create tag input */}
      {isCreating && (
        <div className="flex gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateTag();
              } else if (e.key === 'Escape') {
                setIsCreating(false);
                setNewTagName('');
              }
            }}
            placeholder={t('tags.tagName')}
            className="flex-1 px-2 py-1 text-xs bg-background/60 border border-border/30 rounded-md outline-none focus:border-primary/40"
            autoFocus
          />
          <button
            onClick={handleCreateTag}
            disabled={!newTagName.trim()}
            className="px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.create')}
          </button>
        </div>
      )}

      {/* Tag list */}
      <TagList
        selectedTag={selectedTag}
        onTagSelect={onTagSelect}
      />
    </div>
  );
}
