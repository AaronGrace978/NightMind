export type ModelOption = {
  id: string;
  name: string;
  note: string;
};

export const OLLAMA_CLOUD: ModelOption[] = [
  { id: "kimi-k3", name: "Kimi K3", note: "Moonshot flagship" },
  { id: "kimi-k2.6", name: "Kimi K2.6", note: "Multimodal agent" },
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", note: "Long-horizon code" },
  { id: "glm-5.3", name: "GLM 5.3", note: "Z.ai flagship" },
  { id: "glm-5.3-flash", name: "GLM 5.3 Flash", note: "Fast multimodal" },
  { id: "glm-5.2", name: "GLM 5.2", note: "Long horizon" },
  { id: "glm-5.1", name: "GLM 5.1", note: "Agentic engineering" },
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", note: "Frontier MoE" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", note: "1M context" },
  { id: "qwen3.5", name: "Qwen 3.5", note: "Alibaba multimodal" },
  { id: "minimax-m3", name: "MiniMax M3", note: "1M · multimodal" },
  { id: "minimax-m2.7", name: "MiniMax M2.7", note: "Coding & agents" },
  { id: "gemma4", name: "Gemma 4", note: "Google open" },
  { id: "mistral-large-3", name: "Mistral Large 3", note: "Production MoE" },
  { id: "nemotron-3-ultra", name: "Nemotron 3 Ultra", note: "NVIDIA" },
  { id: "nemotron-3-super", name: "Nemotron 3 Super", note: "120B MoE" },
  { id: "nemotron-3-nano", name: "Nemotron 3 Nano", note: "Efficient" },
  { id: "gpt-oss:120b", name: "gpt-oss 120B", note: "OpenAI open-weight" },
  { id: "gpt-oss:20b", name: "gpt-oss 20B", note: "OpenAI open-weight" },
];

export const OPENAI_MODELS: ModelOption[] = [
  { id: "gpt-5.6-sol", name: "GPT-5.6 Sol", note: "Flagship" },
  { id: "gpt-5.6-terra", name: "GPT-5.6 Terra", note: "Balanced" },
  { id: "gpt-5.6-luna", name: "GPT-5.6 Luna", note: "Fast / volume" },
  { id: "gpt-5.6", name: "GPT-5.6", note: "Alias → Sol" },
  { id: "gpt-5.4", name: "GPT-5.4", note: "Previous" },
  { id: "gpt-4.1", name: "GPT-4.1", note: "Workhorse" },
];

export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: "claude-fable-5", name: "Claude Fable 5", note: "Frontier" },
  { id: "claude-opus-5", name: "Claude Opus 5", note: "Deep work" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", note: "Daily brief" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", note: "Prior opus" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", note: "Prior sonnet" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", note: "Fastest" },
];

export const TRANSCRIBE_MODELS: ModelOption[] = [
  { id: "gpt-transcribe", name: "GPT Transcribe", note: "Best file STT" },
  { id: "gpt-4o-transcribe", name: "GPT-4o Transcribe", note: "Prior gen" },
  { id: "gpt-4o-mini-transcribe", name: "GPT-4o Mini Transcribe", note: "Cheaper" },
  { id: "whisper-1", name: "Whisper", note: "Timestamps / classic" },
];

export const PROVIDERS = [
  { id: "ollama-cloud", name: "Ollama Cloud", needs: "ollama" as const },
  { id: "ollama-local", name: "Ollama Local", needs: "none" as const },
  { id: "openai", name: "OpenAI", needs: "openai" as const },
  { id: "anthropic", name: "Anthropic", needs: "anthropic" as const },
];

export function modelsFor(provider: string, live: { name: string; source: string }[] = []): ModelOption[] {
  if (provider === "openai") return OPENAI_MODELS;
  if (provider === "anthropic") return ANTHROPIC_MODELS;
  if (provider === "ollama-local") {
    const local = live.filter((m) => m.source === "local");
    if (local.length) return local.map((m) => ({ id: m.name, name: m.name, note: "local" }));
    return OLLAMA_CLOUD.map((m) => ({ ...m, note: "pull locally" }));
  }
  const cloud = live.filter((m) => m.source === "cloud");
  const extras = cloud
    .filter((m) => !OLLAMA_CLOUD.some((c) => c.id === m.name))
    .map((m) => ({ id: m.name, name: m.name, note: "cloud" }));
  return [...OLLAMA_CLOUD, ...extras];
}

export function providerLabel(id: string): string {
  return PROVIDERS.find((p) => p.id === id)?.name ?? id;
}
