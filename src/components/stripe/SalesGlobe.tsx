// Browser-only: imports the WebGL globe. Load with React.lazy behind <ClientOnly>.
import { useEffect, useRef } from "react";
import createGlobe from "cobe";

export type GlobePoint = { location: [number, number]; weight: number };

/** Resolve any CSS color (oklch, var-based…) to 0..1 RGB through a 1px canvas. */
function cssToRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return [0.5, 0.5, 0.5];
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [(d[0] ?? 0) / 255, (d[1] ?? 0) / 255, (d[2] ?? 0) / 255];
}

function token(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export default function SalesGlobe({ points, focus }: { points: GlobePoint[]; focus: [number, number] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let size = wrap.offsetWidth || 360;

    const bg = cssToRgb(token("--background") || "#111");
    const isDark = 0.2126 * bg[0] + 0.7152 * bg[1] + 0.0722 * bg[2] < 0.5;
    const primary = cssToRgb(token("--primary") || "#7dd");
    const muted = cssToRgb(token("--muted-foreground") || "#888");

    const max = Math.max(1, ...points.map((p) => p.weight));
    const markers = points.map((p) => ({ location: p.location, size: 0.035 + 0.09 * (p.weight / max) }));

    // Start facing the best-selling country (cobe: phi rotates around Y, theta tilts).
    let phi = focus ? -((focus[1] * Math.PI) / 180) - Math.PI / 2 : 0;
    const theta = focus ? Math.max(-0.6, Math.min(0.6, (focus[0] * Math.PI) / 180 * 0.6)) : 0.25;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi,
      theta,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: isDark ? 5 : 8,
      baseColor: isDark ? [0.22, 0.22, 0.22] : [0.92, 0.92, 0.92],
      markerColor: primary,
      glowColor: isDark ? [0.12, 0.12, 0.12] : muted,
      markers,
      opacity: 0.95,
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const tick = () => {
      if (!reduce) phi += 0.0035;
      globe.update({ phi });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const ro = new ResizeObserver(() => {
      size = wrap.offsetWidth || size;
      globe.update({ width: size * dpr, height: size * dpr });
    });
    ro.observe(wrap);
    requestAnimationFrame(() => { canvas.style.opacity = "1"; });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      globe.destroy();
    };
  }, [points, focus]);

  return (
    <div ref={wrapRef} className="relative w-full aspect-square max-w-[460px] mx-auto">
      <canvas ref={canvasRef} className="w-full h-full opacity-0 transition-opacity duration-700" style={{ contain: "layout paint size" }} />
    </div>
  );
}
