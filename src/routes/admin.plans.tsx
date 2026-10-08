import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus, Edit3, Trash2, Package, Crown, Zap, Users, BookOpen,
  Layers, GitFork, MessageSquare, Check, Trello, StickyNote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [
    { title: "Gerenciar níveis de acesso — Nebula Members" },
    { name: "description", content: "Gerenciar níveis de acesso na plataforma Nebula Members." },
    { property: "og:title", content: "Gerenciar níveis de acesso — Nebula Members" },
    { property: "og:description", content: "Gerenciar níveis de acesso na plataforma Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
 component: Page });

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_period: string;
  /** Hierarquia de acesso: níveis maiores herdam tudo dos menores. */
  level?: number;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
};

// Apenas features que o app realmente aplica (bloqueio de abas no AppShell).
type PlanFeatures = {
  courses_access: boolean;
  community_access: boolean;
  forum_access: boolean;
  organizer_access: boolean;
  notes_access: boolean;
  funnels_access: boolean;
};

const DEFAULT_FEATURES: PlanFeatures = {
  courses_access: true,
  community_access: true,
  forum_access: true,
  organizer_access: true,
  notes_access: true,
  funnels_access: false,
};

const FEATURE_LABELS: Record<keyof PlanFeatures, { label: string; icon: typeof Zap }> = {
  courses_access: { label: "Acesso a Cursos (LMS)", icon: BookOpen },
  community_access: { label: "Acesso a Comunidade", icon: Users },
  forum_access: { label: "Acesso ao Fórum", icon: MessageSquare },
  organizer_access: { label: "Acesso ao Organizador (Trello)", icon: Trello },
  notes_access: { label: "Acesso a Notas (Tiptap)", icon: StickyNote },
  funnels_access: { label: "Acesso a Funis (Builder)", icon: GitFork },
};

const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan-free",
    name: "Free",
    slug: "free",
    price: 0,
    billing_period: "",
    level: 0,
    is_active: true,
    created_at: new Date().toISOString(),
    features: { ...DEFAULT_FEATURES },
  },
  {
    id: "plan-pro",
    name: "Pro",
    slug: "pro",
    price: 97,
    billing_period: "mensal",
    level: 1,
    is_active: true,
    created_at: new Date().toISOString(),
    features: { ...DEFAULT_FEATURES, funnels_access: true },
  },
  {
    id: "plan-premium",
    name: "Premium",
    slug: "premium",
    price: 197,
    billing_period: "mensal",
    level: 2,
    is_active: true,
    created_at: new Date().toISOString(),
    features: { ...DEFAULT_FEATURES, funnels_access: true },
  },
];

// Planos ficam em app_settings como array JSON (não há tabela de planos)
const PLANS_KEY = "plans_config";

async function loadPlans(): Promise<Plan[]> {
  const { data, error } = await (supabase
    .from("app_settings" as any) as any)
    .select("value")
    .eq("key", PLANS_KEY)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    const local = localStorage.getItem(PLANS_KEY);
    return local ? JSON.parse(local) : DEFAULT_PLANS;
  }
  if (data?.value && (data.value as Plan[]).length > 0) return data.value as Plan[];
  return DEFAULT_PLANS;
}

async function savePlans(plans: Plan[]) {
  const { error } = await (supabase
    .from("app_settings" as any) as any)
    .upsert({ key: PLANS_KEY, value: plans, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  }
}

const getTheme = (slug: string) => {
  const s = slug.toLowerCase();
  if (s.includes("free")) {
    return {
      glow: "bg-gradient-to-b from-cyan-500/10 via-cyan-500/5 to-transparent",
      text: "text-cyan-400",
      brand: "text-cyan-400/40",
      buttonBorder: "border-border hover:border-white/20 bg-card hover:bg-muted/50 text-white",
      pill: "bg-cyan-950/30 border-cyan-800/20 text-cyan-400/80",
    };
  }
  if (s.includes("pro")) {
    return {
      glow: "bg-gradient-to-b from-primary/15 via-primary/5 to-transparent",
      text: "text-primary",
      brand: "text-primary/40",
      buttonBorder: "bg-gradient-to-r from-primary via-primary to-primary text-white hover:from-primary hover:to-primary shadow-[0_8px_24px_-8px_rgba(139,92,246,0.8)]",
      pill: "bg-primary/30 border-primary/20 text-primary/80",
    };
  }
  return {
    glow: "bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent",
    text: "text-amber-400",
    brand: "text-amber-400/40",
    buttonBorder: "border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 hover:text-white shadow-[0_4px_12px_rgba(245,158,11,0.05)]",
    pill: "bg-amber-950/30 border-amber-800/20 text-amber-400/80",
  };
};

function PlanCheckItem({ children, color = "text-primary" }: { children: React.ReactNode; color?: string }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed font-medium">
      <Check className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
      <span>{children}</span>
    </li>
  );
}

