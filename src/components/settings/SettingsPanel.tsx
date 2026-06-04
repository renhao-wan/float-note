import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '../../stores/config-store';
import { invoke } from '@tauri-apps/api/core';
import { ThemeSelector } from './ThemeSelector';
import { notesApi } from '../../services/tauri-api';

interface SettingsPanelProps {
  selectedSection: 'general' | 'appearance' | 'shortcuts' | 'editor' | 'advanced';
}

export function SettingsPanel({ selectedSection }: SettingsPanelProps) {
  const { t, i18n } = useTranslation();
  const { config, updateConfig, isLoading } = useConfigStore();
  const [localConfig, setLocalConfig] = useState(config);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [shortcutStatus, setShortcutStatus] = useState<'idle' | 'registering' | 'success' | 'error'>('idle');
  const [shortcutMessage, setShortcutMessage] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'editor' | 'preview'>('preview');
  const [currentNotesDirectory, setCurrentNotesDirectory] = useState<string>('');
  const [directoryInputValue, setDirectoryInputValue] = useState<string>('');

  useEffect(() => {
    // Set localConfig to match the loaded config directly
    console.log('Config changed in SettingsPanel:', JSON.stringify(config, null, 2));
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

  const handleSave = async () => {
    console.log('Saving config:', JSON.stringify(localConfig, null, 2));
    console.log('Appearance being saved:', JSON.stringify(localConfig.appearance, null, 2));
    setSaveStatus('saving');
    try {
      await updateConfig(localConfig);
      setSaveStatus('saved');
      console.log('Config saved successfully');
      
      // Reset status after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save config:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleImportFile = async () => {
    try {
      // For now, let's use a simple input approach
      // In the future, we can use Tauri's file dialog
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.md,.txt';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          try {
            const text = await file.text();
            // For now, create a note from the file content
            // This will be enhanced when we add proper file import
            console.log('File content:', text);
            alert('File import functionality coming soon! For now, copy and paste the content into a new note.');
          } catch (error) {
            console.error('Failed to read file:', error);
            alert('Failed to read file');
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
      alert('Failed to set notes directory: ' + error);
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
            <span className="text-foreground font-mono">Blink</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground/80 font-mono w-24">{t('settings.general.about.version')}</span>
            <div className="flex-1"></div>
            <span className="text-foreground font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="text-muted-foreground/80 font-mono w-24">{t('settings.general.about.author')}</span>
            <div className="flex-1"></div>
            <span className="text-foreground font-mono">AI-Native Spatial Notes ✨</span>
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
            <div className="flex items-center">
              <select
                value={localConfig.language ?? 'zh'}
                onChange={(e) => {
                  const newLang = e.target.value as 'zh' | 'en';
                  setLocalConfig({
                    ...localConfig,
                    language: newLang,
                  });
                  i18n.changeLanguage(newLang);
                }}
                className="w-32 px-2 py-1 bg-background/20 border border-border/20 rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-background/30 transition-colors appearance-none cursor-pointer font-mono"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="zh">简体中文</option>
                <option value="en">English</option>
              </select>
            </div>
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
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  appearance: {
                    ...localConfig.appearance,
                    showNotePreviews: e.target.checked
                  }
                })}
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
                  value={localConfig.appearance?.windowOpacity}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      windowOpacity: parseFloat(e.target.value)
                    }
                  })}
                  className="slider-input"
                />
              </div>
              <span className="text-xs text-muted-foreground/70">🫧</span>
            </div>
            <span className="text-xs text-muted-foreground/70 min-w-[3rem] text-right font-mono">
              {Math.round((localConfig.appearance?.windowOpacity ?? 1) * 100)}%
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
                Browse
              </button>
              <button
                onClick={() => handleSetNotesDirectory()}
                className="px-3 py-2 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
              >
                Set
              </button>
            </div>
            {currentNotesDirectory && (
              <div className="text-xs text-muted-foreground/70 font-mono bg-muted/10 px-2 py-1 rounded-xl">
                Current: {currentNotesDirectory}
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
      {/* Section Header - Standardized spacing */}
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <line x1="10" y1="9" x2="8" y2="9"/>
          </svg>
          {t('settings.appearance.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.appearance.description')}</p>
      </div>

      <div className="space-y-3">
        {/* Theme Selector - Compact */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 flex items-center gap-2 uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07"/>
            </svg>
            {t('settings.appearance.themes.title')}
          </h3>
          <ThemeSelector onSave={() => {
            // Theme changes are handled directly by ThemeSelector
            // No need to trigger main save since themes auto-save
            console.log('[SETTINGS] Theme applied successfully');
          }} />
        </div>

        {/* Typography Group */}
        <div className="bg-card/20 rounded-2xl p-3 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-2 flex items-center gap-2 uppercase tracking-wide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <path d="M4 7V4h16v3M9 20h6M12 4v16"/>
            </svg>
            {t('settings.appearance.typography.title')}
          </h3>
          <div className="space-y-2">
            
            {/* Editor Font Size - Single Line */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-24 font-mono">{t('settings.appearance.typography.editorFontSize')}</label>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70" style={{ fontSize: '11px' }}>A</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <div className="slider-ticks">
                    <div className="slider-tick" style={{ left: '9%' }}></div>
                    <div className="slider-tick" style={{ left: '27%' }}></div>
                    <div className="slider-tick" style={{ left: '50%' }}></div>
                    <div className="slider-tick" style={{ left: '77%' }}></div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="32"
                    step="1"
                    value={localConfig.appearance?.fontSize ?? 15}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      appearance: {
                        ...localConfig.appearance,
                        fontSize: parseInt(e.target.value)
                      }
                    })}
                    className="slider-input"
                  />
                </div>
                <span className="text-muted-foreground/70" style={{ fontSize: '20px' }}>A</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2.5rem] text-right font-mono">
                {localConfig.appearance?.fontSize ?? 15}px
              </span>
            </div>

            {/* Content Font Size - Single Line */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-24 font-mono">{t('settings.appearance.typography.contentFontSize')}</label>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70" style={{ fontSize: '11px' }}>A</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <div className="slider-ticks">
                    <div className="slider-tick" style={{ left: '9%' }}></div>
                    <div className="slider-tick" style={{ left: '27%' }}></div>
                    <div className="slider-tick" style={{ left: '50%' }}></div>
                    <div className="slider-tick" style={{ left: '77%' }}></div>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="32"
                    step="1"
                    value={localConfig.appearance?.contentFontSize ?? 16}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      appearance: {
                        ...localConfig.appearance,
                        contentFontSize: parseInt(e.target.value)
                      }
                    })}
                    className="slider-input"
                  />
                </div>
                <span className="text-muted-foreground/70" style={{ fontSize: '20px' }}>A</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2.5rem] text-right font-mono">
                {localConfig.appearance?.contentFontSize ?? 16}px
              </span>
            </div>

            {/* Editor Font - Single Line */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-24 font-mono">{t('settings.appearance.typography.editorFont')}</label>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1"></div>
                <select
                value={localConfig.appearance?.editorFontFamily ?? 'system-ui'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  appearance: {
                    ...localConfig.appearance,
                    editorFontFamily: e.target.value
                  }
                })}
                className="w-48 px-2 py-1 bg-background/20 border border-border/20 rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-background/30 transition-colors appearance-none cursor-pointer font-mono"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="system-ui">System Default</option>
                <option value="ui-monospace">Monospace</option>
                <option value="'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace">SF Mono</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Fira Code', monospace">Fira Code</option>
              </select>
              </div>
            </div>

            {/* Content Font - Single Line */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-24 font-mono">{t('settings.appearance.typography.contentFont')}</label>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1"></div>
                <select
                value={localConfig.appearance?.previewFontFamily ?? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  appearance: {
                    ...localConfig.appearance,
                    previewFontFamily: e.target.value
                  }
                })}
                className="w-48 px-2 py-1 bg-background/20 border border-border/20 rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-background/30 transition-colors appearance-none cursor-pointer font-mono"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="Inter, -apple-system, BlinkMacSystemFont, sans-serif">Inter</option>
                <option value="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif">System Sans</option>
                <option value="Georgia, 'Times New Roman', serif">Georgia</option>
                <option value="'Crimson Text', Georgia, serif">Crimson Text</option>
                <option value="'Merriweather', Georgia, serif">Merriweather</option>
              </select>
              </div>
            </div>

            {/* Line Height - Single Line */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-24 font-mono">{t('settings.appearance.typography.lineHeight')}</label>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70">1.2</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <div className="slider-ticks">
                    <div className="slider-tick" style={{ left: '0%' }}></div>
                    <div className="slider-tick" style={{ left: '25%' }}></div>
                    <div className="slider-tick" style={{ left: '50%' }}></div>
                    <div className="slider-tick" style={{ left: '100%' }}></div>
                  </div>
                  <input
                    type="range"
                    min="1.2"
                    max="2.0"
                    step="0.1"
                    value={localConfig.appearance?.lineHeight ?? 1.6}
                    onChange={(e) => setLocalConfig({
                      ...localConfig,
                      appearance: {
                          ...localConfig.appearance,
                          lineHeight: parseFloat(e.target.value)
                      }
                    })}
                    className="slider-input"
                  />
                </div>
                <span className="text-xs text-muted-foreground/70">2.0</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2.5rem] text-right font-mono">
                {(localConfig.appearance?.lineHeight ?? 1.6).toFixed(1)}
              </span>
            </div>

            {/* Typography Preview */}
            <div className="mt-6">
              <label className="block text-xs text-muted-foreground mb-3 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
                {t('settings.appearance.typography.typographyPreview')}
              </label>
              
              {/* Preview Toggle Buttons */}
              <div className="flex gap-1 mb-4 bg-background/30 p-1 rounded-2xl w-fit">
                <button 
                  onClick={() => setPreviewMode('editor')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                    previewMode === 'editor' 
                      ? 'bg-primary/80 text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/40'
                  }`}
                >
                  {t('settings.appearance.typography.editorView')}
                </button>
                <button
                  onClick={() => setPreviewMode('preview')}
                  className={`px-3 py-1.5 text-xs font-mono rounded-xl transition-all ${
                    previewMode === 'preview'
                      ? 'bg-primary/80 text-primary-foreground shadow-sm'
                      : 'text-muted-foreground/70 hover:text-foreground hover:bg-background/40'
                  }`}
                >
                  {t('settings.appearance.typography.previewMode')}
                </button>
              </div>

              {/* Single Preview Container */}
              <div className="relative">
                {previewMode === 'editor' ? (
                  <div 
                    className="p-6 bg-card/40 rounded-xl border border-border/40 h-80 overflow-auto shadow-lg backdrop-blur-sm"
                    style={{ 
                      fontFamily: localConfig.appearance?.editorFontFamily ?? 'system-ui',
                      fontSize: `${localConfig.appearance?.fontSize ?? 15}px`,
                      lineHeight: localConfig.appearance?.lineHeight ?? 1.6
                    }}
                  >
                    <div className="text-foreground/90 whitespace-pre-wrap font-mono leading-relaxed">{`# Meeting Notes

