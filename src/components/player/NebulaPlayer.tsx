import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  PictureInPicture, Settings, SkipBack, SkipForward, Loader2,
  Bookmark,
} from "lucide-react";
import type { PlayerSettings } from "@/hooks/use-player-settings";

export type Chapter = { time: number; title: string };

export type NebulaPlayerProps = {
  src: string;
  poster?: string | null;
  title?: string;
  captionsUrl?: string | null;
  chapters?: Chapter[] | null;
  settings: PlayerSettings;
  startAt?: number;
  bookmarks?: Array<{ id: string; time_seconds: number; label: string | null }>;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  onAddBookmark?: (time: number) => void;
  onRemoveBookmark?: (id: string) => void;
};

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function fmt(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function NebulaPlayer({
  src, poster, title, captionsUrl, chapters, settings,
  startAt = 0, bookmarks = [], onProgress, onEnded, onAddBookmark, onRemoveBookmark,
}: NebulaPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const startedRef = useRef(false);
  const lastReportRef = useRef(0);

  const sortedChapters = useMemo(
    () => (chapters ?? []).slice().sort((a, b) => a.time - b.time),
    [chapters]
  );

  const currentChapter = useMemo(() => {
    if (!sortedChapters.length) return null;
    let active: Chapter | null = null;
    for (const c of sortedChapters) {
      if (current >= c.time) active = c;
      else break;
    }
    return active;
  }, [sortedChapters, current]);

  // Block right-click
  useEffect(() => {
    if (!settings.block_right_click) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
      }
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [settings.block_right_click]);

  // DevTools blocking (experimental)
  useEffect(() => {
    if (!settings.block_devtools) return;
    const threshold = 160;
    const check = () => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if (widthDiff || heightDiff) {
        videoRef.current?.pause();
      }
    };
    const interval = setInterval(check, 1000);
    return () => clearInterval(interval);
  }, [settings.block_devtools]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setShowControls(false);
    }, 3000);
  }, []);

  const wake = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, []);

  const seek = useCallback((to: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(to, v.duration || 0));
  }, []);

  const skip = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    seek(v.currentTime + delta);
  }, [seek]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  const togglePip = useCallback(async () => {
    const v = videoRef.current as any;
    if (!v) return;
    try {
      if ((document as any).pictureInPictureElement) await (document as any).exitPictureInPicture();
      else await v.requestPictureInPicture?.();
    } catch {}
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!containerRef.current) return;
      const active = document.activeElement as HTMLElement | null;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      const within = containerRef.current.contains(active) || document.fullscreenElement === containerRef.current;
      if (!within && !fullscreen) return;
      switch (e.key.toLowerCase()) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "arrowright": case "l": skip(10); wake(); break;
        case "arrowleft": case "j": skip(-10); wake(); break;
        case "arrowup": e.preventDefault(); setVolume((v) => Math.min(1, v + 0.05)); wake(); break;
        case "arrowdown": e.preventDefault(); setVolume((v) => Math.max(0, v - 0.05)); wake(); break;
        case "m": setMuted((m) => !m); wake(); break;
        case "f": toggleFullscreen(); break;
        case "p": togglePip(); break;
        case "c": setShowCaptions((s) => !s); break;
        case "b": if (onAddBookmark) { onAddBookmark(videoRef.current?.currentTime ?? 0); } break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, toggleFullscreen, togglePip, fullscreen, wake, onAddBookmark]);

  // Resume position
  useEffect(() => {
    if (!settings.resume_playback) return;
    const v = videoRef.current;
    if (!v || startedRef.current) return;

    let initialStart = startAt;
    try {
      const localKey = `nebula_resume_${src}`;
      const savedLocal = localStorage.getItem(localKey);
      if (savedLocal) {
        const parsed = parseFloat(savedLocal);
        if (!isNaN(parsed) && parsed > 0) {
          initialStart = parsed;
        }
      }
    } catch (_) {}

    if (!initialStart || initialStart < 3) return;

    const onLoaded = () => {
      if (startedRef.current) return;
      if (v.duration && initialStart < v.duration - 5) v.currentTime = initialStart;
      startedRef.current = true;
    };
    v.addEventListener("loadedmetadata", onLoaded);
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, [startAt, src, settings.resume_playback]);

  // Toggle captions track
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !v.textTracks.length) return;
    const track = v.textTracks[0];
    track.mode = showCaptions ? "showing" : "hidden";
  }, [showCaptions]);

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 group select-none focus:outline-none"
      onMouseMove={wake}
      onMouseLeave={() => { if (playing) setShowControls(false); }}
      tabIndex={0}
      style={{ "--player-accent": settings.accent_color, "--player-progress": settings.progress_color } as React.CSSProperties}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        className="w-full h-full object-contain bg-black"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        onPlay={() => { setPlaying(true); scheduleHide(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || 0)}
        onTimeUpdate={(e) => {
          const t = (e.target as HTMLVideoElement).currentTime;
          setCurrent(t);
          if (settings.resume_playback) {
            try {
              localStorage.setItem(`nebula_resume_${src}`, String(t));
            } catch (_) {}
          }
          if (onProgress && Math.abs(t - lastReportRef.current) >= 5) {
            lastReportRef.current = t;
            onProgress(t, duration);
          }
        }}
        onProgress={(e) => {
          const v = e.target as HTMLVideoElement;
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        controlsList={settings.block_download ? "nodownload noremoteplayback" : undefined}
        disablePictureInPicture={false}
        crossOrigin="anonymous"
        preload="metadata"
        playsInline
      >
        {captionsUrl && (
          <track
            kind="subtitles"
            src={captionsUrl}
            srcLang="pt"
            label="Português"
          />
        )}
      </video>

      {/* Watermark */}
      {settings.watermark_enabled && settings.watermark_text && (
        <div
          className={`absolute pointer-events-none text-sm font-medium text-white px-3 py-1 ${
            settings.watermark_position === "top-left" ? "top-4 left-4" :
            settings.watermark_position === "top-right" ? "top-4 right-4" :
            settings.watermark_position === "bottom-left" ? "bottom-16 left-4" :
            "bottom-16 right-4"
          }`}
          style={{ opacity: settings.watermark_opacity }}
        >
          {settings.logo_url && (
            <img src={settings.logo_url} alt="" className="h-6 inline-block mr-2 align-middle" />
          )}
          <span>{settings.watermark_text}</span>
        </div>
      )}

      {/* Center play / loading */}
      {(waiting || !playing) && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/0 via-black/0 to-black/40 transition"
          aria-label={playing ? "Pausar" : "Reproduzir"}
        >
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center backdrop-blur-sm shadow-2xl"
            style={{ background: `${settings.accent_color}cc` }}
          >
            {waiting ? (
              <Loader2 className="h-7 w-7 text-white animate-spin" />
            ) : playing ? (
              <Pause className="h-7 w-7 text-white" />
            ) : (
              <Play className="h-7 w-7 text-white translate-x-0.5" />
            )}
          </div>
        </button>
      )}

      {/* Title bar */}
      <div className={`absolute top-0 inset-x-0 px-4 py-3 bg-gradient-to-b from-black/70 to-transparent transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="text-xs text-white/80 truncate">{currentChapter?.title ?? title ?? ""}</div>
      </div>

      {/* Controls */}
      <div
        className={`absolute bottom-0 inset-x-0 px-4 pb-3 pt-8 bg-gradient-to-t from-black/85 via-black/40 to-transparent transition-opacity ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        style={{ background: showControls ? undefined : undefined }}
      >
        {/* Seek bar */}
        <ProgressBar
          duration={duration}
          current={current}
          buffered={buffered}
          chapters={sortedChapters}
          bookmarks={bookmarks}
          progressColor={settings.progress_color}
          onSeek={seek}
        />

        <div className="flex items-center gap-2 mt-2 text-white">
          <button onClick={togglePlay} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Play/Pause">
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <button onClick={() => skip(-10)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Voltar 10s">
            <SkipBack className="h-4 w-4" />
          </button>
          <button onClick={() => skip(10)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Avançar 10s">
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-1.5 group/vol">
            <button onClick={() => setMuted((m) => !m)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label={muted ? "Ativar som" : "Silenciar"}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : volume < 0.5 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <input
              type="range" min={0} max={1} step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => { setMuted(false); setVolume(Number(e.target.value)); }}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white cursor-pointer h-1 opacity-0 group-hover/vol:opacity-100"
            />
          </div>

          <div className="text-[11px] tabular-nums text-white/80 ml-1">
            {fmt(current)} <span className="text-white/40">/ {fmt(duration)}</span>
          </div>

          <div className="flex-1" />

          {/* Bookmark button */}
          {settings.bookmarks_enabled && onAddBookmark && (
            <button
              onClick={() => onAddBookmark(current)}
              className="p-1.5 rounded-lg hover:bg-white/10"
              aria-label="Adicionar marcador (b)"
              title="Adicionar marcador (b)"
            >
              <Bookmark className="h-4 w-4" />
            </button>
          )}

          {/* Captions toggle */}
          {captionsUrl && (
            <button
              onClick={() => setShowCaptions((s) => !s)}
              className={`px-1.5 py-1 rounded-lg text-[10px] font-bold ${showCaptions ? "bg-white text-black" : "hover:bg-white/10 border border-white/30"}`}
              title="Legendas (c)"
            >
              CC
            </button>
          )}

          {/* Speed control */}
          {settings.speed_control && (
            <div className="relative">
              <button onClick={() => setShowSettings((s) => !s)} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Configurações">
                <Settings className="h-4 w-4" />
              </button>
              {showSettings && (
                <div className="absolute right-0 bottom-full mb-2 min-w-[160px] rounded-xl bg-black/95 border border-white/10 p-1 shadow-2xl z-50">
                  <div className="text-[10px] uppercase tracking-widest text-white/40 px-2 py-1">Velocidade</div>
                  {RATES.map((r) => (
                    <button
                      key={r}
                      onClick={() => { setRate(r); setShowSettings(false); }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-lg hover:bg-white/10 ${rate === r ? "text-white" : "text-white/70"}`}
                    >
                      {r === 1 ? "Normal" : `${r}x`} {rate === r && <span className="float-right">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PiP */}
          <button onClick={togglePip} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Picture-in-Picture" title="PiP (p)">
            <PictureInPicture className="h-4 w-4" />
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1.5 rounded-lg hover:bg-white/10" aria-label="Tela cheia" title="Tela cheia (f)">
            {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({
  duration, current, buffered, chapters, bookmarks, progressColor, onSeek,
}: {
  duration: number; current: number; buffered: number;
  chapters: Chapter[]; bookmarks: Array<{ id: string; time_seconds: number; label: string | null }>;
  progressColor: string; onSeek: (t: number) => void;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const pct = duration ? (current / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  const onMove = (e: React.MouseEvent) => {
    const el = barRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    setHoverPct(Math.max(0, Math.min(1, x)) * 100);
  };

  const onClick = (e: React.MouseEvent) => {
    const el = barRef.current;
    if (!el || !duration) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, x)) * duration);
  };

  return (
    <div
      ref={barRef}
      className="relative h-3 flex items-center cursor-pointer group/seek"
      onMouseMove={onMove}
      onMouseLeave={() => setHoverPct(null)}
      onClick={onClick}
    >
      <div className="absolute inset-x-0 h-1 rounded-full bg-white/15 group-hover/seek:h-1.5 transition-all" />
      <div
        className="absolute h-1 rounded-full bg-white/30 group-hover/seek:h-1.5 transition-all"
        style={{ width: `${bufPct}%` }}
      />
      <div
        className="absolute h-1 rounded-full group-hover/seek:h-1.5 transition-all"
        style={{ width: `${pct}%`, background: progressColor }}
      />
      {/* Chapter markers */}
      {chapters.map((c, i) => {
        if (!duration) return null;
        const left = (c.time / duration) * 100;
        if (left <= 0 || left >= 100) return null;
        return (
          <div
            key={`ch-${i}`}
            className="absolute w-0.5 h-2 bg-white/60"
            style={{ left: `${left}%` }}
            title={c.title}
          />
        );
      })}
      {/* Bookmark markers */}
      {bookmarks.map((b) => {
        if (!duration) return null;
        const left = (b.time_seconds / duration) * 100;
        return (
          <div
            key={b.id}
            className="absolute top-0 bottom-0 w-1 rounded-full bg-yellow-400"
            style={{ left: `${left}%` }}
            title={b.label || fmt(b.time_seconds)}
          />
        );
      })}
      {/* Seek thumb */}
      <div
        className="absolute h-3 w-3 -ml-1.5 rounded-full bg-white shadow-lg opacity-0 group-hover/seek:opacity-100 transition"
        style={{ left: `${pct}%` }}
      />
      {/* Hover tooltip */}
      {hoverPct !== null && duration > 0 && (
        <div
          className="absolute -top-7 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/90 border border-white/10 text-[10px] text-white tabular-nums pointer-events-none"
          style={{ left: `${hoverPct}%` }}
        >
          {fmt((hoverPct / 100) * duration)}
        </div>
      )}
    </div>
  );
}
