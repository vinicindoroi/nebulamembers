/**
 * Regras de acesso por plano às abas da área de membros e duplicação de planos.
 * Puro (sem React/Supabase) para ser coberto por tests/plan-access.mjs.
 */

export type PlanAccessFeatures = {
  tabs?: Record<string, boolean>;
  [key: string]: unknown;
};

export type MemberTab = { path: string; label: string; legacyKey?: string };

/** Abas da área de membros controláveis por plano. Agendamento usa a lista própria da agenda. */
export const MEMBER_TABS: MemberTab[] = [
  { path: "/dashboard", label: "Dashboard" },
  { path: "/organizer", label: "Organização", legacyKey: "organizer_access" },
  { path: "/courses", label: "Cursos", legacyKey: "courses_access" },
  { path: "/offers", label: "Ofertas" },
  { path: "/community", label: "Comunidade", legacyKey: "community_access" },
  { path: "/forum", label: "Fórum", legacyKey: "forum_access" },
  { path: "/saved", label: "Salvos" },
  { path: "/notes", label: "Notas", legacyKey: "notes_access" },
  { path: "/funnels", label: "Funis", legacyKey: "funnels_access" },
  { path: "/funnel-tracker", label: "Funnel Tracker" },
  { path: "/uptime", label: "Uptime" },
  { path: "/pixel-feeder", label: "Pixel Feeder" },
  { path: "/gurufucker", label: "Gurufucker" },
  { path: "/transcript", label: "Transcrição" },
];

/** Sempre liberadas para quem já foi aprovado. */
export const ALWAYS_ALLOWED_TABS = ["/profile", "/settings"];

/** Aba liberada? Valor explícito em `tabs` vence; senão a chave antiga (ex.: courses_access); senão liberada. */
export function isTabAllowed(features: PlanAccessFeatures | null | undefined, path: string): boolean {
  if (ALWAYS_ALLOWED_TABS.includes(path)) return true;
  const explicit = features?.tabs?.[path];
  if (typeof explicit === "boolean") return explicit;
  const legacy = MEMBER_TABS.find((t) => t.path === path)?.legacyKey;
  if (legacy && features && legacy in features) return features[legacy] !== false;
  return true;
}

/** Nova cópia das features com a aba liberada/bloqueada (mantém a chave antiga em sincronia). */
export function withTabAccess<T extends PlanAccessFeatures>(features: T | null | undefined, path: string, allowed: boolean): T {
  const base = (features ?? {}) as T;
  const next = { ...base, tabs: { ...(base.tabs ?? {}), [path]: allowed } } as T;
  const legacy = MEMBER_TABS.find((t) => t.path === path)?.legacyKey;
  if (legacy) (next as Record<string, unknown>)[legacy] = allowed;
  return next;
}

export function slugify(name: string): string {
  return name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

type DuplicablePlan = { id: string; name: string; slug: string; features?: unknown; created_at?: string; [key: string]: unknown };

/** Cópia do plano com id/nome/slug únicos e todas as permissões (features) clonadas. */
export function duplicatePlan<T extends DuplicablePlan>(plan: T, existing: Array<{ slug: string; name?: string }>, newId: string): T {
  const slugs = new Set(existing.map((p) => (p.slug ?? "").toLowerCase()));
  const names = new Set(existing.map((p) => (p.name ?? "").toLowerCase()));
  let n = 1;
  let name = `${plan.name} (cópia)`;
  let slug = `${slugify(plan.slug || plan.name)}-copia`;
  while (slugs.has(slug) || names.has(name.toLowerCase())) {
    n += 1;
    name = `${plan.name} (cópia ${n})`;
    slug = `${slugify(plan.slug || plan.name)}-copia-${n}`;
  }
  return {
    ...plan,
    id: newId,
    name,
    slug,
    features: plan.features === undefined ? undefined : JSON.parse(JSON.stringify(plan.features)),
    created_at: new Date().toISOString(),
  };
}

/** Lista de planos efetiva de um conteúdo: lista explícita, ou expande a hierarquia do nível mínimo. */
export function effectivePlanList(
  levels: string[] | null | undefined,
  single: string | null | undefined,
  plans: Array<{ slug: string; level?: number }>,
): string[] {
  if (levels && levels.length > 0) return levels.map((s) => (s ?? "").trim().toLowerCase()).filter(Boolean);
  const want = (single ?? "free").trim().toLowerCase();
  const min = plans.find((p) => p.slug.toLowerCase() === want)?.level ?? 0;
  return plans.filter((p) => (p.level ?? 0) >= min).map((p) => p.slug.toLowerCase());
}
