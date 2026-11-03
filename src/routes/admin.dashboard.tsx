import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, PlayCircle, UserPlus, TrendingUp, CalendarClock, ArrowRight, MessageCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { StatCard } from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { CallLinkEditor, fetchBookingLinks } from "@/components/admin/CallLinkEditor";
import {
  fmtTime, ymdOf, zonedToDate,
  type Booking, type ScheduleSettings,
} from "@/lib/mentor-schedule";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [
    { title: "Painel administrativo — Nebula Members" },
    { name: "description", content: "Painel administrativo na plataforma Nebula Members." },
    { property: "og:title", content: "Painel administrativo — Nebula Members" },
    { property: "og:description", content: "Painel administrativo na plataforma Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
 component: Page });

const COLORS = ["#7ad3d8", "#9aa0a6", "#f59e0b", "#10b981"];

function Page() {
  const [stats, setStats] = useState({ members: 0, completed: 0, newUsers: 0, completionRate: 0 });
  const [growth, setGrowth] = useState<Array<{ d: string; v: number }>>([]);
  const [completionsByMonth, setCompletionsByMonth] = useState<Array<{ m: string; v: number }>>([]);
  const [plans, setPlans] = useState<Array<{ name: string; value: number }>>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<Array<{ id: string; title: string; views: number }>>([]);
  const [topLessons, setTopLessons] = useState<Array<{ id: string; title: string; views: number }>>([]);

  useEffect(() => {
    (async () => {
      const db = supabase as any;

      const [
        { count: members },
        { count: news },
        { data: profiles },
        { data: logs },
        { data: lessonProgress },
        { data: videoProgress },
        { data: courses },
        { data: lessons },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase.from("profiles").select("id,plan,created_at"),
        db.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(8),
        db.from("lesson_progress").select("user_id,lesson_id,completed_at"),
        db.from("lesson_video_progress").select("user_id,lesson_id"),
        supabase.from("courses").select("id,title"),
        db.from("lessons_public").select("id,title,course_id"),
      ]);

      const progress = lessonProgress ?? [];
      const watching = videoProgress ?? [];

      // Completion rate: completed / (completed + in progress)
      const totalEngaged = progress.length + watching.length;
      const completionRate = totalEngaged > 0 ? Math.round((progress.length / totalEngaged) * 1000) / 10 : 0;

      setStats({ members: members ?? 0, completed: progress.length, newUsers: news ?? 0, completionRate });

      // Growth: cumulative signups per day over last 30 days
      const days: Array<{ d: string; v: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const dayStart = new Date(Date.now() - i * 86400000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const cumulative = (profiles ?? []).filter((p: any) => new Date(p.created_at) <= dayEnd).length;
        days.push({ d: dayStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), v: cumulative });
      }
      setGrowth(days);

      // Lessons completed per month (last 6 months)
      const now = new Date();
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const byMonth: Array<{ m: string; v: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const count = progress.filter((p: any) => {
          const td = new Date(p.completed_at);
          return td >= d && td <= mEnd;
        }).length;
        byMonth.push({ m: monthNames[d.getMonth()], v: count });
      }
      setCompletionsByMonth(byMonth);

      // Plan distribution from profiles
      const planCounts: Record<string, number> = {};
      (profiles ?? []).forEach((p: any) => {
        const plan = p.plan || "Free";
        planCounts[plan] = (planCounts[plan] ?? 0) + 1;
      });
      const plansArr = Object.entries(planCounts).map(([name, value]) => ({ name, value }));
      setPlans(plansArr.length ? plansArr : [{ name: "Free", value: members ?? 0 }]);

      // Activity logs
      setActivity(logs ?? []);

      // Views per lesson = unique users who completed OR started watching
      const lessonViews: Record<string, Set<string>> = {};
      const addView = (lessonId: string, userId: string) => {
        if (!lessonViews[lessonId]) lessonViews[lessonId] = new Set();
        lessonViews[lessonId].add(userId);
      };
      progress.forEach((p: any) => p.lesson_id && p.user_id && addView(p.lesson_id, p.user_id));
      watching.forEach((w: any) => w.lesson_id && w.user_id && addView(w.lesson_id, w.user_id));

      // Top lessons by unique viewers
      const lessonTitle: Record<string, string> = {};
      const lessonCourse: Record<string, string> = {};
      (lessons ?? []).forEach((l: any) => { lessonTitle[l.id] = l.title; lessonCourse[l.id] = l.course_id; });
      const sortedLessons = Object.entries(lessonViews)
        .map(([id, users]) => ({ id, title: lessonTitle[id] ?? "Aula removida", views: users.size }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 5);
      setTopLessons(sortedLessons);

      // Top courses by unique viewers (summed across their lessons)
      const courseViews: Record<string, Set<string>> = {};
      Object.entries(lessonViews).forEach(([lessonId, users]) => {
        const cId = lessonCourse[lessonId];
        if (!cId) return;
        if (!courseViews[cId]) courseViews[cId] = new Set();
        users.forEach((u) => courseViews[cId].add(u));
      });
      const sortedCourses = (courses ?? [])
        .map((c: any) => ({ id: c.id, title: c.title, views: courseViews[c.id]?.size ?? 0 }))
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 5);
      setTopCourses(sortedCourses);
    })();
  }, []);

  const { settings: schedSettings, calls, loading: callsLoading } = useTodayCalls();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real</p>
      </div>

      <TodayCalls settings={schedSettings} calls={calls} loading={callsLoading} />


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Membros ativos" value={stats.members.toLocaleString("pt-BR")} icon={Users} />
        <StatCard label="Aulas concluídas" value={stats.completed.toLocaleString("pt-BR")} icon={PlayCircle} />
        <StatCard label="Novos cadastros (7d)" value={stats.newUsers.toString()} icon={UserPlus} />
        <StatCard label="Taxa de conclusão" value={`${stats.completionRate}%`} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-medium">Evolução de membros (30 dias)</h3></div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="d" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, backdropFilter: "blur(20px)" }} />
                <Line type="monotone" dataKey="v" stroke="#7ad3d8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium mb-4">Distribuição por plano</h3>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={plans} dataKey="value" nameKey="name" outerRadius={80} innerRadius={45} stroke="none">
                  {plans.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4">Aulas concluídas por mês</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={completionsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="m" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "rgba(15,15,20,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
                <Bar dataKey="v" fill="#7ad3d8" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium mb-4">Cursos mais acessados</h3>
          <div className="space-y-3">
            {topCourses.map((c, i) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0"><span className="text-muted-foreground text-xs w-4">{i + 1}</span><span className="truncate">{c.title}</span></div>
                <span className="text-xs text-muted-foreground tabular-nums">{c.views}</span>
              </div>
            ))}
            {!topCourses.length && <div className="text-xs text-muted-foreground">Sem cursos ainda</div>}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <h3 className="text-sm font-medium mb-4">Aulas mais vistas</h3>
          <div className="space-y-3">
            {topLessons.map((l, i) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 min-w-0"><span className="text-muted-foreground text-xs w-4">{i + 1}</span><span className="truncate">{l.title}</span></div>
                <span className="text-xs text-muted-foreground tabular-nums">{l.views}</span>
              </div>
            ))}
            {!topLessons.length && <div className="text-xs text-muted-foreground">Sem visualizações ainda</div>}
          </div>
        </div>
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4">Últimas atividades</h3>
          {activity.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem atividades registradas.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {activity.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div><div className="font-medium">{a.action}</div><div className="text-xs text-muted-foreground">{a.target}</div></div>
                  <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type CallProfile = { id: string; full_name: string | null; email: string | null; phone: string | null };
type TodayCall = Booking & { profile?: CallProfile; link?: string };


const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.length <= 11 ? `55${d}` : d}`;
};

/** Calls booked for the current day in the mentor's timezone. */
function useTodayCalls() {
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [calls, setCalls] = useState<TodayCall[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: s } = await supabase.from("mentor_schedule_settings").select("*").eq("id", 1).maybeSingle();
    const st = (s ?? null) as ScheduleSettings | null;
    const tz = st?.timezone || "America/Sao_Paulo";
    const dayStart = zonedToDate(ymdOf(new Date(), tz), 0, tz);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const { data } = await supabase
      .from("mentor_bookings")
      .select("*")
      .gte("starts_at", dayStart.toISOString())
      .lt("starts_at", dayEnd.toISOString())
      .neq("status", "cancelled")
      .order("starts_at");
    const rows = (data ?? []) as Booking[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    const profiles: Record<string, CallProfile> = {};
    if (ids.length) {
      const p = await supabase.from("profiles").select("id,full_name,email,phone").in("id", ids);
      ((p.data ?? []) as CallProfile[]).forEach((x) => { profiles[x.id] = x; });
    }
    const links = await fetchBookingLinks(rows.map((r) => r.id));
    setSettings(st);
    setCalls(rows.map((r) => ({ ...r, profile: profiles[r.user_id], link: links[r.id] })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const iv = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(iv); window.removeEventListener("focus", onFocus); };
  }, []);

  return { settings, calls, loading };
}

function TodayCalls({ settings, calls, loading }: { settings: ScheduleSettings | null; calls: TodayCall[]; loading: boolean }) {
  const tz = settings?.timezone || "America/Sao_Paulo";
  const now = Date.now();
  const nextId = calls.find((c) => new Date(c.ends_at).getTime() >= now)?.id;

  return (
    <section className="glass rounded-2xl p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><CalendarClock className="h-4 w-4" /></div>
          <div>
            <h3 className="text-sm font-medium">Agendamentos de hoje</h3>
            <p className="text-xs capitalize text-muted-foreground">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: tz })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-3 py-1 text-xs tabular-nums text-muted-foreground">
            {loading ? "—" : `${calls.length} ${calls.length === 1 ? "call" : "calls"}`}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to="/admin/schedule">Ver agenda<ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : calls.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma call marcada para hoje.</p>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => {
            const name = c.profile?.full_name || c.profile?.email || "Aluno";
            const isNext = c.id === nextId;
            const isDone = c.status === "done";
            return (
              <div key={c.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-muted px-4 py-1.5 text-center sm:w-24">
                    <span className="text-lg font-bold tabular-nums">{fmtTime(c.starts_at, tz)}</span>
                    <span className="text-[11px] text-muted-foreground">até {fmtTime(c.ends_at, tz)}</span>
                  </div>
                  <div className="flex min-w-[220px] flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold uppercase text-primary">
                      {name.slice(0, 2)}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{name}</p>
                        {isDone && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">Realizada</span>}
                        {isNext && !isDone && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary">Próxima</span>}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{c.profile?.email}</p>
                      {c.notes && <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">“{c.notes}”</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:ml-auto">
                    {c.profile?.phone ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={waLink(c.profile.phone)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
                      </Button>
                    ) : (
                      <span className="self-center text-xs text-muted-foreground/70">Sem WhatsApp</span>
                    )}
                  </div>
                </div>
                {!isDone && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    <span className="text-xs font-medium text-muted-foreground">Link da call</span>
                    <CallLinkEditor bookingId={c.id} initial={c.link} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

