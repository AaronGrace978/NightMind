import { useMemo, useState } from "react";
import { modelsFor, PROVIDERS, TRANSCRIBE_MODELS } from "../lib/catalog";
import type { OllamaModel, PublicSettings, SettingsPatch } from "../lib/types";

export function SettingsView({
  settings,
  live,
  saving,
  onSave,
  onTest,
}: {
  settings: PublicSettings;
  live: OllamaModel[];
  saving: boolean;
  onSave: (patch: SettingsPatch) => Promise<void>;
  onTest: (provider: string) => Promise<string>;
}) {
  const [name, setName] = useState(settings.display_name);
  const [openai, setOpenai] = useState("");
  const [anthropic, setAnthropic] = useState("");
  const [ollama, setOllama] = useState("");
  const [host, setHost] = useState(settings.ollama_host);
  const [local, setLocal] = useState(settings.local_ollama_url);
  const [provider, setProvider] = useState(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [transcribe, setTranscribe] = useState(settings.transcribe_model);
  const [msg, setMsg] = useState<string | null>(null);

  const models = useMemo(() => modelsFor(provider, live), [provider, live]);

  async function save() {
    setMsg(null);
    const patch: SettingsPatch = {
      display_name: name,
      ollama_host: host,
      local_ollama_url: local,
      provider,
      model,
      transcribe_model: transcribe,
    };
    if (openai.trim()) patch.openai_key = openai.trim();
    if (anthropic.trim()) patch.anthropic_key = anthropic.trim();
    if (ollama.trim()) patch.ollama_key = ollama.trim();
    await onSave(patch);
    setOpenai("");
    setAnthropic("");
    setOllama("");
    setMsg("Kept on this machine.");
  }

  async function test(id: string) {
    setMsg(null);
    try {
      setMsg(await onTest(id));
    } catch (err) {
      setMsg(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <section className="view settings-view">
      <div className="kicker">Keys</div>
      <h1>The models that write the morning.</h1>
      <p className="sub">
        Keys never leave this computer. Transcription uses OpenAI. The brief can be Ollama Cloud,
        local Ollama, OpenAI, or Anthropic.
      </p>

      <div className="cards">
        <div className="card">
          <h2>You</h2>
          <p className="note">Optional. The editor will address you by name.</p>
          <div className="field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aaron" />
          </div>
        </div>

        <div className="card">
          <h2>Ollama Cloud</h2>
          <p className="note">
            Direct API at ollama.com — Kimi, GLM, DeepSeek, Qwen, Gemma, MiniMax, Nemotron, gpt-oss.
          </p>
          <div>
            <span className={`set${settings.ollama_key_set ? "" : " off"}`}>
              <span className="dot" />
              {settings.ollama_key_set ? `set ${settings.ollama_hint}` : "not set"}
            </span>
          </div>
          <div className="grid-2" style={{ marginTop: 12 }}>
            <div className="field">
              <label>API key</label>
              <input
                type="password"
                value={ollama}
                onChange={(e) => setOllama(e.target.value)}
                placeholder="ollama-…"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label>Host</label>
              <input value={host} onChange={(e) => setHost(e.target.value)} />
            </div>
          </div>
          <div className="row-actions">
            <button className="btn ghost" onClick={() => void test("ollama-cloud")}>
              Test cloud
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Ollama Local</h2>
          <p className="note">Your machine, port 11434. Cloud models with a `:cloud` suffix if you're signed in.</p>
          <div className="field">
            <label>URL</label>
            <input value={local} onChange={(e) => setLocal(e.target.value)} />
          </div>
          <div className="row-actions">
            <button className="btn ghost" onClick={() => void test("ollama-local")}>
              Test local
            </button>
          </div>
        </div>

        <div className="card">
          <h2>OpenAI</h2>
          <p className="note">Needed for transcription. Also writes briefs with GPT-5.6.</p>
          <span className={`set${settings.openai_key_set ? "" : " off"}`}>
            <span className="dot" />
            {settings.openai_key_set ? `set ${settings.openai_hint}` : "not set"}
          </span>
          <div className="field" style={{ marginTop: 12 }}>
            <label>API key</label>
            <input
              type="password"
              value={openai}
              onChange={(e) => setOpenai(e.target.value)}
              placeholder="sk-…"
              autoComplete="off"
            />
          </div>
          <div className="row-actions">
            <button className="btn ghost" onClick={() => void test("openai")}>
              Test OpenAI
            </button>
          </div>
        </div>

        <div className="card">
          <h2>Anthropic</h2>
          <p className="note">Claude Fable, Opus, Sonnet, Haiku — for the morning letter.</p>
          <span className={`set${settings.anthropic_key_set ? "" : " off"}`}>
            <span className="dot" />
            {settings.anthropic_key_set ? `set ${settings.anthropic_hint}` : "not set"}
          </span>
          <div className="field" style={{ marginTop: 12 }}>
            <label>API key</label>
            <input
              type="password"
              value={anthropic}
              onChange={(e) => setAnthropic(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
            />
          </div>
          <div className="row-actions">
            <button className="btn ghost" onClick={() => void test("anthropic")}>
              Test Anthropic
            </button>
          </div>
        </div>

        <div className="card">
          <h2>What writes the brief</h2>
          <p className="note">Pick a house and a model. Transcription always goes through OpenAI.</p>
          <div className="grid-2">
            <div className="field">
              <label>Provider</label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  const next = modelsFor(e.target.value, live)[0];
                  if (next) setModel(next.id);
                }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.note}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Transcription</label>
              <select value={transcribe} onChange={(e) => setTranscribe(e.target.value)}>
                {TRANSCRIBE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row-actions">
        <button className="btn" onClick={() => void save()} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span className="hint">{msg}</span>}
      </div>
    </section>
  );
}
