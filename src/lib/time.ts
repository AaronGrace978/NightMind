const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatDuration(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h) return `${h}:${pad(m)}:${pad(r)}`;
  return `${pad(m)}:${pad(r)}`;
}

export function formatClock(d = new Date()): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatNightOf(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h >= 4 && h < 7) return "The hour before dawn.";
  if (h >= 7 && h < 11) return "Morning. The night left you something.";
  if (h >= 11 && h < 17) return "Daylight. You can still speak to the dark.";
  if (h >= 17 && h < 21) return "Evening gathers. The page is empty.";
  if (h >= 21 || h < 2) return "The house is quiet. Say it while it's true.";
  return "The deep night. Don't organize it. Just speak.";
}

export function isMorningHours(d = new Date()): boolean {
  const h = d.getHours();
  return h >= 5 && h < 12;
}
