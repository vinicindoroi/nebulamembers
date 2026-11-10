import { useEffect, useState } from "react";
import { ChevronDown, Hourglass, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { waLink } from "@/lib/whatsapp";

type Profile = { id: string; full_name: string | null; email: string | null; phone: string | null };

/** Students waiting for a free slot. Everyone is notified when one opens; first to book takes it. */
export function WaitlistPanel({ profiles, refreshKey }: { profiles: Record<string, Profile>; refreshKey?: unknown }) {
  const [rows, setRows] = useState<{ user_id: string; created_at: string }[]>([]);
  const [open, setOpen] = useState(false);

  const load = () =>
    supabase.from("mentor_waitlist").select("user_id, created_at").order("created_at")
      .then(({ data }) => setRows(data ?? []));
  useEffect(() => { load(); }, [refreshKey]);

  async function remove(id: string) {
    const { error } = await supabase.from("mentor_waitlist").delete().eq("user_id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.user_id !== id));
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-muted/25">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Hourglass className="h-4 w-4" /> Lista de espera
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">{rows.length}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border">
          <p className="px-4 pt-3 text-xs text-muted-foreground">Quando uma call é cancelada, remarcada ou você libera um horário avulso, todos daqui recebem um aviso. Quem marcar primeiro fica com o horário e sai da lista.</p>
          {rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground">Ninguém na lista de espera.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const p = profiles[r.user_id];
                return (
                  <li key={r.user_id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-[120px] flex-1 truncate font-medium">{p?.full_name || p?.email || "Aluno"}</span>
                    <span className="text-xs text-muted-foreground">desde {new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</span>
                    {p?.phone && (
                      <a href={waLink(p.phone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    )}
                    <button type="button" onClick={() => remove(r.user_id)} className="text-muted-foreground hover:text-destructive" title="Tirar da lista" aria-label="Tirar da lista">
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
