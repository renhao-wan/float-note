# FloatNote 国际化（i18n）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 FloatNote 应用添加国际化支持，支持中文和英文界面，默认中文

**Architecture:** 使用 react-i18next 框架，配合 JSON 翻译文件，通过 AppConfig 持久化语言偏好

**Tech Stack:** react-i18next, i18next, i18next-browser-languagedetector

---

## 文件结构

### 新增文件

```
src/
├── locales/
│   ├── zh.json          # 中文翻译
│   ├── en.json          # 英文翻译
│   └── index.ts         # i18next 初始化
```

### 修改文件

```
src/
├── types/
│   └── config.ts        # 扩展 AppConfig，新增 language 字段
├── stores/
│   └── config-store.ts  # 扩展配置管理
├── components/
│   └── settings/
│       └── GeneralSettings.tsx  # 添加语言切换 UI
├── App.tsx              # 集成 i18next Provider
└── main.tsx             # 初始化 i18next
```

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装国际化依赖**

Run: `pnpm add react-i18next i18next i18next-browser-languagedetector`

Expected: 依赖安装成功

- [ ] **Step 2: 验证依赖安装**

Run: `pnpm list react-i18next i18next i18next-browser-languagedetector`

Expected: 显示已安装的依赖版本

- [ ] **Step 3: 提交依赖变更**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: 添加国际化依赖 (react-i18next, i18next)"
```

---

## Task 2: 创建翻译文件

**Files:**
- Create: `src/locales/zh.json`
- Create: `src/locales/en.json`

- [ ] **Step 1: 创建中文翻译文件**

Create: `src/locales/zh.json`

```json
{
  "common": {
    "save": "保存更改",
    "cancel": "取消",
    "loading": "加载中...",
    "error": "错误",
    "success": "成功",
    "confirm": "确认",
    "delete": "删除",
    "edit": "编辑",
    "create": "创建",
    "close": "关闭",
    "back": "返回",
    "next": "下一步",
    "previous": "上一步",
    "search": "搜索",
    "settings": "设置",
    "help": "帮助",
    "about": "关于"
  },
  "settings": {
    "general": {
      "title": "通用",
      "description": "基础设置 • 谁在用、做什么",
      "about": {
        "title": "关于",
        "application": "应用",
        "version": "版本",
        "author": "作者"
      },
      "interface": {
        "title": "界面",
        "language": "语言",
        "languageDescription": "切换语言以改变界面显示",
        "notePreviews": "笔记预览",
        "notePreviewsDescription": "无需打开即可预览笔记内容",
        "windowOpacity": "窗口透明度",
        "windowOpacityDescription": "背景透明度"
      },
      "fileOperations": {
        "title": "文件操作",
        "notesDirectory": "笔记目录",
        "notesDirectoryDescription": "笔记存储位置",
        "reloadNotes": "重新加载笔记",
        "importNotes": "导入笔记",
        "importNotesDescription": "从 Markdown 文件加载笔记",
        "importFile": "导入文件",
        "importFolder": "导入文件夹",
        "exportNotes": "导出笔记",
        "exportNotesDescription": "将所有笔记保存为 Markdown 文件",
        "exportAll": "导出全部",
        "markdownFormat": "Markdown 格式",
        "markdownFormatDescription": "笔记以 .md 文件存储，包含 YAML frontmatter 元数据（标题、标签、日期）。",
        "directoryMode": "目录模式",
        "directoryModeDescription": "设置自定义目录以直接将笔记加载/保存为文件，适合与 git、Dropbox 或其他工具同步。"
      }
    },
    "appearance": {
      "title": "外观",
      "description": "让 Blink 独一无二 • 字体、颜色和纹理",
      "themes": {
        "title": "主题"
      },
      "typography": {
        "title": "排版",
        "editorFontSize": "编辑器字体大小",
        "contentFontSize": "内容字体大小",
        "editorFont": "编辑器字体",
        "contentFont": "内容字体",
        "lineHeight": "行高",
        "typographyPreview": "排版预览",
        "editorView": "编辑器视图",
        "previewMode": "预览模式",
        "rendered": "渲染",
        "markdown": "Markdown"
      },
      "visual": {
        "title": "视觉",
        "theme": "主题",
        "accentColor": "强调色",
        "noteBackground": "笔记背景"
      },
      "window": {
        "title": "窗口",
        "windowOpacity": "窗口透明度",
        "alwaysOnTop": "始终置顶",
        "alwaysOnTopDescription": "保持窗口在其他窗口之上"
      }
    },
    "shortcuts": {
      "title": "快捷键",
      "description": "全局和应用内键盘快捷键",
      "globalShortcuts": {
        "title": "全局快捷键",
        "description": "全局快捷键允许您在系统任何位置执行操作，即使应用在后台。",
        "createNewNote": "新建笔记",
        "toggleHoverMode": "切换悬停模式"
      },
      "inAppShortcuts": {
        "title": "应用内快捷键",
        "commandPalette": "命令面板",
        "newNote": "新建笔记",
        "togglePreview": "切换预览",
        "openSettings": "打开设置",
        "focusMode": "专注模式"
      },
      "permissions": {
        "title": "所需 macOS 权限",
        "accessibilityAccess": "辅助功能访问",
        "accessibilityAccessDescription": "全局快捷键（⌘⌃⌥⇧N, ⌘⌃⌥⇧H）需要系统级支持。",
        "inputMonitoring": "输入监控",
        "inputMonitoringDescription": "启用键盘事件检测以支持全局快捷键。",
        "setupSteps": "设置步骤",
        "step1": "点击下方「打开辅助功能设置」",
        "step2": "在应用列表中找到「Blink」并启用",
        "step3": "完全退出并重启 Blink",
        "step4": "使用上方按钮测试快捷键",
        "warning": "为什么需要这些权限？",
        "warningDescription": "全局快捷键允许您从系统任何位置即时创建笔记 - 无论您是在浏览、编码还是在会议中。「Hyperkey」（⌘⌃⌥⇧）组合专门设计用于避免与现有快捷键冲突。",
        "openAccessibilitySettings": "打开辅助功能设置 →"
      },
      "actions": {
        "reRegisterShortcuts": "重新注册快捷键",
        "registering": "注册中...",
        "testEvent": "测试事件",
        "testHover": "测试悬停",
        "forceVisible": "强制显示",
        "debugWebview": "调试 Webview"
      }
    },
    "editor": {
      "title": "编辑器",
      "description": "自定义您的写作体验",
      "lineHeight": "行高",
      "paperStyle": {
        "title": "纸张样式",
        "description": "选择背景样式以增强写作体验",
        "plain": " plain",
        "plainDescription": "干净背景",
        "dots": "点状",
        "dotsDescription": " subtle 点状网格",
        "lines": "线条",
        "linesDescription": "笔记本线条",
        "ruled": "横线",
        "ruledDescription": "大学横线"
      },
      "editorFeatures": {
        "title": "编辑器功能",
        "focusMode": "专注模式",
        "focusModeDescription": "无干扰写作",
        "syntaxHighlighting": "语法高亮",
        "syntaxHighlightingDescription": "代码语法颜色",
        "typewriterMode": "打字机模式",
        "typewriterModeDescription": "居中当前行",
        "vimMode": "Vim 模式",
        "vimModeDescription": "启用 Vim 键绑定",
        "wordWrap": "自动换行",
        "wordWrapDescription": "在编辑器中换行"
      }
    },
    "advanced": {
      "title": "高级",
      "description": "高级应用设置",
      "developerMode": "开发者模式",
      "developerModeDescription": "启用开发者工具和功能",
      "autoUpdate": "自动更新",
      "autoUpdateDescription": "自动下载和安装更新"
    }
  },
  "notes": {
    "create": "新建笔记",
    "delete": "删除笔记",
    "edit": "编辑笔记",
    "save": "保存笔记",
    "search": "搜索笔记",
    "noNotes": "暂无笔记",
    "noNotesDescription": "点击「新建笔记」开始",
    "wordCount": "字数",
    "lastSaved": "最后保存",
    "untitled": "无标题笔记",
    "empty": "空笔记"
  },
  "titlebar": {
    "title": "Blink",
    "wordCount": "字数",
    "lastSaved": "最后保存"
  },
  "sidebar": {
    "notes": "笔记",
    "settings": "设置"
  },
  "footer": {
    "theme": "主题",
    "language": "语言"
  },
  "commandPalette": {
    "searchPlaceholder": "搜索笔记...",
    "noResults": "未找到结果",
    "createNote": "新建笔记",
    "openSettings": "打开设置",
    "togglePreview": "切换预览",
    "toggleSidebar": "切换侧边栏"
  },
  "contextMenu": {
    "open": "打开",
    "detach": "分离窗口",
    "delete": "删除",
    "rename": "重命名",
    "duplicate": "复制"
  },
  "dialog": {
    "confirmDelete": "确认删除",
    "confirmDeleteMessage": "确定要删除此笔记吗？此操作无法撤销。",
    "confirmDeleteTitle": "删除笔记",
    "unsavedChanges": "未保存的更改",
    "unsavedChangesMessage": "您有未保存的更改。确定要离开吗？",
    "saveChanges": "保存更改",
    "discardChanges": "放弃更改"
  },
  "defaultTemplate": {
    "title": "新笔记",
    "content": "# 新笔记\n\n开始写作..."
  }
}
```

- [ ] **Step 2: 创建英文翻译文件**

Create: `src/locales/en.json`

```json
{
  "common": {
    "save": "Save Changes",
    "cancel": "Cancel",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "confirm": "Confirm",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "close": "Close",
    "back": "Back",
    "next": "Next",
    "previous": "Previous",
    "search": "Search",
    "settings": "Settings",
    "help": "Help",
    "about": "About"
  },
  "settings": {
    "general": {
      "title": "General",
      "description": "The essentials • who we are, what we do",
      "about": {
        "title": "About",
        "application": "Application",
        "version": "Version",
        "author": "Author"
      },
      "interface": {
        "title": "Interface",
        "language": "Language",
        "languageDescription": "Switch language to change interface display",
        "notePreviews": "Note Previews",
        "notePreviewsDescription": "Peek at note content without opening",
        "windowOpacity": "Window Opacity",
        "windowOpacityDescription": "Background transparency"
      },
      "fileOperations": {
        "title": "File Operations",
        "notesDirectory": "Notes Directory",
        "notesDirectoryDescription": "Where your notes are stored",
        "reloadNotes": "Reload Notes",
        "importNotes": "Import Notes",
        "importNotesDescription": "Load notes from markdown files",
        "importFile": "Import File",
        "importFolder": "Import Folder",
        "exportNotes": "Export Notes",
        "exportNotesDescription": "Save all notes as markdown files",
        "exportAll": "Export All",
        "markdownFormat": "Markdown Format",
        "markdownFormatDescription": "Notes are stored as .md files with YAML frontmatter containing metadata (title, tags, dates).",
        "directoryMode": "Directory Mode",
        "directoryModeDescription": "Set a custom directory to load/save notes directly as files, perfect for syncing with git, Dropbox, or other tools."
      }
    },
    "appearance": {
      "title": "Appearance",
      "description": "Make Blink uniquely yours • fonts, colors & textures",
      "themes": {
        "title": "Themes"
      },
      "typography": {
        "title": "Typography",
        "editorFontSize": "Editor Font Size",
        "contentFontSize": "Content Font Size",
        "editorFont": "Editor Font",
        "contentFont": "Content Font",
        "lineHeight": "Line Height",
        "typographyPreview": "Typography Preview",
        "editorView": "Editor View",
        "previewMode": "Preview Mode",
        "rendered": "rendered",
        "markdown": "markdown"
      },
      "visual": {
        "title": "Visual",
        "theme": "Theme",
        "accentColor": "Accent Color",
        "noteBackground": "Note Background"
      },
      "window": {
        "title": "Window",
        "windowOpacity": "Window Opacity",
        "alwaysOnTop": "Always on Top",
        "alwaysOnTopDescription": "keep window above others"
      }
    },
    "shortcuts": {
      "title": "Shortcuts",
      "description": "Global and in-app keyboard shortcuts",
      "globalShortcuts": {
        "title": "Global Shortcuts",
        "description": "Global shortcuts allow you to perform actions from anywhere on your system, even when the app is in the background.",
        "createNewNote": "Create New Note",
        "toggleHoverMode": "Toggle Hover Mode"
      },
      "inAppShortcuts": {
        "title": "In-App Shortcuts",
        "commandPalette": "Command Palette",
        "newNote": "New Note",
        "togglePreview": "Toggle Preview",
        "openSettings": "Open Settings",
        "focusMode": "Focus Mode"
      },
      "permissions": {
        "title": "Required macOS Permissions",
        "accessibilityAccess": "Accessibility Access",
        "accessibilityAccessDescription": "Required for global shortcuts (⌘⌃⌥⇧N, ⌘⌃⌥⇧H) to work system-wide.",
        "inputMonitoring": "Input Monitoring",
        "inputMonitoringDescription": "Enables detection of keyboard events for global shortcuts.",
        "setupSteps": "Setup Steps",
        "step1": "Click \"open accessibility settings\" below",
        "step2": "Find \"Blink\" in the app list and enable it",
        "step3": "Quit and restart Blink completely",
        "step4": "Test shortcuts with the buttons above",
        "warning": "Why these permissions?",
        "warningDescription": "Global shortcuts allow you to create notes instantly from anywhere on your system - whether you're browsing, coding, or in a meeting. The \"Hyperkey\" (⌘⌃⌥⇧) combination is specifically chosen to avoid conflicts with existing shortcuts.",
        "openAccessibilitySettings": "open accessibility settings →"
      },
      "actions": {
        "reRegisterShortcuts": "re-register shortcuts",
        "registering": "registering...",
        "testEvent": "test event",
        "testHover": "test hover",
        "forceVisible": "force visible",
        "debugWebview": "debug webview"
      }
    },
    "editor": {
      "title": "Editor",
      "description": "Customize your writing experience",
      "lineHeight": "Line Height",
      "paperStyle": {
        "title": "Paper Style",
        "description": "Choose a background style to enhance your writing experience",
        "plain": "Plain",
        "plainDescription": "Clean background",
        "dots": "Dots",
        "dotsDescription": "Subtle dot grid",
        "lines": "Lines",
        "linesDescription": "Notebook lines",
        "ruled": "Ruled",
        "ruledDescription": "College ruled"
      },
      "editorFeatures": {
        "title": "Editor Features",
        "focusMode": "Focus Mode",
        "focusModeDescription": "distraction-free writing",
        "syntaxHighlighting": "Syntax Highlighting",
        "syntaxHighlightingDescription": "code syntax colors",
        "typewriterMode": "Typewriter Mode",
        "typewriterModeDescription": "center current line",
        "vimMode": "Vim Mode",
        "vimModeDescription": "enable vim keybindings",
        "wordWrap": "Word Wrap",
        "wordWrapDescription": "wrap long lines in editor"
      }
    },
    "advanced": {
      "title": "Advanced",
      "description": "Advanced application settings",
      "developerMode": "Developer Mode",
      "developerModeDescription": "Enable developer tools and features",
      "autoUpdate": "Auto Update",
      "autoUpdateDescription": "Automatically download and install updates"
    }
  },
  "notes": {
    "create": "New Note",
    "delete": "Delete Note",
    "edit": "Edit Note",
    "save": "Save Note",
    "search": "Search Notes",
    "noNotes": "No notes yet",
    "noNotesDescription": "Click \"New Note\" to get started",
    "wordCount": "words",
    "lastSaved": "last saved",
    "untitled": "Untitled Note",
    "empty": "Empty note"
  },
  "titlebar": {
    "title": "Blink",
    "wordCount": "words",
    "lastSaved": "last saved"
  },
  "sidebar": {
    "notes": "Notes",
    "settings": "Settings"
  },
  "footer": {
    "theme": "Theme",
    "language": "Language"
  },
  "commandPalette": {
    "searchPlaceholder": "Search notes...",
    "noResults": "No results found",
    "createNote": "New Note",
    "openSettings": "Open Settings",
    "togglePreview": "Toggle Preview",
    "toggleSidebar": "Toggle Sidebar"
  },
  "contextMenu": {
    "open": "Open",
    "detach": "Detach Window",
    "delete": "Delete",
    "rename": "Rename",
    "duplicate": "Duplicate"
  },
  "dialog": {
    "confirmDelete": "Confirm Delete",
    "confirmDeleteMessage": "Are you sure you want to delete this note? This action cannot be undone.",
    "confirmDeleteTitle": "Delete Note",
    "unsavedChanges": "Unsaved Changes",
    "unsavedChangesMessage": "You have unsaved changes. Are you sure you want to leave?",
    "saveChanges": "Save Changes",
    "discardChanges": "Discard Changes"
  },
  "defaultTemplate": {
    "title": "New Note",
    "content": "# New Note\n\nStart writing..."
  }
}
```

- [ ] **Step 3: 提交翻译文件**

```bash
git add src/locales/zh.json src/locales/en.json
git commit -m "feat: 添加中英文翻译文件"
```

---

## Task 3: 初始化 i18next

**Files:**
- Create: `src/locales/index.ts`

- [ ] **Step 1: 创建 i18next 初始化文件**

Create: `src/locales/index.ts`

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zh from './zh.json';
import en from './en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: 'zh', // 默认语言
    fallbackLng: 'zh', // 回退语言
    interpolation: {
      escapeValue: false, // React 已经处理了 XSS
    },
    detection: {
      order: ['querystring', 'cookie', 'localStorage', 'navigator'],
      lookupQuerystring: 'lng',
      lookupCookie: 'i18next',
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage', 'cookie'],
    },
  });

export default i18n;
```

