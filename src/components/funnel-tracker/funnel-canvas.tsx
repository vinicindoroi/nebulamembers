import { useState } from "react";
import { cn } from "@/lib/utils";
import { num } from "@/lib/funnel-tracker/utils-format";
import type { FunnelStepRow } from "@/lib/funnel-tracker/types";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Maximize2, Code2 } from "lucide-react";
import { StepSnippetDialog } from "@/components/funnel-tracker/step-snippet-dialog";

const NODE_W = 260;
const NODE_H = 140;
const GAP_X = 110;
const PAD = 48;

/**
 * Canvas de fluxo estilo editor de bots: cada etapa é um nó conectado ao
 * próximo por uma aresta que mostra quantos passaram e quantos saíram.
 */
export function FunnelCanvas({ steps, workspaceId, funnelId, live, readOnly = false }: { steps: FunnelStepRow[]; workspaceId: string; funnelId: string; live?: Record<string, number>; readOnly?: boolean }) {
  const [zoom, setZoom] = useState(1);
  const [openStep, setOpenStep] = useState<{ key: string; label: string } | null>(null);

  if (!steps.length) return <p className="text-sm text-muted-foreground">Nenhuma etapa configurada.</p>;

  const width = PAD * 2 + steps.length * NODE_W + (steps.length - 1) * GAP_X;
  const height = PAD * 2 + NODE_H + 260;
  const maxSessions = Math.max(1, ...steps.map((s) => s.sessions));
  const nodeY = (height - NODE_H) / 2;

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-[hsl(var(--background))]">
      {/* grid pontilhada */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--primary) / 0.18) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-md border border-border bg-background/80 p-0.5 backdrop-blur">
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-14 text-center text-[11px] tabular-nums text-muted-foreground">{num(zoom * 100, 2)}%</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
          <Plus className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Restaurar zoom" title="Restaurar zoom" onClick={() => setZoom(1)}>
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="relative min-h-[380px] overflow-x-auto sm:min-h-[520px] overflow-y-hidden p-2">
        <div
          className="relative origin-top-left"
          style={{ width, height, transform: `scale(${zoom})`, marginBottom: (zoom - 1) * height }}
        >
          {/* arestas */}
          <svg className="absolute inset-0 overflow-visible" width={width} height={height}>
            <defs>
              <marker id="fc-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(var(--primary))" />
              </marker>
            </defs>
            {steps.slice(0, -1).map((step, i) => {
              const next = steps[i + 1];
              if (!next) return null;
              const x1 = PAD + i * (NODE_W + GAP_X) + NODE_W;
              const x2 = x1 + GAP_X;
              const y = nodeY + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const flowing = next.sessions > 0;
              const thickness = 1.5 + (next.sessions / maxSessions) * 5;
              return (
                <g key={step.key}>
                  <path
                    d={`M ${x1} ${y} C ${x1 + 40} ${y}, ${x2 - 40} ${y}, ${x2 - 2} ${y}`}
                    fill="none"
                    stroke={flowing ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    strokeOpacity={flowing ? 0.8 : 0.35}
                    strokeWidth={flowing ? thickness : 1.5}
                    strokeDasharray={flowing ? undefined : "5 5"}
                    markerEnd="url(#fc-arrow)"
                  />
                  {/* rótulo de passagem */}
                  <foreignObject x={mid - 44} y={y - 46} width="88" height="34">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                          next.bottleneck
                            ? "border-destructive/50 bg-destructive/15 text-destructive"
                            : "border-primary/40 bg-primary/10 text-primary",
                        )}
                      >
                        {next.retention === null ? "—" : `${num(next.retention, 2)}%`}
                      </span>
                    </div>
                  </foreignObject>
                  {/* saída (drop) */}
                  {next.dropped > 0 && (
                    <>
                      <path
                        d={`M ${mid} ${y} C ${mid} ${y + 44}, ${mid + 10} ${y + 58}, ${mid + 14} ${y + 74}`}
                        fill="none"
                        stroke="hsl(var(--destructive))"
                        strokeOpacity="0.5"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      <foreignObject x={mid - 40} y={y + 72} width="110" height="26">
                        <span className="whitespace-nowrap text-[11px] tabular-nums text-destructive/80">
                          saíram {num(next.dropped, 2)}
                        </span>
                      </foreignObject>
                    </>
                  )}
                </g>
              );
            })}
          </svg>

          {/* nós */}
          {steps.map((step, i) => {
            const x = PAD + i * (NODE_W + GAP_X);
            const share = Math.max(2, (step.sessions / maxSessions) * 100);
            return (
              <Button asChild variant="ghost"
                className="block whitespace-normal p-0"
                key={step.key}
              ><div
                role={readOnly ? undefined : "button"}
                tabIndex={readOnly ? undefined : 0}
                onClick={readOnly ? undefined : () => setOpenStep({ key: step.key, label: step.label })}
                onKeyDown={readOnly ? undefined : (e) => { if (e.key === "Enter" || e.key === " ") setOpenStep({ key: step.key, label: step.label }); }}
                title={readOnly ? step.label : "Ver script desta etapa"}
                className={cn(
                  "group absolute rounded-xl border bg-card/90 text-left shadow-lg backdrop-blur transition-colors hover:shadow-primary/10",
                  step.bottleneck ? "border-destructive/60 ring-1 ring-destructive/30" : "border-border hover:border-primary/50",
                )}
                style={{ left: x, top: nodeY, width: NODE_W, height: NODE_H }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-5 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                      {num(i + 1, 2)}
                    </span>
                    <span className="truncate text-sm font-semibold">{step.label}</span>
                  </div>
                  {(live?.[step.key] ?? 0) > 0 && (
                    <span
                      title="Usuários ativos nesta etapa nos últimos 5 min"
                      className="ml-auto flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400"
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      </span>
                      {live?.[step.key]}
                    </span>
                  )}
                  {!readOnly && <Code2 className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
                  {step.bottleneck && (
                    <span className="shrink-0 rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                      gargalo
                    </span>
                  )}
                </div>
                <div className="space-y-2 px-3 py-2.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xl font-bold tabular-nums">{num(step.sessions, 2)}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {num(step.ofTotal, 2)}% do total
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", step.bottleneck ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </div>
              </div></Button>
            );
          })}
        </div>
      </div>

      {openStep && (
        <StepSnippetDialog
          open
          onOpenChange={(v) => !v && setOpenStep(null)}
          workspaceId={workspaceId}
          funnelId={funnelId}
          stepKey={openStep.key}
          stepLabel={openStep.label}
        />
      )}
    </div>
  );
}
