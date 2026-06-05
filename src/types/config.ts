export interface AppConfig {
  alwaysOnTop: boolean;
  language: 'zh' | 'en'; // 新增：语言偏好
  shortcuts: {
    toggleVisibility: string;
  };
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
  appearance: {
    fontSize: number;
    contentFontSize?: number;
    theme: 'dark' | 'light' | 'system';
    themeId?: string; // ID of the selected theme preset
    customTheme?: { // Custom theme overrides
      fonts?: {
        editor?: string;
        preview?: string;
        ui?: string;
      };
      colors?: Record<string, string>;
      backgroundTexture?: {
        type: 'none' | 'paper' | 'canvas' | 'grid' | 'dots' | 'noise' | 'gradient';
        opacity?: number;
        scale?: number;
        color?: string;
      };
    };
    editorFontFamily: string;
    previewFontFamily?: string;
    lineHeight: number;
    accentColor: string;
    backgroundPattern?: 'none' | 'paper' | 'canvas' | 'grid' | 'dots';
    notePaperStyle?: 'none' | 'dotted-grid' | 'lines' | 'ruled';
    syntaxHighlighting?: boolean;
    focusMode?: boolean;
    typewriterMode?: boolean;
    vimMode?: boolean;
    wordWrap?: boolean;
    showNotePreviews?: boolean;
    detachedWindowOpacity?: number; // 分离窗口默认透明度
    appFontFamily: string;
  };
  editor?: {
    fontSize?: number;
    lineHeight?: number;
  };
  advanced?: {
    developerMode?: boolean;
    autoUpdate?: boolean;
  };
  storage?: {
    notesDirectory?: string; // Custom directory for notes, defaults to app data directory
    useCustomDirectory?: boolean; // Whether to use custom directory or default
  };
}

export const defaultConfig: AppConfig = {
  alwaysOnTop: false,
  language: 'zh', // 默认中文
  shortcuts: {
    toggleVisibility: 'Cmd+Ctrl+Alt+Shift+N',
  },
  window: {
    width: 1000,
    height: 700,
  },
  appearance: {
    fontSize: 15,
    contentFontSize: 16,
    theme: 'dark',
    themeId: 'arctic-frost', // 默认选中第一个主题
    editorFontFamily: 'JetBrains Mono, monospace',
    previewFontFamily: 'Source Serif 4, Georgia, serif',
    lineHeight: 1.6,
    accentColor: '#d4a053',
    backgroundPattern: 'none',
    notePaperStyle: 'none',
    syntaxHighlighting: true,
    focusMode: false,
    typewriterMode: false,
    vimMode: false,
    showNotePreviews: false,
    detachedWindowOpacity: 0.9, // 分离窗口默认透明度
    appFontFamily: 'Outfit, system-ui, sans-serif',
  },
  editor: {
    fontSize: 16,
    lineHeight: 1.6,
  },
  advanced: {
    developerMode: false,
    autoUpdate: true,
  },
  storage: {
    notesDirectory: undefined, // Will use default app data directory
    useCustomDirectory: false,
  },
};

// Migration helper for old configs
export const migrateConfig = (config: any): AppConfig => {
  const migratedAppearance = {
    ...defaultConfig.appearance,
    ...(config.appearance || {}),
  };

  // 如果配置中没有 themeId，使用默认值
  if (!migratedAppearance.themeId) {
    migratedAppearance.themeId = 'arctic-frost';
  }

  // 迁移旧的 opacity 字段到新位置
  if (config.opacity !== undefined && migratedAppearance.detachedWindowOpacity === undefined) {
    migratedAppearance.detachedWindowOpacity = config.opacity;
  }

  // 删除旧的 windowOpacity 字段
  delete migratedAppearance.windowOpacity;

  return {
    ...defaultConfig,
    ...config,
    language: config.language || 'zh', // 未设置则默认中文
    appearance: migratedAppearance,
    storage: {
      ...defaultConfig.storage,
      ...(config.storage || {}),
    },
  };
};