- [ ] **Step 2: 提交 i18next 初始化**

```bash
git add src/locales/index.ts
git commit -m "feat: 初始化 i18next 配置"
```

---

## Task 4: 扩展 AppConfig

**Files:**
- Modify: `src/types/config.ts`

- [ ] **Step 1: 扩展 AppConfig 接口**

Modify: `src/types/config.ts`

```typescript
export interface AppConfig {
  opacity: number;
  alwaysOnTop: boolean;
  language: 'zh' | 'en';  // 新增：语言偏好
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
    themeId?: string;
    customTheme?: {
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
    windowOpacity?: number;
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
    notesDirectory?: string;
    useCustomDirectory?: boolean;
  };
}

export const defaultConfig: AppConfig = {
  opacity: 1,
  alwaysOnTop: false,
  language: 'zh',  // 默认中文
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
    editorFontFamily: 'system-ui',
    previewFontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
    lineHeight: 1.6,
    accentColor: '#3b82f6',
    backgroundPattern: 'none',
    notePaperStyle: 'none',
    syntaxHighlighting: true,
    focusMode: false,
    typewriterMode: false,
    vimMode: false,
    showNotePreviews: false,
    appFontFamily: 'system-ui',
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
    notesDirectory: undefined,
    useCustomDirectory: false,
  },
};

export const migrateConfig = (config: any): AppConfig => {
  return {
    ...defaultConfig,
    ...config,
    language: config.language || 'zh',  // 未设置则默认中文
    appearance: {
      ...defaultConfig.appearance,
      ...(config.appearance || {}),
    },
    storage: {
      ...defaultConfig.storage,
      ...(config.storage || {}),
    },
  };
};
```

