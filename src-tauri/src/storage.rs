use crate::models::{Settings, SettingsPatch, Night};
use chrono::{Local, Timelike};
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

pub fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app data dir: {e}"))?;
    Ok(dir)
}

pub fn nights_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = data_dir(app)?.join("nights");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create nights dir: {e}"))?;
    Ok(dir)
}

pub fn night_dir(app: &AppHandle, id: &str) -> Result<PathBuf, String> {
    if !is_safe_id(id) {
        return Err("invalid night id".into());
    }
    let dir = nights_dir(app)?.join(id);
    std::fs::create_dir_all(&dir).map_err(|e| format!("create night dir: {e}"))?;
    Ok(dir)
}

fn is_safe_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() < 80
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

pub fn new_night_id() -> String {
    Local::now().format("%Y%m%d-%H%M%S").to_string()
}

pub fn night_of_iso() -> String {
    let now = Local::now();
    let date = if now.hour() < 12 {
        now.date_naive()
            .pred_opt()
            .unwrap_or_else(|| now.date_naive())
    } else {
        now.date_naive()
    };
    date.format("%Y-%m-%d").to_string()
}

pub fn audio_path(dir: &Path, ext: &str) -> PathBuf {
    dir.join(format!("audio.{ext}"))
}

pub fn meta_path(dir: &Path) -> PathBuf {
    dir.join("night.json")
}

pub fn write_json<T: serde::Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("tmp");
    std::fs::write(&tmp, data).map_err(|e| format!("write {}: {e}", tmp.display()))?;
    if path.exists() {
        std::fs::remove_file(path).ok();
    }
    std::fs::rename(&tmp, path).map_err(|e| format!("rename {}: {e}", path.display()))?;
    Ok(())
}

pub fn save_night(app: &AppHandle, night: &Night) -> Result<(), String> {
    let dir = night_dir(app, &night.id)?;
    write_json(&meta_path(&dir), night)
}

pub fn load_night(app: &AppHandle, id: &str) -> Result<Night, String> {
    let path = meta_path(&night_dir(app, id)?);
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("read night: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse night: {e}"))
}

pub fn list_nights(app: &AppHandle) -> Result<Vec<Night>, String> {
    let root = nights_dir(app)?;
    let mut nights = Vec::new();
    let entries = std::fs::read_dir(&root).map_err(|e| format!("read nights: {e}"))?;
    for entry in entries.flatten() {
        let path = entry.path().join("night.json");
        if !path.exists() {
            continue;
        }
        if let Ok(raw) = std::fs::read_to_string(&path) {
            if let Ok(night) = serde_json::from_str::<Night>(&raw) {
                nights.push(night);
            }
        }
    }
    nights.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(nights)
}

pub fn delete_night(app: &AppHandle, id: &str) -> Result<(), String> {
    let dir = night_dir(app, id)?;
    std::fs::remove_dir_all(&dir).map_err(|e| format!("delete night: {e}"))
}

pub fn settings_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("settings.json"))
}

pub fn load_settings(app: &AppHandle) -> Result<Settings, String> {
    let path = settings_path(app)?;
    if !path.exists() {
        return Ok(Settings::default());
    }
    let raw = std::fs::read_to_string(&path).map_err(|e| format!("read settings: {e}"))?;
    serde_json::from_str(&raw).map_err(|e| format!("parse settings: {e}"))
}

pub fn save_settings(app: &AppHandle, settings: &Settings) -> Result<(), String> {
    let dir = data_dir(app)?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    write_json(&settings_path(app)?, settings)
}

pub fn apply_patch(current: Settings, patch: SettingsPatch) -> Settings {
    Settings {
        openai_key: patch.openai_key.unwrap_or(current.openai_key),
        anthropic_key: patch.anthropic_key.unwrap_or(current.anthropic_key),
        ollama_key: patch.ollama_key.unwrap_or(current.ollama_key),
        ollama_host: patch
            .ollama_host
            .unwrap_or(current.ollama_host)
            .trim()
            .trim_end_matches('/')
            .to_string(),
        local_ollama_url: patch
            .local_ollama_url
            .unwrap_or(current.local_ollama_url)
            .trim()
            .trim_end_matches('/')
            .to_string(),
        provider: patch.provider.unwrap_or(current.provider),
        model: patch.model.unwrap_or(current.model),
        transcribe_model: patch.transcribe_model.unwrap_or(current.transcribe_model),
        display_name: patch.display_name.unwrap_or(current.display_name),
    }
}

pub fn ext_from_mime(mime: &str) -> &'static str {
    let m = mime.to_ascii_lowercase();
    if m.contains("mp4") || m.contains("m4a") || m.contains("aac") {
        "m4a"
    } else if m.contains("mpeg") || m.contains("mp3") {
        "mp3"
    } else if m.contains("wav") {
        "wav"
    } else if m.contains("ogg") {
        "ogg"
    } else {
        "webm"
    }
}