function Page() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<Partial<Plan> | null>(null);

  const load = async () => {
    const data = await loadPlans();
    setPlans(data);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este plano?")) return;
    const updated = plans.filter(p => p.id !== id);
    await savePlans(updated);
    setPlans(updated);
    toast.success("Plano excluído");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie planos, nível de acesso e as áreas liberadas em cada um.
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] cursor-pointer"
        >
          <Plus className="h-4 w-4" />Novo plano
        </button>
      </div>

      {/* Plans grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => {
          const theme = getTheme(p.slug);
          const activeFeatures = Object.entries(FEATURE_LABELS)
            .filter(([key]) => p.features?.[key as keyof PlanFeatures]);
          return (
            <div
              key={p.id}
              className="group relative rounded-2xl overflow-hidden border border-border bg-card backdrop-blur p-6 flex flex-col h-full min-h-[420px] transition-all duration-300 hover:scale-[1.02] hover:border-border"
              style={{
                boxShadow: "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top Glow Accent */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-28 ${theme.glow} blur-[32px] rounded-full pointer-events-none`} />

              {/* Status Badge */}
              <div className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border text-[9px] font-bold uppercase tracking-widest shadow-lg ${p.is_active ? "border-emerald-500/30 text-emerald-400" : "border-border text-white/50"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                {p.is_active ? "Ativo" : "Inativo"}
              </div>

              {/* Edit/Delete Actions */}
              <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg bg-muted/40 hover:bg-white/10 text-white cursor-pointer transition">
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Header */}
              <div className="text-center mt-6">
                <span className={`text-[9px] font-extrabold uppercase tracking-[0.25em] ${theme.brand}`}>NEBULA.HUB</span>
                <h3 className="text-2xl font-black text-white tracking-tight mt-1">{p.name}</h3>
                <span className={`text-[10px] font-bold mt-2 ${theme.pill} px-2.5 py-0.5 rounded-full inline-block`}>
                  Nível {p.level ?? 0} · herda os níveis abaixo
                </span>
              </div>

              {/* Price */}
              <div className="text-center my-6 flex flex-col items-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {p.price > 0 ? `R$ ${p.price}` : "R$ 0"}
                  </span>
                  {p.price > 0 && p.billing_period && (
                    <span className="text-xs text-white/40 font-medium">/{p.billing_period}</span>
                  )}
                </div>
                {p.price === 0 && <span className="text-xs text-white/40 font-semibold mt-1">sem cobrança</span>}
              </div>

              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

              {/* Áreas liberadas (reais) */}
              <ul className="space-y-3 px-1 mb-6">
                {activeFeatures.map(([key, { label }]) => (
                  <PlanCheckItem key={key} color={theme.text}>{label}</PlanCheckItem>
                ))}
                {activeFeatures.length === 0 && (
                  <PlanCheckItem color={theme.text}>Nenhuma área liberada</PlanCheckItem>
                )}
              </ul>

              {/* Edit CTA */}
              <button
                onClick={() => setEditing(p)}
                className={`w-full py-3 px-4 rounded-xl text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto border ${theme.buttonBorder}`}
              >
                Gerenciar Plano <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
        {plans.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhum plano configurado</div>
            <div className="text-xs text-muted-foreground mt-1">
              Crie planos para controlar o acesso às áreas da plataforma.
            </div>
          </div>
        )}
      </div>

      {editing !== null && (
        <PlanModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={async (plan) => {
            const updated = plan.id
              ? plans.map(p => p.id === plan.id ? plan as Plan : p)
              : [...plans, { ...plan, id: crypto.randomUUID(), created_at: new Date().toISOString() } as Plan];
            await savePlans(updated);
            setPlans(updated);
            setEditing(null);
            toast.success("Plano salvo");
          }}
        />
      )}
    </div>
  );
}

function PlanModal({ initial, onClose, onSaved }: {
  initial: Partial<Plan>;
  onClose: () => void;
  onSaved: (plan: Partial<Plan>) => void;
}) {
  const [f, setF] = useState({
    name: initial.name ?? "",
    slug: initial.slug ?? "",
    price: initial.price ?? 0,
    billing_period: initial.billing_period ?? "mensal",
    level: initial.level ?? 0,
    is_active: initial.is_active ?? true,
    features: { ...DEFAULT_FEATURES, ...(initial.features ?? {}) },
  });
  const [saving, setSaving] = useState(false);

  const handleNameChange = (name: string) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    setF({ ...f, name, slug });
  };

  const toggleFeature = (key: keyof PlanFeatures) => {
    setF({ ...f, features: { ...f.features, [key]: !f.features[key] } });
  };

  const save = () => {
    if (!f.name.trim()) return toast.error("Informe o nome do plano");
    if (!f.slug.trim()) return toast.error("Informe o slug");
    setSaving(true);
    onSaved({ ...initial, ...f });
    setSaving(false);
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? "Editar plano" : "Novo plano"}
      kicker={initial.id ? "Editar" : "Criar"}
      description="Configure o nível de acesso e as áreas liberadas deste plano."
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-border hover:bg-muted/50 transition">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar plano"}
          </button>
        </>
      }
    >
      {/* Basic info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome do plano" icon={Package} required>
          <input value={f.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Ex: Pro" className={inputClass} autoFocus />
        </Field>
        <Field label="Slug" icon={Package} required hint="Identificador único">
          <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="ex: pro" className={inputClass} />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Field label="Nível de acesso" icon={Layers} hint="Maior herda os menores. Ex: Individual 3 > Nebula 2 > Pro 1 > Free 0">
          <input type="number" min="0" step="1" value={f.level} onChange={(e) => setF({ ...f, level: Number(e.target.value) })} className={inputClass} />
        </Field>
        <Field label="Preço (R$)" icon={Crown}>
          <input type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inputClass} />
        </Field>
        <Field label="Período" icon={Zap}>
          <input value={f.billing_period} onChange={(e) => setF({ ...f, billing_period: e.target.value })} placeholder="mensal" className={inputClass} />
        </Field>
        <Field label="Status">
          <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-card border border-border cursor-pointer">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="accent-primary" />
            <span className="text-sm">Ativo</span>
          </label>
        </Field>
      </div>

      {/* Áreas da plataforma (as únicas features reais hoje) */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Áreas liberadas</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(FEATURE_LABELS).map(([key, { label, icon: Icon }]) => (
            <label key={key} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border hover:border-border cursor-pointer transition">
              <input
                type="checkbox"
                checked={!!f.features[key as keyof PlanFeatures]}
                onChange={() => toggleFeature(key as keyof PlanFeatures)}
                className="accent-primary"
              />
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