- [ ] **Step 2: 提交 AppConfig 扩展**

```bash
git add src/types/config.ts
git commit -m "feat: 扩展 AppConfig 支持语言偏好"
```

---

## Task 5: 集成 i18next 到应用

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 在 main.tsx 中初始化 i18next**

Modify: `src/main.tsx`

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './locales'; // 初始化 i18next

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 2: 在 App.tsx 中使用 useTranslation**

Modify: `src/App.tsx`

```typescript
import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DetachedNoteWindow, 
  DragGhost 
} from './components/windows';
import { 
  SettingsPanel, 
  SettingsNavigation 
} from './components/settings';
import { DevToolbar } from './components/dev/DevToolbar';
import { 
  CustomTitleBar, 
  WindowWrapper, 
  NavigationSidebar, 
  AppFooter 
} from './components/layout';
import { 
  NotesPanel, 
  EditorArea 
} from './components/notes';
import { 
  ChordHint 
} from './components/common';
import { 
  useDetachedWindowsStore,
  useConfigStore 
} from './stores';
import { 
  useAppInitialization,
  useSaveStatus,
  useModifiedState,
  useWindowTransparency,
  useTypewriterMode,
  useDragToDetach,
  useWindowShade,
  useNoteManagement,
  useCommandPalette,
  useKeyboardShortcuts,
  useContextMenu,
  useChordShortcuts,
  useWindowManager,
  useGlobalEventListeners
} from './hooks';
import { getThemeById } from './types';
import { getWordCount } from './lib/utils';
import { getCenterPosition, getGridPosition } from './utils/window-positioning';


function App() {
  const { t, i18n } = useTranslation();
  const { config, updateConfig } = useConfigStore();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentView, setCurrentView] = useState<'notes' | 'settings'>('notes');
  const [selectedSettingsSection, setSelectedSettingsSection] = useState<'general' | 'appearance' | 'shortcuts' | 'editor' | 'advanced'>('appearance');

  // 同步语言设置
  useEffect(() => {
    if (config.language && i18n.language !== config.language) {
      i18n.changeLanguage(config.language);
    }
  }, [config.language, i18n]);

  // 窗口检测
  const { isDetachedWindow, detachedNoteId, isDragGhost, dragGhostTitle } = useWindowManager();
  
  // 应用初始化
  useAppInitialization({ isDetachedWindow });

  // 分离窗口存储
  const { 
    createWindow, 
    isWindowOpen, 
    focusWindow
  } = useDetachedWindowsStore();

  // 拖拽分离功能
  const onDropCallback = useCallback(async (noteId: string, x: number, y: number) => {
    if (!isWindowOpen(noteId)) {
      await createWindow(noteId, x, y);
    }
  }, [isWindowOpen, createWindow]);

  const { startDrag, isDragging } = useDragToDetach({
    onDrop: onDropCallback
  });

  // 保存状态跟踪
  const saveStatus = useSaveStatus();
  const modifiedState = useModifiedState();
  
  // 窗口透明度
  useWindowTransparency();
  
  // 打字机模式
  const textareaRef = useTypewriterMode();
  
  // 窗口遮罩
  const isShaded = useWindowShade();

  // 笔记管理
  const {
    notes,
    selectedNoteId,
    currentContent,
    loading,
    selectedNote,
    createNewNote,
    selectNote,
    updateNoteContent,
    saveNoteImmediately,
    deleteNote,
    setCurrentContent,
  } = useNoteManagement({
    onSaveStart: () => {
      saveStatus.startSaving();
    },
    onSaveComplete: () => {
      saveStatus.saveSuccess();
      modifiedState.markSaved(currentContent);
    },
    onSaveError: () => {
      saveStatus.setSaveError('Failed to save note');
    }
  });

  // 命令面板
  const {
    showCommandPalette,
    openCommandPalette,
  } = useCommandPalette({
    notes,
    selectedNoteId,
    isPreviewMode,
    sidebarVisible,
    onCreateNewNote: createNewNote,
    onSelectNote: selectNote,
    onToggleSidebar: () => setSidebarVisible(!sidebarVisible),
    onTogglePreview: () => setIsPreviewMode(!isPreviewMode),
    onOpenSettings: () => {
      setCurrentView('settings');
      setSidebarVisible(true);
    },
  });

  // 上下文菜单
  const {
    showContextMenu,
  } = useContextMenu({
    onDeleteNote: deleteNote,
    onDetachNote: async (noteId: string) => {
      const { x, y } = getCenterPosition();
      await createWindow(noteId, x, y);
    },
  });

  // 键盘快捷键
  useKeyboardShortcuts({
    onNewNote: createNewNote,
    onToggleCommandPalette: openCommandPalette,
    onTogglePreview: () => setIsPreviewMode(!isPreviewMode),
    onOpenSettings: () => {
      setCurrentView('settings');
      setSidebarVisible(true);
    },
    onToggleFocus: () => {
      const newConfig = {
        ...config,
        appearance: {
          ...config?.appearance,
          focusMode: !config?.appearance?.focusMode
        }
      };
      updateConfig(newConfig);
    },
    isCommandPaletteOpen: showCommandPalette,
    notes: notes,
    onSelectNote: selectNote,
  });

  // 组合快捷键
  const { chordMode, showChordHint, startWindowMode } = useChordShortcuts({
    notes: notes.map(note => ({ id: note.id, title: note.title })),
    onSelectNote: selectNote,
    onCreateNewNote: createNewNote,
    onToggleCommandPalette: openCommandPalette,
    onCreateDetachedWindow: async (noteId: string) => {
      const { x, y } = getCenterPosition();
      await createWindow(noteId, x, y);
    },
    onFocusWindow: async (noteId: string) => {
      console.log('[CHORD] onFocusWindow called with noteId:', noteId);
      
      if (isWindowOpen(noteId)) {
        console.log('[CHORD] ✅ Window exists, attempting to focus');
        const focused = await focusWindow(noteId);
        if (focused) {
          console.log('[CHORD] ✅ Focus successful');
          return;
        }
      }
      
      console.log('[CHORD] Creating new window');
      const noteIndex = notes.findIndex(note => note.id === noteId);
      let position;
      
      if (noteIndex >= 0 && noteIndex < 9) {
        const slotNumber = noteIndex + 1;
        position = getGridPosition(slotNumber);
        console.log('[CHORD] Using grid position for slot', slotNumber, ':', position);
      } else {
        position = getCenterPosition();
        console.log('[CHORD] Using center position');
      }
      
      await createWindow(noteId, position.x, position.y, position.width, position.height);
    },
  });
  
  // 全局事件监听
  useGlobalEventListeners({
    notes,
    onCreateNewNote: createNewNote,
    onStartWindowMode: startWindowMode,
  });

  // 动画处理
  const handleNotesClick = () => {
    if (currentView === 'notes') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('notes');
      setSidebarVisible(true);
    }
  };
  const handleSettingsClick = () => {
    if (currentView === 'settings') {
      setSidebarVisible(!sidebarVisible);
    } else {
      setCurrentView('settings');
      setSidebarVisible(true);
    }
  };

  // 分离窗口渲染
  if (isDetachedWindow && detachedNoteId) {
    return <DetachedNoteWindow noteId={detachedNoteId} />;
  }

  // 拖拽窗口渲染
  if (isDragGhost && dragGhostTitle) {
    return <DragGhost noteTitle={dragGhostTitle} distance={100} threshold={60} />;
  }

  // 计算字数
  const wordCount = getWordCount(currentContent);
  
  const themeId = config?.appearance?.themeId || 'midnight-ink';
  const theme = getThemeById(themeId);
  
  return (
    <WindowWrapper
      className={`main-window transition-all duration-300 ${
        isDragging ? 'bg-blue-500/5' : ''
      } ${config?.appearance?.focusMode ? 'focus-mode' : ''}`}
      style={
        config?.appearance?.appFontFamily
          ? ({ ['--font-ui']: config.appearance.appFontFamily } as any)
          : undefined
      }
    >
      <div className="h-full grid grid-rows-[auto_1fr_auto]">
        <CustomTitleBar 
          title={t('titlebar.title')}
          isMainWindow={true}
          isShaded={isShaded}
          stats={{
            wordCount: selectedNote ? wordCount : undefined,
            lastSaved: selectedNote?.updated_at ? new Date(selectedNote.updated_at).toLocaleString() : undefined
          }}
        />
        
        <div className="flex min-h-0 overflow-hidden">
          <NavigationSidebar
            currentView={currentView}
            sidebarVisible={sidebarVisible}
            onNotesClick={handleNotesClick}
            onSettingsClick={handleSettingsClick}
          />
        {/* 主内容区域 */}
        <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
          {currentView === 'notes' ? (
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <NotesPanel
                sidebarVisible={sidebarVisible}
                notes={notes}
                selectedNoteId={selectedNoteId}
                loading={loading}
                showNotePreviews={config?.appearance?.showNotePreviews}
                onCreateNewNote={createNewNote}
                onSelectNote={selectNote}
                onDeleteNote={deleteNote}
                onShowContextMenu={showContextMenu}
                onStartDrag={startDrag}
                isWindowOpen={isWindowOpen}
              />

              <EditorArea
                selectedNote={selectedNote || null}
                currentContent={currentContent}
                isPreviewMode={isPreviewMode}
                saveStatus={{
                  isSaving: saveStatus.isSaving,
                  lastSaved: saveStatus.lastSaved,
                  isModified: modifiedState.isModified
                }}
                wordCount={wordCount}
                textareaRef={textareaRef}
                editorConfig={{
                  fontSize: config?.appearance?.fontSize,
                  editorFontFamily: config?.appearance?.editorFontFamily,
                  contentFontSize: config?.appearance?.contentFontSize,
                  previewFontFamily: config?.appearance?.previewFontFamily,
                  lineHeight: config?.appearance?.lineHeight,
                  syntaxHighlighting: config?.appearance?.syntaxHighlighting,
                  notePaperStyle: config?.appearance?.notePaperStyle
                }}
                onContentChange={(content) => {
                  setCurrentContent(content);
                  updateNoteContent(content);
                  if (selectedNote && content !== selectedNote.content) {
                    modifiedState.markModified();
                  }
                }}
                onSave={saveNoteImmediately}
                onPreviewToggle={() => setIsPreviewMode(!isPreviewMode)}
              />
            </div>
          ) : (
            /* 设置视图 */
            <div className="flex-1 flex min-h-0 overflow-hidden">
              <SettingsNavigation
                sidebarVisible={sidebarVisible}
                selectedSection={selectedSettingsSection}
                onSectionChange={setSelectedSettingsSection}
              />
              
              {/* 设置内容区域 */}
              <div className="flex-1 flex flex-col bg-background min-h-0 overflow-hidden">
                <SettingsPanel selectedSection={selectedSettingsSection} />
              </div>
            </div>
          )}
        </div>
        </div>
        
        <AppFooter 
          theme={theme || null} 
          themeId={themeId} 
          config={config} 
        />
      </div>

      {/* 组合快捷键提示 */}
      <ChordHint 
        mode={chordMode}
        visible={showChordHint}
        notes={notes.map(note => ({ id: note.id, title: note.title }))}
      />
      
      {/* 开发工具栏 */}
      {process.env.NODE_ENV === 'development' && !isDetachedWindow && <DevToolbar />}
    </WindowWrapper>
  );
}

export default App;
```

