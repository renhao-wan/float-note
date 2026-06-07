# 多窗口系统

## 窗口类型

| 类型 | 前缀 | 说明 |
|------|------|------|
| 主窗口 | `main` | 应用主窗口，唯一 |
| 分离窗口 | `note-` | 笔记浮动窗口 |
| 拖拽预览 | `drag-ghost-` | 拖拽时的预览窗口 |
| 混合拖拽 | `hybrid-drag-` | 拖拽分离过程中的过渡窗口 |

## 窗口操作

### 创建分离窗口

1. **拖拽分离**：从侧边栏拖拽笔记到窗口外
2. **右键菜单**：右键笔记 → "分离窗口"
3. **API 调用**：`create_detached_window`

### 关闭分离窗口

1. **关闭按钮**：点击标题栏关闭按钮
2. **快捷键**：`Cmd/Ctrl + W`
3. **API 调用**：`close_detached_window`

### 窗口状态

| 状态 | 说明 |
|------|------|
| `is_shaded` | 折叠模式（仅显示标题栏） |
| `is_pinned` | 置顶模式 |
| `position` | 窗口位置 [x, y] |
| `size` | 窗口大小 [width, height] |

## 状态同步

### 事件系统

使用 Tauri 事件系统实现跨窗口同步：

| 事件 | 数据 | 说明 |
|------|------|------|
| `note-created` | Note | 创建笔记 |
| `note-updated` | Note | 更新笔记 |
| `note-deleted` | string (id) | 删除笔记 |
| `config-updated` | AppConfig | 配置变更 |
| `window-closed` | string (note_id) | 关闭窗口 |
| `all-detached-windows-cleared` | number | 关闭所有窗口 |

### 同步流程

```
窗口 A 操作 → Tauri invoke → Rust 处理 → emit 事件
                                        ↓
窗口 B ← listen 事件 ← 更新 Zustand Store ← 更新 UI
```

## 窗口配置

### 主窗口

- 透明背景
- 无原生标题栏
- 自定义标题栏组件
- 最小尺寸：200x40
- 默认尺寸：1000x700

### 分离窗口

- 独立编辑能力
- 支持透明度调节
- 支持折叠模式
- 位置和大小持久化

## 跨平台透明度

使用策略模式实现跨平台透明度控制：

| 平台 | 实现方式 |
|------|----------|
| macOS | NSWindow API |
| Windows | Win32 API |
| Linux | X11/Wayland |

只有分离窗口支持透明度控制，主窗口不支持。
