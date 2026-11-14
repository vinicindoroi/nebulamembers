import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Search, Trash2, Edit3, Download, Plus, Shield, Pause, Play, Mail, User, UserPlus, FileText, Activity, Eye, Phone, MapPin, Instagram, ExternalLink, Calendar, Clock, Tag, ArrowUp, ArrowDown, ChevronsUpDown, Copy, Check, X, Wallet, MessageCircle } from "lucide-react";
import { waLink, hasWhatsapp } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";
import { usePlans, isPendingPlan, PENDING_PLAN } from "@/hooks/use-plans";
import { Button } from "@/components/ui/button";
import { MemberTagsModal, MemberTagsPicker, useMemberTags } from "@/components/admin/MemberTags";
import { matchesMemberTag } from "@/lib/member-tags";
import { memberMatchesQuery, sortMembers, statusLabel, relativeDay, type MemberSort, type MemberSortKey } from "@/lib/member-search";
import { useMemberGroups } from "@/hooks/use-member-groups";
import { useMemberLessons } from "@/hooks/use-member-lessons";
import { formatLessons, lessonsOf, lessonsOfGroup } from "@/lib/member-lessons";
import { useMemberCalls } from "@/hooks/use-member-calls";
import { CALL_FILTERS, callsOf, callsOfGroup, formatCalls, matchesCallCount } from "@/lib/member-calls";
import { groupMembers, matchesMemberGroup } from "@/lib/member-groups";
import { MemberGroupSelect, MemberGroupsDialog } from "@/components/admin/MemberGroups";
import { Checkbox } from "@/components/ui/checkbox";
import { PaymentRemindersModal } from "@/components/admin/PaymentReminders";

const filterSelectClass =
  "h-9 shrink-0 cursor-pointer rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none transition hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50";

function StatusPill({ status }: { status: string }) {
  const tone = status === "active"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : status === "suspended"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-amber-500/20 bg-amber-500/10 text-amber-400";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-1 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {statusLabel(status)}
    </span>
  );
}

function SortHeader({ label, sortKey, sort, onSort, className }: { label: string; sortKey: MemberSortKey; sort: MemberSort; onSort: (key: MemberSortKey) => void; className?: string }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" className={`px-4 py-3 text-left font-medium ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        aria-label={`Ordenar por ${label.toLowerCase()}`}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs uppercase tracking-wide transition hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"}`}
      >
        {label}
        {active ? (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );
}

function PlanOptions({ includePending = true }: { includePending?: boolean }) {
  const { plans } = usePlans();
  return (
    <>
      {includePending && <option value={PENDING_PLAN}>Pendente (sem acesso)</option>}
      {plans.map((p) => (
        <option key={p.id} value={p.name}>{p.name}</option>
      ))}
    </>
  );
}

function PlanSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { plans, loading } = usePlans();
  const names = plans.map((p) => p.name);
  const orphan = value && !isPendingPlan(value) && !names.includes(value) ? value : null;
  return (
    <select
      key={`plan-${plans.length}-${loading ? "l" : "r"}-${orphan ?? ""}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
      style={selectStyle}
    >
      <option value={PENDING_PLAN}>Pendente (sem acesso)</option>
      {orphan && <option value={orphan}>{orphan}</option>}
      {plans.map((p) => (
        <option key={p.id} value={p.name}>{p.name}</option>
      ))}
    </select>
  );
}


