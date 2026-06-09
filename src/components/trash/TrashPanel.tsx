import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrashStore } from '../../stores/trash-store';
import { TrashItem } from './TrashItem';
import { toast } from '../../stores/toast-store';
import { TrashedNote } from '../../types/trash';
import { MarkdownRenderer } from '../common/MarkdownRenderer';

interface TrashPanelProps {
  onNoteRestored?: () => void;
}

export function TrashPanel({ onNoteRestored }: TrashPanelProps) {
  const { t } = useTranslation();
  const {
    trashedNotes,
    trashStats,
    isLoading,
    loadTrash,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
  } = useTrashStore();

  const [selectedTrashedNote, setSelectedTrashedNote] =
    useState<TrashedNote | null>(null);

  // Load trash on mount
  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (noteId: string) => {
    try {
      await restoreFromTrash(noteId);
      toast.success(t('trash.restoreSuccess'));
      if (selectedTrashedNote?.note.id === noteId) {
        setSelectedTrashedNote(null);
      }
      onNoteRestored?.();
    } catch (error) {
      console.error('[FLOATNOTE] Failed to restore note:', error);
      toast.error(t('trash.restoreFailed'));
    }
  };

  const handlePermanentDelete = async (noteId: string) => {
    if (!window.confirm(t('trash.confirmPermanentDelete'))) {
      return;
    }

    try {
      await permanentlyDelete(noteId);
      toast.success(t('trash.permanentDeleteSuccess'));
      if (selectedTrashedNote?.note.id === noteId) {
        setSelectedTrashedNote(null);
      }
    } catch (error) {
      console.error('[FLOATNOTE] Failed to permanently delete note:', error);
      toast.error(t('trash.permanentDeleteFailed'));
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm(t('trash.confirmEmptyTrash'))) {
      return;
    }

    try {
      await emptyTrash();
      toast.success(t('trash.emptyTrashSuccess'));
      setSelectedTrashedNote(null);
    } catch (error) {
      console.error('[FLOATNOTE] Failed to empty trash:', error);
      toast.error(t('trash.emptyTrashFailed'));
    }
  };

  const handleSelectNote = (noteId: string) => {
    const trashedNote = trashedNotes.find((t) => t.note.id === noteId);
    setSelectedTrashedNote(trashedNote || null);
  };

  return (
    <div className="flex-1 flex min-h-0 overflow-hidden">
      {/* Trash list */}
      <div className="w-80 bg-card/80 border-r border-border/30 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="h-[76px] flex flex-col justify-center px-4 border-b border-border/20 pt-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 pt-1">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-muted-foreground/60"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              <h2 className="text-sm font-medium text-foreground/90">
                {t('sidebar.trash')}
              </h2>
            </div>

            {trashedNotes.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                disabled={isLoading}
                className="text-xs text-muted-foreground/60 hover:text-red-500 transition-colors disabled:opacity-50"
                title={t('trash.emptyTrash')}
              >
                {t('trash.emptyTrash')}
              </button>
            )}
          </div>

          {/* Stats */}
          {trashStats && (
            <div className="text-[10px] text-muted-foreground/50 font-mono">
              {t('trash.notesCount', { count: trashStats.total_count })}
            </div>
          )}
        </div>

        {/* Trash items */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground/60 text-sm">
              {t('common.loading')}
            </div>
          ) : trashedNotes.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground/60 text-sm">
              <div className="space-y-2">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="mx-auto text-muted-foreground/30"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                  <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                <div>{t('trash.empty')}</div>
                <div className="text-xs text-muted-foreground/40">
                  {t('trash.emptyDescription')}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {trashedNotes.map((trashedNote) => (
                <TrashItem
                  key={trashedNote.note.id}
                  trashedNote={trashedNote}
                  isSelected={
                    selectedTrashedNote?.note.id === trashedNote.note.id
                  }
                  onSelect={handleSelectNote}
                  onRestore={handleRestore}
                  onPermanentDelete={handlePermanentDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preview panel */}
      <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
        {selectedTrashedNote ? (
          <div className="flex-1 overflow-y-auto p-6">
            <MarkdownRenderer
              content={selectedTrashedNote.note.content || ''}
              syntaxHighlighting={true}
              className="w-full h-full overflow-y-auto scrollbar-hide prose max-w-none content-font text-foreground"
              style={{ padding: '1.5rem' }}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground/30">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="mx-auto mb-4"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              <p className="text-sm">{t('trash.selectNote')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
