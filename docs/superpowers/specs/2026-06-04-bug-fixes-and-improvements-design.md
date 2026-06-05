# Bug 修复和改进设计文档

## 概述

修复 FloatNote 项目中的功能缺陷、性能问题和用户体验问题。

## 问题清单

### 高优先级

| # | 问题 | 文件 | 影响 |
|---|------|------|------|
| 1 | 自动保存间隔过长 (30秒) | use-note-management.tsx, DetachedNoteWindow.tsx | 数据丢失风险 |
| 2 | saveNoteImmediately 逻辑错误 | use-note-management.tsx | Cmd+S 保存失效 |
| 3 | useDragToDetach 事件监听器频繁重建 | use-drag-to-detach.tsx | 拖拽卡顿 |
| 4 | 大量组件未使用 i18n 硬编码英文 | 多个组件 | 中文用户体验差 |

### 中优先级

| # | 问题 | 文件 | 影响 |
|---|------|------|------|
| 5 | 文件导入/导出功能未实现 | SettingsPanel.tsx | 功能缺失 |
| 6 | 删除笔记后选择逻辑使用过时状态 | use-note-management.tsx | 可能选中已删除笔记 |
| 7 | 窗口透明度仅限 macOS 但 UI 对所有平台显示 | TransparencyControls.tsx | 用户困惑 |
| 8 | 过多 console.log 调试日志 | 多个文件 | 性能和隐私 |
| 9 | ThemeSelector cleanup effect 缺少依赖 | ThemeSelector.tsx | 主题恢复失败 |
| 10 | 隐藏 textarea 与 CodeMirror 不同步 | NoteEditor.tsx | 打字机模式问题 |
| 11 | refreshWindows 被禁用 | detached-windows-store.ts | 窗口状态无法恢复 |
| 12 | AppearanceSettings 与 SettingsPanel 重复代码 | AppearanceSettings.tsx | 维护困难 |

---

## 修复方案

### 批次 1：功能缺陷修复

#### 问题 2：saveNoteImmediately 逻辑错误

**文件**: `src/hooks/use-note-management.tsx:272`

```typescript
// 修改前
if (!selectedNoteId || !currentContent === undefined) return;

// 修改后
if (!selectedNoteId || currentContent === undefined) return;
```

#### 问题 6：删除笔记后选择逻辑

**文件**: `src/hooks/use-note-management.tsx:334`

```typescript
// 修改前
const remainingNotes = notes.filter(note => note.id !== noteId);

// 修改后 - 使用 setNotes 回调中的最新状态
setNotes(prev => {
  const remainingNotes = prev.filter(note => note.id !== noteId);
  if (selectedNoteId === noteId) {
    const nextNote = remainingNotes[0] || null;
    selectNote(nextNote?.id || null);
  }
  return remainingNotes;
});
```

---

### 批次 2：性能优化

#### 问题 3：useDragToDetach 事件监听器频繁重建

**文件**: `src/hooks/use-drag-to-detach.tsx:413`

```typescript
// 修改前
useEffect(() => {
  // 事件监听器逻辑
}, [dragState, dragThreshold, onDrop]);

// 修改后 - 使用 ref 模式
const dragStateRef = useRef(dragState);
useEffect(() => {
  dragStateRef.current = dragState;
}, [dragState]);

useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    const currentDragState = dragStateRef.current;
    // ...
  };
  window.addEventListener('mousemove', handleMouseMove);
  return () => window.removeEventListener('mousemove', handleMouseMove);
}, []); // 空依赖数组
```

#### 问题 8：过多 console.log

```typescript
// 删除或改为
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] ...');
}
```

---

### 批次 3：用户体验优化

#### 问题 1：自动保存间隔过长

**文件**: `src/hooks/use-note-management.tsx:267` 和 `src/components/windows/DetachedNoteWindow.tsx:165`

```typescript
// 修改前
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 30000); // 30 秒

// 修改后
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 3000); // 3 秒
```

#### 问题 4：大量组件未使用 i18n

**需要修改的文件**:
- `src/components/settings/SettingsPanel.tsx`
- `src/components/notes/EditorArea.tsx`
- `src/components/layout/CustomTitleBar.tsx`
- `src/components/windows/DetachedNoteWindow.tsx`

**方案**: 将硬编码英文改为 `t()` 函数调用

**需要添加的 i18n key**:
```json
{
  "titlebar": {
    "minimize": "最小化",
    "maximize": "最大化",
    "restore": "还原",
    "close": "关闭"
  },
  "editor": {
    "saving": "保存中...",
    "modified": "已修改",
    "saved": "已保存",
    "ready": "就绪",
    "words": "字"
  }
}
```

#### 问题 7：窗口透明度仅限 macOS

**文件**: `src/components/settings/TransparencyControls.tsx`

```typescript
{!isMac() && (
  <div className="text-xs text-muted-foreground/60 mt-2">
    {t('settings.appearance.window.opacityUnavailable')}
  </div>
)}
```

---

### 批次 4：功能和代码质量

#### 问题 5：文件导入/导出未实现

**文件**: `src/components/settings/SettingsPanel.tsx`

```typescript
const handleImportFile = async () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md,.txt';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) {
      const text = await file.text();
      await invoke('create_note', { request: { content: text } });
    }
  };
  input.click();
};
```

#### 问题 9：ThemeSelector cleanup 缺少依赖

**文件**: `src/components/settings/ThemeSelector.tsx:31-39`

使用 ref 来获取最新值，或使用 `addEventListener('beforeunload')` 处理页面离开。

#### 问题 10：隐藏 textarea 不同步

**文件**: `src/components/editor/NoteEditor.tsx:119-127`

```typescript
useEffect(() => {
  if (textareaRef.current && content) {
    textareaRef.current.value = content;
  }
}, [content]);
```

#### 问题 11：refreshWindows 被禁用

分析加载循环原因并修复，然后重新启用 `refreshWindows`。

#### 问题 12：重复代码

删除 `src/components/settings/AppearanceSettings.tsx`，统一使用 `SettingsPanel` 中的 `renderAppearanceSection`。

---

## 改动文件清单

| 文件 | 改动内容 |
|------|----------|
| `src/hooks/use-note-management.tsx` | 修复保存逻辑、删除逻辑、自动保存间隔 |
| `src/components/windows/DetachedNoteWindow.tsx` | 自动保存间隔、i18n |
| `src/hooks/use-drag-to-detach.tsx` | 事件监听器优化 |
| `src/components/settings/SettingsPanel.tsx` | i18n、文件导入实现 |
| `src/components/notes/EditorArea.tsx` | i18n |
| `src/components/layout/CustomTitleBar.tsx` | i18n |
| `src/components/settings/TransparencyControls.tsx` | macOS 提示 |
| `src/components/settings/ThemeSelector.tsx` | cleanup 依赖修复 |
| `src/components/editor/NoteEditor.tsx` | textarea 同步 |
| `src/stores/detached-windows-store.ts` | refreshWindows 修复 |
| `src/components/settings/AppearanceSettings.tsx` | 删除（重复代码） |
| `src/locales/en.json` | 添加新 key |
| `src/locales/zh.json` | 添加新 key |

---

## 验证方式

1. **功能测试**
   - 测试 Cmd+S 保存功能
   - 测试删除笔记后自动选择
   - 测试文件导入功能
   - 测试主题预览和恢复

2. **性能测试**
   - 测试拖拽操作流畅度
   - 检查控制台日志数量

3. **国际化测试**
   - 切换语言检查所有文本
   - 检查是否有遗漏的硬编码文本

4. **构建验证**
   - `pnpm run type-check`
   - `pnpm run build`
