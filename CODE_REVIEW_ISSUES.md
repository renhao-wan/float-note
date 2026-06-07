# FloatNote 代码审查问题清单

> 审查日期: 2026-06-07
> 共 51 个问题，按优先级分组

---

## P0 — 严重问题（需立即修复）

- [x] **#1** XSS 风险：MarkdownRenderer 缺少 `rehype-sanitize`，链接 `href` 未过滤 `javascript:` 协议
  - 文件: `src/components/common/MarkdownRenderer.tsx`
  - 详情: `react-markdown` + `remark-gfm` + `rehype-highlight` 不会自动净化所有 HTML。恶意 Markdown 可注入 `[click me](javascript:alert('xss'))`

- [x] **#2** 事件监听器泄漏（竞态条件）
  - 文件: `src/hooks/use-global-event-listeners.tsx` 第 118-127 行
  - 详情: 如果组件在 `setupListeners()` resolve 前卸载，`cleanup` 为 `undefined`，所有 `listen()` 注册的事件监听器永远无法被移除

- [x] **#3** `handleCloseWindow` 缺少 `useCallback` 导致 useEffect 无限重执行
  - 文件: `src/components/windows/DetachedNoteWindow.tsx` 第 218 行、第 310 行
  - 详情: 每次渲染创建新引用，导致键盘事件监听器反复添加/移除

- [x] **#4** `updateNoteContent` 闭包捕获过期的 `note` 引用
  - 文件: `src/components/windows/DetachedNoteWindow.tsx` 第 169-216 行
  - 详情: `useCallback` 依赖 `note` 对象，3 秒 `setTimeout` 回调中捕获的 `note` 可能是过期值

- [x] **#5** `config-store` 中 `updateAlwaysOnTop`/`updateAppearance` 不发事件
  - 文件: `src/stores/config-store.ts` 第 60-151 行
  - 详情: 绕过了带事件发射的 `updateConfig`，导致多窗口配置不同步

- [x] **#6** `update_note` rename 分支未更新 content hash
  - 文件: `src-tauri/src/modules/commands.rs` 第 184-226 行
  - 详情: 标题变更导致 ID 变更时提前 return，新 ID 无 hash 记录，旧 ID 记录未清理，内容变更检测失效

- [x] **#7** `rename_note` 完全未使用 ModifiedStateTracker
  - 文件: `src-tauri/src/modules/commands.rs` 第 258-326 行
  - 详情: 函数没有接收 `modified_tracker` 参数，重命名后 tracker 记录不会更新

- [x] **#8** `FileNotesStorage::save_all_notes` 非原子写入
  - 文件: `src-tauri/src/modules/file_notes_storage.rs` 第 78-91 行
  - 详情: 先更新缓存再逐个写入磁盘，中途失败会导致缓存与磁盘不一致

- [x] **#9** `detached-windows-store` 中 `createWindow` 成功后 `loading` 卡死
  - 文件: `src/stores/detached-windows-store.ts` 第 64-67 行
  - 详情: 成功后没有 `set({ loading: false })`，`loading` 永远为 `true`

---

## P1 — 中等问题（需尽快修复）

### 前端

- [x] **#10** `useNoteSync` 回调不稳定，每次渲染取消/重建订阅
  - 文件: `src/hooks/use-note-management.ts` 第 60-64 行
  - 详情: 内联箭头函数每次渲染都是新引用，`useEffect` 依赖数组包含 `onNoteUpdate`，高频编辑场景下造成性能问题

- [x] **#11** `NotesPanel` 的 `useMemo` 内执行副作用（修改 ref）
  - 文件: `src/components/notes/NotesPanel.tsx` 第 43-53 行
  - 详情: `useMemo` 内部调用 `isWindowOpen` 并修改 `openWindowIdsRef.current`，`useMemo` 应该是纯计算

