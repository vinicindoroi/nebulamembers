import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronRight, Lock, Minus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MEMBER_TABS, isTabAllowed, withTabAccess, effectivePlanList, type PlanAccessFeatures } from "@/lib/plan-access";

export const Route = createFileRoute("/admin/access")({
  head: () => ({ meta: [
    { title: "Acessos por plano — Nebula Members" },
    { name: "description", content: "Controle quais abas e conteúdos cada plano libera na Nebula Members." },
    { property: "og:title", content: "Acessos por plano — Nebula Members" },
    { property: "og:description", content: "Controle quais abas e conteúdos cada plano libera na Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AccessPage,
});

type RawPlan = { id: string; name: string; slug: string; level?: number; features?: PlanAccessFeatures; [k: string]: unknown };
type Course = { id: string; title: string; access_level: string | null; status: string };
type Mod = { id: string; title: string; course_id: string; position: number; access_level: string | null; access_levels: string[] | null };
type Offer = { id: string; title: string; active: boolean; access_levels: string[] };

const isPending = (slug: string) => ["", "pending", "pendente"].includes(slug.trim().toLowerCase());

function Cell({ state, onClick, disabled, title }: { state: "on" | "off" | "partial" | "locked"; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <td className="px-2 py-1.5 text-center">
      <button
        type="button"
        title={title}
        disabled={disabled || state === "locked"}
        onClick={onClick}
        aria-pressed={state === "on"}
        className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition ${
          state === "on" ? "bg-primary border-primary text-primary-foreground"
          : state === "partial" ? "bg-primary/20 border-primary/50 text-primary"
          : state === "locked" ? "border-border text-muted-foreground/40 cursor-not-allowed"
          : "border-border hover:border-primary/50"
        } disabled:opacity-60`}
      >
        {state === "on" && <Check className="h-3.5 w-3.5" />}
        {state === "partial" && <Minus className="h-3.5 w-3.5" />}
        {state === "locked" && <Lock className="h-3 w-3" />}
      </button>
    </td>
  );
}

function AccessPage() {
  const cache = useQueryClient();
  const [plans, setPlans] = useState<RawPlan[] | null>(null);
  const [allowedSchedule, setAllowedSchedule] = useState<string[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const base = useQuery({
    queryKey: ["admin-access-base"],
    queryFn: async () => {
      const [p, s, c, m, o] = await Promise.all([
        (supabase.from("app_settings" as any) as any).select("value").eq("key", "plans_config").maybeSingle(),
        supabase.from("mentor_schedule_settings").select("allowed_plans").eq("id", 1).maybeSingle(),
        supabase.from("courses").select("id,title,access_level,status").order("created_at"),
        supabase.from("modules").select("id,title,course_id,position,access_level,access_levels").order("position"),
        supabase.from("member_offers").select("id,title,active,access_levels").order("created_at", { ascending: false }),
      ]);
      for (const r of [p, s, c, m, o]) if (r.error) throw r.error;
      return {
        plans: (Array.isArray(p.data?.value) ? p.data.value : []) as RawPlan[],
        schedule: ((s.data as any)?.allowed_plans ?? []) as string[],
        courses: (c.data ?? []) as Course[],
        modules: (m.data ?? []) as Mod[],
        offers: (o.data ?? []) as Offer[],
      };
    },
  });

  const [modules, setModules] = useState<Mod[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    if (!base.data) return;
    setPlans(base.data.plans);
    setAllowedSchedule(base.data.schedule.map((s) => s.toLowerCase()));
    setModules(base.data.modules);
    setOffers(base.data.offers);
  }, [base.data]);

  const cols = useMemo(
    () => (plans ?? []).filter((p) => !isPending(p.slug ?? "")).slice().sort((a, b) => (a.level ?? 0) - (b.level ?? 0)),
    [plans],
  );
  const planRefs = useMemo(() => cols.map((p) => ({ slug: p.slug.toLowerCase(), level: p.level ?? 0 })), [cols]);
  const levelOf = (slug: string | null | undefined) => planRefs.find((p) => p.slug === (slug ?? "free").toLowerCase())?.level ?? 0;

  const savePlans = async (next: RawPlan[]) => {
    const prev = plans;
    setPlans(next);
    const { error } = await (supabase.from("app_settings" as any) as any)
      .upsert({ key: "plans_config", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) { setPlans(prev); toast.error("Não foi possível salvar"); return; }
    void cache.invalidateQueries({ queryKey: ["plans-config"] });
  };

  const toggleTab = (plan: RawPlan, path: string) => {
    if (!plans) return;
    const allowed = !isTabAllowed(plan.features, path);
    void savePlans(plans.map((p) => (p.id === plan.id ? { ...p, features: withTabAccess(p.features, path, allowed) } : p)));
  };

  const toggleSchedule = async (slug: string) => {
    const s = slug.toLowerCase();
    const next = allowedSchedule.includes(s) ? allowedSchedule.filter((x) => x !== s) : [...allowedSchedule, s];
    const prev = allowedSchedule;
    setAllowedSchedule(next);
    const { error } = await supabase.from("mentor_schedule_settings").update({ allowed_plans: next } as any).eq("id", 1);
    if (error) { setAllowedSchedule(prev); toast.error("Não foi possível salvar"); }
  };

  const setModuleLists = async (updates: Array<{ id: string; list: string[] }>) => {
    if (updates.some((u) => u.list.length === 0)) {
      toast.error("Deixe pelo menos um plano com acesso ao módulo");
      return;
    }
    const prev = modules;
    setModules((ms) => ms.map((m) => { const u = updates.find((x) => x.id === m.id); return u ? { ...m, access_levels: u.list, access_level: "free" } : m; }));
    const results = await Promise.all(updates.map((u) =>
      supabase.from("modules").update({ access_levels: u.list, access_level: "free", is_premium: Math.min(...u.list.map(levelOf)) > 0 } as any).eq("id", u.id),
    ));
    if (results.some((r) => r.error)) { setModules(prev); toast.error("Não foi possível salvar"); }
  };

  const toggleModule = (m: Mod, slug: string) => {
    const list = effectivePlanList(m.access_levels, m.access_level, planRefs);
    const next = list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug];
    void setModuleLists([{ id: m.id, list: next }]);
  };

  const toggleCourse = (mods: Mod[], slug: string, allOn: boolean) => {
    void setModuleLists(mods.map((m) => {
      const list = effectivePlanList(m.access_levels, m.access_level, planRefs);
      return { id: m.id, list: allOn ? list.filter((x) => x !== slug) : Array.from(new Set([...list, slug])) };
    }));
  };

  const toggleOffer = async (o: Offer, slug: string) => {
    const list = o.access_levels.map((s) => s.toLowerCase());
    const next = list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug];
    const prev = offers;
    setOffers((os) => os.map((x) => (x.id === o.id ? { ...x, access_levels: next } : x)));
    const { error } = await supabase.from("member_offers").update({ access_levels: next }).eq("id", o.id);
    if (error) { setOffers(prev); toast.error("Não foi possível salvar"); return; }
    void cache.invalidateQueries({ queryKey: ["member-offers"] });
  };

  if (base.isError) return <div className="text-sm text-destructive">Não foi possível carregar os acessos.</div>;
  if (!base.data || !plans) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  const header = (
    <thead>
      <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
        <th className="text-left font-medium px-3 py-2 sticky left-0 bg-card">Item</th>
        {cols.map((p) => (
          <th key={p.id} className="px-2 py-2 font-medium min-w-[92px]">
            <div className="text-foreground normal-case tracking-normal text-xs font-semibold truncate">{p.name}</div>
            <div className="text-[10px]">Nível {p.level ?? 0}</div>
          </th>
        ))}
      </tr>
    </thead>
  );

  const courses = base.data.courses;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" />Acessos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Marque o que cada plano libera. Salva na hora. Admins sempre veem tudo. Para criar ou duplicar planos, use <Link to="/admin/plans" className="text-primary hover:underline">Planos</Link>.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Abas da área de membros</h2>
          <p className="text-xs text-muted-foreground">Perfil e Configurações ficam sempre liberados.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {header}
            <tbody>
              {MEMBER_TABS.slice(0, 3).map((t) => (
                <tr key={t.path} className="border-t border-border/60">
                  <td className="px-3 py-1.5 sticky left-0 bg-card">{t.label}</td>
                  {cols.map((p) => <Cell key={p.id} state={isTabAllowed(p.features, t.path) ? "on" : "off"} onClick={() => toggleTab(p, t.path)} />)}
                </tr>
              ))}
              <tr className="border-t border-border/60">
                <td className="px-3 py-1.5 sticky left-0 bg-card">Agendamento</td>
                {cols.map((p) => <Cell key={p.id} state={allowedSchedule.includes(p.slug.toLowerCase()) ? "on" : "off"} onClick={() => void toggleSchedule(p.slug)} />)}
              </tr>
              {MEMBER_TABS.slice(3).map((t) => (
                <tr key={t.path} className="border-t border-border/60">
                  <td className="px-3 py-1.5 sticky left-0 bg-card">{t.label}</td>
                  {cols.map((p) => <Cell key={p.id} state={isTabAllowed(p.features, t.path) ? "on" : "off"} onClick={() => toggleTab(p, t.path)} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Cursos e módulos</h2>
          <p className="text-xs text-muted-foreground">Marcar no curso aplica a todos os módulos dele. Cadeado = o curso exige nível maior (mude em Cursos). Restrições feitas em aulas específicas continuam valendo.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {header}
            <tbody>
              {courses.map((c) => {
                const mods = modules.filter((m) => m.course_id === c.id);
                const cLevel = levelOf(c.access_level);
                const isOpen = !!open[c.id];
                return [
                  <tr key={c.id} className="border-t border-border/60 bg-muted/20">
                    <td className="px-3 py-1.5 sticky left-0 bg-card">
                      <button type="button" onClick={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))} className="flex items-center gap-1.5 font-medium text-left">
                        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                        <span className="truncate max-w-[260px]">{c.title}</span>
                        <span className="text-[10px] text-muted-foreground font-normal">{mods.length} módulos{c.status !== "published" ? ` · ${c.status}` : ""}</span>
                      </button>
                    </td>
                    {cols.map((p) => {
                      const slug = p.slug.toLowerCase();
                      if ((p.level ?? 0) < cLevel) return <Cell key={p.id} state="locked" title="O curso exige um nível maior" />;
                      if (mods.length === 0) return <td key={p.id} className="text-center text-muted-foreground/50">—</td>;
                      const on = mods.filter((m) => effectivePlanList(m.access_levels, m.access_level, planRefs).includes(slug)).length;
                      const state = on === mods.length ? "on" : on === 0 ? "off" : "partial";
                      return <Cell key={p.id} state={state} onClick={() => toggleCourse(mods, slug, state === "on")} />;
                    })}
                  </tr>,
                  ...(isOpen ? mods.map((m) => (
                    <tr key={m.id} className="border-t border-border/40">
                      <td className="pl-9 pr-3 py-1.5 sticky left-0 bg-card text-muted-foreground truncate max-w-[300px]">{m.title}</td>
                      {cols.map((p) => {
                        const slug = p.slug.toLowerCase();
                        if ((p.level ?? 0) < cLevel) return <Cell key={p.id} state="locked" title="O curso exige um nível maior" />;
                        const on = effectivePlanList(m.access_levels, m.access_level, planRefs).includes(slug);
                        return <Cell key={p.id} state={on ? "on" : "off"} onClick={() => toggleModule(m, slug)} />;
                      })}
                    </tr>
                  )) : []),
                ];
              })}
              {courses.length === 0 && <tr><td colSpan={cols.length + 1} className="px-3 py-6 text-center text-muted-foreground text-xs">Nenhum curso.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Ofertas</h2>
          <p className="text-xs text-muted-foreground">Quais planos veem cada oferta na aba Ofertas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {header}
            <tbody>
              {offers.map((o) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="px-3 py-1.5 sticky left-0 bg-card truncate max-w-[300px]">
                    {o.title}{!o.active && <span className="ml-2 text-[10px] text-muted-foreground">inativa</span>}
                  </td>
                  {cols.map((p) => {
                    const slug = p.slug.toLowerCase();
                    return <Cell key={p.id} state={o.access_levels.map((s) => s.toLowerCase()).includes(slug) ? "on" : "off"} onClick={() => void toggleOffer(o, slug)} />;
                  })}
                </tr>
              ))}
              {offers.length === 0 && <tr><td colSpan={cols.length + 1} className="px-3 py-6 text-center text-muted-foreground text-xs">Nenhuma oferta.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
