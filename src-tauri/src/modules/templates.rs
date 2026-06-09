use chrono::Datelike;
use once_cell::sync::Lazy;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

use crate::error::FloatNoteError;
use crate::modules::file_notes_storage::FileNotesStorage;
use crate::modules::storage::get_configured_notes_directory;
use crate::types::note::Note;
use crate::types::template::{CreateNoteFromTemplateRequest, CreateTemplateRequest, NoteTemplate};
use crate::NotesState;
use crate::{log_error, log_info};

/// 内置模板 ID 集合，用于快速查找
static BUILTIN_TEMPLATE_IDS: Lazy<HashSet<&'static str>> = Lazy::new(|| {
    [
        "daily-journal",
        "meeting-notes",
        "project-plan",
        "book-notes",
        "weekly-report",
    ]
    .into_iter()
    .collect()
});

/// 缓存的内置模板列表，避免每次调用都重新创建
static BUILTIN_TEMPLATES: Lazy<Vec<NoteTemplate>> = Lazy::new(|| {
    let fixed_time = "2024-01-01T00:00:00+00:00".to_string();

    vec![
        NoteTemplate {
            id: "daily-journal".to_string(),
            name: "日记".to_string(),
            description: "每日日记模板".to_string(),
            content: r#"# {{date}} 日记

## 今日计划
- [ ]
- [ ]
- [ ]

## 今日记录


## 今日总结


## 明日计划
- [ ]
- [ ]
- [ ]
"#
            .to_string(),
            is_builtin: true,
            created_at: fixed_time.clone(),
            updated_at: fixed_time.clone(),
        },
        NoteTemplate {
            id: "meeting-notes".to_string(),
            name: "会议记录".to_string(),
            description: "会议记录模板".to_string(),
            content: r#"# 会议记录

## 基本信息
- **日期**: {{date}}
- **时间**: {{time}}
- **参与者**:
- **地点**:

## 议程
1.
2.
3.

## 会议内容


## 行动项
- [ ]
- [ ]
- [ ]

## 下次会议
- **时间**:
- **议题**:
"#
            .to_string(),
            is_builtin: true,
            created_at: fixed_time.clone(),
            updated_at: fixed_time.clone(),
        },
        NoteTemplate {
            id: "project-plan".to_string(),
            name: "项目计划".to_string(),
            description: "项目计划模板".to_string(),
            content: r#"# 项目计划

## 项目概述
- **项目名称**:
- **开始日期**: {{date}}
- **预计完成**:
- **负责人**:

## 项目目标
1.
2.
3.

## 里程碑
- [ ] 里程碑 1:
- [ ] 里程碑 2:
- [ ] 里程碑 3:

## 任务分解
### 阶段 1
- [ ]
- [ ]

### 阶段 2
- [ ]
- [ ]

## 风险与挑战
-

## 资源需求
-

## 备注

"#
            .to_string(),
            is_builtin: true,
            created_at: fixed_time.clone(),
            updated_at: fixed_time.clone(),
        },
        NoteTemplate {
            id: "book-notes".to_string(),
            name: "读书笔记".to_string(),
            description: "读书笔记模板".to_string(),
            content: r#"# 读书笔记

## 书籍信息
- **书名**:
- **作者**:
- **阅读日期**: {{date}}
- **评分**: ⭐⭐⭐⭐⭐

## 核心观点
1.
2.
3.

## 章节笔记


## 金句摘录
>

## 个人感悟


## 行动计划
- [ ]
- [ ]
"#
            .to_string(),
            is_builtin: true,
            created_at: fixed_time.clone(),
            updated_at: fixed_time.clone(),
        },
        NoteTemplate {
            id: "weekly-report".to_string(),
            name: "周报".to_string(),
            description: "周报模板".to_string(),
            content: r#"# 周报

## 基本信息
- **周期**: {{date}}
- **姓名**:

## 本周完成
1.
2.
3.

## 本周问题
-

## 下周计划
1.
2.
3.

## 需要支持
-

## 备注

"#
            .to_string(),
            is_builtin: true,
            created_at: fixed_time.clone(),
            updated_at: fixed_time,
        },
    ]
});

/// 检查是否是内置模板
fn is_builtin_template(template_id: &str) -> bool {
    BUILTIN_TEMPLATE_IDS.contains(template_id)
}

/// Get the templates directory path
fn get_templates_dir(config: &crate::types::config::AppConfig) -> Result<PathBuf, FloatNoteError> {
    let notes_dir =
        get_configured_notes_directory(config).map_err(FloatNoteError::Storage)?;
    let templates_dir = notes_dir.join(".floatnote").join("templates");

    // Create directory if it doesn't exist
    if !templates_dir.exists() {
        fs::create_dir_all(&templates_dir).map_err(|e| {
            FloatNoteError::Storage(format!("Failed to create templates directory: {}", e))
        })?;
    }

    Ok(templates_dir)
}

