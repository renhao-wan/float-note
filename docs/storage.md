# 存储格式

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

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 笔记唯一标识（slug 格式） |
| `title` | string | 笔记标题 |
| `created_at` | string | 创建时间（ISO 8601） |
| `updated_at` | string | 更新时间（ISO 8601） |
| `tags` | string[] | 标签列表 |
| `position` | number | 排序位置 |

### 文件命名

文件名 = 笔记 ID + `.md`，例如：
- 标题 "我的笔记" → 文件名 `我的笔记.md`
- 标题 "My Note" → 文件名 `my-note.md`

标题和文件名自动同步，重命名标题会同步修改文件名。

### 存储位置

默认存储目录：
- macOS: `~/Documents/FloatNote/`
- Windows: `C:\Users\{用户名}\Documents\FloatNote\`
- Linux: `~/Documents/FloatNote/`

可在设置中自定义存储目录。

## 配置存储

### 配置文件

配置存储在 `.floatnote/config.json`：

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

窗口位置存储在 `.floatnote/window-positions.json`：

```json
{
  "main": { "x": 100, "y": 100, "width": 1000, "height": 700 },
  "note-xxx": { "x": 200, "y": 200, "width": 600, "height": 400 }
}
```

### 分离窗口存储

分离窗口状态存储在 `.floatnote/detached-windows.json`：

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
