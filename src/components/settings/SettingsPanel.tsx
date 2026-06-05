import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../stores/config-store';
import { invoke } from '@tauri-apps/api/core';
import { ThemeSelector } from './ThemeSelector';
import { notesApi } from '../../services/tauri-api';
import { getModifierSymbol, isMac } from '../../lib/platform';
import { AppConfig } from '../../types/config';
import { CustomSelect } from '../common/CustomSelect';

interface SettingsPanelProps {
  selectedSection: 'general' | 'appearance' | 'shortcuts' | 'editor';
}

export function SettingsPanel({ selectedSection }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const { config, updateConfig, isLoading } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [shortcutStatus, setShortcutStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [shortcutMessage, setShortcutMessage] = useState<string>('');
  const [currentNotesDirectory, setCurrentNotesDirectory] = useState<string>('');
  const [directoryInputValue, setDirectoryInputValue] = useState<string>('');

  useEffect(() => {
    // Set localConfig to match the loaded config directly
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    // Load current notes directory
    const loadCurrentDirectory = async () => {
      try {
        const directory = await notesApi.getCurrentNotesDirectory();
        setCurrentNotesDirectory(directory);
        setDirectoryInputValue(directory);
      } catch (error) {
        console.error('Failed to load current notes directory:', error);
      }
    };
    loadCurrentDirectory();
  }, []);

  // 实时预览 + 立即持久化
  const handleConfigChange = async (update: Partial<AppConfig>) => {
    const newConfig = { ...localConfig, ...update };
    setLocalConfig(newConfig);
    // 立即应用并持久化
    await updateConfig(newConfig);
  };

  // 实时预览 + 立即持久化
  const handleAppearanceChange = async (appearanceUpdate: Partial<AppConfig['appearance']>) => {
    const newConfig = {
      ...localConfig,
      appearance: { ...localConfig.appearance, ...appearanceUpdate }
    };
    setLocalConfig(newConfig);
    // 立即应用并持久化
    await updateConfig(newConfig);
  };

  const handleImportFile = async () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.txt';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const text = await file.text();
            // 从文件名提取标题（去掉扩展名）
            const title = file.name.replace(/\.(md|txt)$/i, '');
            // 调用 Tauri 命令创建笔记
            await invoke('create_note', { request: { title, content: text, tags: [] } });
            // 触发笔记列表刷新事件
            window.dispatchEvent(new Event('notes-updated'));
          } catch (error) {
            console.error('Failed to import file:', error);
            alert('Failed to import file');
          }
        }
      };
      input.click();
    } catch (error) {
      console.error('Failed to import file:', error);
      alert('Failed to import file');
    }
  };

  const handleImportDirectory = async () => {
    // This will be implemented once we have proper directory picker
    alert('Directory import functionality coming soon! For now, use the Import File button for individual markdown files.');
  };

  const handleExportAll = async () => {
    try {
      // For now, let's just show a message about the feature
      alert('Export functionality coming soon! This will save all your notes as markdown files with frontmatter.');
    } catch (error) {
      console.error('Failed to export notes:', error);
      alert('Failed to export notes');
    }
  };

  const handleSetNotesDirectory = async () => {
    try {
      if (directoryInputValue.trim()) {
        await notesApi.setNotesDirectory(directoryInputValue.trim());
        setCurrentNotesDirectory(directoryInputValue.trim());
        
        // Update the config store with the new directory
        const updatedConfig = {
          ...localConfig,
          storage: {
            ...localConfig.storage,
            notesDirectory: directoryInputValue.trim(),
            useCustomDirectory: true,
          }
        };
        setLocalConfig(updatedConfig);
        await updateConfig(updatedConfig);
        
        // Automatically reload notes from the new directory
        const notes = await notesApi.reloadNotesFromDirectory();
        alert(`Notes directory updated! Successfully loaded ${notes.length} notes from the new directory.`);
      }
    } catch (error) {
      console.error('Failed to set notes directory:', error);
      alert('Failed to set notes directory: ' + String(error));
    }
  };

  const handleReloadNotes = async () => {
    try {
      const notes = await notesApi.reloadNotesFromDirectory();
      alert(`Successfully loaded ${notes.length} notes from the configured directory!`);
    } catch (error) {
      console.error('Failed to reload notes:', error);
      alert('Failed to reload notes: ' + error);
    }
  };

  const handleBrowseDirectory = async () => {
    try {
      // Use Tauri's directory dialog
      const result = await invoke<string | null>('open_directory_dialog');
      if (result) {
        setDirectoryInputValue(result);
      }
    } catch (error) {
      console.error('Failed to open directory dialog:', error);
      // Fallback to prompt
      const newDir = prompt('Enter the path to your notes directory:', directoryInputValue);
      if (newDir) {
        setDirectoryInputValue(newDir);
      }
    }
  };

  const renderGeneralSection = () => (
    <div data-section="general" className="space-y-4">
      {/* Section Header - Standardized 76px height to match notes sidebar */}
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
          </svg>
          {t('settings.general.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.general.description')}</p>
      </div>

      <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
        <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 8v4l3 3"/>
          </svg>
          {t('settings.general.about.title')}
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground/80 font-mono w-24">{t('settings.general.about.application')}</span>
            <div className="flex-1"></div>
            <span className="text-foreground font-mono">FloatNote</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground/80 font-mono w-24">{t('settings.general.about.version')}</span>
            <div className="flex-1"></div>
            <span className="text-foreground font-mono">0.1.0</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground/80 font-mono w-24">{t('settings.general.about.author')}</span>
            <div className="flex-1"></div>
            <span className="text-foreground font-mono">Renhao Wan</span>
          </div>
        </div>
      </div>

      <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
        <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          {t('settings.general.interface.title')}
        </h3>
        <div className="space-y-3 text-xs">

          {/* Language Selector */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex flex-col">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.interface.language')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.interface.languageDescription')}</span>
            </div>
            <CustomSelect
              value={localConfig.language ?? 'zh'}
              options={[
                { value: 'zh', label: '简体中文' },
                { value: 'en', label: 'English' },
              ]}
              onChange={async (newLang) => {
                // 立即切换语言
                i18n.changeLanguage(newLang);
                // 立即保存配置
                await handleConfigChange({ language: newLang as 'zh' | 'en' });
              }}
            />
          </div>

          {/* Show Note Previews Toggle */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex flex-col">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.interface.notePreviews')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.interface.notePreviewsDescription')}</span>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="note-previews"
                checked={localConfig.appearance?.showNotePreviews ?? false}
                onChange={(e) => handleAppearanceChange({ showNotePreviews: e.target.checked })}
                className="w-4 h-4 text-primary bg-background border border-border/30 rounded-xl focus:ring-primary/50 focus:ring-2 cursor-pointer"
              />
            </div>
          </div>
          
          {/* Window Opacity Slider */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col w-28">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.interface.windowOpacity')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.interface.windowOpacityDescription')}</span>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-muted-foreground/70">🫥</span>
              <div className="flex-1 relative h-5 slider-container">
                <div className="slider-track"></div>
                <div className="slider-ticks">
                  <div className="slider-tick" style={{ left: '10%' }}></div>
                  <div className="slider-tick" style={{ left: '30%' }}></div>
                  <div className="slider-tick" style={{ left: '50%' }}></div>
                  <div className="slider-tick" style={{ left: '70%' }}></div>
                  <div className="slider-tick" style={{ left: '90%' }}></div>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={localConfig.appearance?.detachedWindowOpacity}
                  onChange={(e) => handleAppearanceChange({ detachedWindowOpacity: parseFloat(e.target.value) })}
                  className="slider-input"
                />
              </div>
              <span className="text-xs text-muted-foreground/70">🫧</span>
            </div>
            <span className="text-xs text-muted-foreground/70 min-w-[3rem] text-right font-mono">
              {Math.round((localConfig.appearance?.detachedWindowOpacity ?? 1) * 100)}%
            </span>
          </div>
          
        </div>
      </div>

      {/* File Operations Section */}
      <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
        <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
          {t('settings.general.fileOperations.title')}
        </h3>
        <div className="space-y-3 text-xs">

          {/* Notes Directory */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.notesDirectory')}</span>
                <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.notesDirectoryDescription')}</span>
              </div>
              <button
                onClick={() => handleReloadNotes()}
                className="px-3 py-1.5 text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl transition-colors"
              >
                {t('settings.general.fileOperations.reloadNotes')}
              </button>
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={directoryInputValue}
                onChange={(e) => setDirectoryInputValue(e.target.value)}
                placeholder="/path/to/your/notes"
                className="flex-1 px-3 py-2 text-xs bg-background/20 border border-border/20 rounded-2xl text-foreground placeholder-muted-foreground/60 focus:outline-none focus:border-primary/40"
              />
              <button
                onClick={() => handleBrowseDirectory()}
                className="px-3 py-2 text-xs bg-background/40 hover:bg-background/60 border border-border/30 rounded-2xl transition-colors"
              >
                {t('common.browse')}
              </button>
              <button
                onClick={() => handleSetNotesDirectory()}
                className="px-3 py-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
              >
                {t('common.set')}
              </button>
            </div>
            {currentNotesDirectory && (
              <div className="text-xs text-muted-foreground/70 font-mono bg-muted/10 px-2 py-1 rounded-xl">
                {t('common.current')}: {currentNotesDirectory}
              </div>
            )}
          </div>
          
          {/* Import Notes */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.importNotes')}</span>
                <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.importNotesDescription')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleImportFile()}
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
                >
                  {t('settings.general.fileOperations.importFile')}
                </button>
                <button
                  onClick={() => handleImportDirectory()}
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
                >
                  {t('settings.general.fileOperations.importFolder')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Export Notes */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.exportNotes')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.exportNotesDescription')}</span>
            </div>
            <button
              onClick={() => handleExportAll()}
              className="px-3 py-1.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-colors"
            >
              {t('settings.general.fileOperations.exportAll')}
            </button>
          </div>
          
          {/* File Format Info */}
          <div className="bg-muted/10 rounded-2xl p-3 border border-border/10">
            <div className="text-xs text-muted-foreground/80 leading-relaxed space-y-2">
              <div>
                <strong className="text-foreground/90">{t('settings.general.fileOperations.markdownFormat')}:</strong> {t('settings.general.fileOperations.markdownFormatDescription')}
              </div>
              <div>
                <strong className="text-foreground/90">{t('settings.general.fileOperations.directoryMode')}:</strong> {t('settings.general.fileOperations.directoryModeDescription')}
              </div>
            </div>
          </div>
          
        </div>
      </div>

    </div>
  );

  const renderAppearanceSection = () => (
    <div data-section="appearance" className="space-y-4">
      {/* Section Header */}
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
          </svg>
          {t('settings.appearance.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.appearance.description')}</p>
      </div>

      <div className="space-y-3">
        {/* Theme Selector */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 flex items-center gap-2 uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
            </svg>
            {t('settings.appearance.themes.title')}
          </h3>
          <ThemeSelector />
        </div>

        {/* Typography - Compact */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 flex items-center gap-2 uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
            </svg>
            {t('settings.appearance.typography.title')}
          </h3>
          <div className="space-y-2">
            {/* Font Size */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-20 font-mono">{t('settings.appearance.typography.editorFontSize')}</label>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70" style={{ fontSize: '11px' }}>A</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={localConfig.appearance?.fontSize ?? 15}
                    onChange={(e) => handleAppearanceChange({ fontSize: parseInt(e.target.value) })}
                    className="slider-input"
                  />
                </div>
                <span className="text-muted-foreground/70" style={{ fontSize: '18px' }}>A</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2rem] text-right font-mono">
                {localConfig.appearance?.fontSize ?? 15}px
              </span>
            </div>

            {/* Line Height */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-20 font-mono">{t('settings.appearance.typography.lineHeight')}</label>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70">1.2</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={localConfig.appearance?.lineHeight ?? 1.6}
                    onChange={(e) => handleAppearanceChange({ lineHeight: parseFloat(e.target.value) })}
                    className="slider-input"
                  />
                </div>
                <span className="text-xs text-muted-foreground/70">2.0</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2rem] text-right font-mono">
                {(localConfig.appearance?.lineHeight ?? 1.6).toFixed(1)}
              </span>
            </div>
          </div>
        </div>
              
        {/* Accent Color + Window */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 uppercase tracking-wide">
            {t('settings.appearance.visual.title')}
          </h3>
          <div className="flex items-center gap-3">
            <label className="text-xs text-foreground/80 w-20 font-mono">{t('settings.appearance.visual.accentColor')}</label>
            <div className="flex gap-1.5 flex-1">
              {['#d4a053', '#5a9e96', '#d45858', '#7c9a6e', '#9e8a6e', '#8b7ec8'].map(color => (
                <button key={color}
                  onClick={() => handleAppearanceChange({ accentColor: color })}
                  className={`w-7 h-7 rounded-lg border-2 transition-all ${localConfig.appearance?.accentColor === color ? 'border-primary scale-110 shadow-glow' : 'border-transparent hover:border-primary/30 hover:scale-105'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Window */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 uppercase tracking-wide">
            {t('settings.appearance.window.title')}
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-20 font-mono">{t('settings.appearance.window.windowOpacity')}</label>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground/70">30%</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <input type="range" min="0.3" max="1.0" step="0.05" value={localConfig.appearance?.detachedWindowOpacity ?? 0.9}
                    onChange={async (e) => {
                      const v = parseFloat(e.target.value);
                      handleAppearanceChange({ detachedWindowOpacity: v });
                      try { await invoke('set_window_opacity', { opacity: v }); } catch {}
                    }}
                    className="slider-input" />
                </div>
                <span className="text-xs text-muted-foreground/70">100%</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2rem] text-right font-mono">{Math.round((localConfig.appearance?.detachedWindowOpacity ?? 0.9) * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-20 font-mono">{t('settings.appearance.window.alwaysOnTop')}</label>
              <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.appearance.window.alwaysOnTopDescription')}</span>
              <button onClick={async () => {
                const v = !localConfig.alwaysOnTop;
                setLocalConfig({ ...localConfig, alwaysOnTop: v });
                try { await invoke('set_window_always_on_top', { alwaysOnTop: v }); } catch {}
                await updateConfig({ ...localConfig, alwaysOnTop: v });
              }}
                className={`relative w-8 h-4 rounded-full transition-colors ${localConfig.alwaysOnTop ? 'bg-primary' : 'bg-background/40 border border-border/40'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${localConfig.alwaysOnTop ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );

  const renderShortcutsSection = () => (
    <div data-section="shortcuts" className="space-y-4">
      {/* Section Header - Standardized spacing */}
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <rect x="2" y="7" width="20" height="10" rx="1"/>
            <path d="M7 21c0-2.5 2-2.5 2-5M15 21c0-2.5 2-2.5 2-5M9 7v-4M15 7v-4"/>
          </svg>
          {t('settings.shortcuts.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.shortcuts.description')}</p>
      </div>

      <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
        <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
            <rect x="2" y="7" width="20" height="10" rx="1"/>
            <path d="M7 21c0-2.5 2-2.5 2-5M15 21c0-2.5 2-2.5 2-5M9 7v-4M15 7v-4"/>
          </svg>
          {t('settings.shortcuts.globalShortcuts.title')}
        </h3>
        <div className="space-y-4">
          <div className="text-xs text-muted-foreground/70 mb-4">
            {t('settings.shortcuts.globalShortcuts.description')}
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/80 font-mono w-32">{t('settings.shortcuts.globalShortcuts.createNewNote')}</span>
              <div className="flex-1 flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{isMac() ? '⌃' : 'Ctrl'}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{isMac() ? '⌥' : 'Alt'}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⇧</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">N</kbd>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/80 font-mono w-32">{t('settings.shortcuts.globalShortcuts.toggleHoverMode')}</span>
              <div className="flex-1 flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{isMac() ? '⌃' : 'Ctrl'}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{isMac() ? '⌥' : 'Alt'}</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⇧</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">H</kbd>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setShortcutStatus('registering');
                  setShortcutMessage('');
                  try {
                    const result = await invoke<string>('reregister_global_shortcuts');
                    setShortcutStatus('success');
                    setShortcutMessage(result);
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 5000);
                  } catch (error: any) {
                    setShortcutStatus('error');
                    setShortcutMessage(error.toString());
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 10000);
                  }
                }}
                disabled={shortcutStatus === 'registering'}
                className="px-3 py-1.5 text-xs bg-primary/80 text-primary-foreground hover:bg-primary/90 rounded transition-all disabled:opacity-50 font-mono"
              >
                {shortcutStatus === 'registering' ? t('settings.shortcuts.actions.registering') : t('settings.shortcuts.actions.reRegisterShortcuts')}
              </button>
              
              <button
                onClick={async () => {
                  console.log('[FLOATNOTE] [SETTINGS] Testing event emission...');
                  try {
                    const result = await invoke<string>('test_emit_new_note');
                    console.log('[FLOATNOTE] [SETTINGS] Test result:', result);
                    setShortcutMessage('Test event emitted successfully');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[FLOATNOTE] [SETTINGS] Test failed:', error);
                    setShortcutMessage('Test failed: ' + error.toString());
                    setShortcutStatus('error');
                  }
                }}
                className="px-3 py-1.5 text-xs bg-background/40 border border-border/40 hover:bg-background/60 rounded transition-all font-mono"
              >
                {t('settings.shortcuts.actions.testEvent')}
              </button>
              
              <button
                onClick={async () => {
                  console.log('[FLOATNOTE] [SETTINGS] Testing hover toggle...');
                  try {
                    const hoverState = await invoke<boolean>('toggle_all_windows_hover');
                    console.log('[FLOATNOTE] [SETTINGS] Hover state:', hoverState);
                    setShortcutMessage(`Hover mode ${hoverState ? 'enabled' : 'disabled'} for all windows`);
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[FLOATNOTE] [SETTINGS] Hover toggle failed:', error);
                    setShortcutMessage('Hover toggle failed: ' + error.toString());
                    setShortcutStatus('error');
                  }
                }}
                className="px-3 py-1.5 text-xs bg-background/40 border border-border/40 hover:bg-background/60 rounded transition-all font-mono"
              >
                {t('settings.shortcuts.actions.testHover')}
              </button>
              
              <button
                onClick={async () => {
                  console.log('[FLOATNOTE] [SETTINGS] Forcing main window visible...');
                  try {
                    await invoke('force_main_window_visible');
                    console.log('[FLOATNOTE] [SETTINGS] Main window forced visible');
                    setShortcutMessage('Main window forced visible and centered');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[FLOATNOTE] [SETTINGS] Force visible failed:', error);
                    setShortcutMessage('Force visible failed: ' + error.toString());
                    setShortcutStatus('error');
                  }
                }}
                className="px-3 py-1.5 text-xs bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 rounded transition-all font-mono text-red-400"
              >
                {t('settings.shortcuts.actions.forceVisible')}
              </button>
              
              <button
                onClick={async () => {
                  console.log('[FLOATNOTE] [SETTINGS] Checking webview state...');
                  try {
                    const state = await invoke('debug_webview_state');
                    console.log('[FLOATNOTE] [SETTINGS] Webview state:', state);
                    setShortcutMessage('Webview state logged to console');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[FLOATNOTE] [SETTINGS] Webview state check failed:', error);
                    setShortcutMessage('State check failed: ' + error.toString());
                    setShortcutStatus('error');
                  }
                }}
                className="px-3 py-1.5 text-xs bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30 rounded transition-all font-mono text-purple-400"
              >
                {t('settings.shortcuts.actions.debugWebview')}
              </button>
            </div>
            
            {shortcutMessage && (
              <div className={`mt-3 text-xs font-mono ${
                shortcutStatus === 'success' ? 'text-green-400' : 'text-red-400'
              }`}>
                {shortcutMessage}
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/20">
            <div className="text-xs text-muted-foreground/60 space-y-3">
              <p className="font-medium text-foreground/80">{t('settings.shortcuts.permissions.title')}:</p>
              
              <div className="bg-background/20 border border-border/20 rounded-2xl p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-foreground/90 mb-1">{t('settings.shortcuts.permissions.accessibilityAccess')}</p>
                    <p className="text-muted-foreground/70 leading-relaxed">
                      {t('settings.shortcuts.permissions.accessibilityAccessDescription')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div>
                    <p className="font-medium text-foreground/90 mb-1">{t('settings.shortcuts.permissions.inputMonitoring')}</p>
                    <p className="text-muted-foreground/70 leading-relaxed">
                      {t('settings.shortcuts.permissions.inputMonitoringDescription')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
                <p className="font-medium text-amber-400/90 mb-1 flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
                  </svg>
                  {t('settings.shortcuts.permissions.setupSteps')}
                </p>
                <ol className="text-amber-300/80 leading-relaxed space-y-1 ml-4 list-decimal">
                  <li>{t('settings.shortcuts.permissions.step1')}</li>
                  <li>{t('settings.shortcuts.permissions.step2')}</li>
                  <li>{t('settings.shortcuts.permissions.step3')}</li>
                  <li>{t('settings.shortcuts.permissions.step4')}</li>
                </ol>
              </div>
              
              <div className="text-muted-foreground/50 text-[11px] leading-relaxed">
                <p className="font-medium mb-1">{t('settings.shortcuts.permissions.warning')}</p>
                <p>{t('settings.shortcuts.permissions.warningDescription')}</p>
              </div>
              
              <button
                onClick={() => invoke('open_system_settings')}
                className="mt-3 text-xs text-primary/80 hover:text-primary underline font-mono"
              >
                {t('settings.shortcuts.permissions.openAccessibilitySettings')}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
        <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
            <rect x="2" y="7" width="20" height="10" rx="1"/>
            <path d="M5 12h14M7 12l2-2M7 12l2 2"/>
          </svg>
          {t('settings.shortcuts.inAppShortcuts.title')}
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.commandPalette')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">K</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.newNote')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">N</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.togglePreview')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⇧</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">P</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.openSettings')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">,</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.focusMode')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">{getModifierSymbol()}</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">.</kbd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  const renderEditorSection = () => (
    <div data-section="editor" className="space-y-6">
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            <path d="m15 5 4 4"/>
          </svg>
          {t('settings.editor.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.editor.description')}</p>
      </div>
      
      <div className="space-y-4">
        {/* Note: Font size is configured in Appearance section */}
        
        <div>
          <label className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{t('settings.editor.lineHeight')}</span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={localConfig.editor?.lineHeight || 1.6}
              onChange={(e) => handleConfigChange({
                editor: {
                  ...localConfig.editor,
                  lineHeight: parseFloat(e.target.value)
                }
              })}
              className="w-32 h-2 bg-gray-200 rounded-2xl appearance-none cursor-pointer"
            />
            <span className="text-sm text-muted-foreground w-8 text-right">
              {localConfig.editor?.lineHeight || 1.6}
            </span>
          </label>
        </div>
        
        <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <path d="M9 9h.01"/>
              <path d="M15 9h.01"/>
              <path d="M9 15h.01"/>
              <path d="M15 15h.01"/>
            </svg>
            {t('settings.editor.paperStyle.title')}
          </h3>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground/70 mb-4">
              {t('settings.editor.paperStyle.description')}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'none', label: t('settings.editor.paperStyle.plain'), description: t('settings.editor.paperStyle.plainDescription') },
                { key: 'dotted-grid', label: t('settings.editor.paperStyle.dots'), description: t('settings.editor.paperStyle.dotsDescription') },
                { key: 'lines', label: t('settings.editor.paperStyle.lines'), description: t('settings.editor.paperStyle.linesDescription') },
                { key: 'ruled', label: t('settings.editor.paperStyle.ruled'), description: t('settings.editor.paperStyle.ruledDescription') }
              ].map((style) => (
                <button
                  key={style.key}
                  onClick={() => handleAppearanceChange({ notePaperStyle: style.key as any })}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    (localConfig.appearance?.notePaperStyle || 'none') === style.key
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border/20 bg-background/20 hover:border-border/40'
                  }`}
                >
                  <div className="text-xs font-medium text-foreground/90 mb-1">
                    {style.label}
                  </div>
                  <div className="text-xs text-muted-foreground/60">
                    {style.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Editor Features */}
        <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <path d="m9 11 3 3L22 4"/>
            </svg>
            {t('settings.editor.editorFeatures.title')}
          </h3>
          <div className="space-y-3">
            
            {/* Focus Mode */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.editor.editorFeatures.focusMode')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.editor.editorFeatures.focusModeDescription')}</span>
                <button
                  onClick={() => handleAppearanceChange({ focusMode: !localConfig.appearance?.focusMode })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                    localConfig.appearance?.focusMode ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform border border-border/20 ${
                    localConfig.appearance?.focusMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* Syntax Highlighting */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.editor.editorFeatures.syntaxHighlighting')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.editor.editorFeatures.syntaxHighlightingDescription')}</span>
                <button
                  onClick={() => handleAppearanceChange({ syntaxHighlighting: !localConfig.appearance?.syntaxHighlighting })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                    localConfig.appearance?.syntaxHighlighting ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform border border-border/20 ${
                    localConfig.appearance?.syntaxHighlighting ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* Typewriter Mode */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.editor.editorFeatures.typewriterMode')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.editor.editorFeatures.typewriterModeDescription')}</span>
                <button
                  onClick={() => handleAppearanceChange({ typewriterMode: !localConfig.appearance?.typewriterMode })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                    localConfig.appearance?.typewriterMode ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform border border-border/20 ${
                    localConfig.appearance?.typewriterMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* Vim Mode */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.editor.editorFeatures.vimMode')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.editor.editorFeatures.vimModeDescription')}</span>
                <button
                  onClick={() => handleAppearanceChange({ vimMode: !localConfig.appearance?.vimMode })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                    localConfig.appearance?.vimMode ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform border border-border/20 ${
                    localConfig.appearance?.vimMode ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
            
            {/* Word Wrap */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.editor.editorFeatures.wordWrap')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.editor.editorFeatures.wordWrapDescription')}</span>
                <button
                  onClick={() => handleAppearanceChange({
                    wordWrap: localConfig.appearance?.wordWrap === false ? true : !localConfig.appearance?.wordWrap
                  })}
                  className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${
                    localConfig.appearance?.wordWrap !== false ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-background rounded-full transition-transform border border-border/20 ${
                    localConfig.appearance?.wordWrap !== false ? 'translate-x-3.5' : 'translate-x-0'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  const renderSection = () => {
    switch (selectedSection) {
      case 'general':
        return renderGeneralSection();
      case 'appearance':
        return renderAppearanceSection();
      case 'shortcuts':
        return renderShortcutsSection();
      case 'editor':
        return renderEditorSection();
      default:
        return renderAppearanceSection();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-5 relative">
        {renderSection()}
      </div>
    </div>
  );
}