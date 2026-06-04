# 测试窗口生命周期跟踪

本文档说明如何测试 FloatNote 中窗口生命周期事件跟踪的实现。

## 已实现内容

1. **后端窗口生命周期跟踪**
   - `create_detached_window` 现在设置窗口销毁的事件监听器
   - 当窗口被销毁（用户或操作系统关闭）时：
     - 从后端状态中移除窗口
     - 将更新后的状态保存到磁盘
     - 向前端发出 `window-destroyed` 事件，携带笔记 ID

2. **前端事件监听器**
   - App.tsx 现在监听 `window-destroyed` 事件
   - 收到事件后刷新窗口列表以与后端同步
   - 同时监听拖拽窗口的 `hybrid-window-destroyed` 事件

3. **窗口状态真相命令**
   - 新命令 `get_window_state_truth` 提供完整的可见性：
     - 所有 Tauri 窗口及其属性
     - 所有后端状态条目
     - Tauri 和后端状态之间的差异
   - 可通过开发工具栏的 "Window State Truth" 按钮访问

## 测试方法

### 1. 检查初始状态
```javascript
// 在主窗口的浏览器控制台中
await window.__TAURI__.invoke('get_window_state_truth')
```

### 2. 创建分离窗口
- 从侧边栏拖出笔记以创建分离窗口
- 或右键点击笔记并选择「在新窗口中打开」
- 或使用命令面板 (⌘K) 搜索要打开的笔记

### 3. 验证窗口已被跟踪
```javascript
// 再次检查状态 - 应显示新窗口
await window.__TAURI__.invoke('get_window_state_truth')
```

### 4. 关闭分离窗口
- 点击分离窗口的关闭按钮
- 或在分离窗口中按 ⌘W

### 5. 验证清理
```javascript
// 再次检查状态 - 窗口应已被移除
await window.__TAURI__.invoke('get_window_state_truth')
```

## 预期行为

- 当窗口关闭时，你应该在控制台中看到：
  - `[FLOATNOTE] Window destroyed event received for note: <note-id>`
  - `[FLOATNOTE] Windows after destroy cleanup: [...]`

- Window State Truth 输出应显示：
  - 关闭前：窗口同时存在于 Tauri 和后端状态中
  - 关闭后：窗口从 Tauri 和后端状态中均已移除

## 使用开发工具栏

1. 点击主窗口右下角的 "DEV" 按钮
2. 点击 "Window State Truth" 查看当前状态
3. 弹窗将显示完整的状态信息
4. 检查控制台获取格式化输出

## 调试技巧

- 如果窗口在状态中显示为「孤立」，使用开发工具栏中的 "Clear All Windows"
- 使用 "Refresh Windows" 强制同步前端和后端
- 检查日志：`~/Library/Application Support/com.float-note.dev/logs/float-note.log`
