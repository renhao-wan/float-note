import { useTranslation } from 'react-i18next';
import { getModifierSymbol } from '../../lib/platform';

export type ViewType = 'notes' | 'tags' | 'templates' | 'trash' | 'settings';

interface NavigationSidebarProps {
  currentView: ViewType;
  sidebarVisible: boolean;
  onNotesClick: () => void;
  onTagsClick: () => void;
  onTemplatesClick: () => void;
  onTrashClick: () => void;
  onSettingsClick: () => void;
}

export function NavigationSidebar({
  currentView,
  sidebarVisible,
  onNotesClick,
  onTagsClick,
  onTemplatesClick,
  onTrashClick,
  onSettingsClick,
}: NavigationSidebarProps) {
  const { t } = useTranslation();
  return (
    <div
      className="w-8 bg-card/60 flex flex-col items-center justify-between border-r border-border/40 flex-shrink-0 relative z-10 backdrop-blur-md"
      data-sidebar
    >
      <div className="flex flex-col items-center pt-4 gap-1">
        {/* Notes view icon */}
        <button
          onClick={onNotesClick}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
            currentView === 'notes'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/15'
          }`}
          title={
            sidebarVisible && currentView === 'notes'
              ? t('sidebar.hideNotes')
              : t('sidebar.notes')
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14,2 14,8 20,8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <line x1="10" y1="9" x2="8" y2="9" />
          </svg>
        </button>

        {/* Tags view icon */}
        <button
          onClick={onTagsClick}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
            currentView === 'tags'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/15'
          }`}
          title={
            sidebarVisible && currentView === 'tags'
              ? t('sidebar.hideTags')
              : t('sidebar.tags')
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </button>

        {/* Templates view icon - different from notes icon */}
        <button
          onClick={onTemplatesClick}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
            currentView === 'templates'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/15'
          }`}
          title={
            sidebarVisible && currentView === 'templates'
              ? t('sidebar.hideTemplates')
              : t('sidebar.templates')
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="13" x2="15" y2="13" />
            <line x1="9" y1="17" x2="12" y2="17" />
          </svg>
        </button>

        {/* Trash view icon */}
        <button
          onClick={onTrashClick}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200 ${
            currentView === 'trash'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/15'
          }`}
          title={
            sidebarVisible && currentView === 'trash'
              ? t('sidebar.hideTrash')
              : t('sidebar.trash')
          }
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
      <div className="flex flex-col items-center">
        {/* Settings icon */}
        <button
          onClick={onSettingsClick}
          className={`w-6 h-6 flex items-center justify-center m-0.5 mb-1 rounded-md transition-all duration-200 ${
            currentView === 'settings'
              ? 'bg-primary text-primary-foreground shadow-glow'
              : 'text-muted-foreground hover:text-primary hover:bg-primary/15'
          }`}
          title={
            sidebarVisible && currentView === 'settings'
              ? t('sidebar.hideSettings')
              : `${t('sidebar.settings')} (${getModifierSymbol()},)`
          }
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
