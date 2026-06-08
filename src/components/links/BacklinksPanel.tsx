import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Backlink } from '../../types/link';
import { linksApi } from '../../services/links-api';

interface BacklinksPanelProps {
  noteId: string | null;
  onNavigateToNote: (noteId: string) => void;
}

export function BacklinksPanel({ noteId, onNavigateToNote }: BacklinksPanelProps) {
  const { t } = useTranslation();
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!noteId) {
      setBacklinks([]);
      return;
    }

    const loadBacklinks = async () => {
      setIsLoading(true);
      try {
        const links = await linksApi.getBacklinks(noteId);
        setBacklinks(links);
      } catch (error) {
        console.error('[FLOATNOTE] Failed to load backlinks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBacklinks();
  }, [noteId]);

  if (!noteId) {
    return null;
  }

  return (
    <div className="border-t border-border/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/60">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        </svg>
        <span className="text-xs font-medium text-foreground/70">
          {t('links.backlinks')} ({backlinks.length})
        </span>
      </div>

      {/* Backlinks list */}
      {isLoading ? (
        <div className="px-4 pb-3 text-[10px] text-muted-foreground/40">
          {t('common.loading')}
        </div>
      ) : backlinks.length > 0 ? (
        <div className="px-4 pb-3 space-y-1">
          {backlinks.map((backlink) => (
            <button
              key={backlink.note_id}
              onClick={() => onNavigateToNote(backlink.note_id)}
              className="w-full text-left p-2 rounded hover:bg-primary/5 transition-colors"
            >
              <div className="text-xs font-medium text-primary/80 hover:text-primary truncate">
                {backlink.note_title}
              </div>
              {backlink.link_context && (
                <div className="text-[10px] text-muted-foreground/50 truncate mt-0.5">
                  {backlink.link_context}
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-4 pb-3 text-[10px] text-muted-foreground/40">
          {t('links.noBacklinks')}
        </div>
      )}
    </div>
  );
}
