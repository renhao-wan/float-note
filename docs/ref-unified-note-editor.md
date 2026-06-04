# 重构文档：统一笔记编辑器组件

**分支名称：** `refactor/unified-note-editor`
**日期：** 2025-07-14
**状态：** 规划中

## 目录
1. [问题陈述](#问题陈述)
2. [重复代码分析](#重复代码分析)
3. [拟议方案](#拟议方案)
4. [实现计划](#实现计划)
5. [优势](#优势)
6. [风险缓解](#风险缓解)
7. [测试策略](#测试策略)

## 问题陈述

FloatNote 应用目前在主窗口编辑器 (`EditorArea.tsx`) 和分离窗口编辑器 (`DetachedNoteWindow.tsx`) 之间存在大量代码重复。这种重复带来了几个问题：

- **约 150 行重复代码** 在两个组件之间
- **维护负担** - 功能必须实现两次
- **行为不一致的风险** - 容易忘记更新两个地方
- **最近的例子** - vim 模式指示器在分离窗口中缺失，直到手动添加

## 重复代码分析

### 共享功能（当前重复）

1. **编辑器集成**
   - 使用相同配置的 CodeMirrorEditor 组件
   - 预览模式的 MarkdownRenderer
   - 预览/编辑模式切换逻辑
   - 内容变更处理

2. **Vim 模式支持**
   - Vim 状态跟踪 (`{ mode: string; subMode?: string }`)
   - 视觉指示器（INSERT/VISUAL/NORMAL 的颜色编码）
   - 模式变更回调

3. **样式和配置**
   - 纸张样式类生成 (`getPaperStyleClass` 函数)
   - 编辑器配置（fontSize、fontFamily、lineHeight）
   - 背景图案
   - 打字机模式支持

4. **UI 元素**
   - 保存状态指示器
   - 字数显示
   - 底部/状态栏模式

### 需要保留的关键差异

**EditorArea.tsx（主窗口）**
- 从父组件接收 props
- 使用 `textareaRef` 实现额外功能
- 带滑动胶囊动画的精致模式切换
- 显示「选择笔记开始编辑」空状态
- 集成到更大的布局系统

**DetachedNoteWindow.tsx（独立窗口）**
- 自包含，带自有数据获取
- 窗口特定功能（关闭、键盘快捷键）
- 自定义窗口外观（CustomTitleBar、WindowWrapper）
- 标题栏的紧凑模式切换
- 窗口折叠支持
- 加载和错误状态

## 拟议方案

### 新组件：`NoteEditor`

创建一个新组件，封装共享的编辑器功能，同时允许父组件保持其独特功能。

#### 组件位置
`/src/components/editor/NoteEditor.tsx`

#### 接口设计

```typescript
interface EditorConfig {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  editorFontFamily?: string;
  previewFontFamily?: string;
  contentFontSize?: number;
  syntaxHighlighting?: boolean;
  vimMode?: boolean;
  typewriterMode?: boolean;
  backgroundPattern?: string;
  notePaperStyle?: string;
}

interface VimStatus {
  mode: string;
  subMode?: string;
}

interface NoteEditorProps {
  // 内容
  content: string;
  onContentChange: (content: string) => void;

  // 预览模式
  isPreviewMode: boolean;
  onPreviewToggle?: () => void;

  // 配置
  config: EditorConfig;

  // Vim 模式
  vimStatus?: VimStatus;
  onVimStatusChange?: (status: VimStatus) => void;

  // 可选 props
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;

  // 渲染 props 用于自定义 UI 元素
  renderModeToggle?: () => React.ReactNode;
  renderFooter?: () => React.ReactNode;
}
```

#### 组件结构

```typescript
export function NoteEditor({
  content,
  onContentChange,
  isPreviewMode,
  onPreviewToggle,
  config,
  vimStatus,
  onVimStatusChange,
  placeholder = "开始写作...",
  autoFocus = false,
  className = "",
  textareaRef,
  renderModeToggle,
  renderFooter
}: NoteEditorProps) {
  // 共享纸张样式逻辑
  const paperStyleClass = getPaperStyleClass(config.notePaperStyle);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 可选自定义模式切换 */}
      {renderModeToggle && renderModeToggle()}

      {/* 编辑器/预览区域 */}
      <div className={`flex-1 relative overflow-hidden ${
        config.backgroundPattern && config.backgroundPattern !== 'none'
          ? `bg-pattern-${config.backgroundPattern}`
          : ''
      } ${paperStyleClass}`}>
        {!isPreviewMode ? (
          <CodeMirrorEditor
            value={content}
            onChange={onContentChange}
            placeholder={placeholder}
            vimMode={config.vimMode || false}
            fontSize={config.fontSize}
            fontFamily={config.editorFontFamily || config.fontFamily}
            lineHeight={config.lineHeight}
            typewriterMode={config.typewriterMode || false}
            autoFocus={autoFocus}
            className={paperStyleClass}
            onVimStatusChange={onVimStatusChange}
            textareaRef={textareaRef}
          />
        ) : (
          <MarkdownRenderer
            content={content}
            syntaxHighlighting={config.syntaxHighlighting}
            className={`w-full h-full overflow-y-auto prose prose-invert max-w-none cursor-text ${paperStyleClass}`}
            onDoubleClick={onPreviewToggle}
            title="双击编辑"
            style={{
              fontSize: `${config.contentFontSize || config.fontSize}px`,
              fontFamily: config.previewFontFamily || 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              lineHeight: config.lineHeight,
              padding: '1.5rem'
            }}
          />
        )}
      </div>

      {/* 可选自定义底部 */}
      {renderFooter && renderFooter()}
    </div>
  );
}
```

## 实现计划

### 第一阶段：创建核心组件
1. 创建 `/src/components/editor/NoteEditor.tsx`
2. 移动共享纸张样式工具函数
3. 实现核心编辑器/预览逻辑
4. 添加正确的 TypeScript 类型

### 第二阶段：重构 EditorArea
1. 导入 `NoteEditor`
2. 用新组件替换重复的编辑器逻辑
3. 使用渲染 props 实现自定义模式切换 UI
4. 保留所有现有功能

### 第三阶段：重构 DetachedNoteWindow
1. 导入 `NoteEditor`
2. 替换重复的编辑器逻辑
3. 使用渲染 props 实现窗口特定 UI
4. 确保 vim 模式和保存防抖仍然工作

### 第四阶段：清理
1. 移除所有重复代码
2. 更新导入和导出
3. 运行类型检查
4. 彻底测试两个窗口

## 优势

1. **代码减少** - 消除约 150 行重复代码
2. **单一事实来源** - 编辑器行为在一处定义
3. **更易维护** - 功能只需实现一次
4. **行为一致** - 保证两种上下文中功能相同
5. **更好的测试** - 可以单独单元测试核心编辑器逻辑
6. **未来灵活性** - 需要时可轻松添加新的编辑器上下文

## 风险缓解

### 保留独特功能
- 使用渲染 props 模式允许自定义 UI 元素
- 将窗口特定逻辑保留在父组件中
- 在需要时保持单独的配置处理

### 处理边缘情况
- 确保 `textareaRef` 仍适用于 EditorArea
- 保留 DetachedNoteWindow 中的键盘快捷键处理
- 维护正确的焦点管理

### 回滚策略
- 在功能分支上工作
- 过渡期间保留旧代码注释
- 移除旧代码前进行全面测试
- Git 历史允许轻松回滚

## 测试策略

### 手动测试清单
- [ ] 主窗口编辑器加载并显示内容
- [ ] 分离窗口编辑器加载并显示内容
- [ ] 预览模式切换在两种上下文中工作
- [ ] Vim 模式指示器正确显示
- [ ] 保存状态正常工作（带防抖）
- [ ] 键盘快捷键仍然有效
- [ ] 窗口特定功能保留
- [ ] 配置变更正确应用
- [ ] 无视觉回归

### 自动化测试机会
- `NoteEditor` 的单元测试
- 父组件的集成测试
- 可用时的视觉回归测试

## 成功标准

重构成功的条件：
1. 两个编辑器使用相同的核心组件
2. 无重复的编辑器逻辑
3. 所有现有功能工作完全相同
4. 代码更清晰、更易维护
5. 无用户可见的变更或回归

## 未来增强

此重构支持：
- 更轻松地添加新编辑器功能
- 编辑器预设或主题的可能性
- 更好的性能优化
- 简化的测试基础设施
