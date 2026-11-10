import { useState } from "react";
import { CheckCircle2, ChevronDown, Circle, NotebookPen } from "lucide-react";
import { fmtDate, fmtTime } from "@/lib/mentor-schedule";
import type { CallNotes } from "@/lib/call-feedback";
import { StarRating } from "./StarRating";

/** A past call in the student's history, with the mentor's notes and tasks when available. */
export function PastCallItem({ startsAt, status, tz, notes, rating }: {
  startsAt: string; status: string; tz: string; notes?: CallNotes; rating?: number;
}) {
  const hasNotes = !!notes && (notes.summary.trim() !== "" || notes.tasks.length > 0);
  const [open, setOpen] = useState(false);
  const doneTasks = notes?.tasks.filter((t) => t.done).length ?? 0;

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        disabled={!hasNotes}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={hasNotes ? open : undefined}
        className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left text-sm enabled:hover:bg-muted/40"
      >
        <span className="capitalize">{fmtDate(startsAt, tz)} · {fmtTime(startsAt, tz)}</span>
        <span className="flex items-center gap-3">
          {rating ? <StarRating value={rating} size="sm" /> : null}
          {hasNotes && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
              <NotebookPen className="h-3.5 w-3.5" /> Anotações
              {notes!.tasks.length > 0 && <span className="text-muted-foreground">· {doneTasks}/{notes!.tasks.length} tarefas</span>}
            </span>
          )}
          <span className="text-muted-foreground">{status === "cancelled" ? "Cancelada" : "Realizada"}</span>
          {hasNotes && <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />}
        </span>
      </button>
      {open && hasNotes && (
        <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
          {notes!.summary.trim() && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">O que foi falado</p>
              <p className="whitespace-pre-line text-sm">{notes!.summary}</p>
            </div>
          )}
          {notes!.tasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Suas tarefas</p>
              <ul className="space-y-1.5">
                {notes!.tasks.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {t.done ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
