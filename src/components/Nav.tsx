import type { ReactNode } from "react";
import type { View } from "../lib/types";

const items: { id: View; label: string; icon: ReactNode }[] = [
  {
    id: "night",
    label: "Night",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M15 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15 3.5z" />
      </svg>
    ),
  },
  {
    id: "morning",
    label: "Morning",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
      </svg>
    ),
  },
  {
    id: "archive",
    label: "Archive",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M4 7h16M6 7v12h12V7M9 11h6" />
      </svg>
    ),
  },
];

export function Nav({
  view,
  onChange,
}: {
  view: View;
  onChange: (v: View) => void;
}) {
  return (
    <nav className="nav">
      {items.map((item) => (
        <button
          key={item.id}
          className={`nav-btn${view === item.id ? " active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
      <div className="nav-spacer" />
      <button
        className={`nav-btn${view === "settings" ? " active" : ""}`}
        onClick={() => onChange("settings")}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 4v2M12 18v2M4.9 7.1l1.5 1.5M17.6 15.4l1.5 1.5M4 12h2M18 12h2M4.9 16.9l1.5-1.5M17.6 8.6l1.5-1.5" />
        </svg>
        <span>Keys</span>
      </button>
    </nav>
  );
}
