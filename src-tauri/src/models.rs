use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionItem {
    pub text: String,
    #[serde(default)]
    pub urgency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Brief {
    pub headline: String,
    #[serde(default)]
    pub mood_label: String,
    #[serde(default)]
    pub mood_note: String,
    #[serde(default)]
    pub thread: String,
    #[serde(default)]
    pub decisions: Vec<String>,
    #[serde(default)]
    pub actions: Vec<ActionItem>,
    #[serde(default)]
    pub ideas: Vec<String>,
    #[serde(default)]
    pub release: Vec<String>,
    #[serde(default)]
    pub quote: String,
    #[serde(default)]
    pub generated_at: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Night {
    pub id: String,
    pub created_at: String,
    pub night_of: String,
    #[serde(default)]
    pub duration_secs: f64,
    #[serde(default)]
    pub mime: String,
    #[serde(default)]
    pub audio_ext: String,
    #[serde(default)]
    pub transcript: Option<String>,
    #[serde(default)]
    pub live_captions: Option<String>,
    #[serde(default)]
    pub brief: Option<Brief>,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(default)]
    pub error: Option<String>,
}

fn default_status() -> String {
    "recording".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    #[serde(default)]
    pub openai_key: String,
    #[serde(default)]
    pub anthropic_key: String,
    #[serde(default)]
    pub ollama_key: String,
    #[serde(default = "default_ollama_host")]
    pub ollama_host: String,
    #[serde(default = "default_local_ollama")]
    pub local_ollama_url: String,
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default = "default_transcribe")]
    pub transcribe_model: String,
    #[serde(default)]
    pub display_name: String,
}

fn default_ollama_host() -> String {
    "https://ollama.com".into()
}
fn default_local_ollama() -> String {
    "http://127.0.0.1:11434".into()
}
fn default_provider() -> String {
    "ollama-cloud".into()
}
fn default_model() -> String {
    "kimi-k3".into()
}
fn default_transcribe() -> String {
    "gpt-transcribe".into()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            openai_key: String::new(),
            anthropic_key: String::new(),
            ollama_key: String::new(),
            ollama_host: default_ollama_host(),
            local_ollama_url: default_local_ollama(),
            provider: default_provider(),
            model: default_model(),
            transcribe_model: default_transcribe(),
            display_name: String::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublicSettings {
    pub openai_key_set: bool,
    pub anthropic_key_set: bool,
    pub ollama_key_set: bool,
    pub openai_hint: String,
    pub anthropic_hint: String,
    pub ollama_hint: String,
    pub ollama_host: String,
    pub local_ollama_url: String,
    pub provider: String,
    pub model: String,
    pub transcribe_model: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SettingsPatch {
    pub openai_key: Option<String>,
    pub anthropic_key: Option<String>,
    pub ollama_key: Option<String>,
    pub ollama_host: Option<String>,
    pub local_ollama_url: Option<String>,
    pub provider: Option<String>,
    pub model: Option<String>,
    pub transcribe_model: Option<String>,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NightStatus {
    pub id: String,
    pub status: String,
    pub detail: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OllamaModel {
    pub name: String,
    pub source: String,
}

pub fn hint(key: &str) -> String {
    let k = key.trim();
    if k.is_empty() {
        return String::new();
    }
    if k.len() <= 6 {
        return "••••".into();
    }
    format!("••••{}", &k[k.len().saturating_sub(4)..])
}

pub fn public_settings(s: &Settings) -> PublicSettings {
    PublicSettings {
        openai_key_set: !s.openai_key.trim().is_empty(),
        anthropic_key_set: !s.anthropic_key.trim().is_empty(),
        ollama_key_set: !s.ollama_key.trim().is_empty(),
        openai_hint: hint(&s.openai_key),
        anthropic_hint: hint(&s.anthropic_key),
        ollama_hint: hint(&s.ollama_key),
        ollama_host: s.ollama_host.clone(),
        local_ollama_url: s.local_ollama_url.clone(),
        provider: s.provider.clone(),
        model: s.model.clone(),
        transcribe_model: s.transcribe_model.clone(),
        display_name: s.display_name.clone(),
    }
}