- [ ] **#12** `CodeMirrorEditor` 多个 `useEffect` 互相冲突地重建编辑器状态
  - 文件: `src/components/editor/CodeMirrorEditor.tsx` 第 385-443 行
  - 详情: `vimMode` 和 `typewriterMode` 变化时都调用 `view.setState()` 重建状态，同时变化会产生竞态
  - **推迟原因**: 需要重构为统一的编辑器状态管理，涉及 CodeMirror 扩展系统的设计决策

- [x] **#13** `Vim.defineEx` 全局注册，多窗口实例互相覆盖 `onSave`
  - 文件: `src/components/editor/CodeMirrorEditor.tsx` 第 298-309 行
  - 详情: 后注册的会覆盖先注册的，导致 `onSave` 指向错误的回调

- [x] **#14** `EditorArea` 的 `renderHeader`/`renderFooter` 每次渲染创建新引用
  - 文件: `src/components/notes/EditorArea.tsx` 第 78 行、第 131 行
  - 详情: 作为 props 传给 `NoteEditor`，破坏子组件 `React.memo` 优化

- [x] **#15** `CustomTitleBar` 每次渲染调用 `getCurrentWebviewWindow()`
  - 文件: `src/components/layout/CustomTitleBar.tsx` 第 34 行
  - 详情: 应用 `useMemo(() => getCurrentWebviewWindow(), [])` 稳定化

- [x] **#16** `ResizablePanel` 的 `mousemove` 无节流调用 `onResize`（60+次/秒）
  - 文件: `src/components/windows/ResizablePanel.tsx` 第 26-31 行
  - 详情: 每次鼠标移动都调用 `onResize`，父组件执行重操作时会导致性能问题

- [x] **#17** `window-positions-store` 使用 `any` 类型，违反项目规范
  - 文件: `src/stores/window-positions-store.ts` 第 32-35 行
  - 详情: 应使用 `DetachedWindow` 类型

- [ ] **#18** `detached-windows-store` 和 `window-positions-store` 严重职责重叠
  - 文件: `src/stores/detached-windows-store.ts` 和 `src/stores/window-positions-store.ts`
  - 详情: 两个 store 都调用相同的 Tauri 后端命令，维护独立状态，建议合并
  - **推迟原因**: 重大架构重构，需要仔细规划迁移路径，避免破坏现有功能

- [x] **#19** `config-store` 的 `loadConfig` 异常时 error 被置为 null
  - 文件: `src/stores/config-store.ts` 第 52-56 行
  - 详情: 加载失败但 `error: null`，用户看不到任何错误提示

- [x] **#20** `DetachedWindowOpacitySlider` 初始化时无条件覆盖用户透明度设置
  - 文件: `src/components/windows/DetachedWindowOpacitySlider.tsx` 第 49-58 行
  - 详情: 挂载时强制设为 `TRANSPARENCY_CONFIG.defaultOpacity`（0.9），忽略 `initialOpacity`

- [x] **#21** `tauri-api.ts` 完全没有错误处理
  - 文件: `src/services/tauri-api.ts`
  - 详情: 所有方法都没有 `try/catch`，异常直接冒泡，日志中无 `[FLOATNOTE]` 前缀
  - **推迟原因**: 需要统一错误处理策略，与 #43 一起处理

### 后端

- [x] **#22** `toggle_all_windows_hover` 隐藏分支持有锁时间过长
  - 文件: `src-tauri/src/modules/windows.rs` 第 379-386 行
  - 详情: `windows_lock` 被持有后直到函数结束才释放，应尽快 drop

- [x] **#23** `rename_note` 先修改内存再操作磁盘，磁盘失败导致数据丢失
  - 文件: `src-tauri/src/modules/commands.rs` 第 290-296 行
  - 详情: 先从内存移除旧 note，再尝试磁盘重命名，失败时旧 note 已丢失

