import { invoke } from "@tauri-apps/api/core";
import type {
  Night,
  OllamaModel,
  PublicSettings,
  SettingsPatch,
} from "./types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function createNight(mime: string): Promise<Night> {
  return invoke("create_night", { mime });
}

export async function writeAudioChunk(
  id: string,
  chunk: Uint8Array,
  append: boolean,
): Promise<void> {
  return invoke("write_audio_chunk", {
    id,
    chunk: Array.from(chunk),
    append,
  });
}

export async function writeAudioFile(id: string, bytes: Uint8Array): Promise<void> {
  const size = 256 * 1024;
  for (let i = 0; i < bytes.length; i += size) {
    await writeAudioChunk(id, bytes.subarray(i, i + size), i > 0);
  }
}

export async function finalizeNight(
  id: string,
  durationSecs: number,
  liveCaptions: string,
): Promise<Night> {
  return invoke("finalize_night", {
    id,
    durationSecs,
    liveCaptions: liveCaptions.trim() ? liveCaptions : null,
  });
}

export async function processNight(id: string): Promise<Night> {
  return invoke("process_night", { id });
}

export async function regenerateBrief(id: string): Promise<Night> {
  return invoke("regenerate_brief", { id });
}

export async function listNights(): Promise<Night[]> {
  return invoke("list_nights");
}

export async function getNight(id: string): Promise<Night> {
  return invoke("get_night", { id });
}

export async function deleteNight(id: string): Promise<void> {
  return invoke("delete_night", { id });
}

export async function updateTranscript(id: string, transcript: string): Promise<Night> {
  return invoke("update_transcript", { id, transcript });
}

export async function getSettings(): Promise<PublicSettings> {
  return invoke("get_settings");
}

export async function saveSettings(patch: SettingsPatch): Promise<PublicSettings> {
  return invoke("save_settings", { patch });
}

export async function listOllamaModels(): Promise<OllamaModel[]> {
  return invoke("list_ollama_models");
}

export async function testProvider(provider: string): Promise<string> {
  return invoke("test_provider", { provider });
}

export function pickMime(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return "audio/webm";
}
