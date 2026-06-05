# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

FloatNote 是一个 AI 原生的空间笔记应用，基于 Tauri v2 + React + TypeScript 构建。核心特性是多窗口架构——笔记可以被分离为独立的浮动窗口，形成空间化的知识管理系统。

## 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm run dev              # 仅启动 Vite 前端开发服务器
pnpm run tauri:dev        # 启动完整的 Tauri 开发模式（前端 + Rust 后端）

# 类型检查和代码检查
pnpm run type-check       # TypeScript 类型检查
pnpm run lint             # ESLint 代码检查

# 构建
pnpm run build            # 构建前端
pnpm run tauri:build      # 构建完整的桌面应用

# 格式化
pnpm run format           # Prettier 格式化
pnpm run format:check     # 检查格式
```

## 架构

### 前端结构
- `/src/App.tsx` - 主应用组件，处理多窗口路由和布局
- `/src/components/` - UI 组件，按功能分组：
  - `layout/` - 窗口布局组件（CustomTitleBar, WindowWrapper, NavigationSidebar）
  - `notes/` - 笔记相关组件（NotesPanel, EditorArea, TitleEditor）
  - `windows/` - 窗口管理组件（DetachedNoteWindow, DragGhost, ResizablePanel）
  - `settings/` - 设置面板组件
  - `common/` - 共享组件（CommandPalette, Sidebar, ContextMenu）
  - `ui/` - 基础 UI 原语（Button, Slider）
- `/src/stores/` - Zustand 状态管理
  - `notes-store.ts` - 笔记选择和搜索状态
  - `config-store.ts` - 应用配置
  - `detached-windows-store.ts` - 分离窗口跟踪
  - `window-positions-store.ts` - 窗口位置持久化
- `/src/hooks/` - 自定义 React hooks，封装业务逻辑
  - `use-note-management.tsx` - 笔记 CRUD 操作
  - `use-drag-to-detach.tsx` - 拖拽分离窗口功能
  - `use-chord-shortcuts.tsx` - 组合快捷键（Hyperkey 模式）
  - `use-window-transparency.ts` - 窗口透明度控制
- `/src/services/` - Tauri API 封装层
  - `tauri-api.ts` - 通过 `invoke()` 调用 Rust 命令
- `/src/types/` - TypeScript 类型定义

### 后端结构 (Rust/Tauri)
- `/src-tauri/src/lib.rs` - 应用入口，注册所有 Tauri 命令
- `/src-tauri/src/state.rs` - 应用状态定义（使用 Arc<RwLock<>> 实现线程安全）
- `/src-tauri/src/modules/` - 功能模块
  - `storage.rs` - 配置和窗口数据持久化
  - `file_notes_storage.rs` - 基于文件系统的笔记存储（Markdown + frontmatter）
  - `file_operations.rs` - 文件导入/导出操作
  - `windows.rs` - 窗口创建和管理命令
  - `commands.rs` - 笔记 CRUD 命令
  - `modified_state_tracker.rs` - 跨窗口修改状态跟踪
- `/src-tauri/src/handlers/` - 事件处理器（菜单、快捷键、窗口位置）
- `/src-tauri/src/services/` - 业务服务层
- `/src-tauri/src/types/` - Rust 类型定义（Note, AppConfig, DetachedWindow）

### 透明度模块
- `/src/lib/transparency/` - 跨平台透明度控制模块
  - `types.ts` - 策略接口和类型定义
  - `strategy-manager.ts` - 策略管理器（单例）
  - `strategies/` - 平台特定实现
    - `macos.ts` - macOS 实现（使用 NSWindow API）
    - `windows.ts` - Windows 实现（使用 Win32 API）
    - `linux.ts` - Linux 实现（使用 X11/Wayland）
  - `constants.ts` - 常量定义

### 窗口架构
应用使用多窗口系统，不同窗口类型有不同的权限集：
- **main** - 主应用窗口
- **note-*** - 分离的笔记窗口，具有完整编辑权限
- **drag-ghost-*** - 拖拽预览窗口
- **hybrid-drag-*** - 拖拽分离过程中的混合窗口

窗口权限在 `tauri.conf.json` 的 `capabilities` 中定义。

### 状态同步
跨窗口状态通过 Tauri 的事件系统实时同步：
- `note-updated` / `note-created` / `note-deleted` - 笔记变更事件
- `config-updated` - 配置变更事件
- 前端通过 `useGlobalEventListeners` hook 监听这些事件

### 笔记存储格式
笔记以 Markdown 文件存储，包含 YAML frontmatter：
```markdown
---
id: uuid
title: 标题
created_at: ISO日期
updated_at: ISO日期
tags: []
position: 0
---

笔记内容...
```

## 关键设计决策

1. **拖拽分离 (Drag-to-Detach)**: 从侧边栏拖拽笔记可创建浮动窗口，使用 `useDragToDetach` hook 实现
2. **空间位置持久化**: 窗口位置和大小通过 `window-positions-store` 保存和恢复
3. **命令面板**: ⌘K 打开模糊搜索面板，支持笔记搜索和命令执行
4. **实时预览**: ⌘⇧P 切换编辑/预览模式
5. **全局快捷键**: Hyperkey+N 创建新笔记（需要系统辅助功能权限）
6. **Typewriter Mode**: 打字机模式，光标保持在编辑器中央
7. **透明度策略模式**: 使用策略模式实现跨平台透明度控制，每个平台有独立的策略实现
8. **分离窗口透明度**: 只有分离窗口支持透明度控制，主窗口不支持
9. **配置统一**: 透明度配置统一存储在 `appearance.detachedWindowOpacity`

## 调试技巧

- 开发模式下，使用浏览器 DevTools 调试前端
- Tauri 控制台输出 Rust 侧日志
- 设置面板中有 "Test Event" 按钮用于调试事件系统
- 日志文件路径可通过 `get_log_file_path` 命令获取
- 前端日志使用 `[FLOATNOTE]` 前缀

## 注意事项

- 所有用户可见文本应引用 "FloatNote" 而非 "Notes App"
- 控制台日志使用 `[FLOATNOTE]` 前缀
- 遵循现有 TypeScript 模式，避免使用 `any` 类型
- 窗口透明度和毛玻璃美学是设计核心
- 保持空间隐喻在 UI/UX 决策中的一致性
