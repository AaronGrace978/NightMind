mod ai;
mod models;
mod storage;
mod transcribe;

use chrono::Local;
use models::{Night, NightStatus, OllamaModel, PublicSettings, SettingsPatch};
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
fn create_night(app: AppHandle, mime: String) -> Result<Night, String> {
    let mut id = storage::new_night_id();
    if storage::night_dir(&app, &id)?.join("night.json").exists() {
        id = format!("{id}-2");
    }
    let ext = storage::ext_from_mime(&mime).to_string();
    let night = Night {
        id: id.clone(),
        created_at: Local::now().to_rfc3339(),
        night_of: storage::night_of_iso(),
        duration_secs: 0.0,
        mime,
        audio_ext: ext,
        transcript: None,
        live_captions: None,
        brief: None,
        status: "recording".into(),
        error: None,
    };
    storage::save_night(&app, &night)?;
    Ok(night)
}

#[tauri::command]
async fn write_audio_chunk(
    app: AppHandle,
    id: String,
    chunk: Vec<u8>,
    append: bool,
) -> Result<(), String> {
    let night = storage::load_night(&app, &id)?;
    let path = storage::audio_path(&storage::night_dir(&app, &id)?, &night.audio_ext);
    if append && path.exists() {
        use tokio::io::AsyncWriteExt;
        let mut file = tokio::fs::OpenOptions::new()
            .append(true)
            .open(&path)
            .await
            .map_err(|e| format!("open audio: {e}"))?;
        file.write_all(&chunk)
            .await
            .map_err(|e| format!("append audio: {e}"))?;
    } else {
        tokio::fs::write(&path, &chunk)
            .await
            .map_err(|e| format!("write audio: {e}"))?;
    }
    Ok(())
}

#[tauri::command]
fn finalize_night(
    app: AppHandle,
    id: String,
    duration_secs: f64,
    live_captions: Option<String>,
) -> Result<Night, String> {
    let mut night = storage::load_night(&app, &id)?;
    night.duration_secs = duration_secs;
    night.live_captions = live_captions.filter(|s| !s.trim().is_empty());
    night.status = "recorded".into();
    night.error = None;
    storage::save_night(&app, &night)?;
    Ok(night)
}

#[tauri::command]
async fn process_night(app: AppHandle, id: String) -> Result<Night, String> {
    let mut night = storage::load_night(&app, &id)?;
    let settings = storage::load_settings(&app)?;
    emit_status(&app, &id, "transcribing", "Listening back through the dark.");

    let audio = storage::audio_path(&storage::night_dir(&app, &id)?, &night.audio_ext);
    let captions = night.live_captions.clone().unwrap_or_default();

    match transcribe::transcribe_file(&settings, &audio, &night.audio_ext).await {
        Ok(text) if !text.trim().is_empty() => {
            night.transcript = Some(text);
            night.status = "transcribed".into();
            night.error = None;
        }
        Ok(_) => {
            if captions.trim().is_empty() {
                night.status = "error".into();
                night.error = Some("Nothing could be heard in the recording.".into());
                storage::save_night(&app, &night)?;
                emit_status(&app, &id, "error", &night.error.clone().unwrap_or_default());
                return Ok(night);
            }
            night.transcript = Some(captions.clone());
            night.status = "transcribed".into();
            night.error = Some("Used live captions — add OpenAI for a cleaner transcript.".into());
        }
        Err(err) => {
            if captions.trim().is_empty() {
                night.status = "error".into();
                night.error = Some(err);
                storage::save_night(&app, &night)?;
                emit_status(&app, &id, "error", &night.error.clone().unwrap_or_default());
                return Ok(night);
            }
            night.transcript = Some(captions.clone());
            night.status = "transcribed".into();
            night.error = Some(format!("{err} Live captions were kept instead."));
        }
    }
    storage::save_night(&app, &night)?;

    emit_status(&app, &id, "writing", "Separating the signal from the 3am noise.");
    let source = night.transcript.clone().unwrap_or_default();
    match ai::write_brief(
        &settings,
        &night.night_of,
        &night.created_at,
        night.duration_secs,
        &source,
        &captions,
    )
    .await
    {
        Ok(brief) => {
            night.brief = Some(brief);
            night.status = "ready".into();
            storage::save_night(&app, &night)?;
            emit_status(&app, &id, "ready", "The morning is written.");
            Ok(night)
        }
        Err(err) => {
            night.status = "transcribed".into();
            night.error = Some(err.clone());
            storage::save_night(&app, &night)?;
            emit_status(&app, &id, "error", &err);
            Ok(night)
        }
    }
}

