# 存储架构

## 目录结构

所有数据存储在**笔记目录**下，默认位置：

| 平台        | 路径                                            |
| ----------- | ----------------------------------------------- |
| **Windows** | `%APPDATA%/floatNote/data/`                     |
| **macOS**   | `~/Library/Application Support/floatNote/data/` |
| **Linux**   | `~/.local/share/floatNote/data/`                |

可在设置中自定义存储目录。

### 完整目录结构

```
{notes_dir}/
├── *.md                          # 笔记文件（Markdown + YAML frontmatter）
├── config.json                   # 应用配置
├── detached_windows.json         # 分离窗口状态
├── spatial_positions.json        # 全局空间位置配置
├── spatial_{note_id}.json        # 单个笔记的空间位置
├── attachments/                  # 附件目录
│   └── {note_id}/               # 每个笔记的附件
│       └── image.png
├── .trash/                       # 回收站
│   └── {note_id}.md
└── .floatnote/                   # 内部数据目录
    ├── workspace.json            # 工作区状态
    ├── links.json                # 双向链接索引
    └── templates/                # 模板目录
        └── custom_templates.json # 自定义模板
```

## 笔记存储

### 文件格式

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

### Frontmatter 字段

| 字段         | 类型     | 说明                      |
| ------------ | -------- | ------------------------- |
| `id`         | string   | 笔记唯一标识（slug 格式） |
| `title`      | string   | 笔记标题                  |
| `created_at` | string   | 创建时间（ISO 8601）      |
| `updated_at` | string   | 更新时间（ISO 8601）      |
| `tags`       | string[] | 标签列表                  |
| `position`   | number   | 排序位置                  |

### 文件命名

文件名 = 笔记 ID + `.md`，例如：

- 标题 "我的笔记" → 文件名 `我的笔记.md`
- 标题 "My Note" → 文件名 `my-note.md`

标题和文件名自动同步，重命名标题会同步修改文件名。

## 配置存储

### 配置文件

配置存储在 `config.json`：

```json
{
  "appearance": {
    "theme": "midnight-ink",
    "fontSize": 14,
    "editorFontFamily": "JetBrains Mono, monospace",
    "previewFontFamily": "Georgia, serif"
  },
  "editor": {
    "autoSave": true,
    "vimMode": false,
    "typewriterMode": false
  },
  "storage": {
    "notesDirectory": null,
    "useCustomDirectory": false
  },
  "window": {
    "height": 700,
    "width": 1000
  }
}
```

### 窗口位置存储

窗口位置存储在 `detached_windows.json`：

```json
{
  "note-xxx": {
    "note_id": "xxx",
    "window_label": "note-xxx",
    "position": [200, 200],
    "size": [600, 400],
    "is_shaded": false,
    "is_pinned": false
  }
}
```

## 重新加载机制

重新加载时会：

1. 从文件系统读取所有 `.md` 文件
2. 解析 YAML frontmatter 获取元数据
3. 修复位置冲突（如果有多个笔记 position 相同）
4. 更新内存缓存

**支持外部修改**：直接在文件系统中修改 `.md` 文件，重新加载后会自动同步。

## 内部数据说明

| 文件                                         | 用途                   |
| -------------------------------------------- | ---------------------- |
| `.floatnote/workspace.json`                  | 工作区状态（窗口布局） |
| `.floatnote/links.json`                      | 双向链接索引           |
| `.floatnote/templates/custom_templates.json` | 用户自定义模板         |
| `.trash/`                                    | 回收站（已删除笔记）   |
| `attachments/`                               | 附件存储               |
| `spatial_*.json`                             | 窗口空间位置           |