- [ ] **Step 3: 提交 i18next 集成**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: 集成 i18next 到应用"
```

---

## Task 6: 添加语言切换 UI

**Files:**
- Modify: `src/components/settings/GeneralSettings.tsx`

- [ ] **Step 1: 在通用设置中添加语言切换**

Modify: `src/components/settings/GeneralSettings.tsx`

```typescript
import { useTranslation } from 'react-i18next';
import { AppConfig } from '../../types';

interface GeneralSettingsProps {
  localConfig: AppConfig;
  setLocalConfig: (config: AppConfig) => void;
  currentNotesDirectory: string;
  directoryInputValue: string;
  setDirectoryInputValue: (value: string) => void;
  onReloadNotes: () => Promise<void>;
  onBrowseDirectory: () => Promise<void>;
  onSetNotesDirectory: () => Promise<void>;
  onImportFile: () => Promise<void>;
  onImportDirectory: () => Promise<void>;
  onExportAll: () => Promise<void>;
}

export function GeneralSettings({
  localConfig,
  setLocalConfig,
  currentNotesDirectory,
  directoryInputValue,
  setDirectoryInputValue,
  onReloadNotes,
  onBrowseDirectory,
  onSetNotesDirectory,
  onImportFile,
  onImportDirectory,
  onExportAll,
}: GeneralSettingsProps) {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = async (lang: 'zh' | 'en') => {
    i18n.changeLanguage(lang);
    setLocalConfig({
      ...localConfig,
      language: lang
    });
  };

  return (
    <div data-section="general" className="space-y-4">
      {/* 分区标题 */}
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
          
          {/* 语言切换 */}
          <div className="flex justify-between items-center gap-3">
            <div className="flex flex-col">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.interface.language')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.interface.languageDescription')}</span>
            </div>
            <div className="flex items-center">
              <select
                value={localConfig.language || 'zh'}
                onChange={(e) => handleLanguageChange(e.target.value as 'zh' | 'en')}
                className="w-32 px-2 py-1 bg-background/20 border border-border/20 rounded-xl text-foreground text-xs focus:outline-none focus:border-primary/40 hover:bg-background/30 transition-colors appearance-none cursor-pointer font-mono"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                  backgroundPosition: 'right 0.5rem center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          
          {/* 笔记预览切换 */}
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
          
          {/* 窗口透明度滑块 */}
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

      {/* 文件操作部分 */}
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
          
          {/* 笔记目录 */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.notesDirectory')}</span>
                <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.notesDirectoryDescription')}</span>
              </div>
              <button
                onClick={() => onReloadNotes()}
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
                onClick={() => onBrowseDirectory()}
                className="px-3 py-2 text-xs bg-background/40 hover:bg-background/60 border border-border/30 rounded-2xl transition-colors"
              >
                Browse
              </button>
              <button
                onClick={() => onSetNotesDirectory()}
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
          
          {/* 导入笔记 */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.importNotes')}</span>
                <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.importNotesDescription')}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onImportFile()}
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
                >
                  {t('settings.general.fileOperations.importFile')}
                </button>
                <button
                  onClick={() => onImportDirectory()}
                  className="px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-2xl transition-colors"
                >
                  {t('settings.general.fileOperations.importFolder')}
                </button>
              </div>
            </div>
          </div>
          
          {/* 导出笔记 */}
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-foreground/90 font-mono text-xs">{t('settings.general.fileOperations.exportNotes')}</span>
              <span className="text-muted-foreground/60 text-xs">{t('settings.general.fileOperations.exportNotesDescription')}</span>
            </div>
            <button
              onClick={() => onExportAll()}
              className="px-3 py-1.5 text-xs bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 rounded-2xl transition-colors"
            >
              {t('settings.general.fileOperations.exportAll')}
            </button>
          </div>
          
          {/* 帮助文本 */}
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
}
```

- [ ] **Step 2: 提交语言切换 UI**

```bash
git add src/components/settings/GeneralSettings.tsx
git commit -m "feat: 在通用设置中添加语言切换 UI"
```

---

## Task 7: 测试和验证

**Files:**
- None (手动测试)

- [ ] **Step 1: 启动开发服务器**

Run: `pnpm run tauri:dev`

Expected: 应用启动成功，默认显示中文界面

- [ ] **Step 2: 测试语言切换**

1. 打开设置面板
2. 进入通用设置
3. 在语言下拉菜单中选择 "English"
4. 验证界面文本切换为英文
5. 选择 "中文"
6. 验证界面文本切换回中文

Expected: 语言切换即时生效，无需保存

- [ ] **Step 3: 测试语言持久化**

1. 切换到英文
2. 关闭应用
3. 重新启动应用
4. 验证界面仍为英文

Expected: 语言偏好在重启后保持

- [ ] **Step 4: 测试翻译完整性**

1. 浏览所有设置面板
2. 检查所有文本是否都有翻译
3. 检查是否有遗漏的翻译键

Expected: 所有 UI 文本都有正确的翻译

- [ ] **Step 5: 提交最终更改**

```bash
git add .
git commit -m "feat: 完成国际化功能实现"
```

---

## 完成

国际化功能实现完成！现在 Blink 支持中英文界面，用户可以在设置面板中切换语言。
