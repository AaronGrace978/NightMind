import { formatDuration, formatNightOf } from "../lib/time";
import type { Night } from "../lib/types";

export function ArchiveView({
  nights,
  onOpen,
  onDelete,
}: {
  nights: Night[];
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (!nights.length) {
    return (
      <section className="view empty">
        <div className="kicker">Archive</div>
        <h1>The first night hasn't been spoken yet.</h1>
        <p className="sub">Every dump lives here — the brief, the audio, the raw transcript.</p>
      </section>
    );
  }

  return (
    <section className="view archive-view">
      <div className="kicker">Archive</div>
      <h1>Nights kept.</h1>
      <p className="sub">
        {nights.length} {nights.length === 1 ? "take" : "takes"} in the dark.
      </p>
      <div className="timeline">
        {nights.map((n) => (
          <div key={n.id} className="night-card">
            <button
              type="button"
              onClick={() => onOpen(n.id)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "grid",
                gap: 6,
              }}
            >
              <h3>{n.brief?.headline || "Unwritten night"}</h3>
              <p>
                {formatNightOf(n.night_of)} · {formatDuration(n.duration_secs)}
              </p>
            </button>
            <span className={`status-pill${n.status === "error" ? " error" : ""}`}>{n.status}</span>
            <div className="row-actions" style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => onDelete(n.id)}
              >
                Release
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
