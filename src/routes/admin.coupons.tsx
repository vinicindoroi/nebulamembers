import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, Ticket, Search, Hash, Percent, DollarSign, Calendar, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/coupons")({ component: Page });

type Coupon = {
  id: string;
  code: string;
  kind: string;
  value: number;
  max_uses: number | null;
  uses: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

function Page() {
  const [rows, setRows] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setRows((data ?? []) as Coupon[]);
  };
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("coupons").update({ active: !active }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((p) => p.map((r) => (r.id === id ? { ...r, active: !active } : r)));
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Excluído"); load();
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = rows.filter((r) => !search || r.code.toLowerCase().includes(search.toLowerCase()));

  const active = rows.filter((r) => r.active).length;
  const totalUses = rows.reduce((s, r) => s + (r.uses ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cupons</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie códigos promocionais para suas vendas.</p>
        </div>
        <button
          onClick={() => setEditing({ kind: "percent", value: 10, active: true })}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Plus className="h-4 w-4" />Novo cupom
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Stat icon={Ticket} label="Total" value={rows.length} />
        <Stat icon={Percent} label="Ativos" value={active} accent="emerald" />
        <Stat icon={Hash} label="Resgates" value={totalUses} />
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/5">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar pelo código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Ticket className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhum cupom</div>
            <div className="text-xs text-muted-foreground mt-1">Crie um código promocional para começar.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-white/[0.02] border-b border-white/5">
                  <th className="text-left px-4 py-3 font-medium">Código</th>
                  <th className="text-left px-4 py-3 font-medium">Desconto</th>
                  <th className="text-left px-4 py-3 font-medium">Usos</th>
                  <th className="text-left px-4 py-3 font-medium">Validade</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((c) => {
                  const expired = c.expires_at && new Date(c.expires_at) < new Date();
                  const exhausted = c.max_uses && c.uses >= c.max_uses;
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => copyCode(c.code)}
                          className="font-mono text-sm flex items-center gap-2 group"
                          title="Copiar código"
                        >
                          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">{c.code}</span>
                          {copied === c.code ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {c.kind === "percent" ? `${c.value}%` : `R$ ${Number(c.value).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {c.uses ?? 0} / {c.max_uses ?? "∞"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {expired ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-red-500/10 text-red-400">Expirado</span>
                        ) : exhausted ? (
                          <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-400">Esgotado</span>
                        ) : (
                          <button
                            onClick={() => toggle(c.id, c.active)}
                            className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded transition ${
                              c.active
                                ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-white/5 text-muted-foreground hover:bg-white/10"
                            }`}
                          >
                            {c.active ? "Ativo" : "Inativo"}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <CouponModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent?: "emerald" }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
      <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent === "emerald" ? "bg-emerald-500/10 text-emerald-400" : "bg-primary/10 text-primary"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function CouponModal({ initial, onClose, onSaved }: { initial: Partial<Coupon>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    code: initial.code ?? "",
    kind: initial.kind ?? "percent",
    value: Number(initial.value ?? 10),
    max_uses: initial.max_uses ?? "",
    expires_at: initial.expires_at ? initial.expires_at.slice(0, 10) : "",
    active: initial.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const generate = () => {
    const code = Array.from({ length: 8 }, () => "ABCDEFGHJKMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 30)]).join("");
    setF({ ...f, code });
  };

  const save = async () => {
    if (!f.code.trim()) return toast.error("Informe um código");
    if (!f.value || f.value <= 0) return toast.error("Valor inválido");
    if (f.kind === "percent" && f.value > 100) return toast.error("Percentual não pode passar de 100");
    setSaving(true);
    const payload: any = {
      code: f.code.toUpperCase(),
      kind: f.kind,
      value: f.value,
      max_uses: f.max_uses ? Number(f.max_uses) : null,
      expires_at: f.expires_at || null,
      active: f.active,
    };
    const { error } = initial.id
      ? await supabase.from("coupons").update(payload).eq("id", initial.id)
      : await supabase.from("coupons").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cupom salvo"); onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={initial.id ? "Editar" : "Criar"}
      title={initial.id ? "Editar cupom" : "Novo cupom"}
      description="Configure o desconto, limite de uso e validade."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar cupom"}
          </button>
        </>
      }
    >
      <Field label="Código" icon={Hash} required hint="Letras e números. Será usado em maiúsculas.">
        <div className="flex gap-2">
          <input
            autoFocus
            value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase().replace(/\s/g, "") })}
            className={`${inputClass} font-mono`}
            placeholder="BLACKFRIDAY"
          />
          <button
            type="button"
            onClick={generate}
            className="shrink-0 px-3 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-xs flex items-center gap-1.5 transition"
            title="Gerar código"
          >
            <Hash className="h-3.5 w-3.5" />Gerar
          </button>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Tipo" icon={Percent}>
          <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })} className={selectClass} style={selectStyle}>
            <option value="percent">Percentual (%)</option>
            <option value="fixed">Valor fixo (R$)</option>
          </select>
        </Field>
        <Field label={f.kind === "percent" ? "Desconto (%)" : "Desconto (R$)"} icon={f.kind === "percent" ? Percent : DollarSign} required>
          <input
            type="number"
            min="0"
            max={f.kind === "percent" ? 100 : undefined}
            step="0.01"
            value={f.value}
            onChange={(e) => setF({ ...f, value: Number(e.target.value) })}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Limite de usos" icon={Hash} hint="Vazio = ilimitado.">
          <input
            type="number"
            min="0"
            value={f.max_uses}
            onChange={(e) => setF({ ...f, max_uses: e.target.value })}
            className={inputClass}
            placeholder="∞"
          />
        </Field>
        <Field label="Expira em" icon={Calendar} hint="Vazio = sem validade.">
          <input
            type="date"
            value={f.expires_at}
            onChange={(e) => setF({ ...f, expires_at: e.target.value })}
            className={inputClass}
            style={{ colorScheme: "dark" }}
          />
        </Field>
      </div>

      <Field label="Estado">
        <label className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-primary" />
          <span className="text-sm">Cupom ativo</span>
        </label>
      </Field>
    </Modal>
  );
}
