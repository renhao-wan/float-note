# 架构说明

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 桌面框架 | Tauri v2 | 跨平台桌面应用框架 |
| 前端 | React 18 + TypeScript + Vite 5 | UI 框架 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 样式 | Tailwind CSS 3 | 原子化 CSS |
| 编辑器 | CodeMirror 6 | 代码编辑器 |
| Markdown | react-markdown + remark-gfm | Markdown 渲染 |
| UI 组件 | Radix UI | 无样式组件库 |
| 后端 | Rust + Tokio | 异步运行时 |
| 包管理 | pnpm | 快速包管理器 |

## 目录结构

```
float-note/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   │   ├── editor/               # 编辑器组件
│   │   │   ├── CodeMirrorEditor.tsx
│   │   │   └── NoteEditor.tsx
│   │   ├── layout/               # 窗口布局
│   │   │   ├── CustomTitleBar.tsx
│   │   │   ├── WindowWrapper.tsx
│   │   │   └── NavigationSidebar.tsx
│   │   ├── notes/                # 笔记相关
│   │   │   ├── NotesPanel.tsx
│   │   │   ├── EditorArea.tsx
│   │   │   └── TitleEditor.tsx
│   │   ├── settings/             # 设置面板
│   │   │   ├── GeneralSettings.tsx
│   │   │   └── ThemeSelector.tsx
│   │   └── windows/              # 窗口管理
│   │       ├── DetachedNoteWindow.tsx
│   │       └── DragGhost.tsx
│   ├── hooks/                    # 自定义 Hooks
│   │   ├── use-note-management.ts
│   │   ├── use-drag-to-detach.tsx
│   │   └── use-window-tracking.ts
│   ├── stores/                   # Zustand 状态管理
│   │   ├── config-store.ts
│   │   ├── notes-store.ts
│   │   └── detached-windows-store.ts
│   ├── services/                 # Tauri API 封装
│   │   ├── tauri-api.ts
│   │   └── detached-windows-api.ts
│   ├── lib/                      # 工具库
│   │   └── transparency/         # 跨平台透明度控制
│   ├── locales/                  # 国际化翻译
│   └── types/                    # TypeScript 类型定义
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── modules/              # 功能模块
│       │   ├── commands.rs       # 笔记 CRUD
│       │   ├── windows.rs        # 窗口管理
│       │   └── storage.rs        # 持久化存储
│       ├── handlers/             # 事件处理器
│       ├── services/             # 业务服务
│       └── types/                # Rust 类型定义
└── public/                       # 静态资源
```

## 核心模块

### 前端模块

| 模块 | 职责 |
|------|------|
| `components/` | UI 组件，按功能分组 |
| `hooks/` | 业务逻辑封装 |
| `stores/` | 全局状态管理 |
| `services/` | 后端 API 调用 |
| `lib/` | 通用工具函数 |

### 后端模块

| 模块 | 职责 |
|------|------|
| `modules/commands.rs` | 笔记增删改查命令 |
| `modules/windows.rs` | 窗口创建和管理 |
| `modules/storage.rs` | 配置和数据持久化 |
| `handlers/` | 菜单、快捷键、窗口事件处理 |
| `services/` | 业务逻辑服务层 |

## 数据流

```
用户操作 → React 组件 → Hooks → Tauri invoke → Rust 命令
                ↓
            Zustand Store ← Tauri 事件 ← Rust 状态更新
                ↓
            UI 更新
```

## 跨窗口同步

使用 Tauri 事件系统实现多窗口状态同步：

| 事件 | 触发时机 |
|------|----------|
| `note-created` | 创建笔记 |
| `note-updated` | 更新笔记内容 |
| `note-deleted` | 删除笔记 |
| `config-updated` | 配置变更 |
| `window-closed` | 关闭分离窗口 |
