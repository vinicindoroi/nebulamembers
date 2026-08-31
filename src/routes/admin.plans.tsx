import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Plus, Edit3, Trash2, Package, Crown, Zap, Users, BookOpen,
  Layers, GitFork, MessageSquare, BarChart3, Shield, Check, Trello, StickyNote
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/plans")({ component: Page });

type Plan = {
  id: string;
  name: string;
  slug: string;
  price: number;
  billing_period: string;
  features: PlanFeatures;
  is_active: boolean;
  created_at: string;
};

type PlanFeatures = {
  max_courses: number;
  max_modules: number;
  max_posts_per_day: number;
  max_members: number;
  course_categories: string[];
  funnel_types: string[];
  community_access: boolean;
  comments_access: boolean;
  notifications_custom: boolean;
  priority_support: boolean;
  custom_domain: boolean;
  analytics_access: boolean;
  api_access: boolean;
  courses_access: boolean;
  forum_access: boolean;
  organizer_access: boolean;
  notes_access: boolean;
  funnels_access: boolean;
};

const DEFAULT_FEATURES: PlanFeatures = {
  max_courses: 1,
  max_modules: 5,
  max_posts_per_day: 3,
  max_members: 50,
  course_categories: [],
  funnel_types: [],
  community_access: false,
  comments_access: true,
  notifications_custom: false,
  priority_support: false,
  custom_domain: false,
  analytics_access: false,
  api_access: false,
  courses_access: true,
  forum_access: true,
  organizer_access: true,
  notes_access: true,
  funnels_access: false,
};

const ALL_CATEGORIES = [
  "marketing", "copywriting", "trafego", "design",
  "desenvolvimento", "negocios", "financas", "ia",
];

const ALL_FUNNEL_TYPES = [
  "vsl", "webinar", "lancamento", "evergreen",
  "tripwire", "high_ticket", "lead_magnet",
];

const FEATURE_LABELS: Record<string, { label: string; icon: typeof Zap }> = {
  courses_access: { label: "Acesso a Cursos (LMS)", icon: BookOpen },
  community_access: { label: "Acesso a Comunidade", icon: Users },
  forum_access: { label: "Acesso ao Fórum", icon: MessageSquare },
  organizer_access: { label: "Acesso ao Organizador (Trello)", icon: Trello },
  notes_access: { label: "Acesso a Notas (Tiptap)", icon: StickyNote },
  funnels_access: { label: "Acesso a Funis (Builder)", icon: GitFork },
  comments_access: { label: "Comentários no LMS", icon: MessageSquare },
  notifications_custom: { label: "Notificações customizadas", icon: Zap },
  priority_support: { label: "Suporte prioritário", icon: Shield },
  custom_domain: { label: "Domínio customizado", icon: Crown },
  analytics_access: { label: "Analytics avançado", icon: BarChart3 },
  api_access: { label: "Acesso à API", icon: Zap },
};

const DEFAULT_PLANS: Plan[] = [
  {
    id: "plan-free",
    name: "Free",
    slug: "free",
    price: 0,
    billing_period: "",
    is_active: true,
    created_at: new Date().toISOString(),
    features: {
      max_courses: 2,
      max_modules: 5,
      max_posts_per_day: 3,
      max_members: 50,
      course_categories: [],
      funnel_types: [],
      community_access: true,
      comments_access: true,
      notifications_custom: false,
      priority_support: false,
      custom_domain: false,
      analytics_access: false,
      api_access: false,
      courses_access: true,
      forum_access: true,
      organizer_access: true,
      notes_access: true,
      funnels_access: false,
    },
  },
  {
    id: "plan-pro",
    name: "Pro",
    slug: "pro",
    price: 97,
    billing_period: "mensal",
    is_active: true,
    created_at: new Date().toISOString(),
    features: {
      max_courses: 10,
      max_modules: 50,
      max_posts_per_day: 20,
      max_members: 500,
      course_categories: ["marketing", "copywriting", "trafego", "design"],
      funnel_types: ["vsl", "webinar", "lead_magnet"],
      community_access: true,
      comments_access: true,
      notifications_custom: true,
      priority_support: false,
      custom_domain: false,
      analytics_access: true,
      api_access: false,
      courses_access: true,
      forum_access: true,
      organizer_access: true,
      notes_access: true,
      funnels_access: true,
    },
  },
  {
    id: "plan-premium",
    name: "Premium",
    slug: "premium",
    price: 197,
    billing_period: "mensal",
    is_active: true,
    created_at: new Date().toISOString(),
    features: {
      max_courses: 999,
      max_modules: 999,
      max_posts_per_day: 999,
      max_members: 9999,
      course_categories: ["marketing", "copywriting", "trafego", "design", "desenvolvimento", "negocios", "financas", "ia"],
      funnel_types: ["vsl", "webinar", "lancamento", "evergreen", "tripwire", "high_ticket", "lead_magnet"],
      community_access: true,
      comments_access: true,
      notifications_custom: true,
      priority_support: true,
      custom_domain: true,
      analytics_access: true,
      api_access: true,
      courses_access: true,
      forum_access: true,
      organizer_access: true,
      notes_access: true,
      funnels_access: true,
    },
  },
];