export const Route = createFileRoute("/admin/members")({
  head: () => ({ meta: [
    { title: "Gerenciar membros — Nebula Members" },
    { name: "description", content: "Gerenciar membros na plataforma Nebula Members." },
    { property: "og:title", content: "Gerenciar membros — Nebula Members" },
    { property: "og:description", content: "Gerenciar membros na plataforma Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
 component: Page });

type Member = { 
  id: string; 
  full_name: string | null; 
  avatar_url: string | null; 
  plan: string | null; 
  status: string; 
  created_at: string; 
  last_seen_at: string | null; 
  bio: string | null;
  phone?: string | null;
  location?: string | null;
  instagram?: string | null;
  email?: string | null;
};

function Page() {
  const [rows, setRows] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [editing, setEditing] = useState<Member | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [billing, setBilling] = useState<Member | null>(null);
  const [sort, setSort] = useState<MemberSort>({ key: "created_at", dir: "desc" });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const lastClickedIndex = useRef<number | null>(null);
  const memberTags = useMemberTags();
  const memberGroups = useMemberGroups();
  const lessons = useMemberLessons();
  const calls = useMemberCalls();
  const [groupFilter, setGroupFilter] = useState("all");
  const [callFilter, setCallFilter] = useState("all");
  const [grouped, setGrouped] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const { plans } = usePlans();
  const [tagFilter, setTagFilter] = useState("all");
  const [tagTarget, setTagTarget] = useState<{ memberIds: string[]; title: string } | null>(null);
  const tagsFor = (id: string) => memberTags.tags.filter((tag) => memberTags.assignments.some((item) => item.member_id === id && item.tag_id === tag.id));
  useEffect(() => {
    if (!memberTags.loading && tagFilter !== "all" && tagFilter !== "untagged" && !memberTags.tags.some((tag) => tag.id === tagFilter)) setTagFilter("all");
  }, [memberTags.tags, memberTags.loading, tagFilter]);

  useEffect(() => {
    if (!memberGroups.loading && groupFilter !== "all" && groupFilter !== "none" && !memberGroups.groups.some((g) => g.id === groupFilter)) setGroupFilter("all");
  }, [memberGroups.groups, memberGroups.loading, groupFilter]);
  const filtersActive = q.trim() !== "" || statusFilter !== "all" || planFilter !== "all" || tagFilter !== "all" || groupFilter !== "all" || callFilter !== "all";

  const clearFilters = () => {
    setQ("");
    setStatusFilter("all");
    setPlanFilter("all");
    setTagFilter("all");
    setGroupFilter("all");
    setCallFilter("all");
    setSelectedIds([]);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("admin_list_profiles");
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!matchesMemberGroup(r.id, groupFilter, memberGroups.groupOf)) return false;
    if (!matchesMemberTag(r.id, tagFilter, memberTags.assignments)) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (planFilter === "pending") { if (!isPendingPlan(r.plan)) return false; }
    else if (planFilter !== "all" && (r.plan ?? "") !== planFilter) return false;
    if (!memberMatchesQuery(r, q)) return false;
    if (!matchesCallCount(callsOf(r.id, calls.counts), callFilter)) return false;
    return true;
  });

  const sorted = useMemo(
    () => sortMembers(filtered, sort, plans.map((p) => p.name), lessons.counts, calls.counts),
    [filtered, sort, plans, lessons.counts, calls.counts],
  );

  const changeSort = (key: MemberSortKey) => {
    setSort((prev) => (prev.key === key
      ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
      : { key, dir: key === "created_at" || key === "last_seen_at" ? "desc" : "asc" }));
  };

  const sections = groupMembers(sorted, memberGroups.groups, memberGroups.groupOf, grouped);
  const displayed = sections.flatMap((section) => section.members);

  const toggleSelect = (id: string, index: number, shiftKey: boolean) => {
    const anchor = lastClickedIndex.current;
    let next: string[];
    if (shiftKey && anchor !== null) {
      const [from, to] = [anchor, index].sort((a, b) => a - b);
      const range = displayed.slice(from, to + 1).map((m) => m.id);
      next = Array.from(new Set([...selectedIds, ...range]));
    } else {
      next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    }
    setSelectedIds(next);
    lastClickedIndex.current = index;
  };

  const copyEmail = async (member: Member) => {
    const email = member.email?.trim();
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(member.id);
      setTimeout(() => setCopiedId((current) => (current === member.id ? null : current)), 1600);
      toast.success("Email copiado");
    } catch {
      toast.error("Não foi possível copiar o email");
    }
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(status === "active" ? "Membro reativado" : "Membro suspenso");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este perfil? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Membro excluído");
    load();
  };

  const bulkUpdatePlan = async (plan: string) => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ plan }).in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Plano atualizado para ${selectedIds.length} membros!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
  };

  const bulkUpdateStatus = async (status: string) => {
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ status }).in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Status atualizado para ${selectedIds.length} membros!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
  };

  const bulkDelete = async () => {
    if (!confirm(`Excluir os ${selectedIds.length} membros selecionados? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").delete().in("id", selectedIds);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${selectedIds.length} membros excluídos com sucesso!`);
      setSelectedIds([]);
      load();
    }
    setLoading(false);
  };

  const exportCsv = () => {
    const head = "Nome,Email,Plano,Status,Aulas,Calls,Cadastro\n";
    const body = sorted.map((r) => `"${r.full_name ?? ""}","${r.email ?? ""}","${isPendingPlan(r.plan) ? "Pendente" : r.plan}","${statusLabel(r.status)}","${lessonsOf(r.id, lessons.counts)}","${callsOf(r.id, calls.counts)}","${r.created_at}"`).join("\n");
    const blob = new Blob(["\uFEFF" + head + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "membros.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{filtered.length} de {rows.length} membros</span>
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs text-foreground transition hover:bg-muted/60">
                <X className="h-3 w-3" /> Limpar filtros
              </button>
            )}
          </p>
        </div>
        <div className="flex max-w-full flex-wrap gap-2">
          <Button variant="outline" onClick={() => setGroupsOpen(true)}><User />Grupos</Button>
          <Button variant="outline" onClick={() => setTagTarget({ memberIds: [], title: "Gerenciar tags" })}><Tag />Tags</Button>
          <button type="button" onClick={exportCsv} className="glass px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-muted/60"><Download className="h-4 w-4" />CSV</button>
          <button type="button" onClick={() => setAdding(true)} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-3 flex items-center gap-2 flex-wrap">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            aria-label="Buscar membros por nome, email ou telefone"
            placeholder="Buscar por nome, email ou telefone..."
            className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/40"
          />
          {q && (
            <button type="button" onClick={() => setQ("")} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setSelectedIds([]); }} aria-label="Filtrar por status" className={filterSelectClass} style={{ colorScheme: "dark" }}>
          <option value="all">Todos status</option><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="pending">Pendente</option>
        </select>
        <select value={planFilter} onChange={(e) => { setPlanFilter(e.target.value); setSelectedIds([]); }} aria-label="Filtrar por plano" className={filterSelectClass} style={{ colorScheme: "dark" }}>
          <option value="all">Todos planos</option><option value="pending">Pendente (sem acesso)</option><PlanOptions includePending={false} />
        </select>
        <select aria-label="Filtrar por tag" value={tagFilter} disabled={memberTags.loading} onChange={(event) => { setTagFilter(event.target.value); setSelectedIds([]); }} className={filterSelectClass} style={{ colorScheme: "dark" }}>
          <option value="all">Todas as tags</option>
          <option value="untagged">Sem tags</option>
          {memberTags.tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
        <select aria-label="Filtrar por grupo" value={groupFilter} disabled={memberGroups.loading} onChange={(e) => { setGroupFilter(e.target.value); setSelectedIds([]); lastClickedIndex.current = null; }} className={filterSelectClass}>
          <option value="all">Todos os grupos</option><option value="none">Sem grupo</option>
          {memberGroups.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select aria-label="Filtrar por quantidade de calls" value={callFilter} disabled={calls.loading} onChange={(e) => { setCallFilter(e.target.value); setSelectedIds([]); }} className={filterSelectClass}>
          {CALL_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <label className="flex cursor-pointer items-center gap-2 px-2 text-sm"><Checkbox checked={grouped} onCheckedChange={(v) => { setGrouped(v === true); lastClickedIndex.current = null; }} />Agrupar</label>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 animate-fade-in flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{selectedIds.length} selecionados</span>
            <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">Limpar seleção</button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <MemberTagsPicker {...memberTags} memberIds={[...selectedIds]} align="end" trigger={<Button variant="outline" size="sm"><Tag />Aplicar tags</Button>} />
            <MemberGroupSelect state={memberGroups} memberIds={selectedIds} label="Grupo dos membros selecionados" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Plano:</span>
              <select
                onChange={async (e) => {
                  const plan = e.target.value;
                  if (!plan) return;
                  await bulkUpdatePlan(plan);
                  e.target.value = "";
                }}
                className="bg-muted/40 border border-border rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Alterar...</option>
                <PlanOptions />
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Status:</span>
              <select
                onChange={async (e) => {
                  const status = e.target.value;
                  if (!status) return;
                  await bulkUpdateStatus(status);
                  e.target.value = "";
                }}
                className="bg-muted/40 border border-border rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Alterar...</option>
                <option value="active">Ativo</option>
                <option value="pending">Pendente</option>
                <option value="suspended">Suspenso</option>
              </select>
            </div>

            <button
              onClick={bulkDelete}
              className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px] text-sm">
            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th scope="col" className="w-14 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todos os membros listados"
                    checked={sorted.length > 0 && selectedIds.length === sorted.length}
                    onChange={(e) => {
                      setSelectedIds(e.target.checked ? sorted.map((r) => r.id) : []);
                      lastClickedIndex.current = null;
                    }}
                    className="size-6 shrink-0 cursor-pointer rounded-md accent-primary"
                  />
                </th>
                <SortHeader label="Membro" sortKey="name" sort={sort} onSort={changeSort} className="w-[320px]" />
                <SortHeader label="Plano" sortKey="plan" sort={sort} onSort={changeSort} />
                <SortHeader label="Aulas" sortKey="lessons" sort={sort} onSort={changeSort} />
                <SortHeader label="Calls" sortKey="calls" sort={sort} onSort={changeSort} />
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Tags</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide">Grupo</th>
                <SortHeader label="Status" sortKey="status" sort={sort} onSort={changeSort} />
                <SortHeader label="Cadastro" sortKey="created_at" sort={sort} onSort={changeSort} />
                <SortHeader label="Último acesso" sortKey="last_seen_at" sort={sort} onSort={changeSort} />
                <th scope="col" className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={11} className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted/60" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-40 animate-pulse rounded bg-muted/60" />
                        <div className="h-3 w-60 animate-pulse rounded bg-muted/40" />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-14 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <div className="rounded-full border border-border bg-muted/30 p-3">
                        {rows.length === 0 ? <UserPlus className="h-5 w-5 text-muted-foreground" /> : <Search className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{rows.length === 0 ? "Nenhum membro ainda" : "Nenhum membro encontrado"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {rows.length === 0 ? "Adicione o primeiro membro para começar." : "Nenhum resultado com os filtros aplicados."}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {rows.length > 0 && <Button variant="outline" size="sm" onClick={clearFilters}><X />Limpar filtros</Button>}
                        <Button size="sm" onClick={() => setAdding(true)}><Plus />Adicionar membro</Button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {sections.map((section) => <Fragment key={section.id}>
              {grouped && <tr className="bg-muted/30"><td colSpan={11} className="px-4 py-3 text-sm font-semibold">{section.name} <span className="ml-2 text-xs font-normal text-muted-foreground">{section.members.length} {section.members.length === 1 ? "membro" : "membros"} · {formatLessons(lessonsOfGroup(section.members.map((m) => m.id), lessons.counts))} até agora · {formatCalls(callsOfGroup(section.members.map((m) => m.id), calls.counts))} realizadas</span></td></tr>}
              {section.members.map((r) => {
                const index = displayed.findIndex((member) => member.id === r.id);
                const rowTags = tagsFor(r.id);
                return (
                <tr
                  key={r.id}
                  tabIndex={0}
                  onClick={() => setViewing(r)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setViewing(r); } }}
                  className={`group cursor-pointer select-none outline-none transition hover:bg-card focus-visible:bg-card focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary/40 ${selectedIds.includes(r.id) ? "bg-primary/[0.04]" : ""}`}
                >
                  <td className="w-14 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${r.full_name ?? "Sem nome"}`}
                      checked={selectedIds.includes(r.id)}
                      onClick={(e) => { e.stopPropagation(); toggleSelect(r.id, index, e.nativeEvent.shiftKey); }}
                      onChange={() => {}}
                      className="size-6 shrink-0 cursor-pointer rounded-md accent-primary"
                    />
                  </td>
                  <td className="w-[320px] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 shrink-0 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                        {(r.full_name ?? "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium transition duration-200 group-hover:text-primary">{r.full_name ?? "Sem nome"}</div>
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-xs text-muted-foreground">{r.email?.trim() || "sem email"}</span>
                          {r.email?.trim() && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyEmail(r); }}
                              aria-label={`Copiar email de ${r.full_name ?? "Sem nome"}`}
                              title="Copiar email"
                              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition hover:bg-muted/60 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                            >
                              {copiedId === r.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-md px-2 py-1 text-xs ${isPendingPlan(r.plan) ? "bg-amber-500/10 text-amber-400" : "bg-muted/40 text-foreground"}`}>
                      {isPendingPlan(r.plan) ? "Pendente" : r.plan}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground" title="Aulas concluídas até agora">
                    {formatLessons(lessonsOf(r.id, lessons.counts))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground" title="Calls realizadas até agora">
                    {formatCalls(callsOf(r.id, calls.counts))}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex max-w-56 flex-wrap items-center gap-1.5">
                      {rowTags.map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          title={`Remover ${tag.name}`}
                          aria-label={`Remover tag ${tag.name} de ${r.full_name ?? "Sem nome"}`}
                          onClick={async () => {
                            const { error } = await supabase.from("member_tag_assignments").delete().eq("member_id", r.id).eq("tag_id", tag.id);
                            if (error) toast.error("Não foi possível remover a tag.");
                            else { await memberTags.reload(); toast.success("Tag removida"); }
                          }}
                          className="group/tag inline-flex max-w-full items-center gap-1 break-words rounded-md border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary transition hover:border-destructive/40 hover:bg-destructive/10"
                        >
                          {tag.name}
                          <X className="size-3 shrink-0 opacity-40 transition group-hover/tag:opacity-100" />
                        </button>
                      ))}
                      <MemberTagsPicker
                        {...memberTags}
                        memberIds={[r.id]}
                        trigger={
                          <button
                            type="button"
                            aria-label={`Tags de ${r.full_name ?? "Sem nome"}`}
                            title="Editar tags"
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition hover:bg-muted/60 ${rowTags.length ? "text-muted-foreground" : "border border-dashed border-border text-muted-foreground"}`}
                          >
                            {rowTags.length ? <Tag className="h-3.5 w-3.5" /> : <><Plus className="h-3 w-3" />Tag</>}
                          </button>
                        }
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><MemberGroupSelect state={memberGroups} memberIds={[r.id]} label={`Grupo de ${r.full_name ?? "Sem nome"}`} /></td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusPill status={r.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td
                    className="whitespace-nowrap px-4 py-3 text-muted-foreground"
                    title={r.last_seen_at ? new Date(r.last_seen_at).toLocaleString("pt-BR") : undefined}
                  >
                    {r.last_seen_at ? (
                      <div className="leading-tight">
                        <div>{relativeDay(r.last_seen_at)}</div>
                        <div className="text-[11px] text-muted-foreground/70">
                          {new Date(r.last_seen_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ) : "Nunca acessou"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      {hasWhatsapp(r.phone) && (
                        <a
                          href={waLink(r.phone!)}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Abrir WhatsApp de ${r.full_name ?? "Sem nome"}`}
                          title={`WhatsApp: ${r.phone}`}
                          className="p-1.5 rounded-lg text-emerald-400 transition hover:bg-emerald-500/10"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button type="button" onClick={() => setViewing(r)} aria-label="Visualizar detalhes" className="p-1.5 rounded-lg transition hover:bg-muted/60"><Eye className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setEditing(r)} aria-label="Editar membro" className="p-1.5 rounded-lg transition hover:bg-muted/60"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setBilling(r)} aria-label="Cobranças" title="Cobranças" className="p-1.5 rounded-lg transition hover:bg-muted/60"><Wallet className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => setStatus(r.id, r.status === "active" ? "suspended" : "active")} aria-label={r.status === "active" ? "Suspender membro" : "Reativar membro"} className="p-1.5 rounded-lg transition hover:bg-muted/60">
                        {r.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button type="button" onClick={() => remove(r.id)} aria-label="Excluir membro" className="p-1.5 rounded-lg text-red-400 transition hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
                );
              })}</Fragment>)}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <MemberDetailsModal member={viewing} onClose={() => setViewing(null)} onEdit={() => setEditing(viewing)} />}
      {editing && <EditModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {billing && <PaymentRemindersModal member={billing} onClose={() => setBilling(null)} />}
      {adding && <AddMemberModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
      {tagTarget && <MemberTagsModal {...memberTags} {...tagTarget} onClose={() => setTagTarget(null)} />}
      <MemberGroupsDialog state={memberGroups} open={groupsOpen} onOpenChange={setGroupsOpen} />
    </div>
  );
}

function EditModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ 
    full_name: member.full_name ?? "", 
    plan: member.plan ?? PENDING_PLAN, 
    bio: member.bio ?? "",
    phone: member.phone ?? "",
    location: member.location ?? "",
    instagram: member.instagram ?? "",
    email: member.email ?? ""
  });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name.trim(),
      plan: form.plan,
      bio: form.bio.trim() || null,
      phone: form.phone.trim() || null,
      location: form.location.trim() || null,
      instagram: form.instagram.trim() || null,
      email: form.email.trim() || null
    }).eq("id", member.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Membro atualizado");
    onSaved();
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Editar membro"
      kicker="Edição"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-muted/50">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nome" icon={User} required>
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="Email" icon={Mail}>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" className={inputClass} />
        </Field>
        <Field label="Telefone" icon={Phone}>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(XX) XXXXX-XXXX" className={inputClass} />
        </Field>
        <Field label="Localização" icon={MapPin}>
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Cidade - Estado" className={inputClass} />
        </Field>
        <Field label="Instagram" icon={Instagram}>
          <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} placeholder="@usuario" className={inputClass} />
        </Field>
        <Field label="Plano" icon={Shield}>
          <PlanSelect value={form.plan} onChange={(v) => setForm({ ...form, plan: v })} />
        </Field>

        <Field label="Bio" icon={FileText}>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} className={inputClass} />
        </Field>
      </div>
    </Modal>
  );
}

function AddMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<"manual" | "invite">("manual");
  const [form, setForm] = useState({ 
    full_name: "", 
    email: "", 
    plan: PENDING_PLAN, 
    bio: "", 
    status: "active",
    phone: "",
    location: "",
    instagram: ""
  });
  const [saving, setSaving] = useState(false);

  const saveManual = async () => {
    if (!form.full_name.trim()) return toast.error("Nome é obrigatório");

    setSaving(true);
    const { error } = await supabase.from("profiles").insert({
      full_name: form.full_name.trim(),
      plan: form.plan,
      bio: form.bio.trim() || null,
      status: form.status,
      phone: form.phone.trim() || null,
      location: form.location.trim() || null,
      instagram: form.instagram.trim() || null,
      email: form.email.trim() || null,
    });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Membro adicionado com sucesso");
    onSaved();
  };

  const sendInvite = async () => {
    if (!form.email.trim()) return toast.error("Email é obrigatório");
    if (!form.full_name.trim()) return toast.error("Nome é obrigatório");

    setSaving(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: crypto.randomUUID(),
      options: {
        data: { full_name: form.full_name.trim() },
      },
    });
    setSaving(false);

    if (error) return toast.error(error.message);

    // Update the profile with plan/status/bio if user was created
    if (data.user) {
      await supabase.from("profiles").update({
        plan: form.plan,
        status: form.status,
        bio: form.bio.trim() || null,
        phone: form.phone.trim() || null,
        location: form.location.trim() || null,
        instagram: form.instagram.trim() || null,
        email: form.email.trim() || null,
      }).eq("id", data.user.id);
    }

    toast.success("Membro criado! Um email de confirmação foi enviado.");
    onSaved();
  };

  const handleSave = () => (mode === "invite" ? sendInvite() : saveManual());

  return (
    <Modal
      open
      onClose={onClose}
      title="Adicionar membro"
      kicker="Novo membro"
      description="Escolha como deseja adicionar o membro à plataforma."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-muted/50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? "Salvando..." : mode === "invite" ? "Enviar convite" : "Adicionar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 rounded-xl bg-card border border-border">
          <button
            onClick={() => setMode("manual")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${mode === "manual" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Cadastro manual
          </button>
          <button
            onClick={() => setMode("invite")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${mode === "invite" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white"}`}
          >
            Convite por email
          </button>
        </div>

        <Field label="Nome completo" icon={User} required>
          <input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            placeholder="Ex: João Silva"
            className={inputClass}
          />
        </Field>

        <Field label="Email" icon={Mail} required={mode === "invite"} hint={mode === "invite" ? "Um convite será enviado para este email." : "Opcional."}>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="joao@email.com"
            className={inputClass}
          />
        </Field>

        <Field label="Telefone" icon={Phone}>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(XX) XXXXX-XXXX"
            className={inputClass}
          />
        </Field>

        <Field label="Localização" icon={MapPin}>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Cidade - Estado"
            className={inputClass}
          />
        </Field>

        <Field label="Instagram" icon={Instagram}>
          <input
            value={form.instagram}
            onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            placeholder="@usuario"
            className={inputClass}
          />
        </Field>

        <Field label="Plano" icon={Shield}>
          <PlanSelect value={form.plan} onChange={(v) => setForm({ ...form, plan: v })} />
        </Field>


        <Field label="Status" icon={Activity}>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="active">Ativo</option>
            <option value="pending">Pendente</option>
            <option value="suspended">Suspenso</option>
          </select>
        </Field>

        <Field label="Bio" icon={FileText} hint="Opcional. Uma breve descrição sobre o membro.">
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            placeholder="Conte um pouco sobre este membro..."
            className={inputClass}
          />
        </Field>
      </div>
    </Modal>
  );
}

function MemberDetailsModal({ member, onClose, onEdit }: { member: Member; onClose: () => void; onEdit: () => void }) {
  const formatWhatsAppLink = (phone: string | null) => {
    if (!phone) return "";
    const cleanPhone = phone.replace(/\D/g, "");
    let formattedPhone = cleanPhone;
    if (cleanPhone.length >= 10 && !cleanPhone.startsWith("55")) {
      formattedPhone = "55" + cleanPhone;
    }
    return `https://wa.me/${formattedPhone}`;
  };

  const waLink = formatWhatsAppLink(member.phone ?? null);

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalhes do Membro"
      kicker="Visualização"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-muted/50 text-muted-foreground hover:text-foreground">Fechar</button>
          <button 
            onClick={() => {
              onClose();
              onEdit();
            }} 
            className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm flex items-center gap-2 font-semibold shadow-[0_4px_12px_rgba(139,92,246,0.25)] hover:scale-[1.01] active:scale-[0.99] transition animate-fade-in"
          >
            <Edit3 className="h-4 w-4" /> Editar Membro
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Header Profile Info */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.25)] shrink-0">
            {(member.full_name ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground truncate leading-snug">{member.full_name ?? "Sem nome"}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-muted/40 border border-border text-foreground">
                {isPendingPlan(member.plan) ? "Pendente" : member.plan}
              </span>
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                member.status === "active" 
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                  : member.status === "suspended" 
                    ? "bg-red-500/10 border border-red-500/20 text-red-400" 
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
              }`}>
                {member.status === "active" ? "Ativo" : member.status === "suspended" ? "Suspenso" : "Pendente"}
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" /> Biografia
          </h4>
          <p className="text-xs text-foreground/80 leading-relaxed p-3.5 rounded-xl border border-border bg-card min-h-[50px] whitespace-pre-wrap">
            {member.bio || "Nenhuma biografia descrita para este membro."}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Email */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-primary" /> E-mail
            </div>
            <div className="text-xs text-foreground/90 font-medium truncate mt-1">
              {member.email ? (
                <a href={`mailto:${member.email}`} className="hover:text-primary hover:underline transition">
                  {member.email}
                </a>
              ) : (
                <span className="text-muted-foreground/40 italic">Não informado</span>
              )}
            </div>
          </div>

          {/* Telefone / WhatsApp */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" /> Telefone / WhatsApp
            </div>
            <div className="text-xs text-foreground/90 font-medium mt-1">
              {member.phone ? (
                <a 
                  href={waLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-350 hover:underline transition font-semibold"
                  title="Abrir conversa no WhatsApp"
                >
                  <Phone className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500/10 shrink-0" />
                  <span>{member.phone}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              ) : (
                <span className="text-muted-foreground/40 italic">Não informado</span>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Localização
            </div>
            <div className="text-xs text-foreground/90 font-medium truncate mt-1">
              {member.location || <span className="text-muted-foreground/40 italic">Não informado</span>}
            </div>
          </div>

          {/* Instagram */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5 text-primary" /> Instagram
            </div>
            <div className="text-xs text-foreground/90 font-medium mt-1">
              {member.instagram ? (
                <a 
                  href={`https://instagram.com/${member.instagram.replace("@", "")}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-1.5 text-primary hover:text-primary-hover hover:underline transition font-semibold"
                >
                  <span>{member.instagram.startsWith("@") ? member.instagram : `@${member.instagram}`}</span>
                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                </a>
              ) : (
                <span className="text-muted-foreground/40 italic">Não informado</span>
              )}
            </div>
          </div>

          {/* Data de Cadastro */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Membro Desde
            </div>
            <div className="text-xs text-foreground/80 mt-1">
              {new Date(member.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Último Acesso */}
          <div className="p-3.5 rounded-xl border border-border bg-card space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" /> Último Acesso
            </div>
            <div className="text-xs text-foreground/80 mt-1">
              {member.last_seen_at 
                ? new Date(member.last_seen_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) 
                : "Sem registros"}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}