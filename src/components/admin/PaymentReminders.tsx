import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Trash2, Undo2, Wallet, MessageCircle, Plus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/admin/Modal";
import { Button } from "@/components/ui/button";
import { waLink } from "@/lib/whatsapp";
import {
  adminDueReminders, buildInstallments, dueLabel, formatBRL, formatDue, reminderStatus, ymd,
  ADMIN_NOTICE_DAYS, type PaymentReminder,
} from "@/lib/payment-reminders";

const db = supabase as any;

function statusClass(r: PaymentReminder, today: string) {
  const s = reminderStatus(r, today, ADMIN_NOTICE_DAYS);
  if (s === "paid") return "bg-muted text-muted-foreground";
  if (s === "overdue") return "bg-destructive/15 text-destructive";
  if (s === "today" || s === "soon") return "bg-primary/15 text-primary";
  return "bg-muted text-muted-foreground";
}

async function setPaid(id: string, paid: boolean) {
  const { error } = await db.from("payment_reminders").update({ paid_at: paid ? new Date().toISOString() : null }).eq("id", id);
  if (error) { toast.error(error.message); return false; }
  toast.success(paid ? "Marcado como pago." : "Cobrança reaberta.");
  return true;
}

/** Admin: list and create payment reminders for one member. */
export function PaymentRemindersModal({ member, onClose }: { member: { id: string; full_name: string | null; email?: string | null }; onClose: () => void }) {
  const today = ymd(new Date());
  const [list, setList] = useState<PaymentReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ count: "1", startAt: "1", amount: "", firstDue: today, note: "" });

  async function load() {
    const { data, error } = await db.from("payment_reminders").select("*").eq("user_id", member.id).order("due_date");
    if (error) toast.error(error.message);
    setList((data ?? []) as PaymentReminder[]);
    setLoading(false);
    if (!data?.length) setAdding(true);
  }
  useEffect(() => { load(); }, [member.id]);

  const preview = useMemo(() => {
    const count = Number(form.count) || 1;
    return buildInstallments({ count, startAt: Number(form.startAt) || 1, firstDue: form.firstDue || today, amount: null });
  }, [form.count, form.startAt, form.firstDue]);

  async function save() {
    if (!form.firstDue) return toast.error("Informe a data de vencimento.");
    const amount = form.amount.trim() ? Number(form.amount.replace(/\./g, "").replace(",", ".")) : null;
    if (amount != null && (!Number.isFinite(amount) || amount < 0)) return toast.error("Valor inválido.");
    const { data: auth } = await supabase.auth.getUser();
    const rows = buildInstallments({ count: Number(form.count) || 1, startAt: Number(form.startAt) || 1, firstDue: form.firstDue, amount, note: form.note })
      .map((r) => ({ ...r, user_id: member.id, created_by: auth.user?.id ?? null }));
    setSaving(true);
    const { error } = await db.from("payment_reminders").insert(rows);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(rows.length === 1 ? "Lembrete criado." : `${rows.length} parcelas criadas.`);
    setAdding(false);
    setForm({ count: "1", startAt: "1", amount: "", firstDue: today, note: "" });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta cobrança?")) return;
    const { error } = await db.from("payment_reminders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const open = list.filter((r) => !r.paid_at);
  const openTotal = open.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <Modal open onClose={onClose} title="Cobranças" kicker={member.full_name || member.email || "Membro"} size="md"
      description="O aluno vê o lembrete no painel dele a partir de 5 dias antes do vencimento."
      footer={<button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-muted/50">Fechar</button>}
    >
      {loading ? <p className="text-xs text-muted-foreground">Carregando...</p> : (
        <div className="space-y-4">
          {list.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{open.length} em aberto{openTotal > 0 ? ` · ${formatBRL(openTotal)}` : ""}</span>
                <span>{list.length - open.length} pagas</span>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {list.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-medium ${r.paid_at ? "text-muted-foreground line-through" : ""}`}>
                        {r.label}{r.amount != null && <span className="ml-1.5 font-normal tabular-nums">{formatBRL(r.amount)}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDue(r.due_date)}{r.note ? ` · ${r.note}` : ""}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${statusClass(r, today)}`}>{dueLabel(r, today)}</span>
                    {r.paid_at ? (
                      <button onClick={async () => (await setPaid(r.id, false)) && load()} aria-label="Reabrir" title="Reabrir" className="rounded-lg p-1.5 hover:bg-muted/60"><Undo2 className="h-3.5 w-3.5" /></button>
                    ) : (
                      <button onClick={async () => (await setPaid(r.id, true)) && load()} aria-label="Marcar como pago" title="Marcar como pago" className="rounded-lg p-1.5 text-primary hover:bg-primary/10"><Check className="h-3.5 w-3.5" /></button>
                    )}
                    <button onClick={() => remove(r.id)} aria-label="Excluir" title="Excluir" className="rounded-lg p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {adding ? (
            <div className="space-y-3 rounded-xl border border-border p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nº de parcelas">
                  <input type="number" min={1} max={60} value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Começar da parcela" hint="Ex.: 3 se já pagou 2">
                  <input type="number" min={1} max={Number(form.count) || 1} value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Valor por parcela (R$)">
                  <input inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500,00" className={inputClass} />
                </Field>
                <Field label="Próximo vencimento" required>
                  <input type="date" value={form.firstDue} onChange={(e) => setForm({ ...form, firstDue: e.target.value })} className={inputClass} style={{ colorScheme: "dark" }} />
                </Field>
              </div>
              <Field label="Observação (o aluno vê)">
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ex.: Pix para a chave de sempre" className={inputClass} />
              </Field>
              {preview.length > 1 && (
                <p className="text-[11px] text-muted-foreground">
                  Mensal: {preview.map((p) => formatDue(p.due_date).slice(0, 5)).join(" · ")}
                </p>
              )}
              <div className="flex justify-end gap-2">
                {list.length > 0 && <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-sm hover:bg-muted/50">Cancelar</button>}
                <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-1.5 rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Salvando..." : preview.length > 1 ? `Criar ${preview.length} parcelas` : "Criar lembrete"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" /> Nova cobrança
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}

type DueRow = PaymentReminder & { profile?: { id: string; full_name: string | null; email: string | null; phone: string | null } };

/** Admin dashboard: overdue and upcoming (7 days) charges. Hidden when there is nothing to charge. */
export function DuePaymentsPanel() {
  const today = ymd(new Date());
  const [rows, setRows] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const limit = new Date(); limit.setDate(limit.getDate() + ADMIN_NOTICE_DAYS);
    const { data } = await db.from("payment_reminders").select("*").is("paid_at", null).lte("due_date", ymd(limit)).order("due_date");
    const list = adminDueReminders((data ?? []) as PaymentReminder[], today);
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const profiles: Record<string, DueRow["profile"]> = {};
    if (ids.length) {
      const p = await supabase.from("profiles").select("id,full_name,email,phone").in("id", ids);
      (p.data ?? []).forEach((x: any) => { profiles[x.id] = x; });
    }
    setRows(list.map((r) => ({ ...r, profile: profiles[r.user_id] })));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  if (loading || rows.length === 0) return null;
  const overdue = rows.filter((r) => reminderStatus(r, today) === "overdue").length;

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wallet className="h-4 w-4" /></div>
          <div>
            <h3 className="text-sm font-medium">Cobranças</h3>
            <p className="text-xs text-muted-foreground">Vencidas e dos próximos {ADMIN_NOTICE_DAYS} dias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overdue > 0 && <span className="rounded-full bg-destructive/15 px-3 py-1 text-xs text-destructive tabular-nums">{overdue} {overdue === 1 ? "vencida" : "vencidas"}</span>}
          <Button asChild size="sm" variant="outline"><Link to="/admin/members">Membros<ArrowRight className="h-3.5 w-3.5" /></Link></Button>
        </div>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {rows.map((r) => {
          const name = r.profile?.full_name || r.profile?.email || "Aluno";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
              <div className="min-w-[180px] flex-1">
                <div className="truncate text-sm font-medium">{name}</div>
                <div className="text-xs text-muted-foreground">
                  {r.label}{r.amount != null ? ` · ${formatBRL(r.amount)}` : ""} · {formatDue(r.due_date)}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${statusClass(r, today)}`}>{dueLabel(r, today)}</span>
              {r.profile?.phone && (
                <Button asChild size="sm" variant="outline">
                  <a href={waLink(r.profile.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={async () => (await setPaid(r.id, true)) && load()}>
                <Check className="h-4 w-4" /> Pago
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
