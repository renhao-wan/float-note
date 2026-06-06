# FloatNote 代码审查问题清单

> 审查日期: 2026-06-06
> 审查范围: 整个项目（前端 React/TypeScript + 后端 Rust/Tauri）

---

## 目录

- [P0 - 必须立即修复](#p0---必须立即修复)
- [P1 - 高优先级](#p1---高优先级)
- [P2 - 中优先级](#p2---中优先级)
- [P3 - 低优先级](#p3---低优先级)

---

## P0 - 必须立即修复

### 1. [安全] CSP 被禁用

**文件:** `src-tauri/tauri.conf.json:44`

**问题:** Content Security Policy 设置为 `null`，webview 完全暴露于 XSS 攻击。攻击者可以注入任意脚本、样式和外部连接。

**当前代码:**
```json
"csp": null
```

**修复方案:**
```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'"
```

**状态:** ✅ 已修复 (commit: 1ec9b9d)

---

### 2. [Bug] 事件监听器竞态泄漏

**文件:** `src/hooks/use-app-initialization.tsx:36-43`

**问题:** `initializeApp()` 是异步函数，如果组件在 Promise 解析前卸载，事件监听器永远不会被移除，导致内存泄漏。

**当前代码:**
```typescript
let cleanup: (() => void) | undefined;
initializeApp().then(cleanupFn => {
  cleanup = cleanupFn;
});
return () => {
  if (cleanup) cleanup(); // Promise 未 resolve 时 cleanup 是 undefined，监听器泄漏
};
```

**修复方案:**
```typescript
useEffect(() => {
  let cleanup: (() => void) | undefined;
  let cancelled = false;

  initializeApp().then(cleanupFn => {
    if (cancelled) {
      cleanupFn(); // 已卸载，立即清理
    } else {
      cleanup = cleanupFn;
    }
  });

  return () => {
    cancelled = true;
    if (cleanup) cleanup();
  };
}, []);
```

**状态:** ✅ 已修复 (commit: 0616cce)

---

## P1 - 高优先级

### 3. [性能] `options` 对象不稳定导致全链路 memoization 失效

**文件:** `src/App.tsx:106-116` 和 `src/hooks/use-note-management.tsx:228,277`

**问题:** App.tsx 传给 `useNoteManagement` 的 `options` 对象每次渲染都是新创建的，导致 `updateNoteContent` 和 `saveNoteImmediately` 每次渲染都被重新创建，所有下游消费者也会重渲染。

**当前代码:**
```typescript
// App.tsx
const { ... } = useNoteManagement({
  onSaveComplete: (noteId, content) => { markSaved(content); },
  onError: (error) => { console.error(error); }
});
```

**修复方案:**
```typescript
// App.tsx
const options = useMemo(() => ({
  onSaveComplete: (noteId: string, content: string) => {
    markSaved(content);
  },
  onError: (error: string) => {
    console.error('Save error:', error);
  }
}), [markSaved]);

const { ... } = useNoteManagement(options);
```

**状态:** ✅ 已修复 (commit: 11611dc)

---

### 4. [安全] 文件操作无路径验证

**文件:** `src-tauri/src/modules/file_operations.rs:152-178`

**问题:** `set_notes_directory` 接受任意路径，无路径规范化或沙箱检查。恶意前端可以写入任意位置（路径遍历漏洞）。

**当前代码:**
```rust
pub async fn set_notes_directory(
    directory_path: String,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    let path = PathBuf::from(&directory_path);
    if !path.exists() { return Err(...); }
    if !path.is_dir() { return Err(...); }
    // 无路径规范化
    config_lock.storage.notes_directory = Some(directory_path);
}
```

**修复方案:**
```rust
pub async fn set_notes_directory(
    directory_path: String,
    config: State<'_, ConfigState>,
) -> Result<(), String> {
    let path = PathBuf::from(&directory_path);

    // 规范化路径，防止路径遍历
    let canonical = path.canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))?;

    // 可选：限制在用户目录下
    let home = dirs::home_dir().ok_or("Cannot determine home directory")?;
    if !canonical.starts_with(&home) {
        return Err("Notes directory must be under home directory".to_string());
    }

    // ... 继续原有逻辑
}
```

**状态:** ✅ 已修复 (commit: de5deed)

---

### 5. [Rust] 文件 I/O 在锁内执行导致性能问题

**文件:** `src-tauri/src/modules/windows.rs:1170-1174`

**问题:** `update_detached_window_position` 在每次像素移动时都持有锁并写磁盘，拖拽时造成严重卡顿。

**当前代码:**
```rust
let mut windows_lock = detached_windows.lock().await;
if let Some(window) = windows_lock.get_mut(&window_label) {
    window.position = (x, y);
    save_detached_windows_to_disk(&windows_lock).await?; // 每次像素移动都写磁盘
}
```

**修复方案:**
```rust
// 方案1：移除自动保存，由前端 debounce 后调用专门的保存命令
pub async fn update_detached_window_position(
    window_label: String,
    x: f64,
    y: f64,
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let mut windows_lock = detached_windows.lock().await;
    if let Some(window) = windows_lock.get_mut(&window_label) {
        window.position = (x, y);
        // 不在这里保存到磁盘
    }
    Ok(())
}

// 方案2：添加独立的保存命令，由前端在拖拽结束时调用
#[tauri::command]
pub async fn save_detached_windows_state(
    detached_windows: State<'_, DetachedWindowsState>,
) -> Result<(), String> {
    let windows_lock = detached_windows.lock().await;
    save_detached_windows_to_disk(&windows_lock).await?;
    Ok(())
}
```

**状态:** ✅ 已修复 (commit: a18f8c0)

---

### 6. [Rust] `std::thread::sleep` 在 async 上下文中阻塞运行时

**文件:** `src-tauri/src/modules/windows.rs:452`

**问题:** 在 async 函数中使用 `std::thread::sleep` 会阻塞 Tokio 运行时线程，影响其他异步任务。

**当前代码:**
```rust
std::thread::sleep(std::time::Duration::from_millis(100));
```

**修复方案:**
```rust
tokio::time::sleep(std::time::Duration::from_millis(100)).await;
```

**状态:** ✅ 已修复 (commit: 636d94d)

---

## P2 - 中优先级

### 7. [Bug] `error as string` 类型断言错误

**文件:** `src/stores/detached-windows-store.ts:41,70,94,157`

**问题:** 多个 catch 块使用 `error as string`，但 JavaScript 抛出的是 Error 对象，导致错误信息丢失。

**当前代码:**
```typescript
catch (error) {
  set({ error: error as string, loading: false });
}
```

**修复方案:**
```typescript
catch (error) {
  set({
    error: error instanceof Error ? error.message : String(error),
    loading: false
  });
}
```

**状态:** ✅ 已修复 (commit: 78b8ee0)

---

### 8. [性能] `selectNote` 依赖 `notes` 数组导致频繁重建

**文件:** `src/hooks/use-note-management.tsx:155-173`

**问题:** `selectNote` 依赖 `[notes]`，而 `notes` 在每次输入时都会变化，导致 `selectNote` 每次按键都重建，进而导致 `NotesPanel` 重渲染。

**当前代码:**
```typescript
const selectNote = useCallback((noteId: string) => {
  const note = notes.find(n => n.id === noteId);
  // ...
}, [selectedNoteId, notes]); // notes 在每次输入时变化
```

**修复方案:**
```typescript
const notesRef = useRef(notes);
notesRef.current = notes;

const selectNote = useCallback((noteId: string) => {
  const currentNotes = notesRef.current;
  const note = currentNotes.find(n => n.id === noteId);
  // ...
}, [selectedNoteId]); // 移除 notes 依赖
```

**状态:** ✅ 已修复 (commit: f7060d3)

---

### 9. [性能] `deleteNote` 同样依赖 `notes` 数组

**文件:** `src/hooks/use-note-management.tsx:280-301`

**问题:** `deleteNote` 依赖 `[notes, selectNote]`，由于 `selectNote` 也依赖 `notes`，`deleteNote` 也会在每次按键时重建。

**修复方案:** 同 #8，使用 `useRef` 存储 notes 引用。

**状态:** ✅ 已修复 (commit: be310b8)

---

### 10. [性能] `NotesPanel` 中 `useEffect` 在每次 notes 变化时遍历所有笔记

**文件:** `src/components/notes/NotesPanel.tsx:42-50`

**问题:** `notes` 在每次用户输入时都会变化，导致这个 useEffect 在每次按键时执行。

**当前代码:**
```typescript
useEffect(() => {
  const openIds = new Set<string>();
  notes.forEach(note => {
    if (isWindowOpen(note.id)) {
      openIds.add(note.id);
    }
  });
  setOpenWindowIds(openIds);
}, [notes, isWindowOpen]);
```

**修复方案:**
```typescript
// 使用事件驱动方式，监听窗口打开/关闭事件
useEffect(() => {
  const updateOpenWindows = () => {
    const openIds = new Set<string>();
    notes.forEach(note => {
      if (isWindowOpen(note.id)) {
        openIds.add(note.id);
      }
    });
    setOpenWindowIds(openIds);
  };

  // 只在窗口状态变化时更新
  const unsubscribe = listen('window-state-changed', updateOpenWindows);
  updateOpenWindows(); // 初始化

  return () => { unsubscribe.then(fn => fn()); };
}, [isWindowOpen]); // 移除 notes 依赖
```

**状态:** ✅ 已修复 (commit: e8dd443)

---

### 11. [Rust] `unwrap()` 在 `duration_since` 上可能导致 panic

**文件:** `src-tauri/src/modules/windows.rs:457`

**问题:** 系统时钟错误时（如双启动系统、VM），`duration_since` 会返回 Err，`.unwrap()` 会导致 panic。

**当前代码:**
```rust
let ghost_label = format!("drag-ghost-{}", std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap()
    .as_millis());
```

**修复方案:**
```rust
let ghost_label = format!("drag-ghost-{}", std::time::SystemTime::now()
    .duration_since(std::time::UNIX_EPOCH)
    .unwrap_or_default()
    .as_millis());
```

**状态:** ✅ 已修复 (commit: 636d94d)

---

### 12. [Rust] 硬编码的屏幕尺寸

**文件:** `src-tauri/src/modules/window_commands.rs:156-157`

**问题:** 窗口定位使用开发者特定的屏幕尺寸（3440x1440），在其他屏幕上功能失效。

**当前代码:**
```rust
let screen_width = 3440.0; // TODO: Get actual screen width
let screen_height = 1440.0; // TODO: Get actual screen height
```

**修复方案:**
```rust
use tauri::Manager;

pub fn calculate_grid_coordinates(app_handle: &tauri::AppHandle) -> (f64, f64) {
    let monitor = app_handle.primary_monitor()
        .ok()
        .flatten()
        .ok_or("Cannot get primary monitor")?;

    let screen_width = monitor.size().width as f64;
    let screen_height = monitor.size().height as f64;

    // ... 继续原有逻辑
}
```

**状态:** ✅ 已修复 (commit: c67fe45)

---

### 13. [Rust] 不一致的锁获取顺序

**文件:** `src-tauri/src/services/note_service.rs:105-133`

**问题:** `create_note` 释放 cache 后获取 storage，而 `update_note` 同时持有两者。不一致的锁顺序是潜在死锁风险。

**修复方案:** 统一锁获取顺序，或使用 `try_lock` 并处理失败情况。

**状态:** ✅ 已修复 (commit: 02c4a26)

---

### 14. [Bug] `refreshWindows` 是空操作

**文件:** `src/stores/detached-windows-store.ts:64-66`

**问题:** `createWindow` 成功后调用 `refreshWindows()`，但该方法是空的，新窗口不会被添加到 store。

**修复方案:** 实现 `refreshWindows` 或在 `createWindow` 成功后直接更新 `windows` 数组。

**状态:** ✅ 已修复 (commit: 4387275)

---

### 15. [Bug] `usePermissions` 中 `setTimeout` 无清理

**文件:** `src/hooks/use-permissions.tsx:22-24`

**问题:** `requestPermissions` 中的 `setTimeout` 没有存储到 ref 中，组件卸载后无法清除。

**当前代码:**
```typescript
const requestPermissions = useCallback(() => {
  setTimeout(() => {
    setShowPermissionPrompt(true);
  }, 2000);
}, []);
```

**修复方案:**
```typescript
const timerRef = useRef<NodeJS.Timeout>();

useEffect(() => {
  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
}, []);

const requestPermissions = useCallback(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  timerRef.current = setTimeout(() => {
    setShowPermissionPrompt(true);
  }, 2000);
}, []);
```

**状态:** ✅ 已修复 (commit: c40d87f)

---

## P3 - 低优先级

### 16. [风格] 调试日志残留

**文件:**
- `src/hooks/use-window-tracking.ts:19,34,78,87`
- `src/hooks/use-drag-to-detach.tsx:120,244`
- `src/stores/window-positions-store.ts:45,67,86`
- `src/hooks/use-app-initialization.tsx:19`

**问题:** 生产代码中存在调试用的 `console.log`。

**修复方案:** 引入日志级别控制或在构建时剥离。

**状态:** ☐ 待修复

---

### 17. [风格] 文件扩展名不一致

**文件:**
- `src/hooks/use-note-management.tsx`
- `src/hooks/use-app-initialization.tsx`
- `src/hooks/use-context-menu.tsx`
- `src/hooks/use-window-manager.tsx`
- `src/hooks/use-permissions.tsx`

**问题:** 不含 JSX 的 hook 文件使用 `.tsx` 扩展名。

**修复方案:** 改为 `.ts` 扩展名。

**状态:** ☐ 待修复

---

### 18. [风格] Zustand store 中使用 `Map` 类型

**文件:** `src/stores/window-positions-store.ts:11`

**问题:** Zustand 使用引用相等性判断状态变化，Map 每次更新都创建新实例，即使内容未变也会触发重渲染。

**修复方案:** 使用普通对象 `{ [key: string]: WindowPosition }` 或配合 `immer` 中间件。

**状态:** ☐ 待修复

---

### 19. [Rust] 66 个 `.unwrap()` 调用

**文件:** 分布在 6 个 Rust 文件中

**问题:** 可能导致 panic，影响应用稳定性。

**修复方案:** 逐步替换为 `?` 操作符或 `.unwrap_or_default()`。

**状态:** ☐ 待修复

---

### 20. [Rust] `serde_yaml = "0.9"` 已停止维护

**文件:** `src-tauri/Cargo.toml:26`

**问题:** 该版本不再有安全更新。

**修复方案:** 考虑迁移到活跃维护的 YAML 库（如 `serde_yml`）。

**状态:** ☐ 待修复

---

### 21. [Rust] `tokio` 使用 `features = ["full"]`

**文件:** `src-tauri/Cargo.toml:28`

**问题:** 启用了所有特性，包括不需要的 `process` 等，增大攻击面。

**当前代码:**
```toml
tokio = { version = "1.0", features = ["full"] }
```

**修复方案:**
```toml
tokio = { version = "1.0", features = ["rt-multi-thread", "macros", "sync", "time"] }
```

**状态:** ☐ 待修复

---

### 22. [风格] 未使用的遗留组件

**文件:** `src/components/notes/NoteEditor.tsx`

**问题:** 与 `src/components/editor/NoteEditor.tsx` 是不同文件，使用 React Query 而非主应用的 `useNoteManagement`，可能未被使用。

**修复方案:** 确认是否使用，如未使用则删除。

**状态:** ☐ 待修复

---

### 23. [Bug] `useSaveStatus` 的 `getRelativeTime` 返回类型不一致

**文件:** `src/hooks/use-save-status.ts:9,77`

**问题:** 接口声明为 `string | null`，但实际是函数。当 `lastSaved` 为 null 时，调用会抛出 TypeError。

**修复方案:** 统一类型定义，确保 `getRelativeTime` 始终是函数。

**状态:** ☐ 待修复

---

### 24. [Rust] 静默丢弃的窗口操作错误

**文件:** `src-tauri/src/modules/windows.rs:381,400`

**问题:** 使用 `let _ = window.hide()` 和 `let _ = window.show()` 静默丢弃错误，调试困难。

**修复方案:** 至少记录日志：
```rust
if let Err(e) = window.hide() {
    log::warn!("Failed to hide window: {}", e);
}
```

**状态:** ☐ 待修复

---

### 25. [Rust] 重复的类型别名定义

**文件:**
- `src-tauri/src/state.rs:53-56`
- `src-tauri/src/types/window.rs:30-33`

**问题:** `NotesState`, `ConfigState`, `DetachedWindowsState`, `ToggleState` 在两处定义，维护风险。

**修复方案:** 统一到一处，另一处使用 `use` 导入。

**状态:** ☐ 待修复

---

## 修复进度跟踪

| 优先级 | 总数 | 已修复 | 待修复 |
|--------|------|--------|--------|
| P0 | 2 | 2 | 0 |
| P1 | 4 | 4 | 0 |
| P2 | 9 | 9 | 0 |
| P3 | 10 | 0 | 10 |
| **总计** | **25** | **15** | **10** |

---

## 相关资源

- [Tauri 安全最佳实践](https://tauri.app/v1/references/security/)
- [React Hooks 依赖数组最佳实践](https://react.dev/reference/rules/hooks#specifying-reactive-values)
- [Tokio 异步编程指南](https://tokio.rs/tokio/tutorial)
- [Content Security Policy 参考](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