- [ ] **#24** 多函数同时持有 `notes` 和 `config` 两个锁，锁顺序脆弱
  - 文件: `src-tauri/src/modules/commands.rs`
  - 详情: 目前获取顺序一致（先 notes 后 config），但未来修改可能引入死锁
  - **推迟原因**: 需要重构为统一的应用状态结构体，涉及整个后端架构

- [x] **#25** `generate_unique_title` 理论上可能无限循环
  - 文件: `src-tauri/src/modules/commands.rs` 第 74-87 行
  - 详情: 缺少最大重试次数限制

- [ ] **#26** 同步文件 I/O 声明为 `async fn`，阻塞 Tokio 运行时
  - 文件: `src-tauri/src/modules/storage.rs`、`src-tauri/src/modules/file_notes_storage.rs`
  - 详情: 使用 `std::fs` 而非 `tokio::fs`，阻塞工作线程
  - **推迟原因**: 桌面应用本地 SSD 影响较小，改动范围大需全面测试

- [x] **#27** `data_loader.rs` 静默吞掉启动加载错误
  - 文件: `src-tauri/src/startup/data_loader.rs` 第 26-27 行
  - 详情: `load_notes` 或 `load_detached_windows` 失败时完全静默，不记录日志

- [x] **#28** Windows 换行符 `\r\n` 导致 frontmatter 解析失败
  - 文件: `src-tauri/src/modules/file_operations.rs` 第 314 行
  - 详情: 只处理 `---\n`，不处理 `---\r\n`

- [x] **#29** `export_all_notes_to_directory` 缺少路径验证
  - 文件: `src-tauri/src/modules/file_operations.rs` 第 144 行
  - 详情: 来自前端的 `directory_path` 直接用于创建目录和写入文件，无验证

- [ ] **#30** `error.rs` 定义了完善的错误类型但几乎未被使用
  - 文件: `src-tauri/src/error.rs`
  - 详情: 所有 Tauri command 都返回 `Result<T, String>`，错误信息丢失上下文
  - **推迟原因**: 需要全面修改所有 Tauri command 的返回类型，影响面广

---

## P2 — 低优先级问题

### 前端

- [x] **#31** `App.tsx` 大量内联回调传给子组件，导致不必要的重渲染链
  - 文件: `src/App.tsx` 第 96-266 行
  - **推迟原因**: 需要系统性重构组件 props 接口，涉及多个子组件

- [x] **#32** `use-drag-to-detach` 中 `isOutsideSidebar`/`realWindowCreated` 不必要的 state
  - 文件: `src/hooks/use-drag-to-detach.tsx` 第 33-34 行
  - 详情: 从未返回给消费者，仅通过 ref 使用，应移除 state 改用 ref

- [x] **#33** `saveNoteImmediately` 依赖 `currentContent` 导致引用不稳定
  - 文件: `src/hooks/use-note-management.ts` 第 247-290 行
  - 详情: 每次用户输入字符回调都重建，应使用 ref 持有 `currentContent`

- [x] **#34** `use-app-initialization` 的 `Promise.all` 未 await
  - 文件: `src/hooks/use-app-initialization.ts` 第 22-25 行
  - 详情: 未处理的 Promise rejection 风险，`data-loaded` 事件可能触发重复加载

- [x] **#35** `use-window-tracking` 生产环境 60 秒 debounce 过于激进
  - 文件: `src/hooks/use-window-tracking.ts` 第 7-8 行
  - 详情: 应用崩溃时可能丢失最多 60 秒的窗口位置变更

- [x] **#36** `platform.ts` 使用已废弃的 `navigator.platform`
  - 文件: `src/lib/platform.ts` 第 7 行
  - 详情: 应复用 `strategy-manager.ts` 中的 `userAgent` 方案

- [x] **#37** 策略管理器 `getOpacity` 不查询实际窗口状态，仅返回缓存
  - 文件: `src/lib/transparency/strategy-manager.ts` 第 100-108 行
  - 详情: 缓存丢失时所有窗口透明度被错误报告为默认值

