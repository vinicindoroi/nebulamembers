import { useEffect, useRef } from "react";

/** Lightweight, decorative motion; never captures input from the form. */
export function ConstellationMotion() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const palette = getComputedStyle(canvas);
    const primary = palette.getPropertyValue("--primary").trim();
    const foreground = palette.getPropertyValue("--foreground").trim();
    let width = 0, height = 0, frameId = 0, last = 0, elapsed = 0;
    let visible = false;
    const cursor = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const paths = [
      [[.08, .27], [.17, .16], [.28, .21], [.35, .12]],
      [[.73, .2], [.85, .29], [.8, .43], [.92, .51]],
      [[.12, .62], [.23, .69], [.35, .59], [.45, .66]],
    ];
    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      cursor.targetX = ((e.clientX - rect.left) / rect.width - .5) * 14;
      cursor.targetY = ((e.clientY - rect.top) / rect.height - .5) * 14;
    };
    const leave = () => { cursor.targetX = 0; cursor.targetY = 0; };
    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", move);
    parent?.addEventListener("pointerleave", leave);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      cursor.x += (cursor.targetX - cursor.x) * .05;
      cursor.y += (cursor.targetY - cursor.y) * .05;
      paths.forEach((path, index) => {
        const visibility = media.matches ? .22 : Math.pow((1 + Math.sin(elapsed * .3 + index * 2)) / 2, 2) * .55;
        const points = path.map(([x = 0, y = 0], i) => ({
          x: x * width + cursor.x + (media.matches ? 0 : Math.sin(elapsed * .18 + i) * 5),
          y: y * height + cursor.y + (media.matches ? 0 : Math.cos(elapsed * .15 + i) * 5),
        }));
        ctx.strokeStyle = primary;
        ctx.lineWidth = .75;
        ctx.globalAlpha = visibility * .35;
        ctx.beginPath();
        points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
        ctx.stroke();
        points.forEach((p, i) => {
          ctx.globalAlpha = visibility * (.65 + .35 * Math.sin(elapsed + i));
          ctx.fillStyle = foreground;
          ctx.beginPath(); ctx.arc(p.x, p.y, i === 1 ? 2 : 1.3, 0, Math.PI * 2); ctx.fill();
        });
        // One small light travels through each constellation, rather than a whole scene flashing.
        if (!media.matches) {
          const progress = ((elapsed * .12 + index * .33) % 1) * (points.length - 1);
          const a = points[Math.floor(progress)], b = points[Math.floor(progress) + 1];
          if (a && b) {
            const mix = progress % 1;
            ctx.globalAlpha = visibility;
            ctx.fillStyle = primary;
            ctx.beginPath(); ctx.arc(a.x + (b.x - a.x) * mix, a.y + (b.y - a.y) * mix, 2, 0, Math.PI * 2); ctx.fill();
          }
        }
      });
      if (!media.matches) {
        // Sparse shooting stars, confined to the upper sky and away from the form.
        for (let i = 0; i < 2; i++) {
          const cycle = (elapsed + i * 7) % 16;
          if (cycle > 1.5) continue;
          const p = cycle / 1.5;
          const x = width * (.22 + i * .36 + p * .16), y = height * (.08 + p * .1);
          const trail = ctx.createLinearGradient(x - 65, y - 32, x, y);
          trail.addColorStop(0, "transparent"); trail.addColorStop(1, primary);
          ctx.globalAlpha = Math.sin(p * Math.PI) * .7;
          ctx.strokeStyle = trail; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(x - 65, y - 32); ctx.lineTo(x, y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };
    const tick = (now: number) => {
      frameId = 0;
      if (!visible || document.hidden || media.matches) return;
      if (now - last >= 1000 / 24) {
        elapsed += Math.min((now - last) / 1000, .06);
        last = now;
        draw();
      }
      frameId = requestAnimationFrame(tick);
    };
    const update = () => {
      cancelAnimationFrame(frameId);
      frameId = 0;
      if (!visible || document.hidden) return;
      draw();
      last = performance.now();
      if (!media.matches) frameId = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); });
    const sizes = new ResizeObserver(() => { resize(); update(); });
    observer.observe(canvas); sizes.observe(canvas);
    document.addEventListener("visibilitychange", update);
    media.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frameId); observer.disconnect(); sizes.disconnect();
      parent?.removeEventListener("pointermove", move); parent?.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", update); media.removeEventListener("change", update);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />;
}