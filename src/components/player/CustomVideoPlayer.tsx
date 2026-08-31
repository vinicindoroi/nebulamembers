import { useCallback, useEffect, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipForward, SkipBack, Bookmark, Settings, Loader2,
} from "lucide-react";
import type { PlayerSettings } from "@/hooks/use-player-settings";

type Props = {
  src: string;
  title?: string;
  settings: PlayerSettings;
  initialTime?: number;
  playbackRate?: number;
  bookmarks?: Array<{ id: string; time_seconds: number; label: string | null }>;
  onTimeUpdate?: (time: number, duration: number) => void;
  onAddBookmark?: (time: number) => void;
  onRemoveBookmark?: (id: string) => void;
  onSeekToBookmark?: (time: number) => void;
  onEnded?: () => void;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

function formatTime(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export function CustomVideoPlayer({
  src, title, settings, initialTime = 0, playbackRate = 1,
  bookmarks = [], onTimeUpdate, onAddBookmark, onRemoveBookmark, onSeekToBookmark, onEnded,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(playbackRate);
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);

  // Protection: block right-click
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

  // Set initial time and playback rate
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (initialTime > 0) v.currentTime = initialTime;
    v.playbackRate = speed;
  }, [src]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) setShowControls(true);
    else resetHideTimer();
  }, [playing, resetHideTimer]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered(v.buffered.end(v.buffered.length - 1));
    }
    onTimeUpdate?.(v.currentTime, v.duration);
  };

  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setLoading(false);
    if (initialTime > 0) v.currentTime = initialTime;
    v.playbackRate = speed;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (time: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(time, duration));
    setCurrentTime(v.currentTime);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = (e.clientX - rect.left) / rect.width;
    seek(pct * duration);
  };

  const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(pct * duration);
    setHoverX(e.clientX - rect.left);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
    setShowSpeedMenu(false);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !muted;
    setMuted(!muted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      if (val === 0) setMuted(true);
      else if (muted) { setMuted(false); videoRef.current.muted = false; }
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const skip = (seconds: number) => seek(currentTime + seconds);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 group select-none"
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      style={{ "--player-accent": settings.accent_color, "--player-progress": settings.progress_color } as React.CSSProperties}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onEnded={() => { setPlaying(false); onEnded?.(); }}
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        controlsList={settings.block_download ? "nodownload" : undefined}
        disablePictureInPicture={settings.block_download}
        playsInline
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      )}

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

      {/* Big play button when paused */}
      {!playing && !loading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center backdrop-blur-sm"
            style={{ background: `${settings.accent_color}cc` }}
          >
            <Play className="h-7 w-7 text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ background: settings.controls_bg }}
      >
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 cursor-pointer group/progress hover:h-2.5 transition-all mx-3 mt-2"
          onClick={handleProgressClick}
          onMouseMove={handleProgressHover}
          onMouseLeave={() => setHoverTime(null)}
        >
          <div className="absolute inset-0 rounded-full bg-white/20" />
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progress}%`, background: settings.progress_color }} />
          {/* Bookmark markers */}
          {bookmarks.map((b) => (
            <div
              key={b.id}
              className="absolute top-0 bottom-0 w-1 rounded-full bg-yellow-400"
              style={{ left: `${(b.time_seconds / duration) * 100}%` }}
              title={b.label || formatTime(b.time_seconds)}
            />
          ))}
          {/* Hover tooltip */}
          {hoverTime !== null && (
            <div
              className="absolute -top-8 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none"
              style={{ left: hoverX }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-1 px-3 py-2">
          <button onClick={togglePlay} className="p-1.5 hover:bg-white/10 rounded-lg transition" aria-label={playing ? "Pausar" : "Reproduzir"}>
            {playing ? <Pause className="h-5 w-5 text-white" /> : <Play className="h-5 w-5 text-white" fill="white" />}
          </button>

          <button onClick={() => skip(-10)} className="p-1.5 hover:bg-white/10 rounded-lg transition" aria-label="Voltar 10s">
            <SkipBack className="h-4 w-4 text-white" />
          </button>
          <button onClick={() => skip(10)} className="p-1.5 hover:bg-white/10 rounded-lg transition" aria-label="Avançar 10s">
            <SkipForward className="h-4 w-4 text-white" />
          </button>

          {/* Volume */}
          <div className="flex items-center gap-1 group/vol">
            <button onClick={toggleMute} className="p-1.5 hover:bg-white/10 rounded-lg transition" aria-label={muted ? "Ativar som" : "Silenciar"}>
              {muted || volume === 0 ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-0 group-hover/vol:w-20 transition-all duration-200 accent-white h-1 cursor-pointer opacity-0 group-hover/vol:opacity-100"
            />
          </div>

          {/* Time */}
          <span className="text-[11px] text-white/80 tabular-nums ml-2">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Bookmark button */}
          {settings.bookmarks_enabled && onAddBookmark && (
            <button
              onClick={() => onAddBookmark(currentTime)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition"
              aria-label="Adicionar marcador"
              title="Adicionar marcador"
            >
              <Bookmark className="h-4 w-4 text-white" />
            </button>
          )}

          {/* Speed */}
          {settings.speed_control && (
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2 py-1 hover:bg-white/10 rounded-lg transition text-[11px] text-white font-medium"
                aria-label="Velocidade"
              >
                {speed}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/95 border border-white/10 rounded-xl p-1 min-w-[80px]">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => changeSpeed(s)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition ${
                        speed === s ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} className="p-1.5 hover:bg-white/10 rounded-lg transition" aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>
            {isFullscreen ? <Minimize className="h-4 w-4 text-white" /> : <Maximize className="h-4 w-4 text-white" />}
          </button>
        </div>
      </div>
    </div>
  );
}
