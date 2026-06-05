# Bug 修复和改进实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 FloatNote 项目中的功能缺陷、性能问题和用户体验问题

**Architecture:** 分 4 个批次修复 12 个问题，按优先级排序：功能缺陷 → 性能优化 → 用户体验 → 代码质量

**Tech Stack:** TypeScript, React, Tauri 2.x

---

## 文件结构

### 修改文件

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
| `src/locales/en.json` | 添加新 key |
| `src/locales/zh.json` | 添加新 key |

### 删除文件

| 文件 | 原因 |
|------|------|
| `src/components/settings/AppearanceSettings.tsx` | 重复代码 |

---

## 批次 1：功能缺陷修复

### Task 1: 修复 saveNoteImmediately 逻辑错误

**Files:**
- Modify: `src/hooks/use-note-management.tsx:272`

- [ ] **Step 1: 修复逻辑错误**

找到第 272 行：
```typescript
// 修改前
if (!selectedNoteId || !currentContent === undefined) return;

// 修改后
if (!selectedNoteId || currentContent === undefined) return;
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/hooks/use-note-management.tsx
git commit -m "fix(note): 修复 saveNoteImmediately 逻辑错误"
```

---

### Task 2: 修复删除笔记后选择逻辑

**Files:**
- Modify: `src/hooks/use-note-management.tsx:334`

- [ ] **Step 1: 修复删除逻辑**

找到 `deleteNote` 函数，修改选择逻辑：
```typescript
// 修改前
const remainingNotes = notes.filter(note => note.id !== noteId);
if (selectedNoteId === noteId) {
  const nextNote = remainingNotes[0] || null;
  selectNote(nextNote?.id || null);
}

// 修改后 - 使用函数式更新获取最新状态
setNotes(prev => {
  const remainingNotes = prev.filter(note => note.id !== noteId);
  if (selectedNoteId === noteId) {
    const nextNote = remainingNotes[0] || null;
    // 使用 setTimeout 确保在状态更新后执行
    setTimeout(() => selectNote(nextNote?.id || null), 0);
  }
  return remainingNotes;
});
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/hooks/use-note-management.tsx
git commit -m "fix(note): 修复删除笔记后选择逻辑使用过时状态"
```

---

## 批次 2：性能优化

### Task 3: 优化 useDragToDetach 事件监听器

**Files:**
- Modify: `src/hooks/use-drag-to-detach.tsx:413`

- [ ] **Step 1: 添加 ref 来存储 dragState**

在 hook 开头添加：
```typescript
const dragStateRef = useRef(dragState);
useEffect(() => {
  dragStateRef.current = dragState;
}, [dragState]);
```

- [ ] **Step 2: 修改 useEffect 依赖**

```typescript
// 修改前
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    // 使用 dragState
  };
  // ...
}, [dragState, dragThreshold, onDrop]);

// 修改后
useEffect(() => {
  const handleMouseMove = (e: MouseEvent) => {
    // 使用 dragStateRef.current
    const currentDragState = dragStateRef.current;
    // ...
  };
  // ...
}, []); // 空依赖数组，只注册一次
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/hooks/use-drag-to-detach.tsx
git commit -m "perf(drag): 优化 useDragToDetach 事件监听器，避免频繁重建"
```

---

### Task 4: 清理过多的 console.log

**Files:**
- 多个文件

- [ ] **Step 1: 删除调试日志**

删除或用环境变量保护以下文件中的 console.log：
- `src/hooks/use-chord-shortcuts.tsx`
- `src/hooks/use-note-management.tsx`
- `src/hooks/use-global-event-listeners.tsx`
- `src/hooks/use-app-initialization.tsx`
- `src/stores/detached-windows-store.ts`
- `src/stores/config-store.ts`

```typescript
// 删除或改为
if (process.env.NODE_ENV === 'development') {
  console.log('[DEBUG] ...');
}
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "chore: 清理过多的 console.log 调试日志"
```

---

## 批次 3：用户体验优化

### Task 5: 缩短自动保存间隔

**Files:**
- Modify: `src/hooks/use-note-management.tsx:267`
- Modify: `src/components/windows/DetachedNoteWindow.tsx:165`

- [ ] **Step 1: 修改主窗口自动保存间隔**

找到第 267 行：
```typescript
// 修改前
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 30000);

// 修改后
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 3000);
```

- [ ] **Step 2: 修改分离窗口自动保存间隔**

找到第 165 行：
```typescript
// 修改前
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 30000);

// 修改后
saveTimeoutRef.current = setTimeout(async () => {
  // 保存逻辑
}, 3000);
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/hooks/use-note-management.tsx src/components/windows/DetachedNoteWindow.tsx
git commit -m "fix(save): 缩短自动保存间隔从 30 秒到 3 秒"
```

---

### Task 6: 添加 i18n key

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

- [ ] **Step 1: 添加英文 i18n key**

在 `src/locales/en.json` 中添加：
```json
{
  "titlebar": {
    "minimize": "Minimize",
    "maximize": "Maximize",
    "restore": "Restore",
    "close": "Close"
  },
  "editor": {
    "saving": "Saving...",
    "modified": "Modified",
    "saved": "Saved",
    "ready": "Ready",
    "words": "words",
    "edit": "Edit",
    "preview": "Preview",
    "untitled": "Untitled"
  },
  "settings": {
    "appearance": {
      "window": {
        "opacityUnavailable": "Window opacity control is only available on macOS"
      }
    }
  }
}
```

- [ ] **Step 2: 添加中文 i18n key**

