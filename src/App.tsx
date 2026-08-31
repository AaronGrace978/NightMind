import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { Nav } from "./components/Nav";
import { Starfield } from "./components/Starfield";
import { Titlebar } from "./components/Titlebar";
import {
  deleteNight,
  getSettings,
  isTauri,
  listNights,
  listOllamaModels,
  regenerateBrief,
  saveSettings,
  testProvider,
  updateTranscript,
} from "./lib/api";
import { isMorningHours } from "./lib/time";
import type { Night, NightStatusEvent, OllamaModel, PublicSettings, SettingsPatch, View } from "./lib/types";
import { ArchiveView } from "./views/ArchiveView";
import { MorningView } from "./views/MorningView";
import { NightView } from "./views/NightView";
import { SettingsView } from "./views/SettingsView";
import "./styles.css";

const fallbackSettings: PublicSettings = {
  openai_key_set: false,
  anthropic_key_set: false,
  ollama_key_set: false,
  openai_hint: "",
  anthropic_hint: "",
  ollama_hint: "",
  ollama_host: "https://ollama.com",
  local_ollama_url: "http://127.0.0.1:11434",
  provider: "ollama-cloud",
  model: "kimi-k3",
  transcribe_model: "gpt-transcribe",
  display_name: "",
};

export default function App() {
  const [view, setView] = useState<View>(isMorningHours() ? "morning" : "night");
  const [nights, setNights] = useState<Night[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings>(fallbackSettings);
  const [live, setLive] = useState<OllamaModel[]>([]);
  const [saving, setSaving] = useState(false);
  const [writing, setWriting] = useState(false);
  const [status, setStatus] = useState<NightStatusEvent | null>(null);

  const active = useMemo(
    () => nights.find((n) => n.id === activeId) ?? nights[0] ?? null,
    [nights, activeId],
  );

  async function refresh() {
    if (!isTauri()) return;
    const list = await listNights();
    setNights(list);
    setActiveId((id) => id ?? list[0]?.id ?? null);
  }

  useEffect(() => {
    void (async () => {
      if (!isTauri()) return;
      try {
        setSettings(await getSettings());
        await refresh();
        setLive(await listOllamaModels().catch(() => []));
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | undefined;
    void listen<NightStatusEvent>("night-status", (event) => {
      setStatus(event.payload);
      setNights((cur) =>
        cur.map((n) =>
          n.id === event.payload.id ? { ...n, status: event.payload.status } : n,
        ),
      );
      if (event.payload.status === "writing") setWriting(true);
      if (event.payload.status === "ready" || event.payload.status === "error") {
        setWriting(false);
        void refresh();
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => unlisten?.();
  }, []);

  function upsert(night: Night) {
    setNights((cur) => {
      const i = cur.findIndex((n) => n.id === night.id);
      if (i === -1) return [night, ...cur];
      const next = cur.slice();
      next[i] = night;
      return next.sort((a, b) => b.created_at.localeCompare(a.created_at));
    });
    setActiveId(night.id);
  }

  return (
    <div className={`app${isMorningHours() ? " morning-hours" : ""}`}>
      <Starfield />
      <div className="grain" />
      <div className="vignette" />
      <Titlebar />
      <div className="shell">
        <Nav view={view} onChange={setView} />
        <main className="main">
          {view === "night" && (
            <NightView
              onNight={upsert}
              onReady={(n) => {
                upsert(n);
                setView("morning");
              }}
            />
          )}
          {view === "morning" && (
            <MorningView
              night={active}
              writing={writing || status?.status === "writing"}
              onRewrite={() => {
                if (!active) return;
                setWriting(true);
                void regenerateBrief(active.id)
                  .then((n) => {
                    upsert(n);
                    setWriting(false);
                  })
                  .catch(() => setWriting(false));
              }}
              onSaveTranscript={(text) => {
                if (!active) return;
                void updateTranscript(active.id, text).then(upsert);
              }}
            />
          )}
          {view === "archive" && (
            <ArchiveView
              nights={nights}
              onOpen={(id) => {
                setActiveId(id);
                setView("morning");
              }}
              onDelete={(id) => {
                void deleteNight(id).then(() => {
                  setNights((cur) => cur.filter((n) => n.id !== id));
                  setActiveId((cur) => (cur === id ? null : cur));
                });
              }}
            />
          )}
          {view === "settings" && (
            <SettingsView
              settings={settings}
              live={live}
              saving={saving}
              onSave={async (patch: SettingsPatch) => {
                setSaving(true);
                try {
                  const next = await saveSettings(patch);
                  setSettings(next);
                  setLive(await listOllamaModels().catch(() => []));
                } finally {
                  setSaving(false);
                }
              }}
              onTest={testProvider}
            />
          )}
        </main>
      </div>
    </div>
  );
}
