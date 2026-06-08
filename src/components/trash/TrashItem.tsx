import { useTranslation } from 'react-i18next';
import { TrashedNote } from '../../types/trash';
import { markdownToPlainText, truncateText } from '../../lib/utils';

interface TrashItemProps {
  trashedNote: TrashedNote;
  onRestore: (noteId: string) => void;
  onPermanentDelete: (noteId: string) => void;
}

export function TrashItem({ trashedNote, onRestore, onPermanentDelete }: TrashItemProps) {
  const { t } = useTranslation();
  const { note, deletedAt } = trashedNote;

  // Format deletion date
  const deletedDate = new Date(deletedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Get preview text
  const plainText = markdownToPlainText(note.content);
  const preview = truncateText(plainText, 80);

  return (
    <div className="group p-3 hover:bg-primary/5 rounded-lg transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className="text-sm font-medium text-foreground/80 truncate">
            {note.title || 'Untitled'}
          </h4>

          {/* Preview */}
          {preview && (
            <p className="text-xs text-muted-foreground/60 mt-1 line-clamp-2">
              {preview}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              {deletedDate}
            </span>
            <span className="text-[10px] text-muted-foreground/50 font-mono">
              {note.id.slice(-5)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRestore(note.id)}
            className="p-1.5 text-muted-foreground/60 hover:text-green-500 hover:bg-green-500/10 rounded transition-colors"
            title={t('trash.restore')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1,4 1,10 7,10"/>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
            </svg>
          </button>
          <button
            onClick={() => onPermanentDelete(note.id)}
            className="p-1.5 text-muted-foreground/60 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
            title={t('trash.permanentDelete')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
              <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
