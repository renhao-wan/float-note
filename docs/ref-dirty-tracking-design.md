# 脏标记系统设计

**分支名称：** `feature/dirty-tracking`
**日期：** 2025-07-14
**状态：** 已实现 ✅

## 概述

本文档概述了 FloatNote 脏标记系统的实现，确保我们只保存实际发生变化的笔记。这建立在最近的优化基础上，我们从批量保存切换到了单条笔记保存。

## 设计原则

1. **混合方法**：结合内部脏标记和文件哈希，实现全面的变更检测
2. **性能**：正常编辑操作期间开销最小
3. **可靠性**：检测内部编辑和外部文件变更
4. **简洁性**：清晰、可维护的实现

## 实现策略

### 1. 内部变更跟踪（脏标记）

**目的**：跟踪应用内进行的变更
**实现**：笔记 ID 到脏状态的 HashMap

```rust
// NotesState 中
pub struct NotesState {
    notes: Arc<Mutex<HashMap<String, Note>>>,
    dirty_flags: Arc<Mutex<HashMap<String, bool>>>,
    content_hashes: Arc<Mutex<HashMap<String, String>>>,
}
```

**优势**：
- 编辑期间零成本（只需设置标记）
- 即时变更检测
- 无计算开销

### 2. 外部变更检测（内容哈希）

**目的**：检测应用外部修改的文件
**实现**：存储在笔记索引中的 SHA-256 哈希

```rust
pub struct NoteIndexEntry {
    // ... 现有字段 ...
    file_hash: Option<String>, // 文件内容的 SHA-256 哈希
    content_hash: Option<String>, // 仅笔记内容的 SHA-256 哈希
}
```

**优势**：
- 检测外部编辑器/同步冲突
- 提供数据完整性验证
- 为未来智能同步奠定基础

## 实现计划

### 第一阶段：后端基础设施

1. 向 `NotesState` 添加脏标记跟踪：
   ```rust
   // 跟踪哪些笔记有未保存的更改
   dirty_flags: Arc<Mutex<HashMap<String, bool>>>

   // 跟踪内容哈希用于比较
   content_hashes: Arc<Mutex<HashMap<String, String>>>
   ```

2. 更新 `update_note` 命令：
   - 比较新内容与存储的哈希
   - 仅在内容实际变化时保存
   - 保存成功后更新哈希

3. 向 `FileStorageManager` 添加哈希计算：
   - 保存笔记时计算 SHA-256 哈希
   - 存储在笔记索引中用于外部变更检测

### 第二阶段：前端集成

1. 向笔记 store 添加脏状态：
   ```typescript
   interface NoteState {
     isDirty: boolean;
     lastSavedContent?: string;
   }
   ```

2. 更新保存逻辑：
   - 在编辑器中跟踪内容变化
   - 仅在内容不同时调用保存命令
   - 显示准确的保存状态

### 第三阶段：外部变更检测

1. 文件监视器集成：
   - 监控笔记目录的外部变更
   - 在变更事件时比较文件哈希
   - 提示用户解决冲突

2. 启动验证：
   - 检查文件哈希与索引的一致性
   - 检测应用关闭期间修改的笔记
   - 自动重新加载变更的笔记

## 技术细节

### 哈希计算

```rust
use sha2::{Sha256, Digest};

fn compute_content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}
```

### 脏标记管理

```rust
impl NotesState {
    pub fn mark_dirty(&self, note_id: &str) {
        let mut flags = self.dirty_flags.lock().await;
        flags.insert(note_id.to_string(), true);
    }

    pub fn clear_dirty(&self, note_id: &str) {
        let mut flags = self.dirty_flags.lock().await;
        flags.remove(note_id);
    }

    pub fn is_dirty(&self, note_id: &str) -> bool {
        let flags = self.dirty_flags.lock().await;
        flags.get(note_id).copied().unwrap_or(false)
    }
}
```

## 优势

1. **性能**：仅在必要时保存
2. **可靠性**：检测所有类型的变更
3. **用户体验**：准确的保存指示器
4. **面向未来**：支持高级同步功能

## 测试策略

1. 哈希计算的单元测试
2. 脏标记生命周期的集成测试
3. 保存优化的端到端测试
4. 外部变更检测的手动测试

## 迁移说明

- 现有笔记将在首次保存时获取哈希
- 对当前功能无破坏性变更
- 可通过功能标记逐步推出