在 `src/locales/zh.json` 中添加：
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
    "words": "字",
    "edit": "编辑",
    "preview": "预览",
    "untitled": "无标题"
  },
  "settings": {
    "appearance": {
      "window": {
        "opacityUnavailable": "窗口透明度控制仅在 macOS 上可用"
      }
    }
  }
}
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat(i18n): 添加编辑器和标题栏的 i18n key"
```

---

### Task 7: 更新组件使用 i18n

**Files:**
- Modify: `src/components/layout/CustomTitleBar.tsx`
- Modify: `src/components/notes/EditorArea.tsx`
- Modify: `src/components/windows/DetachedNoteWindow.tsx`

- [ ] **Step 1: 修改 CustomTitleBar.tsx**

添加导入并更新 title 属性：
```typescript
import { useTranslation } from 'react-i18next';

// 在组件中
const { t } = useTranslation();

// 修改 title 属性
title={t('titlebar.minimize')}
title={isMaximized ? t('titlebar.restore') : t('titlebar.maximize')}
title={t('titlebar.close')}
```

- [ ] **Step 2: 修改 EditorArea.tsx**

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// 修改按钮文字
{t('editor.edit')}
{t('editor.preview')}
```

- [ ] **Step 3: 修改 DetachedNoteWindow.tsx**

```typescript
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// 修改状态文字
{t('editor.saving')}
{t('editor.modified')}
{t('editor.saved')}
{t('editor.ready')}
{t('editor.words')}
```

- [ ] **Step 4: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/components/layout/CustomTitleBar.tsx src/components/notes/EditorArea.tsx src/components/windows/DetachedNoteWindow.tsx
git commit -m "feat(i18n): 更新组件使用 i18n"
```

---

### Task 8: 窗口透明度 macOS 提示

**Files:**
- Modify: `src/components/settings/TransparencyControls.tsx`

- [ ] **Step 1: 添加平台检测和提示**

```typescript
import { isMac } from '../../lib/platform';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

// 在滑块下方添加
{!isMac() && (
  <div className="text-xs text-muted-foreground/60 mt-2">
    {t('settings.appearance.window.opacityUnavailable')}
  </div>
)}
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/settings/TransparencyControls.tsx
git commit -m "fix(ui): 窗口透明度在非 macOS 上显示提示"
```

---

## 批次 4：功能和代码质量

### Task 9: 实现文件导入功能

**Files:**
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: 修改 handleImportFile 函数**

```typescript
const handleImportFile = async () => {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          // 调用 Tauri 命令创建笔记
          await invoke('create_note', { request: { content: text } });
          // 刷新笔记列表
          window.location.reload();
        } catch (error) {
          console.error('Failed to import file:', error);
          alert('Failed to import file');
        }
      }
    };
    input.click();
  } catch (error) {
    console.error('Failed to import file:', error);
    alert('Failed to import file');
  }
};
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/settings/SettingsPanel.tsx
git commit -m "feat(import): 实现文件导入功能"
```

---

### Task 10: 修复 ThemeSelector cleanup 依赖

**Files:**
- Modify: `src/components/settings/ThemeSelector.tsx`

- [ ] **Step 1: 使用 ref 存储最新值**

```typescript
const previewThemeIdRef = useRef(previewThemeId);
const savedThemeIdRef = useRef(savedThemeId);

useEffect(() => {
  previewThemeIdRef.current = previewThemeId;
}, [previewThemeId]);

useEffect(() => {
  savedThemeIdRef.current = savedThemeId;
}, [savedThemeId]);

useEffect(() => {
  return () => {
    // 使用 ref 获取最新值
    if (previewThemeIdRef.current && savedThemeIdRef.current) {
      applyTheme(getThemeById(savedThemeIdRef.current));
    }
  };
}, []);
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/settings/ThemeSelector.tsx
git commit -m "fix(theme): 修复 ThemeSelector cleanup 依赖"
```

---

### Task 11: 同步隐藏 textarea

**Files:**
- Modify: `src/components/editor/NoteEditor.tsx`

- [ ] **Step 1: 添加同步逻辑**

```typescript
useEffect(() => {
  if (textareaRef.current && content) {
    textareaRef.current.value = content;
  }
}, [content]);
```

- [ ] **Step 2: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/components/editor/NoteEditor.tsx
git commit -m "fix(editor): 同步隐藏 textarea 与 CodeMirror 内容"
```

---

### Task 12: 删除重复的 AppearanceSettings 组件

**Files:**
- Delete: `src/components/settings/AppearanceSettings.tsx`
- Modify: `src/components/settings/index.ts` (如果存在)

- [ ] **Step 1: 检查是否有引用**

搜索代码库中是否有引用 `AppearanceSettings`：
```bash
grep -r "AppearanceSettings" src/
```

- [ ] **Step 2: 删除文件**

```bash
rm src/components/settings/AppearanceSettings.tsx
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "refactor: 删除重复的 AppearanceSettings 组件"
```

---

## 最终验证

- [ ] **Step 1: 运行完整类型检查**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 2: 运行构建**

Run: `pnpm run build`
Expected: 构建成功

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "fix: 完成 bug 修复和改进"
```

---

## 验证清单

### 功能测试
- [ ] 测试 Cmd+S 保存功能
- [ ] 测试删除笔记后自动选择
- [ ] 测试文件导入功能
- [ ] 测试主题预览和恢复

### 性能测试
- [ ] 测试拖拽操作流畅度
- [ ] 检查控制台日志数量

### 国际化测试
- [ ] 切换语言检查所有文本
- [ ] 检查是否有遗漏的硬编码文本

### 构建验证
- [ ] `pnpm run type-check` 通过
- [ ] `pnpm run build` 通过
