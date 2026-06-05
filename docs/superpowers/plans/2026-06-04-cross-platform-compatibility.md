# 跨平台兼容性改造实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 FloatNote 项目中的 macOS 特有代码改为三平台（macOS、Windows、Linux）兼容的方式

**Architecture:** 采用最小改动方案，创建平台工具函数统一处理跨平台逻辑，前端使用 `navigator.platform` 检测平台，后端使用 `#[cfg(target_os)]` 条件编译

**Tech Stack:** TypeScript, React, Rust, Tauri 2.x

---

## 文件结构

### 新增文件
- `src/lib/platform.ts` - 平台检测工具函数

### 修改文件
| 文件 | 改动内容 |
|------|----------|
| `src/components/windows/DetachedNoteWindow.tsx` | Cmd+W/P 改为支持 Ctrl |
| `src/hooks/use-keyboard-shortcuts.tsx` | 更新日志文本 |
| `src/hooks/use-chord-shortcuts.tsx` | 更新日志文本 |
| `src/components/notes/NotesPanel.tsx` | ⌘ 符号改为平台自适应 |
| `src/components/notes/EditorArea.tsx` | ⌘ 符号改为平台自适应 |
| `src/components/layout/NavigationSidebar.tsx` | ⌘ 符号改为平台自适应 |
| `src/components/settings/SettingsPanel.tsx` | ⌘ 符号改为平台自适应 |
| `src/locales/en.json` | 权限文本平台中立化 |
| `src/locales/zh.json` | 权限文本平台中立化 |
| `src/components/common/PermissionPrompt.tsx` | 权限提示平台自适应 |
| `src/hooks/use-window-transparency.ts` | 非 macOS 优雅降级 |
| `src/components/settings/TransparencyControls.tsx` | 非 macOS 显示提示 |
| `src-tauri/src/modules/system_commands.rs` | open_system_settings 扩展到三平台 |

---

## Task 1: 创建平台工具函数

**Files:**
- Create: `src/lib/platform.ts`

- [ ] **Step 1: 创建平台工具函数文件**

```typescript
// src/lib/platform.ts

/**
 * 检测当前平台是否为 macOS
 */
export const isMac = (): boolean => {
  return navigator.platform.includes('Mac');
};

/**
 * 检测主修饰键（macOS: Cmd, Windows/Linux: Ctrl）
 */
export const isPrimaryModifier = (e: KeyboardEvent): boolean => {
  return isMac() ? e.metaKey : e.ctrlKey;
};

/**
 * 获取平台对应的修饰键符号（macOS: ⌘, Windows/Linux: Ctrl）
 */
export const getModifierSymbol = (): string => {
  return isMac() ? '⌘' : 'Ctrl';
};

/**
 * 获取平台对应的快捷键显示文本
 * @param key - 按键字母（如 'N', 'K'）
 * @param modifiers - 修饰键数组（如 ['shift', 'alt']）
 */
export const getShortcutDisplay = (key: string, modifiers: string[] = []): string => {
  const parts: string[] = [getModifierSymbol()];
  if (modifiers.includes('shift')) parts.push('⇧');
  if (modifiers.includes('alt')) parts.push(isMac() ? '⌥' : 'Alt');
  parts.push(key);
  return parts.join('');
};
```

- [ ] **Step 2: 验证文件创建成功**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/platform.ts
git commit -m "feat(platform): 添加跨平台工具函数"
```

---

## Task 2: 修改 DetachedNoteWindow 键盘快捷键

**Files:**
- Modify: `src/components/windows/DetachedNoteWindow.tsx:190-226`

- [ ] **Step 1: 添加导入**

在文件顶部添加：
```typescript
import { isPrimaryModifier } from '../../lib/platform';
```

- [ ] **Step 2: 修改键盘事件处理**

将第 191-226 行的键盘事件处理改为：

```typescript
// Define the keyboard handler inside useEffect to avoid stale closures
const handleKeyDown = (e: KeyboardEvent) => {
  // Log all key combinations for debugging
  if (isPrimaryModifier(e)) {
    console.log('[DETACHED-WINDOW] Primary modifier key combo detected:', {
      key: e.key,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey
    });
  }

  // Primary+Shift+P to toggle preview mode
  if (isPrimaryModifier(e) && e.shiftKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    console.log('[DETACHED-WINDOW] Toggling preview mode');
    setIsPreviewMode(prev => !prev);
  }

  // Primary+W to close window
  if (isPrimaryModifier(e) && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    e.stopPropagation();
    console.log('[DETACHED-WINDOW] Primary+W pressed, closing window...');
    
    // Ensure we're in the right window context
    if (window.location.search.includes(`note=${noteId}`)) {
      console.log('[DETACHED-WINDOW] Confirmed this is the correct window');
      handleCloseWindow().catch(error => {
        console.error('[DETACHED-WINDOW] Error closing window:', error);
        appWindow.close().catch(() => {});
      });
    } else {
      console.warn('[DETACHED-WINDOW] Window context mismatch, ignoring Primary+W');
    }
  }
};
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/components/windows/DetachedNoteWindow.tsx
git commit -m "fix(shortcuts): DetachedNoteWindow 快捷键支持 Windows/Linux"
```

---

## Task 3: 更新键盘快捷钩子日志

**Files:**
- Modify: `src/hooks/use-keyboard-shortcuts.tsx`
- Modify: `src/hooks/use-chord-shortcuts.tsx`

- [ ] **Step 1: 修改 use-keyboard-shortcuts.tsx 日志**

将文件中的 macOS 特定日志改为平台中立：

```typescript
// 修改前
console.log('[SHORTCUT] Cmd key combo detected:', ...);

