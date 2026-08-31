import { useEffect, useRef } from "react";

export function RecordOrb({
  recording,
  analyser,
  onToggle,
}: {
  recording: boolean;
  analyser: AnalyserNode | null;
  onToggle: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const data = new Uint8Array(analyser?.frequencyBinCount ?? 64);

    const paint = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      if (analyser) {
        analyser.getByteTimeDomainData(data);
      }

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.34;
      ctx.beginPath();
      const n = 96;
      for (let i = 0; i < n; i++) {
        const sample = analyser ? data[Math.floor((i / n) * data.length)] / 128 - 1 : 0;
        const amp = recording ? sample * 28 : Math.sin(i / 6) * 2;
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const r = radius + amp;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = recording ? "rgba(212,101,74,0.85)" : "rgba(232,181,106,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      raf = requestAnimationFrame(paint);
    };

    paint();
    return () => cancelAnimationFrame(raf);
  }, [analyser, recording]);

  return (
    <div className="orb-wrap">
      <div className={`orbit${recording ? " rec" : ""}`} />
      <button
        className={`orb${recording ? " recording" : ""}`}
        onClick={onToggle}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        <canvas ref={canvasRef} />
        <span className="orb-core">
          <span className="orb-dot" />
        </span>
      </button>
    </div>
  );
}
