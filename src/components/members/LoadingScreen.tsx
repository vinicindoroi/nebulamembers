import { useEffect, useRef } from "react";

/** Decorative motion only; never delays the real member gate. */
function LoadingMotion() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0, height = 0, raf = 0, last = 0, time = 0;
    let visible = false;
    let primary = "", foreground = "";
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2, cy = height / 2;
      const scale = Math.min(width / 360, height / 260);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(scale, scale);
      // Fine elliptical ribbons form a dimensional, tilted orbital system.
      for (let line = 0; line < 9; line++) {
        const rotation = -.38 + line * .012;
        const rx = 111 + line * 5, ry = 39 + line * 2.5;
        ctx.save(); ctx.rotate(rotation);
        ctx.strokeStyle = primary;
        ctx.globalAlpha = line % 3 === 0 ? .23 : .075;
        ctx.lineWidth = .75;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
        const angle = time * (.32 + line * .016) + line * .68;
        ctx.globalAlpha = .65;
        ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, angle, angle + .24); ctx.stroke();
        if (line % 3 === 0) {
          const x = Math.cos(angle + .24) * rx, y = Math.sin(angle + .24) * ry;
          ctx.fillStyle = primary; ctx.shadowColor = primary; ctx.shadowBlur = 9;
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      // Sparse, deterministic points, never a repeating star grid.
      for (let i = 0; i < 24; i++) {
        const angle = i * 2.39996;
        const radius = 73 + (i * 31 % 91);
        const drift = reduced.matches ? 0 : Math.sin(time * .3 + i) * 3;
        const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius * .62 + drift;
        ctx.globalAlpha = .12 + .22 * (1 + Math.sin(time * .7 + i)) / 2;
        ctx.fillStyle = i % 3 === 0 ? primary : foreground;
        ctx.beginPath(); ctx.arc(x, y, i % 5 === 0 ? 1.2 : .65, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    };
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || reduced.matches) return;
      if (now - last >= 1000 / 24) {
        time += Math.min((now - last) / 1000, .07); last = now; draw();
      }
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      cancelAnimationFrame(raf); raf = 0;
      const style = getComputedStyle(canvas);
      primary = style.getPropertyValue("--primary").trim();
      foreground = style.getPropertyValue("--foreground").trim();
      if (!visible || document.hidden) return;
      draw(); last = performance.now();
      if (!reduced.matches) raf = requestAnimationFrame(frame);
    };
    const size = new ResizeObserver(() => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); update();
    });
    const visibility = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); });
    const theme = new MutationObserver(update);
    size.observe(canvas); visibility.observe(canvas);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    reduced.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(raf); size.disconnect(); visibility.disconnect(); theme.disconnect();
      reduced.removeEventListener("change", update); document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="absolute inset-0 h-full w-full pointer-events-none" />;
}

export function LoadingScreen() {
  return <div className="nebula-loading min-h-svh flex flex-col items-center justify-center bg-background text-foreground px-6 overflow-hidden" role="status" aria-live="polite" aria-label="Carregando a plataforma">
    <div className="relative w-[360px] max-w-full aspect-[18/13] shrink-0" aria-hidden="true">
      <LoadingMotion />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="nebula-loading-mark flex items-center justify-center h-16 w-16 rounded-2xl border border-glass-border bg-glass backdrop-blur-xl">
          <svg viewBox="0 0 40 40" className="h-8 w-8 text-primary" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 29V11l20 18V11" /><path d="M10 11l20 18" strokeWidth="5" opacity=".12" /></svg>
        </div>
      </div>
    </div>
    <div className="text-center -mt-4 space-y-3">
      <p className="text-lg font-semibold">Nebula Members</p>
      <div className="nebula-loading-track mx-auto w-28 h-px overflow-hidden bg-border" aria-hidden="true"><span className="block h-full w-12 bg-primary" /></div>
      <p className="text-xs text-muted-foreground">Carregando seu espaço<span className="nebula-loading-dots" aria-hidden="true">…</span></p>
    </div>
  </div>;
}