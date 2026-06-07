# 开发指南

## 环境要求

- Node.js >= 18
- pnpm
- Rust >= 1.70
- Tauri CLI

## 安装依赖

```bash
pnpm install
```

## 开发命令

```bash
# 仅前端开发服务器
pnpm run dev

# 完整 Tauri 开发模式（前端 + Rust 后端）
pnpm run tauri:dev
```

## 构建命令

```bash
# 构建前端
pnpm run build

# 构建完整桌面应用
pnpm run tauri:build
```

## 代码检查

```bash
# TypeScript 类型检查
pnpm run type-check

# ESLint 代码检查
pnpm run lint

# Prettier 格式化
pnpm run format
```

## 调试技巧

### 前端调试

开发模式下，使用浏览器 DevTools 调试前端：
- 右键 → 检查元素
- Console 查看日志（前缀 `[FLOATNOTE]`）

### 后端调试

Tauri 控制台输出 Rust 侧日志：
- 使用 `log_info!`、`log_error!` 宏
- 日志文件路径可通过 `get_log_file_path` 命令获取

### 事件调试

设置面板中有 "Test Event" 按钮用于调试事件系统。

## 代码规范

- 遵循现有 TypeScript 模式
- 避免使用 `any` 类型
- 控制台日志使用 `[FLOATNOTE]` 前缀
- 所有用户可见文本应引用 "FloatNote"

## 提交规范

提交信息格式：
```
type(scope): subject
```

类型：
- `feat` - 新功能
- `fix` - 修复
- `docs` - 文档
- `style` - 样式
- `refactor` - 重构
- `test` - 测试
- `chore` - 杂项
