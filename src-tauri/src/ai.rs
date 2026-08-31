use crate::models::{ActionItem, Brief, OllamaModel, Settings};
use crate::transcribe::extract_api_error;
use chrono::Local;
use serde_json::{json, Value};
use std::time::Duration;

const SYSTEM: &str = r#"You are the morning editor of NightMind. You receive one raw nocturnal voice dump — spoken in the dark, often rambling, half-finished, sometimes luminous. You write a brief the speaker can read with coffee. You are not a therapist, not a coach, not a productivity guru. You are a precise, calm editor.

Return ONLY valid JSON with this shape:
{
  "headline": "one sentence, the real subject of the night",
  "mood_label": "1-3 words",
  "mood_note": "one quiet sentence",
  "thread": "2-4 short paragraphs. What this night was actually about. Use second person (you).",
  "decisions": ["decisions already made, or that still need to be made — only if present"],
  "actions": [{"text": "concrete next step", "urgency": "today|soon|later"}],
  "ideas": ["worth keeping"],
  "release": ["loops, spirals, and noise that do not need action"],
  "quote": "one line from them, lightly cleaned, worth keeping"
}

Rules:
- Never invent tasks, names, facts, or decisions that are not in the source.
- Prefer omission to padding. Empty arrays are allowed and preferred over filler.
- Do not use therapy clichés, cheerleading, hashtags, or emoji.
- If the dump is thin, say so in the thread and keep the rest spare.
- urgency: today = time-sensitive; soon = this week; later = someday.
- The quote must be their thought, not yours."#;

pub fn build_user_prompt(
    night_of: &str,
    created_at: &str,
    duration_secs: f64,
    transcript: &str,
    captions: &str,
    name: &str,
) -> String {
    let minutes = (duration_secs / 60.0).max(0.0);
    let who = if name.trim().is_empty() {
        "the speaker".to_string()
    } else {
        name.trim().to_string()
    };
    let mut out = String::new();
    out.push_str(&format!(
        "Write the morning brief for {who}.\nNIGHT OF {night_of}\nRECORDED {created_at} · {minutes:.1} minutes\n\n"
    ));
    if transcript.trim().is_empty() {
        out.push_str("TRANSCRIPT: (none — use live captions if present)\n\n");
    } else {
        out.push_str("TRANSCRIPT:\n");
        out.push_str(transcript.trim());
        out.push_str("\n\n");
    }
    if !captions.trim().is_empty() && captions.trim() != transcript.trim() {
        out.push_str("LIVE CAPTIONS (secondary, may be imperfect):\n");
        out.push_str(captions.trim());
        out.push('\n');
    }
    out
}

pub async fn write_brief(
    settings: &Settings,
    night_of: &str,
    created_at: &str,
    duration_secs: f64,
    transcript: &str,
    captions: &str,
) -> Result<Brief, String> {
    let user = build_user_prompt(
        night_of,
        created_at,
        duration_secs,
        transcript,
        captions,
        &settings.display_name,
    );
    let raw = complete_json(settings, &user).await?;
    parse_brief(&raw, &settings.provider, &settings.model)
}

async fn complete_json(settings: &Settings, user: &str) -> Result<String, String> {
    match settings.provider.as_str() {
        "openai" => openai_chat(settings, user).await,
        "anthropic" => anthropic_chat(settings, user).await,
        "ollama-local" => ollama_chat(settings, user, true).await,
        _ => ollama_chat(settings, user, false).await,
    }
}

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(240))
        .build()
        .map_err(|e| e.to_string())
}

async fn openai_chat(settings: &Settings, user: &str) -> Result<String, String> {
    let key = require(&settings.openai_key, "OpenAI")?;
    let model = if settings.model.trim().is_empty() {
        "gpt-5.6-terra"
    } else {
        settings.model.trim()
    };
    let body = json!({
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user}
        ],
        "response_format": {"type": "json_object"}
    });
    let res = client()?
        .post("https://api.openai.com/v1/chat/completions")
        .bearer_auth(key)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("OpenAI: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(extract_api_error(&text, status.as_u16()));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| format!("OpenAI JSON: {e}"))?;
    v.pointer("/choices/0/message/content")
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "OpenAI returned no content".into())
}

