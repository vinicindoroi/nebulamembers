import { useEffect, useRef } from "react";

/** Twinkling star dots sampled from text, drawn subtly over the nebula. */
export function StarText({ text = "NEBULA MEMBERS", className = "" }: { text?: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let stars: { x: number; y: number; r: number; ph: number; sp: number }[] = [];
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const off = document.createElement("canvas"); off.width = w; off.height = h;
      const o = off.getContext("2d")!;
      const lines = text.split(" ");
      const longest = Math.max(...lines.map((l) => l.length));
      const size = Math.min((w * 0.7) / (longest * 0.72), 110);
      o.font = `700 ${size}px "Plus Jakarta Sans", sans-serif`;
      o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
      lines.forEach((l, i) => o.fillText(l, w / 2, h * 0.4 + (i - (lines.length - 1) / 2) * size * 1.05));
      const data = o.getImageData(0, 0, w, h).data;
      const step = Math.max(4, Math.round(size / 22));
      stars = [];
      for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
        if (data[(y * w + x) * 4 + 3]! > 128 && Math.random() < 0.7)
          stars.push({ x: x + (Math.random() - 0.5) * step * 0.3, y: y + (Math.random() - 0.5) * step * 0.3, r: 0.35 + Math.random() * 0.8, ph: Math.random() * 6.28, sp: 0.6 + Math.random() * 1.6 });
      }
    };
    let raf = 0, last = 0; const start = performance.now();
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden || now - last < 33) return; last = now;
      const t = (now - start) / 1000;
      const fade = Math.min(1, t / 3);
      ctx.clearRect(0, 0, cv.width, cv.height);
      for (const s of stars) {
        const a = (0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))) * fade;
        ctx.fillStyle = `rgba(225,235,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      if (reduce && fade >= 1) cancelAnimationFrame(raf);
    };
    document.fonts?.ready.then(build) ?? build();
    build(); raf = requestAnimationFrame(draw);
    const ro = new ResizeObserver(build); ro.observe(cv);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [text]);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