// 修改后
console.log('[SHORTCUT] Primary modifier key combo detected:', ...);
```

- [ ] **Step 2: 修改 use-chord-shortcuts.tsx 日志**

同样将 macOS 特定日志改为平台中立。

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/hooks/use-keyboard-shortcuts.tsx src/hooks/use-chord-shortcuts.tsx
git commit -m "fix(shortcuts): 更新快捷钩子日志为平台中立"
```

---

## Task 4: 修改 UI 中的 ⌘ 符号

**Files:**
- Modify: `src/components/notes/NotesPanel.tsx:107`
- Modify: `src/components/notes/EditorArea.tsx:99,114`
- Modify: `src/components/layout/NavigationSidebar.tsx:48`
- Modify: `src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: 修改 NotesPanel.tsx**

```typescript
// 修改前
title="Create (⌘N)"

// 修改后
import { getModifierSymbol } from '../../lib/platform';
title={`Create (${getModifierSymbol()}N)`}
```

- [ ] **Step 2: 修改 EditorArea.tsx**

```typescript
// 修改前
title="Edit mode (⌘⇧P)"

// 修改后
import { getModifierSymbol } from '../../lib/platform';
title={`Edit mode (${getModifierSymbol()}⇧P)`}
```

- [ ] **Step 3: 修改 NavigationSidebar.tsx**

```typescript
// 修改前
title={sidebarVisible && currentView === 'settings' ? t('sidebar.hideSettings') : `${t('sidebar.settings')} (⌘,)`}

// 修改后
import { getModifierSymbol } from '../../lib/platform';
title={sidebarVisible && currentView === 'settings' ? t('sidebar.hideSettings') : `${t('sidebar.settings')} (${getModifierSymbol()},)`}
```

- [ ] **Step 4: 修改 SettingsPanel.tsx**

将所有 `⌘` 符号替换为 `${getModifierSymbol()}`。

- [ ] **Step 5: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 6: 提交**

```bash
git add src/components/notes/NotesPanel.tsx src/components/notes/EditorArea.tsx src/components/layout/NavigationSidebar.tsx src/components/settings/SettingsPanel.tsx
git commit -m "fix(ui): ⌘ 符号改为平台自适应"
```

---

## Task 5: 修改后端系统命令

**Files:**
- Modify: `src-tauri/src/modules/system_commands.rs:7-21`

- [ ] **Step 1: 扩展 open_system_settings 函数**

```rust
#[tauri::command]
pub async fn open_system_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        // Windows 10/11 设置 URI - 打开键盘辅助功能设置
        std::process::Command::new("cmd")
            .args(["/C", "start", "ms-settings:easeofaccess-keyboard"])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        // 尝试打开通用设置，不同桌面环境可能不同
        std::process::Command::new("xdg-open")
            .arg("settings://privacy")
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
```

- [ ] **Step 2: 验证修改**

Run: `cd src-tauri && cargo check`
Expected: 无错误

- [ ] **Step 3: 提交**

```bash
git add src-tauri/src/modules/system_commands.rs
git commit -m "fix(system): open_system_settings 扩展到三平台"
```

---

## Task 6: 修改权限提示文本

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`
- Modify: `src/components/common/PermissionPrompt.tsx`

- [ ] **Step 1: 修改英文 locale**

修改 `src/locales/en.json` 中的权限相关文本：

