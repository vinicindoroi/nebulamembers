import { useEffect, useRef } from "react";

/** Abstract orbital contours, not a chart or a representation of sales. */
export function DashboardMotion() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const palette = getComputedStyle(canvas);
    const primary = palette.getPropertyValue("--primary").trim();
    const foreground = palette.getPropertyValue("--foreground").trim();
    let width = 0, height = 0, raf = 0, last = 0, time = 0, visible = false;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const resize = () => {
      width = canvas.clientWidth; height = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const point = (u: number, line: number) => {
      const bend = Math.sin(u * Math.PI * 1.6 + time * .12 + line * .065);
      return {
        x: width * (.32 + u * .77) + mouse.x,
        y: height * (.68 - u * .4) + bend * height * .19 + (line - 7) * 11 + mouse.y,
      };
    };
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      mouse.x += (mouse.tx - mouse.x) * .05; mouse.y += (mouse.ty - mouse.y) * .05;
      const stroke = ctx.createLinearGradient(width * .32, 0, width, 0);
      stroke.addColorStop(0, "transparent"); stroke.addColorStop(.45, primary); stroke.addColorStop(1, "transparent");
      for (let line = 0; line < 15; line++) {
        ctx.strokeStyle = stroke;
        ctx.globalAlpha = line % 4 === 0 ? .24 : .09;
        ctx.lineWidth = line % 4 === 0 ? 1.1 : .7;
        ctx.beginPath();
        for (let step = 0; step <= 80; step++) {
          const p = point(step / 80, line);
          if (step === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        if (line % 4 === 0) {
          const u = media.matches ? .65 : (time * .045 + line * .13) % 1;
          const p = point(u, line);
          ctx.globalAlpha = Math.sin(u * Math.PI) * .7;
          ctx.fillStyle = primary;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = foreground;
          ctx.globalAlpha *= .7;
          ctx.beginPath(); ctx.arc(p.x, p.y, .8, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };
    const frame = (now: number) => {
      raf = 0;
      if (!visible || document.hidden || media.matches) return;
      if (now - last >= 1000 / 24) {
        time += Math.min((now - last) / 1000, .06); last = now; draw();
      }
      raf = requestAnimationFrame(frame);
    };
    const update = () => {
      cancelAnimationFrame(raf); raf = 0;
      if (!visible || document.hidden) return;
      draw(); last = performance.now();
      if (!media.matches) raf = requestAnimationFrame(frame);
    };
    const move = (e: PointerEvent) => {
      if (media.matches) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      mouse.tx = ((e.clientX - rect.left) / rect.width - .5) * 16;
      mouse.ty = ((e.clientY - rect.top) / rect.height - .5) * 10;
    };
    const leave = () => { mouse.tx = 0; mouse.ty = 0; };
    const parent = canvas.parentElement;
    parent?.addEventListener("pointermove", move); parent?.addEventListener("pointerleave", leave);
    const observer = new IntersectionObserver(([entry]) => { visible = entry?.isIntersecting ?? false; update(); });
    const sizes = new ResizeObserver(() => { resize(); update(); });
    observer.observe(canvas); sizes.observe(canvas);
    media.addEventListener("change", update); document.addEventListener("visibilitychange", update);
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); sizes.disconnect();
      parent?.removeEventListener("pointermove", move); parent?.removeEventListener("pointerleave", leave);
      media.removeEventListener("change", update); document.removeEventListener("visibilitychange", update);
    };
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-60 sm:opacity-100" />;
}