## Project Updates
The team made significant progress on the new **dashboard feature**. We completed:

- User authentication flow
- Data visualization components  
- Performance optimizations

### Next Steps
1. Review the pull request for the API integration
2. Schedule user testing sessions
3. Update documentation

> "The best way to predict the future is to invent it." - Alan Kay

\`\`\`javascript
// Example code snippet
function calculateMetrics(data) {
  return data.reduce((acc, val) => {
    return acc + val.score;
  }, 0);
}
\`\`\`

Remember to check the [project roadmap](https://example.com) for updates.`}</div>
                  </div>
                ) : (
                  <div 
                    className="p-6 bg-card/60 rounded-xl border border-primary/20 h-80 overflow-auto prose prose-invert prose-sm max-w-none shadow-xl backdrop-blur-sm ring-1 ring-primary/10"
                    style={{ 
                      fontFamily: localConfig.appearance?.previewFontFamily ?? 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                      fontSize: `${localConfig.appearance?.contentFontSize ?? localConfig.appearance?.fontSize ?? 15}px`,
                      lineHeight: localConfig.appearance?.lineHeight ?? 1.6
                    }}
                  >
                    <h1 style={{ 
                      fontSize: `${(localConfig.appearance?.contentFontSize ?? localConfig.appearance?.fontSize ?? 15) * 1.8}px`, 
                      marginTop: 0,
                      color: 'hsl(var(--foreground) / 1)',
                      fontWeight: '700'
                    }}>Meeting Notes</h1>
                    <h2 style={{ 
                      fontSize: `${(localConfig.appearance?.contentFontSize ?? localConfig.appearance?.fontSize ?? 15) * 1.4}px`,
                      color: 'hsl(var(--foreground) / 1)',
                      fontWeight: '600'
                    }}>Project Updates</h2>
                    <p style={{ color: 'hsl(var(--foreground) / 0.85)' }}>The team made significant progress on the new <strong style={{ color: 'hsl(var(--primary))' }}>dashboard feature</strong>. We completed:</p>
                    <ul style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      <li>User authentication flow</li>
                      <li>Data visualization components</li>
                      <li>Performance optimizations</li>
                    </ul>
                    <h3 style={{ 
                      fontSize: `${(localConfig.appearance?.contentFontSize ?? localConfig.appearance?.fontSize ?? 15) * 1.2}px`,
                      color: 'hsl(var(--foreground) / 1)',
                      fontWeight: '600'
                    }}>Next Steps</h3>
                    <ol style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
                      <li>Review the pull request for the API integration</li>
                      <li>Schedule user testing sessions</li>
                      <li>Update documentation</li>
                    </ol>
                    <blockquote style={{ 
                      borderLeftColor: 'hsl(var(--primary) / 0.6)', 
                      borderLeftWidth: '3px',
                      paddingLeft: '1.5rem', 
                      marginLeft: 0,
                      backgroundColor: 'hsl(var(--primary) / 0.05)',
                      borderRadius: '0 0.5rem 0.5rem 0',
                      padding: '1rem 1.5rem',
                      fontStyle: 'italic',
                      color: 'hsl(var(--foreground) / 0.85)'
                    }}>
                      <p style={{ margin: 0 }}>"The best way to predict the future is to invent it." - Alan Kay</p>
                    </blockquote>
                    <pre style={{ 
                      backgroundColor: 'hsl(var(--muted) / 0.8)', 
                      padding: '1rem', 
                      borderRadius: '0.75rem',
                      fontSize: `${(localConfig.appearance?.contentFontSize ?? localConfig.appearance?.fontSize ?? 15) * 0.85}px`,
                      border: '1px solid hsl(var(--border) / 0.5)',
                      fontFamily: 'ui-monospace, "SF Mono", Monaco, monospace'
                    }}>
                      <code style={{ color: 'hsl(var(--foreground) / 0.9)' }}>{`// Example code snippet
function calculateMetrics(data) {
  return data.reduce((acc, val) => {
    return acc + val.score;
  }, 0);
}`}</code>
                    </pre>
                    <p style={{ color: 'hsl(var(--foreground) / 0.8)' }}>Remember to check the <a href="#" style={{ color: 'hsl(var(--primary))', textDecoration: 'underline', fontWeight: '500' }}>project roadmap</a> for updates.</p>
                  </div>
                )}
                
                {/* Preview Mode Indicator */}
                <div className="absolute top-3 right-3">
                  <div className={`px-2 py-1 text-xs font-mono rounded-full ${
                    previewMode === 'preview' 
                      ? 'bg-primary/20 text-primary border border-primary/30' 
                      : 'bg-muted/40 text-muted-foreground border border-border/30'
                  }`}>
                    {previewMode === 'preview' ? t('settings.appearance.typography.rendered') : t('settings.appearance.typography.markdown')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Group */}
        <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <circle cx="12" cy="12" r="10"/>
              <circle cx="12" cy="12" r="4"/>
              <line x1="21.17" y1="8" x2="12" y2="8"/>
              <line x1="3.95" y1="6.06" x2="8.54" y2="14"/>
              <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
            </svg>
            {t('settings.appearance.visual.title')}
          </h3>
          <div className="space-y-3">
            
            {/* Theme */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.appearance.visual.theme')}</label>
              <div className="flex gap-1 flex-1">
                <button 
                  className="flex-1 px-2 py-1 bg-background/40 border border-primary/40 rounded text-xs font-medium font-mono"
                  disabled
                >
                  dark
                </button>
                <button 
                  className="flex-1 px-2 py-1 bg-background/20 border border-border/20 rounded text-xs text-muted-foreground/50 opacity-50 font-mono"
                  disabled
                >
                  light
                </button>
              </div>
            </div>

            {/* Accent Color */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.appearance.visual.accentColor')}</label>
              <div className="flex gap-1 flex-1">
                {['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                  <button
                    key={color}
                    onClick={() => setLocalConfig({
                      ...localConfig,
                      appearance: {
                        ...localConfig.appearance,
                        accentColor: color
                      }
                    })}
                    className={`w-6 h-6 rounded border transition-all ${
                      localConfig.appearance?.accentColor === color 
                        ? 'border-white/60 scale-105' 
                        : 'border-transparent hover:border-white/30'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            
            {/* Background Pattern */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.appearance.visual.noteBackground')}</label>
              <div className="flex items-center gap-3 flex-1">
                <div className="flex-1"></div>
                <select
                  value={localConfig.appearance?.backgroundPattern ?? 'none'}
                  onChange={(e) => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      backgroundPattern: e.target.value as any
                    }
                  })}
                  className="w-32 px-2 py-1 bg-background/20 border border-border/20 rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-background/30 transition-colors appearance-none cursor-pointer font-mono"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="none">none</option>
                  <option value="paper">paper</option>
                  <option value="canvas">canvas</option>
                  <option value="grid">grid</option>
                  <option value="dots">dots</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Window Group */}
        <div className="bg-card/20 rounded-2xl p-4 border border-border/10">
          <h3 className="text-xs font-medium text-foreground/90 mb-3 flex items-center gap-2 uppercase tracking-wide">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/70">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="9" cy="9" r="2"/>
              <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
            </svg>
            {t('settings.appearance.window.title')}
          </h3>
          <div className="space-y-3">
            
            {/* Window Opacity */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.appearance.window.windowOpacity')}</label>
              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs text-muted-foreground/70">30%</span>
                <div className="flex-1 relative h-5 slider-container">
                  <div className="slider-track"></div>
                  <div className="slider-ticks">
                    <div className="slider-tick" style={{ left: '0%' }}></div>
                    <div className="slider-tick" style={{ left: '25%' }}></div>
                    <div className="slider-tick" style={{ left: '50%' }}></div>
                    <div className="slider-tick" style={{ left: '75%' }}></div>
                    <div className="slider-tick" style={{ left: '100%' }}></div>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.05"
                    value={localConfig.opacity}
                    onChange={async (e) => {
                      const newOpacity = parseFloat(e.target.value);
                      const newConfig = { ...localConfig, opacity: newOpacity };
                      setLocalConfig(newConfig);
                      // Apply opacity immediately
                      try {
                        await invoke('set_window_opacity', { opacity: newOpacity });
                      } catch (error) {
                        console.error('Failed to set window opacity:', error);
                      }
                    }}
                    onMouseUp={async () => {
                      // Save to config on mouse up
                      await updateConfig(localConfig);
                    }}
                    className="slider-input"
                  />
                </div>
                <span className="text-xs text-muted-foreground/70">100%</span>
              </div>
              <span className="text-xs text-muted-foreground/70 min-w-[2.5rem] text-right font-mono">
                {Math.round(localConfig.opacity * 100)}%
              </span>
            </div>

            {/* Always on Top */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-foreground/80 w-28 font-mono">{t('settings.appearance.window.alwaysOnTop')}</label>
              <div className="flex items-center gap-3 flex-1">
                <span className="text-xs text-muted-foreground/60 flex-1">{t('settings.appearance.window.alwaysOnTopDescription')}</span>
                <button
                  onClick={async () => {
                    const newAlwaysOnTop = !localConfig.alwaysOnTop;
                    const newConfig = { ...localConfig, alwaysOnTop: newAlwaysOnTop };
                    setLocalConfig(newConfig);
                    // Apply immediately
                    try {
                      await invoke('set_window_always_on_top', { alwaysOnTop: newAlwaysOnTop });
                    } catch (error) {
                      console.error('Failed to set always on top:', error);
                    }
                    await updateConfig(newConfig);
                  }}
                  className={`relative w-8 h-4 rounded-full transition-colors ${
                    localConfig.alwaysOnTop ? 'bg-primary' : 'bg-background/40 border border-border/40'
                  }`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${
                    localConfig.alwaysOnTop ? 'translate-x-4' : 'translate-x-0'
                  }`} />
                </button>
              </div>
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
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌃</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌥</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⇧</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">N</kbd>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs text-foreground/80 font-mono w-32">{t('settings.shortcuts.globalShortcuts.toggleHoverMode')}</span>
              <div className="flex-1 flex items-center gap-2">
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌃</kbd>
                <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌥</kbd>
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
                  console.log('[BLINK] [SETTINGS] Testing event emission...');
                  try {
                    const result = await invoke<string>('test_emit_new_note');
                    console.log('[BLINK] [SETTINGS] Test result:', result);
                    setShortcutMessage('Test event emitted successfully');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[BLINK] [SETTINGS] Test failed:', error);
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
                  console.log('[BLINK] [SETTINGS] Testing hover toggle...');
                  try {
                    const hoverState = await invoke<boolean>('toggle_all_windows_hover');
                    console.log('[BLINK] [SETTINGS] Hover state:', hoverState);
                    setShortcutMessage(`Hover mode ${hoverState ? 'enabled' : 'disabled'} for all windows`);
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[BLINK] [SETTINGS] Hover toggle failed:', error);
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
                  console.log('[BLINK] [SETTINGS] Forcing main window visible...');
                  try {
                    await invoke('force_main_window_visible');
                    console.log('[BLINK] [SETTINGS] Main window forced visible');
                    setShortcutMessage('Main window forced visible and centered');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[BLINK] [SETTINGS] Force visible failed:', error);
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
                  console.log('[BLINK] [SETTINGS] Checking webview state...');
                  try {
                    const state = await invoke('debug_webview_state');
                    console.log('[BLINK] [SETTINGS] Webview state:', state);
                    setShortcutMessage('Webview state logged to console');
                    setShortcutStatus('success');
                    setTimeout(() => {
                      setShortcutStatus('idle');
                      setShortcutMessage('');
                    }, 3000);
                  } catch (error: any) {
                    console.error('[BLINK] [SETTINGS] Webview state check failed:', error);
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
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">K</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.newNote')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">N</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.togglePreview')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⇧</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">P</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.openSettings')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">,</kbd>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-foreground/80 font-mono">{t('settings.shortcuts.inAppShortcuts.focusMode')}</span>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 text-xs bg-background/40 border border-border/30 rounded-xl font-mono">⌘</kbd>
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
              onChange={(e) => setLocalConfig({
                ...localConfig,
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      notePaperStyle: style.key as any
                    }
                  })}
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      focusMode: !localConfig.appearance?.focusMode
                    }
                  })}
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      syntaxHighlighting: !localConfig.appearance?.syntaxHighlighting
                    }
                  })}
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      typewriterMode: !localConfig.appearance?.typewriterMode
                    }
                  })}
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      vimMode: !localConfig.appearance?.vimMode
                    }
                  })}
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
                  onClick={() => setLocalConfig({
                    ...localConfig,
                    appearance: {
                      ...localConfig.appearance,
                      wordWrap: localConfig.appearance?.wordWrap === false ? true : !localConfig.appearance?.wordWrap
                    }
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


  const renderAdvancedSection = () => (
    <div data-section="advanced" className="space-y-6">
      <div className="h-[40px] flex flex-col justify-center">
        <h2 className="text-sm font-medium text-foreground mb-1 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/70">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M12 8v4"/>
            <path d="M12 16h.01"/>
          </svg>
          {t('settings.advanced.title')}
        </h2>
        <p className="text-xs text-muted-foreground/60">{t('settings.advanced.description')}</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{t('settings.advanced.developerMode')}</div>
              <div className="text-xs text-muted-foreground/60">{t('settings.advanced.developerModeDescription')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={localConfig.advanced?.developerMode || false}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  advanced: {
                    ...localConfig.advanced,
                    developerMode: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </label>
        </div>
        
        <div>
          <label className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">{t('settings.advanced.autoUpdate')}</div>
              <div className="text-xs text-muted-foreground/60">{t('settings.advanced.autoUpdateDescription')}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={localConfig.advanced?.autoUpdate !== false}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  advanced: {
                    ...localConfig.advanced,
                    autoUpdate: e.target.checked
                  }
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </label>
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
      case 'advanced':
        return renderAdvancedSection();
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
        {/* Scroll hint gradient */}
        <div className="pointer-events-none sticky bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/80 to-transparent -mb-12" />
      </div>
      <div className="border-t border-border/20 px-5 py-3 bg-background/60 backdrop-blur-xl flex-shrink-0">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
            className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-medium text-white bg-primary rounded hover:bg-primary/90 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveStatus === 'saving' ? (
              <>
                <svg className="w-3 h-3 mr-2 -ml-1 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.loading')}
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <svg className="w-3 h-3 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                {t('common.success')}
              </>
            ) : saveStatus === 'error' ? (
              <>
                <svg className="w-3 h-3 mr-2 -ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                {t('common.error')}
              </>
            ) : (
              t('common.save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
}