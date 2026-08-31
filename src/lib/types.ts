export type View = "night" | "morning" | "archive" | "settings";

export type ActionItem = {
  text: string;
  urgency: string;
};

export type Brief = {
  headline: string;
  mood_label: string;
  mood_note: string;
  thread: string;
  decisions: string[];
  actions: ActionItem[];
  ideas: string[];
  release: string[];
  quote: string;
  generated_at: string;
  provider: string;
  model: string;
};

export type Night = {
  id: string;
  created_at: string;
  night_of: string;
  duration_secs: number;
  mime: string;
  audio_ext: string;
  transcript: string | null;
  live_captions: string | null;
  brief: Brief | null;
  status: string;
  error: string | null;
};

export type PublicSettings = {
  openai_key_set: boolean;
  anthropic_key_set: boolean;
  ollama_key_set: boolean;
  openai_hint: string;
  anthropic_hint: string;
  ollama_hint: string;
  ollama_host: string;
  local_ollama_url: string;
  provider: string;
  model: string;
  transcribe_model: string;
  display_name: string;
};

export type SettingsPatch = {
  openai_key?: string;
  anthropic_key?: string;
  ollama_key?: string;
  ollama_host?: string;
  local_ollama_url?: string;
  provider?: string;
  model?: string;
  transcribe_model?: string;
  display_name?: string;
};

export type OllamaModel = {
  name: string;
  source: string;
};

export type NightStatusEvent = {
  id: string;
  status: string;
  detail: string;
};
