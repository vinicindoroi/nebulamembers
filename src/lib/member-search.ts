export type MemberSearchable = {
  id: string;
  full_name: string | null;
  email?: string | null;
  phone?: string | null;
  instagram?: string | null;
  plan?: string | null;
  status?: string | null;
  created_at?: string | null;
  last_seen_at?: string | null;
};

export type MemberSortKey = "name" | "plan" | "status" | "created_at" | "last_seen_at";
export type MemberSort = { key: MemberSortKey; dir: "asc" | "desc" };

const text = (value: unknown) => (value == null ? "" : String(value)).trim().toLowerCase();

/** Todos os termos da busca precisam aparecer em nome, email, telefone ou instagram. */
export function memberMatchesQuery(member: MemberSearchable, query: string) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [member.full_name, member.email, member.phone, member.instagram]
    .map(text)
    .join(" ");
  return terms.every((term) => haystack.includes(term));
}

const STATUS_LABELS: Record<string, string> = {
  active: "Ativo",
  suspended: "Suspenso",
  pending: "Pendente",
};

export function statusLabel(status: string | null | undefined) {
  const key = text(status);
  return STATUS_LABELS[key] ?? (key || "—");
}

const STATUS_RANK: Record<string, number> = { active: 0, pending: 1, suspended: 2 };

function nameCompare(a: MemberSearchable, b: MemberSearchable) {
  return text(a.full_name).localeCompare(text(b.full_name), "pt-BR", { numeric: true, sensitivity: "base" });
}

/** Ordena mantendo membros sem último acesso sempre no fim, em qualquer direção. */
export function sortMembers<T extends MemberSearchable>(members: T[], sort: MemberSort, planOrder: string[] = []) {
  const dir = sort.dir === "asc" ? 1 : -1;
  const rank = (plan: string | null | undefined) => {
    const name = text(plan);
    const index = planOrder.map(text).indexOf(name);
    return name === "" || name === "pending" || name === "pendente" ? Number.MAX_SAFE_INTEGER : index === -1 ? planOrder.length : index;
  };

  return [...members].sort((a, b) => {
    let cmp = 0;

    if (sort.key === "created_at" || sort.key === "last_seen_at") {
      const av = a[sort.key] ? Date.parse(a[sort.key] as string) : NaN;
      const bv = b[sort.key] ? Date.parse(b[sort.key] as string) : NaN;
      const aMissing = Number.isNaN(av);
      const bMissing = Number.isNaN(bv);
      if (aMissing && bMissing) cmp = 0;
      else if (aMissing) return 1;
      else if (bMissing) return -1;
      else cmp = av - bv;
    } else if (sort.key === "plan") {
      cmp = rank(a.plan) - rank(b.plan) || text(a.plan).localeCompare(text(b.plan), "pt-BR");
    } else if (sort.key === "status") {
      cmp = (STATUS_RANK[text(a.status)] ?? 9) - (STATUS_RANK[text(b.status)] ?? 9) || nameCompare(a, b);
    } else {
      cmp = nameCompare(a, b);
    }

    if (cmp === 0 && sort.key !== "name") cmp = nameCompare(a, b);
    return cmp * dir;
  });
}

/** "Hoje" / "Ontem" / "Há 3 dias" / data completa — usado na coluna Último acesso. */
export function relativeDay(iso: string | null | undefined, now: Date = new Date()) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 7) return `Há ${days} dias`;
  return date.toLocaleDateString("pt-BR");
}
