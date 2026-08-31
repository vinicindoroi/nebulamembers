import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/logs")({ component: Page });

type Log = { id: string; action: string; target: string | null; ip: string | null; created_at: string; actor_id: string | null };

function Page() {
  const [rows, setRows] = useState<Log[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(500);
    setRows((data ?? []) as Log[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => rows.filter((r) => !q || `${r.action} ${r.target ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    [rows, q]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Logs de atividade</h1>
          <p className="text-sm text-muted-foreground mt-1">Histórico de ações administrativas na plataforma.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Filtrar por ação ou alvo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} de {rows.length}</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhum log</div>
            <div className="text-xs text-muted-foreground mt-1">
              {q ? "Nenhum log corresponde à busca." : "Os logs aparecerão aqui conforme as ações forem registradas."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-white/[0.02] border-b border-white/5">
                  <th className="text-left px-4 py-3 font-medium">Ação</th>
                  <th className="text-left px-4 py-3 font-medium">Alvo</th>
                  <th className="text-left px-4 py-3 font-medium">IP</th>
                  <th className="text-left px-4 py-3 font-medium">Quando</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3">
                      <span className="font-medium">{l.action}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{l.target ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{l.ip ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(l.created_at).toLocaleString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
