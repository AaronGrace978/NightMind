use crate::models::Settings;
use reqwest::multipart::{Form, Part};
use serde_json::Value;
use std::path::Path;
use std::time::Duration;

fn filename_for(ext: &str) -> &'static str {
    match ext {
        "m4a" => "audio.m4a",
        "mp3" => "audio.mp3",
        "wav" => "audio.wav",
        "ogg" => "audio.ogg",
        _ => "audio.webm",
    }
}

fn mime_for(ext: &str) -> &'static str {
    match ext {
        "m4a" => "audio/mp4",
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "ogg" => "audio/ogg",
        _ => "audio/webm",
    }
}

pub async fn transcribe_file(
    settings: &Settings,
    path: &Path,
    ext: &str,
) -> Result<String, String> {
    let key = settings.openai_key.trim();
    if key.is_empty() {
        return Err(
            "Add an OpenAI key in Settings to transcribe. Live captions will still be kept."
                .into(),
        );
    }

    let bytes = tokio::fs::read(path)
        .await
        .map_err(|e| format!("read audio: {e}"))?;
    if bytes.is_empty() {
        return Err("the recording is empty".into());
    }

    let model = if settings.transcribe_model.trim().is_empty() {
        "gpt-transcribe"
    } else {
        settings.transcribe_model.trim()
    };

    let part = Part::bytes(bytes)
        .file_name(filename_for(ext))
        .mime_str(mime_for(ext))
        .map_err(|e| format!("audio part: {e}"))?;

    let form = Form::new()
        .part("file", part)
        .text("model", model.to_string())
        .text(
            "prompt",
            "Nocturnal voice journal. Transcribe faithfully, including hesitations and false starts. Do not summarize.",
        );

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(360))
        .build()
        .map_err(|e| e.to_string())?;

    let res = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .bearer_auth(key)
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("transcription request: {e}"))?;

    let status = res.status();
    let body = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(extract_api_error(&body, status.as_u16()));
    }

    if let Ok(v) = serde_json::from_str::<Value>(&body) {
        if let Some(text) = v.get("text").and_then(|t| t.as_str()) {
            return Ok(text.trim().to_string());
        }
    }
    Ok(body.trim().to_string())
}

pub fn extract_api_error(body: &str, status: u16) -> String {
    if let Ok(v) = serde_json::from_str::<Value>(body) {
        if let Some(msg) = v
            .pointer("/error/message")
            .and_then(|m| m.as_str())
            .or_else(|| v.get("error").and_then(|e| e.as_str()))
            .or_else(|| v.get("message").and_then(|m| m.as_str()))
        {
            return format!("HTTP {status}: {msg}");
        }
    }
    let snippet: String = body.chars().take(280).collect();
    format!("HTTP {status}: {snippet}")
}
