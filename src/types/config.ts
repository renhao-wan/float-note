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
    customTheme?: {
      // Custom theme overrides
      fonts?: {
        editor?: string;
        preview?: string;
        ui?: string;
      };
      colors?: Record<string, string>;
      backgroundTexture?: {
        type:
          | 'none'
          | 'paper'
          | 'canvas'
          | 'grid'
          | 'dots'
          | 'noise'
          | 'gradient';
        opacity?: number;
        scale?: number;
        color?: string;
      };
    };
    editorFontFamily: string;
    previewFontFamily?: string;
    lineHeight: number;
    backgroundPattern?: 'none' | 'paper' | 'canvas' | 'grid' | 'dots';
    notePaperStyle?: 'none' | 'dotted-grid' | 'lines' | 'ruled';
    syntaxHighlighting?: boolean;
    focusMode?: boolean;
    typewriterMode?: boolean;
    vimMode?: boolean;
    wordWrap?: boolean;
    showNotePreviews?: boolean;
    appFontFamily: string;
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
    backgroundPattern: 'none',
    notePaperStyle: 'none',
    syntaxHighlighting: true,
    focusMode: false,
    typewriterMode: false,
    vimMode: false,
    wordWrap: true, // 自动换行
    showNotePreviews: false,
    appFontFamily: 'Outfit, system-ui, sans-serif',
  },
  storage: {
    notesDirectory: undefined, // Will use default app data directory
    useCustomDirectory: false,
  },
};