```json
{
  "permissions": {
    "enableGlobalShortcuts": "Enable Global Shortcuts",
    "accessibilityRequired": "System Permissions Required",
    "description": "FloatNote needs system permissions to enable global shortcuts. Please grant the required permissions in your system settings.",
    "setupSteps": "Setup Steps",
    "step1": "Click 'Open Settings' below",
    "step2": "Find 'FloatNote' in the accessibility list",
    "step3": "Toggle the switch to enable access",
    "step4": "Restart FloatNote to activate shortcuts",
    "privacyNote": "Privacy Note:",
    "privacyDescription": "FloatNote only monitors specific keyboard combinations for global shortcuts. No other data is accessed or stored.",
    "openSettings": "Open Settings",
    "later": "Later"
  }
}
```

- [ ] **Step 2: 修改中文 locale**

修改 `src/locales/zh.json` 中的权限相关文本：

```json
{
  "permissions": {
    "enableGlobalShortcuts": "启用全局快捷键",
    "accessibilityRequired": "需要系统权限",
    "description": "FloatNote 需要系统权限来启用全局快捷键。请在系统设置中授予所需权限。",
    "setupSteps": "设置步骤",
    "step1": "点击下方「打开设置」",
    "step2": "在辅助功能应用列表中找到「FloatNote」",
    "step3": "切换开关以启用访问",
    "step4": "重启 FloatNote 以激活快捷键",
    "privacyNote": "隐私说明：",
    "privacyDescription": "FloatNote 仅监控全局快捷键的特定键盘组合。不会访问或存储其他数据。",
    "openSettings": "打开设置",
    "later": "稍后"
  }
}
```

- [ ] **Step 3: 修改 PermissionPrompt.tsx**

更新组件使用平台中立的文本，并使用 `getModifierSymbol()` 显示快捷键。

- [ ] **Step 4: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 5: 提交**

```bash
git add src/locales/en.json src/locales/zh.json src/components/common/PermissionPrompt.tsx
git commit -m "fix(i18n): 权限提示文本平台中立化"
```

---

## Task 7: 窗口透明度优雅降级

**Files:**
- Modify: `src/hooks/use-window-transparency.ts`
- Modify: `src/components/settings/TransparencyControls.tsx`

- [ ] **Step 1: 修改 use-window-transparency.ts**

```typescript
import { isMac } from '../../lib/platform';

export function useWindowTransparency() {
  const setOpacity = async (opacity: number) => {
    if (!isMac()) {
      console.warn('[FLOATNOTE] Window opacity is only available on macOS');
      return;
    }
    // 原有逻辑
    await invoke('set_window_opacity', { opacity });
  };

  // ... 其他代码
}
```

- [ ] **Step 2: 修改 TransparencyControls.tsx**

```typescript
import { isMac } from '../../lib/platform';

export function TransparencyControls() {
  return (
    <div>
      {/* 原有的滑块代码 */}
      {!isMac() && (
        <div className="text-xs text-muted-foreground/60 mt-2">
          Window opacity control is only available on macOS
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 验证修改**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 4: 提交**

```bash
git add src/hooks/use-window-transparency.ts src/components/settings/TransparencyControls.tsx
git commit -m "fix(opacity): 窗口透明度在非 macOS 上优雅降级"
```

---

## Task 8: 最终验证和提交

- [ ] **Step 1: 运行完整类型检查**

Run: `pnpm run type-check`
Expected: 无错误

- [ ] **Step 2: 运行构建**

Run: `pnpm run build`
Expected: 构建成功

- [ ] **Step 3: 运行 Rust 检查**

Run: `cd src-tauri && cargo check`
Expected: 无错误

- [ ] **Step 4: 最终提交**

```bash
git add -A
git commit -m "feat(cross-platform): 完成跨平台兼容性改造"
```

---

## 验证清单

### macOS 验证
- [ ] 运行 `pnpm run tauri:dev`
- [ ] 测试 Cmd+W 关闭窗口
- [ ] 测试 Cmd+Shift+P 切换预览
- [ ] 验证 ⌘ 符号显示正常
- [ ] 测试权限设置打开

### Windows 验证
- [ ] 运行 `pnpm run tauri:dev`
- [ ] 测试 Ctrl+W 关闭窗口
- [ ] 测试 Ctrl+Shift+P 切换预览
- [ ] 验证 Ctrl 符号显示正常
- [ ] 测试权限设置打开

### Linux 验证
- [ ] 运行 `pnpm run tauri:dev`
- [ ] 测试 Ctrl+W 关闭窗口
- [ ] 测试 Ctrl+Shift+P 切换预览
- [ ] 验证 Ctrl 符号显示正常
- [ ] 测试权限设置打开

### 通用验证
- [ ] 窗口透明度滑块在非 macOS 上显示提示
- [ ] 毛玻璃效果在所有平台正常工作
- [ ] 所有快捷键在对应平台正常触发