/// Get the custom templates directory path
fn get_custom_templates_dir(
    config: &crate::types::config::AppConfig,
) -> Result<PathBuf, FloatNoteError> {
    let templates_dir = get_templates_dir(config)?;
    let custom_dir = templates_dir.join("custom");

    if !custom_dir.exists() {
        fs::create_dir_all(&custom_dir).map_err(|e| {
            FloatNoteError::Storage(format!(
                "Failed to create custom templates directory: {}",
                e
            ))
        })?;
    }

    Ok(custom_dir)
}

/// Load custom templates from disk
fn load_custom_templates(
    config: &crate::types::config::AppConfig,
) -> Result<Vec<NoteTemplate>, FloatNoteError> {
    let custom_dir = get_custom_templates_dir(config)?;
    let mut templates = Vec::new();

    if custom_dir.exists() {
        let entries = fs::read_dir(&custom_dir).map_err(|e| {
            FloatNoteError::Storage(format!("Failed to read custom templates directory: {}", e))
        })?;

        for entry in entries {
            let entry = entry.map_err(|e| {
                FloatNoteError::Storage(format!("Failed to read directory entry: {}", e))
            })?;
            let path = entry.path();

            if path.is_file() && path.extension().is_some_and(|ext| ext == "json") {
                match fs::read_to_string(&path) {
                    Ok(content) => match serde_json::from_str::<NoteTemplate>(&content) {
                        Ok(template) => templates.push(template),
                        Err(e) => {
                            log_error!("TEMPLATES", "Failed to parse template {:?}: {}", path, e);
                        }
                    },
                    Err(e) => {
                        log_error!("TEMPLATES", "Failed to read template {:?}: {}", path, e);
                    }
                }
            }
        }
    }

    Ok(templates)
}

/// Load all templates (builtin + custom)
fn load_all_templates(
    config: &crate::types::config::AppConfig,
) -> Result<Vec<NoteTemplate>, FloatNoteError> {
    let mut templates = BUILTIN_TEMPLATES.clone();
    templates.extend(load_custom_templates(config)?);
    Ok(templates)
}

/// Get all templates
#[tauri::command]
pub async fn get_all_templates(
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Vec<NoteTemplate>, FloatNoteError> {
    let config_lock = config.lock().await;
    load_all_templates(&config_lock)
}

/// Get a specific template (optimized - doesn't load all templates)
#[tauri::command]
pub async fn get_template(
    template_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    // 先检查内置模板（使用缓存）
    if let Some(template) = BUILTIN_TEMPLATES.iter().find(|t| t.id == template_id) {
        return Ok(template.clone());
    }

    // 再查找自定义模板
    let config_lock = config.lock().await;
    let custom_dir = get_custom_templates_dir(&config_lock)?;
    let file_path = custom_dir.join(format!("{}.json", template_id));

    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to read template: {}", e)))?;
        let template: NoteTemplate = serde_json::from_str(&content)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to parse template: {}", e)))?;
        return Ok(template);
    }

    Err(FloatNoteError::NotFound(format!(
        "Template not found: {}",
        template_id
    )))
}

/// Create a custom template
#[tauri::command]
pub async fn create_template(
    request: CreateTemplateRequest,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Creating template: {}", request.name);

    // 验证模板名称不为空
    if request.name.trim().is_empty() {
        return Err(FloatNoteError::Validation(
            "Template name cannot be empty".to_string(),
        ));
    }

    let custom_dir = get_custom_templates_dir(&config_lock)?;

    let now = chrono::Utc::now().to_rfc3339();
    let template_id = Uuid::new_v4().to_string();

    let template = NoteTemplate {
        id: template_id.clone(),
        name: request.name,
        description: request.description,
        content: request.content,
        is_builtin: false,
        created_at: now.clone(),
        updated_at: now,
    };

    // Save to file
    let file_path = custom_dir.join(format!("{}.json", template_id));
    let content = serde_json::to_string_pretty(&template)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to serialize template: {}", e)))?;

    fs::write(&file_path, content)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to write template: {}", e)))?;

    log_info!(
        "TEMPLATES",
        "Created template: {} ({})",
        template.name,
        template.id
    );

    Ok(template)
}

/// Update a custom template
#[tauri::command]
pub async fn update_template(
    template_id: String,
    request: CreateTemplateRequest,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    // 检查是否是内置模板
    if is_builtin_template(&template_id) {
        return Err(FloatNoteError::Validation(
            "Cannot modify builtin templates".to_string(),
        ));
    }

    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Updating template: {}", template_id);

    // 验证模板名称不为空
    if request.name.trim().is_empty() {
        return Err(FloatNoteError::Validation(
            "Template name cannot be empty".to_string(),
        ));
    }

    let custom_dir = get_custom_templates_dir(&config_lock)?;
    let file_path = custom_dir.join(format!("{}.json", template_id));

    // Load existing template
    let content = fs::read_to_string(&file_path)
        .map_err(|_| FloatNoteError::NotFound(format!("Template not found: {}", template_id)))?;

    let mut template: NoteTemplate = serde_json::from_str(&content)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to parse template: {}", e)))?;

    // Update fields
    template.name = request.name;
    template.description = request.description;
    template.content = request.content;
    template.updated_at = chrono::Utc::now().to_rfc3339();

    // Save
    let content = serde_json::to_string_pretty(&template)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to serialize template: {}", e)))?;

    fs::write(&file_path, content)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to write template: {}", e)))?;

    log_info!("TEMPLATES", "Updated template: {}", template_id);

    Ok(template)
}