- [x] **#38** `formatDate` 未处理无效日期字符串
  - 文件: `src/lib/utils.ts` 第 7-22 行
  - 详情: `Invalid Date` 会静默通过所有条件判断

- [x] **#39** `MarkdownRenderer` 的 `onError` 手动 DOM 操作不受 React 管理
  - 文件: `src/components/common/MarkdownRenderer.tsx` 第 86-93 行
  - 详情: 组件卸载时手动创建的 DOM 节点不会被 React 清理

- [x] **#40** `toast-store` 的 `toastCounter` 全局变量在 HMR 下不重置
  - 文件: `src/stores/toast-store.ts` 第 17 行
  - 详情: 应使用 `crypto.randomUUID()` 或 `Date.now()` + 随机数

- [x] **#41** `use-global-event-listeners` 中空事件监听器（`window-closed`/`window-created`）
  - 文件: `src/hooks/use-global-event-listeners.tsx` 第 75-84 行
  - 详情: 注册了事件但回调函数体为空，消耗资源却什么都不做

- [x] **#42** `window-positions-store` 硬编码窗口 label 格式 `note-${noteId}`
  - 文件: `src/stores/window-positions-store.ts` 第 100-120 行
  - 详情: 后端 label 生成逻辑变化时会悄悄出错
  - **推迟原因**: 与 #18 一起处理（store 合并时统一 label 管理）

- [ ] **#43** 各 store 错误处理策略不统一
  - 文件: 全部 store
  - 详情: 有的抛异常，有的静默，有的设 error 状态，建议统一
  - **推迟原因**: 需要制定统一的错误处理规范并全面修改

- [x] **#44** `NotesPanel` 搜索未做防抖，每次输入对所有笔记执行 `markdownToPlainText`
  - 文件: `src/components/notes/NotesPanel.tsx` 第 62-65 行
  - 详情: 笔记数量多或内容长时会很慢

### 后端

- [x] **#45** `AppState` struct 定义了但从未使用
  - 文件: `src-tauri/src/state.rs` 第 10-44 行
  - 详情: 实际使用的是 `Mutex` type alias，两套并行状态定义容易混淆

- [x] **#46** `storage.rs` 中 `save_notes_to_disk`/`load_notes_from_disk` 是 dead code
  - 文件: `src-tauri/src/modules/storage.rs` 第 14-47 行
  - 详情: 旧 JSON 存储方式的残留，已被 `FileNotesStorage` 替代

- [x] **#47** `note_commands.rs` 和 `note_service.rs` 全部是未使用的 v2 迁移残留
  - 文件: `src-tauri/src/modules/note_commands.rs`、`src-tauri/src/services/note_service.rs`
  - 详情: 增加维护负担和编译时间

- [x] **#48** `update_app_menu` 是空实现，多处调用做无用功
  - 文件: `src-tauri/src/modules/windows.rs` 第 1364-1372 行
  - 详情: TODO 占位符，函数体只是 `Ok(())`
  - **推迟原因**: 需要实现完整的菜单更新逻辑或移除相关调用

- [x] **#49** `uuid_from_slug.rs` 使用 RFC 4122 DNS namespace UUID 而非自定义
  - 文件: `src-tauri/src/utils/uuid_from_slug.rs` 第 5 行
  - 详情: 应生成随机 UUID v4 作为专属 namespace

- [x] **#50** `menu_handler.rs` 中 `"59"` 菜单 ID 疑似调试残留
  - 文件: `src-tauri/src/handlers/menu_handler.rs` 第 276 行
  - 详情: 需要加注释说明或删除

- [x] **#51** 日志方式不一致（`println!` vs `log_info!` 宏）
  - 文件: `src-tauri/src/modules/windows.rs`
  - 详情: 应统一使用日志宏以便于日志收集和过滤
  - **推迟原因**: 需要全面扫描替换，影响文件较多
