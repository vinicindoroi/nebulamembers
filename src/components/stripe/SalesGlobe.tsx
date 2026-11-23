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

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const TILT_MAX = 1.35;

const mix = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

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
    const baseColor: [number, number, number] = isDark ? mix([0.2, 0.2, 0.2], primary, 0.18) : mix([0.94, 0.94, 0.94], primary, 0.12);
    const fadeTo: [number, number, number] = isDark ? mix([0.03, 0.04, 0.04], primary, 0.1) : baseColor;
    const bright: [number, number, number] = mix(primary, [1, 1, 1], isDark ? 0.55 : 0.15);
    // "Live sales" effect: every country rests as a dim dot and flashes at its own organic rhythm,
    // like a sale popping up there. Countries that sell more flash more often.
    const rand = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    const sized = points.map((p, i) => {
      const w = p.weight / max;
      return { location: p.location, core: 0.022 + 0.04 * w, period: 5200 - 3400 * w, seed: i + 1 };
    });
    const dim: [number, number, number] = mix(primary, fadeTo, 0.55);
    const FLASH = 900; // ms a flash lasts
    const pulseMarkers = (t: number) => {
      const glows: Array<{ location: [number, number]; size: number; color: [number, number, number] }> = [];
      const cores: typeof glows = [];
      for (const m of sized) {
        const cycle = Math.floor(t / m.period + rand(m.seed));
        const start = (cycle - rand(m.seed)) * m.period + rand(m.seed * 31 + cycle) * (m.period - FLASH);
        const e = t - start;
        const k = e >= 0 && e < FLASH ? e / FLASH : -1;         // 0..1 while flashing
        if (k < 0) {
          cores.push({ location: m.location, size: m.core * 0.75, color: dim });
          continue;
        }
        const pop = Math.sin(Math.PI * Math.min(1, k * 1.6));  // fast rise, quick fall
        glows.push({ location: m.location, size: m.core * (1.4 + 2.2 * k), color: mix(primary, fadeTo, Math.min(1, k * 1.15)) });
        cores.push({ location: m.location, size: m.core * (0.75 + 0.75 * pop), color: mix(dim, bright, pop) });
      }
      return [...glows, ...cores];
    };
    const markers = pulseMarkers(performance.now());

    // Start facing the best-selling country (cobe: phi rotates around Y, theta tilts).
    const phi = focus ? -((focus[1] * Math.PI) / 180) - Math.PI / 2 : 0;
    const theta = focus ? clamp((focus[0] * Math.PI) / 180 * 0.6, -0.6, 0.6) : 0.25;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi,
      theta,
      dark: isDark ? 1 : 0,
      diffuse: isDark ? 1.6 : 1.2,
      mapSamples: 20000,
      mapBrightness: isDark ? 7 : 8,
      mapBaseBrightness: isDark ? 0.02 : 0,
      baseColor,
      markerColor: primary,
      glowColor: isDark ? mix([0.05, 0.05, 0.05], primary, 0.32) : mix(muted, primary, 0.4),
      markers,
      markerElevation: 0.02,
      opacity: 0.96,
    });

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Drag to explore every country; otherwise a slow auto-spin plus a gentle turn toward the cursor.
    let spin = phi;            // accumulated horizontal rotation (drag + auto-spin + inertia)
    let tilt = theta;          // accumulated vertical tilt (drag + inertia)
    let offPhi = 0, offTheta = 0;   // eased hover parallax
    let tgtPhi = 0, tgtTheta = 0;   // hover targets
    let speed = 0.0018, tgtSpeed = 0.0018;
    let velPhi = 0, velTheta = 0;   // rad per frame, kept after release for inertia
    let dragging = false;
    let lastX = 0, lastY = 0, lastT = 0;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      velPhi = 0;
      velTheta = 0;
      tgtPhi = 0;
      tgtTheta = 0;
      try { wrap.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
      wrap.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (dragging) {
        const now = performance.now();
        const dt = Math.max(8, now - lastT);
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        lastT = now;
        const k = 0.0062;
        spin += dx * k;
        tilt = clamp(tilt + dy * k * 0.75, -TILT_MAX, TILT_MAX);
        velPhi = (dx * k) / dt * 16;
        velTheta = (dy * k * 0.75) / dt * 16;
        return;
      }
      const r = wrap.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 2 - 1;   // -1..1
      const y = ((e.clientY - r.top) / r.height) * 2 - 1;
      tgtPhi = x * 0.6;
      tgtTheta = y * 0.35;
      tgtSpeed = 0.0006;               // nearly pause the spin while the user explores
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      try { wrap.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      wrap.style.cursor = "grab";
    };

    const onLeave = () => {
      if (dragging) return;
      tgtPhi = 0;
      tgtTheta = 0;
      tgtSpeed = 0.0018;
    };

    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    let raf = 0;
    const tick = () => {
      if (!reduce) {
        speed += (tgtSpeed - speed) * 0.03;
        if (!dragging) {
          spin += speed;
          if (Math.abs(velPhi) > 1e-6 || Math.abs(velTheta) > 1e-6) {
            spin += velPhi;
            tilt = clamp(tilt + velTheta, -TILT_MAX, TILT_MAX);
            velPhi *= 0.9;
            velTheta *= 0.9;
          }
        }
        offPhi += (tgtPhi - offPhi) * 0.045;
        offTheta += (tgtTheta - offTheta) * 0.045;
      }
      globe.update(
        reduce || sized.length === 0
          ? { phi: spin + offPhi, theta: clamp(tilt + offTheta, -1.4, 1.4) }
          : { phi: spin + offPhi, theta: clamp(tilt + offTheta, -1.4, 1.4), markers: pulseMarkers(performance.now()) },
      );
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
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      ro.disconnect();
      globe.destroy();
    };
  }, [points, focus]);

  return (
    <div className="relative w-full max-w-[480px] mx-auto aspect-square">
      <div className="globe-halo" aria-hidden />
      <div className="globe-orbit globe-orbit-dashed" style={{ inset: "-4%" }} aria-hidden />
      <div className="globe-orbit globe-orbit-dot" style={{ inset: "3%" }} aria-hidden />
      <div
        ref={wrapRef}
        className="relative w-full h-full cursor-grab select-none"
        style={{ touchAction: "pan-y" }}
      >
        <canvas ref={canvasRef} className="w-full h-full opacity-0 transition-opacity duration-700" style={{ contain: "layout paint size" }} />
      </div>
    </div>
  );
}