/// Delete a custom template
#[tauri::command]
pub async fn delete_template(
    template_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<(), FloatNoteError> {
    // 检查是否是内置模板
    if is_builtin_template(&template_id) {
        return Err(FloatNoteError::Validation(
            "Cannot delete builtin templates".to_string(),
        ));
    }

    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Deleting template: {}", template_id);

    let custom_dir = get_custom_templates_dir(&config_lock)?;
    let file_path = custom_dir.join(format!("{}.json", template_id));

    log_info!("TEMPLATES", "Template file path: {:?}", file_path);

    if !file_path.exists() {
        log_error!("TEMPLATES", "Template file not found: {:?}", file_path);
        return Err(FloatNoteError::NotFound(format!(
            "Template not found: {}",
            template_id
        )));
    }

    fs::remove_file(&file_path).map_err(|e| {
        log_error!("TEMPLATES", "Failed to delete template file: {}", e);
        FloatNoteError::Storage(format!("Failed to delete template: {}", e))
    })?;

    log_info!("TEMPLATES", "Deleted template: {}", template_id);

    Ok(())
}

/// Create a note from a template
#[tauri::command]
pub async fn create_note_from_template(
    request: CreateNoteFromTemplateRequest,
    notes: tauri::State<'_, NotesState>,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Note, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!(
        "TEMPLATES",
        "Creating note from template: {}",
        request.template_id
    );

    // Get template (using optimized single lookup)
    let template = get_template_internal(&request.template_id, &config_lock)?;

    // Process template variables
    let now = chrono::Utc::now();
    let content = template
        .content
        .replace("{{title}}", &request.title)
        .replace("{{date}}", &now.format("%Y-%m-%d").to_string())
        .replace("{{time}}", &now.format("%H:%M").to_string())
        .replace("{{datetime}}", &now.format("%Y-%m-%d %H:%M").to_string())
        .replace(
            "{{weekday}}",
            get_weekday(now.weekday().num_days_from_monday()),
        );

    // Create note
    let mut notes_lock = notes.lock().await;

    // Find the highest position
    let max_position = notes_lock
        .values()
        .filter_map(|n| n.position)
        .max()
        .unwrap_or(-1);

    // Generate unique ID
    let existing_ids: std::collections::HashSet<String> = notes_lock.keys().cloned().collect();
    let note_id = crate::utils::generate_unique_slug(&request.title, &existing_ids);

    let note = Note {
        id: note_id,
        title: request.title,
        content,
        created_at: now.to_rfc3339(),
        updated_at: now.to_rfc3339(),
        position: Some(max_position + 1),
        tags: None,
    };

    // Save to memory
    notes_lock.insert(note.id.clone(), note.clone());

    // Save to disk
    let file_storage =
        FileNotesStorage::new(&config_lock).map_err(FloatNoteError::Storage)?;
    file_storage
        .save_note(&note)
        .await
        .map_err(FloatNoteError::Storage)?;

    log_info!(
        "TEMPLATES",
        "Created note from template: {} -> {}",
        template.name,
        note.id
    );

    Ok(note)
}

/// Internal function to get a single template (reused by create_note_from_template)
fn get_template_internal(
    template_id: &str,
    config: &crate::types::config::AppConfig,
) -> Result<NoteTemplate, FloatNoteError> {
    // 先检查内置模板
    if let Some(template) = BUILTIN_TEMPLATES.iter().find(|t| t.id == template_id) {
        return Ok(template.clone());
    }

    // 再查找自定义模板
    let custom_dir = get_custom_templates_dir(config)?;
    let file_path = custom_dir.join(format!("{}.json", template_id));

    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to read template: {}", e)))?;
        let template: NoteTemplate = serde_json::from_str(&content)
            .map_err(|e| FloatNoteError::Storage(format!("Failed to parse template: {}", e)))?;
        return Ok(template);
    }

    Err(FloatNoteError::NotFound(format!(
        "Template not found: {}",
        template_id
    )))
}

/// Get weekday name in Chinese
fn get_weekday(day: u32) -> &'static str {
    match day {
        0 => "周一",
        1 => "周二",
        2 => "周三",
        3 => "周四",
        4 => "周五",
        5 => "周六",
        6 => "周日",
        _ => "",
    }
}
