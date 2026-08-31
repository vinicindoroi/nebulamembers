import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Send, Bell, Users, Clock, FileText, Trash2, Calendar, CheckCircle2, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/notifications")({ component: Page });

type Notif = {
  id: string;
  title: string;
  content: string;
  audience: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

const AUDIENCES = [
  { value: "all", label: "Todos os membros" },
  { value: "free", label: "Plano Free" },
  { value: "pro", label: "Plano Pro" },
  { value: "premium", label: "Plano Premium" },
];

function Page() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Notif[]>([]);
  const [f, setF] = useState({ title: "", content: "", audience: "all", scheduled_at: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Notif[]);
  };
  useEffect(() => { load(); }, []);

  const send = async () => {
    if (!f.title.trim()) return toast.error("Informe um título");
    if (!f.content.trim()) return toast.error("Escreva uma mensagem");
    setSending(true);
    const { error } = await supabase.from("notifications").insert({
      title: f.title,
      content: f.content,
      audience: f.audience,
      scheduled_at: f.scheduled_at || null,
      sent_at: f.scheduled_at ? null : new Date().toISOString(),
      created_by: user?.id,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success(f.scheduled_at ? "Notificação agendada" : "Notificação enviada");
    setF({ title: "", content: "", audience: "all", scheduled_at: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta notificação?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluída"); load();
  };

  const stats = useMemo(() => {
    const sent = rows.filter((r) => r.sent_at).length;
    const scheduled = rows.filter((r) => r.scheduled_at && !r.sent_at).length;
    return { total: rows.length, sent, scheduled };
  }, [rows]);

  const audienceLabel = AUDIENCES.find((a) => a.value === f.audience)?.label ?? "Todos";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notificações</h1>
        <p className="text-sm text-muted-foreground mt-1">Comunique-se com seus membros em tempo real ou agende.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon={Bell} label="Total" value={stats.total} />
        <Stat icon={CheckCircle2} label="Enviadas" value={stats.sent} accent="emerald" />
        <Stat icon={Clock} label="Agendadas" value={stats.scheduled} accent="amber" />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-1">Compor</div>
            <h3 className="text-base font-semibold">Nova notificação</h3>
          </div>

          <div className="p-5 space-y-5">
            <Field label="Título" icon={FileText} required>
              <input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                placeholder="Ex: Nova aula disponível!"
                className={inputClass}
              />
            </Field>

            <Field label="Mensagem" icon={FileText} required hint={`${f.content.length} caracteres`}>
              <textarea
                value={f.content}
                onChange={(e) => setF({ ...f, content: e.target.value })}
                rows={5}
                placeholder="Escreva a mensagem que será exibida..."
                className={`${inputClass} resize-none`}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Público" icon={Users}>
                <select
                  value={f.audience}
                  onChange={(e) => setF({ ...f, audience: e.target.value })}
                  className={selectClass}
                  style={selectStyle}
                >
                  {AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </Field>

              <Field label="Agendar" icon={Calendar} hint="Deixe vazio para enviar agora.">
                <input
                  type="datetime-local"
                  value={f.scheduled_at}
                  onChange={(e) => setF({ ...f, scheduled_at: e.target.value })}
                  className={inputClass}
                  style={{ colorScheme: "dark" }}
                />
              </Field>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              {f.scheduled_at ? `Será enviada para ${audienceLabel.toLowerCase()} em ${new Date(f.scheduled_at).toLocaleString("pt-BR")}` : `Enviar agora para ${audienceLabel.toLowerCase()}`}
            </div>
            <button
              onClick={send}
              disabled={sending}
              className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
            >
              {f.scheduled_at ? <Calendar className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {sending ? "..." : f.scheduled_at ? "Agendar" : "Enviar"}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02]">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Histórico</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground ml-auto">{rows.length}</span>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {rows.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <div className="text-xs text-muted-foreground">Nenhuma notificação ainda.</div>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {rows.map((n) => {
                  const scheduled = !n.sent_at && n.scheduled_at;
                  return (
                    <div key={n.id} className="p-4 hover:bg-white/[0.02] transition group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-tight min-w-0 flex-1 truncate">{n.title}</div>
                        <button
                          onClick={() => remove(n.id)}
                          className="p-1 rounded hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.content}</div>
                      <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          scheduled ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                        }`}>
                          {scheduled ? "Agendada" : "Enviada"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5">{n.audience}</span>
                        <span>{new Date(n.sent_at ?? n.scheduled_at ?? n.created_at).toLocaleString("pt-BR")}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent?: "emerald" | "amber" }) {
  const cls = accent === "emerald"
    ? "bg-emerald-500/10 text-emerald-400"
    : accent === "amber"
    ? "bg-amber-500/10 text-amber-400"
    : "bg-primary/10 text-primary";
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
