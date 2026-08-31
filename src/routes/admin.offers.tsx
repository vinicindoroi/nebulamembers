import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Link as LinkIcon, DollarSign, Tag, Package, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/offers")({ component: Page });

type Offer = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  checkout_url: string;
  badge_text: string | null;
  active: boolean;
  created_at: string;
};

function Page() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Partial<Offer> | null>(null);

  const load = async () => {
    const { data, error } = await (supabase.from("offers" as any) as any).select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setOffers((data ?? []) as Offer[]);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta oferta?")) return;
    const { error } = await (supabase.from("offers" as any) as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Oferta excluída");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ofertas</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie links de pagamento e ofertas para conteúdo premium.</p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Plus className="h-4 w-4" />Nova oferta
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((o) => (
          <div key={o.id} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-white/10 transition group">
            <div className="flex items-start justify-between gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditing(o)} className="p-1.5 rounded-lg hover:bg-white/10"><Edit3 className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(o.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <h3 className="font-medium mt-3 leading-tight">{o.name}</h3>
            {o.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.description}</p>}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm font-semibold text-emerald-400">R$ {Number(o.price).toFixed(2)}</span>
              {o.badge_text && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{o.badge_text}</span>}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <LinkIcon className="h-3 w-3" />
              <span className="truncate">{o.checkout_url}</span>
            </div>
            <div className="mt-2">
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${o.active ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"}`}>
                {o.active ? "Ativa" : "Inativa"}
              </span>
            </div>
          </div>
        ))}
        {offers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhuma oferta</div>
            <div className="text-xs text-muted-foreground mt-1">Crie sua primeira oferta para monetizar conteúdo premium.</div>
          </div>
        )}
      </div>

      {editing !== null && (
        <OfferModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function OfferModal({ initial, onClose, onSaved }: { initial: Partial<Offer>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial.name ?? "",
    description: initial.description ?? "",
    price: Number(initial.price ?? 0),
    checkout_url: initial.checkout_url ?? "",
    badge_text: initial.badge_text ?? "",
    active: initial.active ?? true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Informe um nome");
    if (!f.checkout_url.trim()) return toast.error("Informe o link de checkout");
    setSaving(true);
    const payload = { ...f, description: f.description || null, badge_text: f.badge_text || null };
    const { error } = initial.id
      ? await (supabase.from("offers" as any) as any).update(payload).eq("id", initial.id)
      : await (supabase.from("offers" as any) as any).insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Oferta salva");
    onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? "Editar oferta" : "Nova oferta"}
      kicker={initial.id ? "Editar" : "Criar"}
      description="Configure o link de pagamento e detalhes da oferta."
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5 transition">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar oferta"}
          </button>
        </>
      }
    >
      <Field label="Nome da oferta" icon={Tag} required>
        <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ex: Acesso Premium Anual" className={inputClass} autoFocus />
      </Field>

      <Field label="Descrição" icon={Package}>
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={2} placeholder="Descrição curta da oferta..." className={`${inputClass} resize-none`} />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Preço (R$)" icon={DollarSign} required>
          <input type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inputClass} />
        </Field>
        <Field label="Texto do badge" icon={Crown} hint="Ex: MAIS VENDIDO">
          <input value={f.badge_text} onChange={(e) => setF({ ...f, badge_text: e.target.value })} placeholder="Ex: POPULAR" className={inputClass} />
        </Field>
      </div>

      <Field label="Link de checkout" icon={LinkIcon} required hint="URL externa (Hotmart, Stripe, Kiwify, etc.)">
        <input value={f.checkout_url} onChange={(e) => setF({ ...f, checkout_url: e.target.value })} placeholder="https://pay.hotmart.com/..." className={inputClass} />
      </Field>

      <Field label="Status">
        <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
          <input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="accent-primary" />
          <span className="text-sm">Oferta ativa</span>
        </label>
      </Field>
    </Modal>
  );
}