async fn anthropic_chat(settings: &Settings, user: &str) -> Result<String, String> {
    let key = require(&settings.anthropic_key, "Anthropic")?;
    let model = if settings.model.trim().is_empty() {
        "claude-sonnet-5"
    } else {
        settings.model.trim()
    };
    let body = json!({
        "model": model,
        "max_tokens": 8000,
        "system": SYSTEM,
        "messages": [{"role": "user", "content": user}]
    });
    let res = client()?
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Anthropic: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(extract_api_error(&text, status.as_u16()));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| format!("Anthropic JSON: {e}"))?;
    v.pointer("/content/0/text")
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Anthropic returned no content".into())
}

async fn ollama_chat(settings: &Settings, user: &str, local: bool) -> Result<String, String> {
    let (host, key) = if local {
        (settings.local_ollama_url.trim().to_string(), String::new())
    } else {
        (
            if settings.ollama_host.trim().is_empty() {
                "https://ollama.com".into()
            } else {
                settings.ollama_host.trim().to_string()
            },
            require(&settings.ollama_key, "Ollama Cloud")?.to_string(),
        )
    };
    let model = if settings.model.trim().is_empty() {
        "kimi-k3"
    } else {
        settings.model.trim()
    };
    let body = json!({
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": user}
        ],
        "stream": false,
        "format": "json"
    });
    let mut req = client()?
        .post(format!("{host}/api/chat"))
        .json(&body);
    if !key.is_empty() {
        req = req.bearer_auth(&key);
    }
    let res = req.send().await.map_err(|e| format!("Ollama: {e}"))?;
    let status = res.status();
    let text = res.text().await.map_err(|e| e.to_string())?;
    if !status.is_success() {
        return Err(extract_api_error(&text, status.as_u16()));
    }
    let v: Value = serde_json::from_str(&text).map_err(|e| format!("Ollama JSON: {e}"))?;
    v.pointer("/message/content")
        .and_then(|c| c.as_str())
        .map(|s| s.to_string())
        .ok_or_else(|| "Ollama returned no content".into())
}

fn require<'a>(key: &'a str, name: &str) -> Result<&'a str, String> {
    let k = key.trim();
    if k.is_empty() {
        Err(format!("Add a {name} API key in Settings."))
    } else {
        Ok(k)
    }
}

