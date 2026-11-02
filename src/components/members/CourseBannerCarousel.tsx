import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextBannerIndex } from "@/lib/course-banners";
import type { CourseBanner } from "@/lib/course-banners";

export function CourseBannerCarousel({ banners, urls, intervalSeconds, onImageError }: { banners: CourseBanner[]; urls: Record<string, string>; intervalSeconds: number; onImageError?: (path: string) => void }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const changed = () => setReducedMotion(media.matches);
    media.addEventListener("change", changed); return () => media.removeEventListener("change", changed);
  }, []);
  useEffect(() => { setIndex((i) => i < banners.length ? i : 0); }, [banners.length]);
  useEffect(() => {
    if (banners.length < 2 || paused || hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((i) => nextBannerIndex(i, banners.length)), intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [banners.length, intervalSeconds, paused, hovered, focused, reducedMotion]);
  if (!banners.length) return null;
  return <section aria-label="Banners de Cursos" aria-roledescription="carrossel" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false); }} className="relative aspect-[16/7] overflow-hidden rounded-md bg-card sm:aspect-[32/9]">
    {banners.map((b, i) => <div key={b.id} aria-hidden={i !== index} inert={i !== index} className={`absolute inset-0 transition-opacity duration-700 ease-in-out motion-reduce:transition-none ${i === index ? "z-10 opacity-100" : "pointer-events-none opacity-0"}`}>
      {b.courseId ? <Link to="/courses/$courseId" params={{ courseId: b.courseId }} className="block h-full w-full"><img src={urls[b.path]} alt={b.label} onError={() => onImageError?.(b.path)} className="h-full w-full object-cover object-center" /></Link> : <img src={urls[b.path]} alt={b.label} onError={() => onImageError?.(b.path)} className="h-full w-full object-cover object-center" />}
    </div>)}
    {banners.length > 1 && <div className="absolute inset-x-3 bottom-3 z-20 flex items-center justify-between gap-3">
      <div className="flex gap-1 rounded-md border border-border bg-background/85 p-1">
        <Button size="icon" variant="ghost" aria-label="Banner anterior" onClick={() => setIndex((i) => (i + banners.length - 1) % banners.length)}><ChevronLeft /></Button>
        <Button size="icon" variant="ghost" aria-label={paused ? "Retomar banners" : "Pausar banners"} onClick={() => setPaused((v) => !v)}>{paused ? <Play /> : <Pause />}</Button>
        <Button size="icon" variant="ghost" aria-label="Próximo banner" onClick={() => setIndex((i) => nextBannerIndex(i, banners.length))}><ChevronRight /></Button>
      </div>
      <div className="flex flex-wrap justify-end gap-1 rounded-md border border-border bg-background/85 p-1">
        {banners.map((b, i) => <Button key={b.id} variant={i === index ? "default" : "ghost"} size="icon" className="size-7" aria-label={`Exibir banner ${i + 1}`} aria-current={i === index ? "true" : undefined} onClick={() => setIndex(i)}>{i + 1}</Button>)}
      </div>
    </div>}
  </section>;
}