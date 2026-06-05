import { useTranslation } from 'react-i18next';
import { applyTheme, getAllThemes } from '../../types/theme';
import { useConfigStore } from '../../stores/config-store';

export function ThemeSelector() {
  const { t } = useTranslation();
  const { config, updateConfig } = useConfigStore();
  const savedThemeId = config.appearance?.themeId || 'arctic-frost';

  const handleThemeClick = async (themeId: string) => {
    // 立即应用主题
    const theme = getAllThemes().find(t => t.id === themeId);
    if (theme) {
      applyTheme(theme);
    }

    // 立即保存到配置
    try {
      await updateConfig({
        appearance: {
          ...config.appearance,
          themeId: themeId,
        }
      });
    } catch (error) {
      console.error('[THEME] Failed to save theme:', error);
    }
  };

  // Get themes sorted: dark themes first, then light themes
  const allThemes = getAllThemes();
  const darkThemes = allThemes.filter(theme => {
    const bg = theme.colors.background;
    return bg.startsWith('#0') || bg.startsWith('#1') || bg.startsWith('#2');
  });
  const lightThemes = allThemes.filter(theme => {
    const bg = theme.colors.background;
    return !bg.startsWith('#0') && !bg.startsWith('#1') && !bg.startsWith('#2');
  });
  const sortedThemes = [...darkThemes, ...lightThemes].reverse();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-1.5">
        {sortedThemes.map((theme) => (
          <button
            key={theme.id}
            onClick={() => handleThemeClick(theme.id)}
            className={`group relative p-1.5 rounded transition-all text-left ${
              savedThemeId === theme.id
                ? 'border-primary border-solid bg-primary/10'
                : 'border-border/50 hover:border-border bg-card/30 hover:bg-card/50 border-solid'
            }`}
          >
            {/* Theme Preview */}
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-10 h-10 rounded border border-border/50 relative overflow-hidden"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                }}
              >
                {/* Mini preview of theme */}
                <div
                  className="absolute top-0.5 left-0.5 w-2 h-0.5 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <div
                  className="absolute top-1.5 left-0.5 right-0.5 h-0.5 rounded-full opacity-50"
                  style={{ backgroundColor: theme.colors.foreground }}
                />
                <div
                  className="absolute top-2.5 left-0.5 right-1 h-0.5 rounded-full opacity-30"
                  style={{ backgroundColor: theme.colors.foreground }}
                />
                <div
                  className="absolute bottom-0.5 left-0.5 w-2 h-2 rounded"
                  style={{ backgroundColor: theme.colors.card }}
                />
              </div>

              <h4 className="text-[10px] font-medium text-foreground/80 truncate px-1">
                {t(`settings.appearance.themes.${theme.id}`, theme.name)}
              </h4>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
