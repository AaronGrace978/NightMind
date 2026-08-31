import { getCurrentWindow } from "@tauri-apps/api/window";
import { Mark } from "./Mark";
import { isTauri } from "../lib/api";

export function Titlebar() {
  const win = () => getCurrentWindow();

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar-brand">
        <Mark />
        <span className="wordmark">NightMind</span>
      </div>
      {isTauri() && (
        <div className="win-controls">
          <button className="win-btn" onClick={() => win().minimize()} aria-label="Minimize">
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M2 6h8" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button
            className="win-btn"
            onClick={() => win().toggleMaximize()}
            aria-label="Maximize"
          >
            <svg width="11" height="11" viewBox="0 0 12 12">
              <rect x="2.2" y="2.2" width="7.6" height="7.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
          <button className="win-btn close" onClick={() => win().close()} aria-label="Close">
            <svg width="11" height="11" viewBox="0 0 12 12">
              <path d="M3 3l6 6M9 3L3 9" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
