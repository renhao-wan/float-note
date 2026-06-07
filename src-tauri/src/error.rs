use thiserror::Error;

#[derive(Debug, Error)]
pub enum FloatNoteError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("YAML error: {0}")]
    Yaml(#[from] serde_yaml::Error),

    #[error("Database error: {0}")]
    Database(String),

    #[error("Window error: {0}")]
    Window(String),

    #[error("Note not found: {id}")]
    NoteNotFound { id: String },

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Storage error: {0}")]
    Storage(String),

    #[error("Invalid operation: {0}")]
    InvalidOperation(String),

    #[error("Menu error: {0}")]
    Menu(String),

    #[error("Global shortcut error: {0}")]
    GlobalShortcut(String),

    #[error("Tauri error: {0}")]
    Tauri(#[from] tauri::Error),
}

// Implement conversion from FloatNoteError to String for Tauri commands
impl From<FloatNoteError> for String {
    fn from(err: FloatNoteError) -> Self {
        err.to_string()
    }
}

pub type Result<T> = std::result::Result<T, FloatNoteError>;
pub type FloatNoteResult<T> = Result<T>;

/// 辅助宏：将错误转换为 String 并记录日志
#[macro_export]
macro_rules! to_string_error {
    ($result:expr, $category:expr) => {
        $result.map_err(|e| {
            let msg = format!("{}", e);
            log_error!($category, "{}", msg);
            msg
        })
    };
}