fn parse_brief(raw: &str, provider: &str, model: &str) -> Result<Brief, String> {
    let value = extract_json(raw)?;
    let headline = string_field(&value, "headline")
        .or_else(|| string_field(&value, "title"))
        .unwrap_or_else(|| "A night, spoken".into());
    let actions = value
        .get("actions")
        .and_then(|a| a.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    if let Some(s) = item.as_str() {
                        return Some(ActionItem {
                            text: s.to_string(),
                            urgency: "soon".into(),
                        });
                    }
                    let text = item.get("text")?.as_str()?.to_string();
                    if text.trim().is_empty() {
                        return None;
                    }
                    Some(ActionItem {
                        text,
                        urgency: item
                            .get("urgency")
                            .and_then(|u| u.as_str())
                            .unwrap_or("soon")
                            .to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    Ok(Brief {
        headline,
        mood_label: string_field(&value, "mood_label").unwrap_or_default(),
        mood_note: string_field(&value, "mood_note").unwrap_or_default(),
        thread: string_field(&value, "thread").unwrap_or_default(),
        decisions: string_list(&value, "decisions"),
        actions,
        ideas: string_list(&value, "ideas"),
        release: string_list(&value, "release"),
        quote: string_field(&value, "quote").unwrap_or_default(),
        generated_at: Local::now().to_rfc3339(),
        provider: provider.to_string(),
        model: model.to_string(),
    })
}

fn string_field(v: &Value, key: &str) -> Option<String> {
    v.get(key)
        .and_then(|x| x.as_str())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

fn string_list(v: &Value, key: &str) -> Vec<String> {
    v.get(key)
        .and_then(|x| x.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|i| i.as_str().map(|s| s.trim().to_string()))
                .filter(|s| !s.is_empty())
                .collect()
        })
        .unwrap_or_default()
}

fn extract_json(raw: &str) -> Result<Value, String> {
    let s = raw.trim();
    if let Ok(v) = serde_json::from_str::<Value>(s) {
        return Ok(v);
    }
    let stripped = s
        .trim_start_matches("```json")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    if let Ok(v) = serde_json::from_str::<Value>(stripped) {
        return Ok(v);
    }
    if let (Some(start), Some(end)) = (s.find('{'), s.rfind('}')) {
        if end > start {
            if let Ok(v) = serde_json::from_str::<Value>(&s[start..=end]) {
                return Ok(v);
            }
        }
    }
    Err("the model did not return a usable brief".into())
}

pub async fn list_ollama_models(settings: &Settings) -> Vec<OllamaModel> {
    let mut out = Vec::new();
    if !settings.ollama_key.trim().is_empty() {
        let host = if settings.ollama_host.trim().is_empty() {
            "https://ollama.com".to_string()
        } else {
            settings.ollama_host.trim().to_string()
        };
        if let Ok(models) = fetch_tags(&host, Some(settings.ollama_key.trim())).await {
            for name in models {
                out.push(OllamaModel {
                    name,
                    source: "cloud".into(),
                });
            }
        }
    }
    if let Ok(models) = fetch_tags(&settings.local_ollama_url, None).await {
        for name in models {
            out.push(OllamaModel {
                name,
                source: "local".into(),
            });
        }
    }
    out
}

async fn fetch_tags(host: &str, key: Option<&str>) -> Result<Vec<String>, String> {
    let url = format!("{}/api/tags", host.trim().trim_end_matches('/'));
    let mut req = client()?.get(url);
    if let Some(k) = key {
        if !k.is_empty() {
            req = req.bearer_auth(k);
        }
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    if !res.status().is_success() {
        return Err("tags failed".into());
    }
    let v: Value = res.json().await.map_err(|e| e.to_string())?;
    let mut names = Vec::new();
    if let Some(arr) = v.get("models").and_then(|m| m.as_array()) {
        for m in arr {
            if let Some(name) = m
                .get("name")
                .and_then(|n| n.as_str())
                .or_else(|| m.get("model").and_then(|n| n.as_str()))
            {
                let clean = name.trim().trim_end_matches(":latest").to_string();
                if !clean.is_empty() && !names.contains(&clean) {
                    names.push(clean);
                }
            }
        }
    }
    Ok(names)
}

pub async fn test_provider(settings: &Settings, provider: &str) -> Result<String, String> {
    match provider {
        "openai" => {
            let key = require(&settings.openai_key, "OpenAI")?;
            let res = client()?
                .get("https://api.openai.com/v1/models")
                .bearer_auth(key)
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status();
            if status.is_success() {
                Ok("OpenAI is listening.".into())
            } else {
                Err(extract_api_error(
                    &res.text().await.unwrap_or_default(),
                    status.as_u16(),
                ))
            }
        }
        "anthropic" => {
            let key = require(&settings.anthropic_key, "Anthropic")?;
            let res = client()?
                .get("https://api.anthropic.com/v1/models")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .send()
                .await
                .map_err(|e| e.to_string())?;
            let status = res.status();
            if status.is_success() {
                Ok("Anthropic is listening.".into())
            } else {
                Err(extract_api_error(
                    &res.text().await.unwrap_or_default(),
                    status.as_u16(),
                ))
            }
        }
        "ollama-local" => {
            fetch_tags(&settings.local_ollama_url, None)
                .await
                .map(|m| format!("Local Ollama · {} models", m.len()))
        }
        _ => {
            let key = require(&settings.ollama_key, "Ollama Cloud")?;
            let host = if settings.ollama_host.trim().is_empty() {
                "https://ollama.com"
            } else {
                settings.ollama_host.trim()
            };
            fetch_tags(host, Some(key))
                .await
                .map(|m| format!("Ollama Cloud · {} models", m.len()))
        }
    }
}
