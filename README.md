# FloatNote

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-v2-ffc131?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-dea584?logo=rust)](https://www.rust-lang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite)](https://vitejs.dev/)

FloatNote 是一个空间笔记应用，核心特性是多窗口架构——笔记可以被分离为独立的浮动窗口，形成空间化的知识管理系统。

## ✨ 特性

### 🪟 多窗口空间架构

- 从侧边栏拖拽笔记即可创建独立浮动窗口
- 支持窗口置顶、透明度调节、折叠（Shade）模式
- 窗口位置和大小自动持久化，跨会话恢复

### 📝 Markdown 编辑器

- 基于 CodeMirror 6，支持语法高亮
- 实时 Markdown 预览
- Vim 模式支持
- 打字机模式（光标保持在编辑器中央）
- 自动保存（3 秒防抖）

### 🎨 15 个内置主题

Obsidian Observatory、Dark Forest、Cosmic Dusk、Morning Mist、Warm Parchment、Pure Mono、Inverse Void、Terminal Green、Cyberpunk Neon、Executive Suite、Pastel Dream、Zen Garden、High Contrast Dark、Autumn Harvest、Arctic Frost

### 📁 文件管理

- 笔记以 Markdown 文件存储，带 YAML frontmatter
- 支持导入/导出 Markdown 文件
- 自定义笔记存储目录
- 标题重命名自动同步文件名

### 🌐 国际化

支持中文和英文，运行时切换

### 🔧 高度可定制

- 自定义编辑器字体、预览字体、应用字体
- 字体大小、行高调节
- 纸张样式：空白、点阵、横线、方格

## 🛠️ 技术栈

| 层级     | 技术                                           |
| -------- | ---------------------------------------------- |
| 桌面框架 | Tauri v2                                       |
| 前端     | React 18 + TypeScript + Vite 5                 |
| 状态管理 | Zustand                                        |
| 样式     | Tailwind CSS 3                                 |
| 编辑器   | CodeMirror 6                                   |
| Markdown | react-markdown + remark-gfm + rehype-highlight |
| UI 组件  | Radix UI                                       |
| 后端     | Rust + Tokio                                   |
| 包管理   | pnpm                                           |

## 📦 安装

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/)
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### 安装依赖

```bash
pnpm install
```

## 🚀 开发

```bash
# 仅前端开发服务器
pnpm run dev

# 完整 Tauri 开发模式（前端 + Rust 后端）
pnpm run tauri:dev
```

## 📦 构建

```bash
# 构建前端
pnpm run build

# 构建完整桌面应用（生成平台安装包）
pnpm run tauri:build
```

## 🔍 代码检查

```bash
# TypeScript 类型检查
pnpm run type-check

# ESLint 代码检查
pnpm run lint

# Prettier 格式化
pnpm run format
```

## 📂 项目结构

```
float-note/
├── src/                          # 前端源码
│   ├── components/               # React 组件
│   │   ├── editor/               # 编辑器组件
│   │   ├── layout/               # 窗口布局
│   │   ├── notes/                # 笔记相关
│   │   ├── settings/             # 设置面板
│   │   └── windows/              # 窗口管理
│   ├── hooks/                    # 自定义 Hooks
│   ├── stores/                   # Zustand 状态管理
│   ├── services/                 # Tauri API 封装
│   ├── lib/                      # 工具库
│   │   └── transparency/         # 跨平台透明度控制
│   ├── locales/                  # 国际化翻译
│   └── types/                    # TypeScript 类型定义
├── src-tauri/                    # Rust 后端
│   └── src/
│       ├── modules/              # 功能模块
│       ├── handlers/             # 事件处理器
│       ├── services/             # 业务服务
│       └── types/                # Rust 类型定义
├── public/                       # 静态资源
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 📝 笔记存储格式

笔记以 Markdown 文件存储，包含 YAML frontmatter：

```markdown
---
id: note-slug
title: 笔记标题
created_at: 2024-01-01T00:00:00Z
updated_at: 2024-01-01T00:00:00Z
tags: []
position: 0
---

笔记内容...
```

## 📚 文档

详细文档请查看 [docs](docs/) 目录：

- [架构说明](docs/architecture.md) - 项目整体架构、技术栈
- [开发指南](docs/development.md) - 环境搭建、开发流程
- [存储格式](docs/storage.md) - 笔记和配置存储说明
- [多窗口系统](docs/windows.md) - 窗口类型、状态同步
- [主题系统](docs/themes.md) - 主题结构、自定义主题

## 📄 许可证

[Apache License 2.0](LICENSE)

## 作者

Renhao Wan
