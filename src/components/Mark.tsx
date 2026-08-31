export function Mark({ className = "mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M40.5 18.5c-2.4 3.2-3.8 7.2-3.8 11.5 0 10.2 8.3 18.5 18.5 18.5.7 0 1.4 0 2.1-.1C54.4 54.8 47 60 38.2 60 24.6 60 13.5 48.9 13.5 35.3c0-11.4 7.8-21 18.4-23.8-1.1 2.1-1.7 4.5-1.7 7 0 8.3 6.7 15 15 15 .4 0 .7 0 1.1 0-1.8-4.5-3.5-9.4-5.8-14.9z"
        fill="#f3ece0"
      />
      <circle cx="46" cy="20" r="1.4" fill="#e8b56a" />
    </svg>
  );
}
