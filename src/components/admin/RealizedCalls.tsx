import { useState } from "react";
import { CheckCircle2, ChevronDown, MessageCircle, NotebookPen, Undo2 } from "lucide-react";
import { StarRating } from "@/components/schedule/StarRating";
import { fmtTime } from "@/lib/mentor-schedule";
import { waLink } from "@/lib/whatsapp";

export type RealizedCall = {
  id: string;
  starts_at: string;
  ends_at: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  rating?: number | null;
  comment?: string | null;
  hasNotes?: boolean;
};

/** Calls already realized: kept out of the active queue, grouped under a verifiable header. */
export function RealizedCalls({ calls, tz, onUndo, onNotes }: {
  calls: RealizedCall[];
  tz: string;
  onUndo?: (id: string) => void;
  onNotes?: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  if (calls.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-muted/25">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Realizadas
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal normal-case tabular-nums">{calls.length}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="divide-y divide-border border-t border-border">
          {calls.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-label="Call confirmada" />
              <span className="w-14 shrink-0 font-semibold tabular-nums">{fmtTime(c.starts_at, tz)}</span>
              <span className="min-w-[120px] flex-1 truncate font-medium">{c.name}</span>
              {c.email && <span className="min-w-[140px] max-w-xs flex-1 truncate text-xs text-muted-foreground">{c.email}</span>}
              {c.phone && (
                <a
                  href={waLink(c.phone)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              )}
              {c.rating ? (
                <span className="inline-flex shrink-0 items-center gap-1.5" title={c.comment || undefined}>
                  <StarRating value={c.rating} size="sm" />
                  {c.comment && <span className="max-w-[180px] truncate text-xs text-muted-foreground">“{c.comment}”</span>}
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted-foreground/70">Sem avaliação</span>
              )}
              {onNotes && (
                <button
                  type="button"
                  onClick={() => onNotes(c.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors hover:text-foreground ${c.hasNotes ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}
                >
                  <NotebookPen className="h-3.5 w-3.5" /> {c.hasNotes ? "Ver anotações" : "Anotar"}
                </button>
              )}
              {onUndo && (
                <button
                  type="button"
                  onClick={() => onUndo(c.id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Undo2 className="h-3.5 w-3.5" /> Devolver
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
