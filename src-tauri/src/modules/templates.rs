use std::fs;
use std::path::PathBuf;
use uuid::Uuid;
use chrono::Datelike;

use crate::types::template::{NoteTemplate, CreateTemplateRequest, CreateNoteFromTemplateRequest};
use crate::types::note::Note;
use crate::NotesState;
use crate::modules::storage::get_configured_notes_directory;
use crate::modules::file_notes_storage::FileNotesStorage;
use crate::{log_info, log_error};
use crate::error::FloatNoteError;

/// Get the templates directory path
fn get_templates_dir(config: &crate::types::config::AppConfig) -> Result<PathBuf, String> {
    let notes_dir = get_configured_notes_directory(config)?;
    let templates_dir = notes_dir.join(".floatnote").join("templates");

    // Create directory if it doesn't exist
    if !templates_dir.exists() {
        fs::create_dir_all(&templates_dir)
            .map_err(|e| format!("Failed to create templates directory: {}", e))?;
    }

    Ok(templates_dir)
}

/// Get the custom templates directory path
fn get_custom_templates_dir(config: &crate::types::config::AppConfig) -> Result<PathBuf, String> {
    let templates_dir = get_templates_dir(config)?;
    let custom_dir = templates_dir.join("custom");

    if !custom_dir.exists() {
        fs::create_dir_all(&custom_dir)
            .map_err(|e| format!("Failed to create custom templates directory: {}", e))?;
    }

    Ok(custom_dir)
}

/// Load all templates (builtin + custom)
fn load_all_templates(config: &crate::types::config::AppConfig) -> Result<Vec<NoteTemplate>, String> {
    let mut templates = Vec::new();

    // Load builtin templates
    templates.extend(get_builtin_templates());

    // Load custom templates
    let custom_dir = get_custom_templates_dir(config)?;

    if custom_dir.exists() {
        let entries = fs::read_dir(&custom_dir)
            .map_err(|e| format!("Failed to read custom templates directory: {}", e))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Failed to read directory entry: {}", e))?;
            let path = entry.path();

            if path.is_file() && path.extension().map_or(false, |ext| ext == "json") {
                match fs::read_to_string(&path) {
                    Ok(content) => {
                        match serde_json::from_str::<NoteTemplate>(&content) {
                            Ok(template) => templates.push(template),
                            Err(e) => {
                                log_error!("TEMPLATES", "Failed to parse template {:?}: {}", path, e);
                            }
                        }
                    }
                    Err(e) => {
                        log_error!("TEMPLATES", "Failed to read template {:?}: {}", path, e);
                    }
                }
            }
        }
    }

    Ok(templates)
}

/// Get builtin templates
fn get_builtin_templates() -> Vec<NoteTemplate> {
    let now = chrono::Utc::now().to_rfc3339();

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
"#.to_string(),
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
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
"#.to_string(),
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
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

"#.to_string(),
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
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
"#.to_string(),
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now.clone(),
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

"#.to_string(),
            is_builtin: true,
            created_at: now.clone(),
            updated_at: now,
        },
    ]
}

/// Get all templates
#[tauri::command]
pub async fn get_all_templates(
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<Vec<NoteTemplate>, FloatNoteError> {
    let config_lock = config.lock().await;

    let templates = load_all_templates(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    Ok(templates)
}

/// Get a specific template
#[tauri::command]
pub async fn get_template(
    template_id: String,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    let config_lock = config.lock().await;

    let templates = load_all_templates(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let template = templates.iter()
        .find(|t| t.id == template_id)
        .cloned()
        .ok_or_else(|| FloatNoteError::NotFound(format!("Template not found: {}", template_id)))?;

    Ok(template)
}

/// Create a custom template
#[tauri::command]
pub async fn create_template(
    request: CreateTemplateRequest,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Creating template: {}", request.name);

    let custom_dir = get_custom_templates_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

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

    log_info!("TEMPLATES", "Created template: {} ({})", template.name, template.id);

    Ok(template)
}

/// Update a custom template
#[tauri::command]
pub async fn update_template(
    template_id: String,
    request: CreateTemplateRequest,
    config: tauri::State<'_, crate::ConfigState>,
) -> Result<NoteTemplate, FloatNoteError> {
    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Updating template: {}", template_id);

    let custom_dir = get_custom_templates_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let file_path = custom_dir.join(format!("{}.json", template_id));

    // Load existing template
    let content = fs::read_to_string(&file_path)
        .map_err(|e| FloatNoteError::NotFound(format!("Template not found: {}", template_id)))?;

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
    let config_lock = config.lock().await;

    log_info!("TEMPLATES", "Deleting template: {}", template_id);

    let custom_dir = get_custom_templates_dir(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let file_path = custom_dir.join(format!("{}.json", template_id));

    if !file_path.exists() {
        return Err(FloatNoteError::NotFound(format!("Template not found: {}", template_id)));
    }

    fs::remove_file(&file_path)
        .map_err(|e| FloatNoteError::Storage(format!("Failed to delete template: {}", e)))?;

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

    log_info!("TEMPLATES", "Creating note from template: {}", request.template_id);

    // Get template
    let templates = load_all_templates(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;

    let template = templates.iter()
        .find(|t| t.id == request.template_id)
        .cloned()
        .ok_or_else(|| FloatNoteError::NotFound(format!("Template not found: {}", request.template_id)))?;

    // Process template variables
    let now = chrono::Utc::now();
    let content = template.content
        .replace("{{title}}", &request.title)
        .replace("{{date}}", &now.format("%Y-%m-%d").to_string())
        .replace("{{time}}", &now.format("%H:%M").to_string())
        .replace("{{datetime}}", &now.format("%Y-%m-%d %H:%M").to_string())
        .replace("{{weekday}}", &get_weekday(now.weekday().num_days_from_monday()));

    // Create note
    let mut notes_lock = notes.lock().await;

    // Find the highest position
    let max_position = notes_lock.values()
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
    let file_storage = FileNotesStorage::new(&config_lock)
        .map_err(|e| FloatNoteError::Storage(e))?;
    file_storage.save_note(&note).await
        .map_err(|e| FloatNoteError::Storage(e))?;

    log_info!("TEMPLATES", "Created note from template: {} -> {}", template.name, note.id);

    Ok(note)
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
