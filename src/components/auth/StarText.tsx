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
      // Random (not grid) points inside the glyphs, so it reads like a star field, not a dot matrix.
      stars = [];
      let ink = 0;
      for (let k = 3; k < data.length; k += 16) if (data[k]! > 160) ink += 4;
      const target = Math.round(ink / 28);
      for (let n = 0, tries = 0; n < target && tries < target * 60; tries++) {
        const x = Math.random() * w, y = Math.random() * h;
        if (data[((y | 0) * w + (x | 0)) * 4 + 3]! < 160) continue;
        const roll = Math.random();
        const r = roll > 0.988 ? 1.4 + Math.random() * 0.8 : roll > 0.85 ? 0.8 + Math.random() * 0.4 : 0.3 + Math.random() * 0.4;
        stars.push({ x, y, r, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 1.2 });
        n++;
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
        const tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
        const a = (0.25 + 0.55 * tw * tw) * fade;
        if (s.r > 1.3) {
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
          g.addColorStop(0, `rgba(230,225,255,${a * 0.5})`); g.addColorStop(1, "rgba(230,225,255,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 5, 0, 6.283); ctx.fill();
        }
        ctx.fillStyle = `rgba(240,240,255,${a})`;
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
