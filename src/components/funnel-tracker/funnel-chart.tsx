import { cn } from "@/lib/utils";
import { num } from "@/lib/utils-format";
import type { FunnelStepRow } from "@/lib/funnel/types";

const BAND = 64;
const GAP = 6;
const VW = 200; // unidades do viewBox horizontal

/**
 * Visualização do funil em canvas SVG: bandas trapezoidais monotônicas
 * (nunca alargam para baixo), com rótulos e métricas fora da área do desenho.
 */
export function FunnelChart({ steps }: { steps: FunnelStepRow[] }) {
  if (!steps.length) return <p className="text-sm text-muted-foreground">Nenhuma etapa configurada.</p>;

  const max = Math.max(1, ...steps.map((s) => s.sessions));

  // larguras monotônicas: uma etapa nunca é mais larga que a anterior
  const widths: number[] = [];
  let prev = VW;
  for (const s of steps) {
    const w = Math.min(prev, Math.max(14, (s.sessions / max) * VW));
    widths.push(w);
    prev = w;
  }

  const height = steps.length * BAND;

  return (
    <div className="grid w-full grid-cols-[minmax(96px,1fr)_minmax(120px,2.2fr)_auto] items-stretch gap-x-2 sm:gap-x-4">
      {/* coluna 1: rótulos */}
      <div>
        {steps.map((step) => (
          <div key={step.key} className="flex items-center gap-2" style={{ height: BAND }}>
            <span className="break-words text-sm font-medium">{step.label}</span>
            {step.bottleneck && (
              <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                gargalo
              </span>
            )}
          </div>
        ))}
      </div>

      {/* coluna 2: canvas */}
      <div className="relative" style={{ height }}>
        <svg
          viewBox={`0 0 ${VW} ${height}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <linearGradient id="funnel-band" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="funnel-band-alert" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.35" />
              <stop offset="50%" stopColor="hsl(var(--destructive))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* eixo central */}
          <line
            x1={VW / 2}
            y1={0}
            x2={VW / 2}
            y2={height}
            stroke="hsl(var(--primary))"
            strokeOpacity="0.15"
            strokeWidth="1"
            strokeDasharray="4 6"
          />

          {steps.map((step, i) => {
            const top = widths[i] ?? VW;
            const bottom = widths[i + 1] ?? top * 0.9;
            const y = i * BAND + GAP / 2;
            const y2 = y + BAND - GAP;
            const cx = VW / 2;
            const pts = [
              `${cx - top / 2},${y}`,
              `${cx + top / 2},${y}`,
              `${cx + bottom / 2},${y2}`,
              `${cx - bottom / 2},${y2}`,
            ].join(" ");
            return (
              <polygon
                key={step.key}
                points={pts}
                fill={step.bottleneck ? "url(#funnel-band-alert)" : "url(#funnel-band)"}
                stroke={step.bottleneck ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                strokeOpacity="0.45"
                strokeWidth="0.6"
              />
            );
          })}
        </svg>
      </div>

      {/* coluna 3: métricas */}
      <div>
        {steps.map((step) => (
          <div
            key={step.key}
            className="flex items-center justify-end gap-2 tabular-nums sm:gap-4"
            style={{ height: BAND }}
          >
            <span className="text-sm font-semibold">{num(step.sessions, 2)}</span>
            <span
              className={cn(
                "w-14 text-right text-xs",
                step.bottleneck ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {step.retention === null ? "—" : `${num(step.retention, 2)}%`}
            </span>
            <span className="hidden w-12 text-right text-xs text-muted-foreground sm:inline">
              {step.dropped ? `-${num(step.dropped, 2)}` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