// We store plans in app_settings as a JSON array since there's no plans table
const PLANS_KEY = "plans_config";

async function loadPlans(): Promise<Plan[]> {
  const { data, error } = await (supabase
    .from("app_settings" as any) as any)
    .select("value")
    .eq("key", PLANS_KEY)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    // If table doesn't exist, try localStorage fallback
    const local = localStorage.getItem(PLANS_KEY);
    return local ? JSON.parse(local) : DEFAULT_PLANS;
  }
  if (data?.value && (data.value as Plan[]).length > 0) return data.value as Plan[];
  return DEFAULT_PLANS;
}

async function savePlans(plans: Plan[]) {
  // Try saving to app_settings
  const { error } = await (supabase
    .from("app_settings" as any) as any)
    .upsert({ key: PLANS_KEY, value: plans, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) {
    // Fallback to localStorage
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
      buttonBorder: "border-white/10 hover:border-white/20 bg-white/[0.01] hover:bg-white/[0.06] text-white",
      pill: "bg-cyan-950/30 border-cyan-800/20 text-cyan-400/80",
    };
  }
  if (s.includes("pro")) {
    return {
      glow: "bg-gradient-to-b from-violet-600/15 via-violet-600/5 to-transparent",
      text: "text-violet-400",
      brand: "text-violet-400/40",
      buttonBorder: "bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 text-white hover:from-violet-500 hover:to-indigo-600 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.8)]",
      pill: "bg-violet-950/30 border-violet-800/20 text-violet-400/80",
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
            Gerencie planos de acesso, features e limites por nível.
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
          return (
            <div
              key={p.id}
              className="group relative rounded-2xl overflow-hidden border border-white/[0.08] bg-white/[0.02] backdrop-blur p-6 flex flex-col h-full min-h-[520px] transition-all duration-300 hover:scale-[1.02] hover:border-white/15"
              style={{
                boxShadow: "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              {/* Top Glow Accent */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-28 ${theme.glow} blur-[32px] rounded-full pointer-events-none`} />

              {/* Status Badge */}
              <div className={`absolute top-4 left-4 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border text-[9px] font-bold uppercase tracking-widest shadow-lg ${p.is_active ? "border-emerald-500/30 text-emerald-400" : "border-white/10 text-white/50"}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${p.is_active ? "bg-emerald-400 animate-pulse" : "bg-white/20"}`} />
                {p.is_active ? "Ativo" : "Inativo"}
              </div>

              {/* Edit/Delete Actions */}
              <div className="absolute top-4 right-4 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer transition">
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
              </div>

              {/* Price & Primary limits */}
              <div className="text-center my-6 flex flex-col items-center">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-black text-white tracking-tight">
                    {p.price > 0 ? `R$ ${p.price}` : "R$ 0"}
                  </span>
                  {p.price > 0 && p.billing_period && (
                    <span className="text-xs text-white/40 font-medium">/{p.billing_period}</span>
                  )}
                </div>
                {p.price === 0 && <span className="text-xs text-white/40 font-semibold mt-1">acesso vitalício</span>}
                <span className={`text-[10px] font-bold mt-3 ${theme.pill} px-3 py-1 rounded-full inline-block`}>
                  {p.features.max_courses === 999 || p.features.max_courses > 100 ? "Cursos ilimitados" : `${p.features.max_courses} cursos liberados`}
                </span>
              </div>

              <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

              {/* Bullet list of features */}
              <ul className="space-y-3 px-1 mb-6">
                <PlanCheckItem color={theme.text}>
                  {p.features.max_courses === 999 || p.features.max_courses > 100 ? "Cursos ilimitados" : `${p.features.max_courses} cursos de faturamento`}
                </PlanCheckItem>
                <PlanCheckItem color={theme.text}>
                  {p.features.max_modules === 999 || p.features.max_modules > 100 ? "Módulos ilimitados" : `${p.features.max_modules} módulos inclusos`}
                </PlanCheckItem>
                <PlanCheckItem color={theme.text}>
                  {p.features.max_members === 9999 || p.features.max_members > 5000 ? "Membros ilimitados" : `${p.features.max_members} membros permitidos`}
                </PlanCheckItem>
                <PlanCheckItem color={theme.text}>
                  {p.features.max_posts_per_day === 999 ? "Posts diários ilimitados" : `${p.features.max_posts_per_day} posts diários no fórum`}
                </PlanCheckItem>
                
                {/* Dynamic boolean features */}
                {p.features.funnels_access && (
                  <PlanCheckItem color={theme.text}>Visual Funnel Builder</PlanCheckItem>
                )}
                {p.features.organizer_access && (
                  <PlanCheckItem color={theme.text}>Organizador Trello (Kanban)</PlanCheckItem>
                )}
                {p.features.notes_access && (
                  <PlanCheckItem color={theme.text}>Notas Tiptap com IA Híbrida</PlanCheckItem>
                )}
                {p.features.custom_domain && (
                  <PlanCheckItem color={theme.text}>Domínio customizado do aluno</PlanCheckItem>
                )}
                {p.features.api_access && (
                  <PlanCheckItem color={theme.text}>Acesso completo à API do Hub</PlanCheckItem>
                )}
              </ul>

              {/* Edit CTA button resembling public cards but as a manage button */}
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
          <div className="col-span-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <Package className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhum plano configurado</div>
            <div className="text-xs text-muted-foreground mt-1">
              Crie planos para controlar acesso a cursos, categorias e features.
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

  const toggleCategory = (cat: string) => {
    const cats = f.features.course_categories.includes(cat)
      ? f.features.course_categories.filter(c => c !== cat)
      : [...f.features.course_categories, cat];
    setF({ ...f, features: { ...f.features, course_categories: cats } });
  };

  const toggleFunnel = (type: string) => {
    const types = f.features.funnel_types.includes(type)
      ? f.features.funnel_types.filter(t => t !== type)
      : [...f.features.funnel_types, type];
    setF({ ...f, features: { ...f.features, funnel_types: types } });
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
      description="Configure acesso, limites e features deste plano."
      size="xl"
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Preço (R$)" icon={Crown}>
          <input type="number" step="0.01" min="0" value={f.price} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} className={inputClass} />
        </Field>
        <Field label="Período" icon={Zap}>
          <input value={f.billing_period} onChange={(e) => setF({ ...f, billing_period: e.target.value })} placeholder="mensal" className={inputClass} />
        </Field>
        <Field label="Status">
          <label className="flex items-center gap-3 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} className="accent-primary" />
            <span className="text-sm">Ativo</span>
          </label>
        </Field>
      </div>

      {/* Limits */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Limites</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="Cursos" icon={BookOpen}>
            <input type="number" min="0" value={f.features.max_courses} onChange={(e) => setF({ ...f, features: { ...f.features, max_courses: Number(e.target.value) } })} className={inputClass} />
          </Field>
          <Field label="Módulos" icon={Layers}>
            <input type="number" min="0" value={f.features.max_modules} onChange={(e) => setF({ ...f, features: { ...f.features, max_modules: Number(e.target.value) } })} className={inputClass} />
          </Field>
          <Field label="Posts/dia" icon={MessageSquare}>
            <input type="number" min="0" value={f.features.max_posts_per_day} onChange={(e) => setF({ ...f, features: { ...f.features, max_posts_per_day: Number(e.target.value) } })} className={inputClass} />
          </Field>
          <Field label="Membros" icon={Users}>
            <input type="number" min="0" value={f.features.max_members} onChange={(e) => setF({ ...f, features: { ...f.features, max_members: Number(e.target.value) } })} className={inputClass} />
          </Field>
        </div>
      </div>

      {/* Boolean features */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Features</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {Object.entries(FEATURE_LABELS).map(([key, { label, icon: Icon }]) => (
            <label key={key} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 cursor-pointer transition">
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

      {/* Course categories */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Categorias de curso permitidas</div>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                f.features.course_categories.includes(cat)
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {f.features.course_categories.includes(cat) && <Check className="h-3 w-3 inline mr-1" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Funnel types */}
      <div className="pt-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 mb-3">Tipos de funil permitidos</div>
        <div className="flex flex-wrap gap-2">
          {ALL_FUNNEL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => toggleFunnel(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                f.features.funnel_types.includes(type)
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : "bg-white/[0.03] border-white/10 text-muted-foreground hover:border-white/20"
              }`}
            >
              {f.features.funnel_types.includes(type) && <Check className="h-3 w-3 inline mr-1" />}
              {type}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
