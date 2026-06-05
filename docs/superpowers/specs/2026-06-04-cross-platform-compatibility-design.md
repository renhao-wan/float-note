# 跨平台兼容性改造设计文档

## 概述

将 FloatNote 项目中的 macOS 特有代码改为三平台（macOS、Windows、Linux）兼容的方式，采用最小改动方案。

## 背景

当前项目存在以下 macOS 特有问题：
- 键盘快捷键仅检测 `metaKey`（Cmd），Windows/Linux 上无法触发
- ⌘ 符号硬编码在 UI 中，视觉上不适用于 Windows
- `open_system_settings` 仅支持 macOS
- 权限提示文本直接引用 macOS 概念
- 窗口透明度在非 macOS 上返回错误

## 设计方案

### 1. 前端键盘快捷键统一

**目标**：所有快捷键在 macOS 上用 Cmd，在 Windows/Linux 上用 Ctrl

**改动文件**：
- `src/components/windows/DetachedNoteWindow.tsx`
- `src/hooks/use-keyboard-shortcuts.tsx`
- `src/hooks/use-chord-shortcuts.tsx`

**实现方式**：
```typescript
// src/lib/platform.ts - 新增平台工具函数
export const isMac = (): boolean => {
  return navigator.platform.includes('Mac');
};

export const isPrimaryModifier = (e: KeyboardEvent): boolean => {
  return isMac() ? e.metaKey : e.ctrlKey;
};

export const getModifierSymbol = (): string => {
  return isMac() ? '⌘' : 'Ctrl';
};
```

**DetachedNoteWindow.tsx 改动**：
```typescript
// 修改前
if (e.metaKey && e.shiftKey && e.key.toLowerCase() === 'p') { ... }
if (e.metaKey && e.key.toLowerCase() === 'w') { ... }

// 修改后
import { isPrimaryModifier } from '../../lib/platform';

if (isPrimaryModifier(e) && e.shiftKey && e.key.toLowerCase() === 'p') { ... }
if (isPrimaryModifier(e) && e.key.toLowerCase() === 'w') { ... }
```

### 2. ⌘ 符号平台自适应

**目标**：快捷键提示在 macOS 显示 ⌘，Windows/Linux 显示 Ctrl

**改动文件**：
- `src/components/notes/NotesPanel.tsx`
- `src/components/notes/EditorArea.tsx`
- `src/components/layout/NavigationSidebar.tsx`
- `src/components/settings/SettingsPanel.tsx`

**实现方式**：
```typescript
import { getModifierSymbol } from '../../lib/platform';

// 使用示例
title={`Create (${getModifierSymbol()}N)`}
title={`Settings (${getModifierSymbol()},)`}
```

### 3. 系统设置打开（三平台）

**目标**：`open_system_settings` 在三平台都能打开对应的权限设置

**改动文件**：
- `src-tauri/src/modules/system_commands.rs`

**实现方式**：
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
        // Windows 10/11 设置 URI
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

### 4. 权限提示文本平台自适应

**目标**：权限提示文本根据平台显示正确的内容

**改动文件**：
- `src/locales/en.json`
- `src/locales/zh.json`
- `src/components/common/PermissionPrompt.tsx`

**改动内容**：
```json
// 修改前
"permissions": {
  "enableGlobalShortcuts": "Enable Global Shortcuts",
  "accessibilityRequired": "Accessibility Access Required",
  "description": "FloatNote needs Accessibility access to enable global shortcuts...",
  ...
}

// 修改后
"permissions": {
  "enableGlobalShortcuts": "Enable Global Shortcuts",
  "accessibilityRequired": "System Permissions Required",
  "description": "FloatNote needs system permissions to enable global shortcuts. Please grant the required permissions in your system settings.",
  ...
}
```

**PermissionPrompt.tsx 改动**：
- 将 "macOS 权限" 改为 "系统权限"
- 将 "辅助功能访问" 改为平台中立的描述
- 快捷键符号使用 `getModifierSymbol()`

### 5. 窗口透明度优雅降级

**目标**：Windows/Linux 上透明度滑块显示提示，功能不可用但不报错

**改动文件**：
- `src/hooks/use-window-transparency.ts`
- `src/components/settings/TransparencyControls.tsx`

**实现方式**：
```typescript
// use-window-transparency.ts
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
}

// TransparencyControls.tsx
import { isMac } from '../../lib/platform';

{!isMac() && (
  <div className="text-xs text-muted-foreground/60 mt-2">
    Window opacity control is only available on macOS
  </div>
)}
```

### 6. 保持不变的部分

以下内容保持不变，不影响跨平台兼容性：

- `macOSPrivateApi: true` - Tauri 配置，不影响其他平台编译
- `entitlements.plist` - macOS 打包必需，不影响其他平台
- `cocoa`/`objc` 依赖 - 条件编译，只在 macOS 上引入
- `titleBarStyle: "Overlay"` - Tauri 会自动处理跨平台
- 窗口透明度后端代码 - 保持 macOS 实现，其他平台优雅降级

## 新增文件

- `src/lib/platform.ts` - 平台检测工具函数

## 改动文件清单

### 前端
| 文件 | 改动内容 |
|------|----------|
| `src/lib/platform.ts` | 新增：平台检测工具函数 |
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

### 后端
| 文件 | 改动内容 |
|------|----------|
| `src-tauri/src/modules/system_commands.rs` | open_system_settings 扩展到三平台 |

## 验证方式

1. **macOS**：运行 `pnpm run tauri:dev`，验证所有快捷键、⌘ 符号、权限设置正常
2. **Windows**：运行 `pnpm run tauri:dev`，验证 Ctrl 快捷键、Ctrl 符号、权限设置可打开
3. **Linux**：运行 `pnpm run tauri:dev`，验证 Ctrl 快捷键、Ctrl 符号、权限设置可打开
4. **三平台**：验证窗口透明度滑块在非 macOS 上显示提示，不报错

## 风险评估

- **低风险**：前端改动，纯 UI 和事件处理
- **低风险**：国际化文本改动
- **中风险**：系统命令改动，需要测试各平台的命令是否正确

## 后续优化（不在本次范围内）

- Windows 上使用 `window.set_effects()` 实现亚克力/云母效果
- Linux 上使用 `window.set_effects()` 实现 blur 效果
- 将后端 macOS 特有代码模块化到 `platform/macos.rs`