#[tauri::command]
async fn regenerate_brief(app: AppHandle, id: String) -> Result<Night, String> {
    let mut night = storage::load_night(&app, &id)?;
    let source = night
        .transcript
        .clone()
        .or_else(|| night.live_captions.clone())
        .unwrap_or_default();
    if source.trim().is_empty() {
        return Err("Nothing to rewrite yet.".into());
    }
    let settings = storage::load_settings(&app)?;
    emit_status(&app, &id, "writing", "Rewriting the morning.");
    night.status = "writing".into();
    storage::save_night(&app, &night)?;
    match ai::write_brief(
        &settings,
        &night.night_of,
        &night.created_at,
        night.duration_secs,
        &source,
        night.live_captions.as_deref().unwrap_or(""),
    )
    .await
    {
        Ok(brief) => {
            night.brief = Some(brief);
            night.status = "ready".into();
            night.error = None;
            storage::save_night(&app, &night)?;
            emit_status(&app, &id, "ready", "The morning is written.");
            Ok(night)
        }
        Err(err) => {
            night.status = if night.brief.is_some() {
                "ready".into()
            } else {
                "transcribed".into()
            };
            night.error = Some(err.clone());
            storage::save_night(&app, &night)?;
            emit_status(&app, &id, "error", &err);
            Err(err)
        }
    }
}

#[tauri::command]
fn list_nights(app: AppHandle) -> Result<Vec<Night>, String> {
    storage::list_nights(&app)
}

#[tauri::command]
fn get_night(app: AppHandle, id: String) -> Result<Night, String> {
    storage::load_night(&app, &id)
}

#[tauri::command]
fn delete_night(app: AppHandle, id: String) -> Result<(), String> {
    storage::delete_night(&app, &id)
}

#[tauri::command]
fn update_transcript(app: AppHandle, id: String, transcript: String) -> Result<Night, String> {
    let mut night = storage::load_night(&app, &id)?;
    night.transcript = Some(transcript);
    if night.status == "recorded" || night.status == "error" {
        night.status = "transcribed".into();
    }
    storage::save_night(&app, &night)?;
    Ok(night)
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Result<PublicSettings, String> {
    Ok(models::public_settings(&storage::load_settings(&app)?))
}

#[tauri::command]
fn save_settings(app: AppHandle, patch: SettingsPatch) -> Result<PublicSettings, String> {
    let next = storage::apply_patch(storage::load_settings(&app)?, patch);
    storage::save_settings(&app, &next)?;
    Ok(models::public_settings(&next))
}

#[tauri::command]
async fn list_ollama_models(app: AppHandle) -> Result<Vec<OllamaModel>, String> {
    let settings = storage::load_settings(&app)?;
    Ok(ai::list_ollama_models(&settings).await)
}

#[tauri::command]
async fn test_provider(app: AppHandle, provider: String) -> Result<String, String> {
    let settings = storage::load_settings(&app)?;
    ai::test_provider(&settings, &provider).await
}

fn emit_status(app: &AppHandle, id: &str, status: &str, detail: &str) {
    let _ = app.emit(
        "night-status",
        NightStatus {
            id: id.to_string(),
            status: status.to_string(),
            detail: detail.to_string(),
        },
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if let Ok(dir) = app.path().app_data_dir() {
                std::fs::create_dir_all(dir.join("nights"))?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_night,
            write_audio_chunk,
            finalize_night,
            process_night,
            regenerate_brief,
            list_nights,
            get_night,
            delete_night,
            update_transcript,
            get_settings,
            save_settings,
            list_ollama_models,
            test_provider
        ])
        .run(tauri::generate_context!())
        .expect("error while running NightMind");
}
