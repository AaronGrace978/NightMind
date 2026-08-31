# NightMind

![NightMind — a quiet 3am desk, a moon, a microphone](docs/nightmind-hero.png)

Speak everything at 3am in one long take. Wake up to a clean morning brief.

NightMind is a quiet [Tauri 2](https://v2.tauri.app/) desktop journal. You dump the night — rambling, half-asleep, sometimes luminous — and an editor writes the morning: the thread, the decisions, the few things worth doing, and the rest you can let go.

Keys stay on this machine. Nothing is uploaded except to the model provider you choose.

## The night, then the morning

1. Open NightMind when the house is quiet.
2. Tap the orb, or press **Space**. Speak. Don't organize it.
3. Stop. The recording is kept locally, transcribed, and written into a brief.
4. In the morning, read the letter. Rewrite it with another model if you want.

## Models

**Ollama Cloud** (direct API at [ollama.com](https://docs.ollama.com/cloud.md)) — Kimi K3 / K2.6 / K2.7 Code, GLM 5.3 / 5.2 / 5.1, DeepSeek V4 Pro & Flash, Qwen 3.5, MiniMax M3 / M2.7, Gemma 4, Mistral Large 3, Nemotron 3, gpt-oss.

**Ollama Local** — anything on `localhost:11434`, including `:cloud` models if you are signed in with the Ollama app.

**OpenAI** — GPT-5.6 Sol / Terra / Luna. Also required for transcription (`gpt-transcribe`, with Whisper as a fallback).

**Anthropic** — Claude Fable 5, Opus 5, Sonnet 5, Haiku 4.5.

Live captions still run on-device while you speak, so a dump is never empty if transcription fails.

## Develop

```bash
npm install
npm run tauri dev
```

```bash
npm run tauri build
```

Requires Rust (stable) and the [Tauri 2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS. On Windows that is WebView2, which you likely already have.

API keys are entered in **Keys**. They are stored in the app data directory, never in the repo.

## Stack

Tauri 2 · React · TypeScript · Rust · reqwest
