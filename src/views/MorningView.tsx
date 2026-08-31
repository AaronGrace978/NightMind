import { useEffect, useState } from "react";
import { providerLabel } from "../lib/catalog";
import { formatDuration, formatNightOf } from "../lib/time";
import type { Night } from "../lib/types";

export function MorningView({
  night,
  writing,
  onRewrite,
  onSaveTranscript,
}: {
  night: Night | null;
  writing: boolean;
  onRewrite: () => void;
  onSaveTranscript: (text: string) => void;
}) {
  const [draft, setDraft] = useState(night?.transcript ?? "");
  const brief = night?.brief;

  useEffect(() => {
    setDraft(night?.transcript ?? "");
  }, [night?.id, night?.transcript]);

  if (!night) {
    return (
      <section className="view empty">
        <div className="kicker">Morning</div>
        <h1>Nothing was spoken last night.</h1>
        <p className="sub">The page is still blank. Dump it in the dark whenever it arrives.</p>
      </section>
    );
  }

  if (!brief) {
    return (
      <section className="view empty">
        <div className="kicker">Night of {formatNightOf(night.night_of)}</div>
        <h1>{writing ? "Still writing." : "The morning isn't written yet."}</h1>
        <p className="sub">
          {writing
            ? "Stay with the dark a little longer."
            : night.error || "When the dump is in, NightMind will set down the brief."}
        </p>
        {night.transcript && (
          <div className="row-actions">
            <button className="btn" onClick={onRewrite} disabled={writing}>
              Write the morning
            </button>
          </div>
        )}
      </section>
    );
  }

  const thread = brief.thread.split(/\n{2,}/).filter(Boolean);

  return (
    <article className="view brief-view">
      <header className="brief-head">
        <div className="kicker">Night of {formatNightOf(night.night_of)}</div>
        <h1>{brief.headline}</h1>
        {(brief.mood_label || brief.mood_note) && (
          <div className="mood">
            {brief.mood_label && <b>{brief.mood_label}</b>}
            {brief.mood_note && <span>{brief.mood_note}</span>}
          </div>
        )}
      </header>

      {thread.length > 0 && (
        <div className="thread">
          {thread.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>
      )}

      {brief.decisions.length > 0 && (
        <section className="section">
          <h2>Decisions</h2>
          <ul className="item-list">
            {brief.decisions.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {brief.actions.length > 0 && (
        <section className="section">
          <h2>Do these</h2>
          <ul className="item-list">
            {brief.actions.map((a) => (
              <li key={a.text}>
                <span>{a.text}</span>
                <span className={`urgency ${a.urgency}`}>{a.urgency}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {brief.ideas.length > 0 && (
        <section className="section">
          <h2>Keep these</h2>
          <ul className="item-list">
            {brief.ideas.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {brief.release.length > 0 && (
        <section className="section">
          <h2>Let these go</h2>
          <ul className="item-list">
            {brief.release.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {brief.quote && <blockquote className="quote">“{brief.quote}”</blockquote>}

      <div className="meta-row">
        <span>{formatDuration(night.duration_secs)}</span>
        <span>
          {providerLabel(brief.provider)} · {brief.model}
        </span>
      </div>

      <div className="row-actions">
        <button className="btn" onClick={onRewrite} disabled={writing}>
          {writing ? "Rewriting…" : "Rewrite the morning"}
        </button>
      </div>

      <details className="transcript">
        <summary>Raw dump</summary>
        <textarea
          value={draft || night.transcript || ""}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            const next = draft.trim();
            if (next && next !== (night.transcript || "").trim()) onSaveTranscript(next);
          }}
        />
      </details>
    </article>
  );
}
