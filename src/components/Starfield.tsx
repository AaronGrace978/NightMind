import { useEffect, useRef } from "react";

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  s: number;
  tw: number;
};

export function Starfield() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let stars: Star[] = [];
    let raf = 0;
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.floor((canvas.clientWidth * canvas.clientHeight) / 14000);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        r: Math.random() * 1.2 + 0.2,
        a: Math.random() * 0.6 + 0.15,
        s: Math.random() * 0.08 + 0.02,
        tw: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      t += 0.016;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      for (const star of stars) {
        star.y += star.s;
        if (star.y > canvas.clientHeight) {
          star.y = 0;
          star.x = Math.random() * canvas.clientWidth;
        }
        const tw = star.a * (0.55 + 0.45 * Math.sin(t * 1.4 + star.tw));
        ctx.beginPath();
        ctx.fillStyle = `rgba(243,236,224,${tw})`;
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className="starfield" ref={ref} />;
}
