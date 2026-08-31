import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Edit3, Trash2, BookOpen, X, ImageIcon, Tag as TagIcon, DollarSign, FileText, Folder, Eye, Palette, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/courses")({ component: Page });

type Course = { id: string; title: string; description: string | null; tag: string | null; cover_url: string | null; status: string; price: number | null; category_id: string | null; gradient_from: string | null; gradient_to: string | null; is_premium: boolean | null; offer_id: string | null; access_level: string | null };
type Cat = { id: string; name: string };
type Offer = { id: string; name: string };

function Page() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Course[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [editing, setEditing] = useState<Partial<Course> | null>(null);

  const load = async () => {
    const [{ data: c }, { data: ct }, { data: of }] = await Promise.all([
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("id,name"),
      supabase.from("offers").select("id,name").eq("active", true),
    ]);
    setRows((c ?? []) as any); setCats((ct ?? []) as any); setOffers((of ?? []) as Offer[]);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir este curso?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Curso excluído");
    queryClient.invalidateQueries({ queryKey: ["courses"] });
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Cursos</h1><p className="text-sm text-muted-foreground">{rows.length} cursos</p></div>
        <button onClick={() => setEditing({})} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Novo curso</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => {
          const gFrom = c.gradient_from || "#6366f1";
          const gTo = c.gradient_to || "#8b5cf6";
          const catName = cats.find((cat) => cat.id === c.category_id)?.name;
          return (
            <div key={c.id} className="glass rounded-2xl overflow-hidden hover:bg-white/[0.07] transition group">
              <div className="relative aspect-video">
                {c.cover_url && (
                  <img src={c.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${gFrom}, ${gTo}00)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  {catName && (
                    <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 mb-2 font-medium">{catName}</span>
                  )}
                  <h3 className="text-white font-semibold text-base leading-tight drop-shadow-lg">{c.title}</h3>
                  {c.description && <p className="text-white/70 text-xs mt-1 line-clamp-2 max-w-[85%]">{c.description}</p>}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm hover:bg-red-500/80 text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${c.status === "published" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>{c.status}</span>
                  {c.tag && <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground">{c.tag}</span>}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-muted-foreground">R$ {Number(c.price ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground col-span-full">Nenhum curso. Clique em "Novo curso".</div>}
      </div>

      {editing && <CourseModal initial={editing} cats={cats} offers={offers} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); queryClient.invalidateQueries({ queryKey: ["courses"] }); load(); }} />}
    </div>
  );
}

function toHex(color: string): string {
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  try {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.fillStyle = color;
    return ctx.fillStyle;
  } catch {
    return "#000000";
  }
}

function CourseModal({ initial, cats, offers, onClose, onSaved }: { initial: Partial<Course>; cats: Cat[]; offers: Offer[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "", description: initial.description ?? "", tag: initial.tag ?? "",
    status: initial.status ?? "draft", price: Number(initial.price ?? 0), category_id: initial.category_id ?? "",
    cover_url: initial.cover_url ?? "", gradient_from: initial.gradient_from ?? "#6366f1", gradient_to: initial.gradient_to ?? "#8b5cf6",
    is_premium: initial.is_premium ?? false, offer_id: initial.offer_id ?? "", access_level: (initial as any).access_level ?? "free",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const save = async () => {
    if (!f.title.trim()) return toast.error("Informe um título");
    setSaving(true);
    const payload: any = { ...f, category_id: f.category_id || null, offer_id: f.offer_id || null, access_level: f.access_level };
    const { error } = initial.id
      ? await supabase.from("courses").update(payload).eq("id", initial.id)
      : await supabase.from("courses").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Curso salvo"); onSaved();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/70 backdrop-blur-md"
      style={{ animation: "modal-overlay-in 0.18s ease-out both" }}
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[oklch(0.16_0.015_270)] shadow-[0_24px_80px_-12px_rgba(0,0,0,0.7)] overflow-hidden"
          style={{ animation: "modal-card-in 0.22s cubic-bezier(0.22, 1, 0.36, 1) both" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative px-6 pt-5 pb-4 border-b border-white/5 bg-gradient-to-b from-white/[0.04] to-transparent">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/80 mb-1">
                  {initial.id ? "Editar" : "Criar"}
                </div>
                <h2 className="text-xl font-semibold tracking-tight">{initial.id ? "Editar curso" : "Novo curso"}</h2>
                <p className="text-xs text-muted-foreground mt-1">Defina os detalhes do curso. Você pode editar tudo depois.</p>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 h-9 w-9 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[min(70vh,640px)] overflow-y-auto">
            <Field label="Título" icon={FileText} required>
              <input
                value={f.title}
                onChange={(e) => setF({ ...f, title: e.target.value })}
                placeholder="Ex: Design Systems do zero"
                className="modal-inp"
                autoFocus
              />
            </Field>

            <Field label="Descrição" icon={FileText}>
              <textarea
                value={f.description}
                onChange={(e) => setF({ ...f, description: e.target.value })}
                rows={3}
                placeholder="Resumo curto sobre o que o aluno vai aprender..."
                className="modal-inp resize-none"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Categoria" icon={Folder}>
                <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })} className="modal-inp">
                  <option value="">Sem categoria</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>

              <Field label="Status" icon={Eye}>
                <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className="modal-inp">
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                </select>
              </Field>

              <Field label="Tag" icon={TagIcon}>
                <input
                  value={f.tag}
                  onChange={(e) => setF({ ...f, tag: e.target.value })}
                  placeholder="Ex: Design"
                  className="modal-inp"
                />
              </Field>

              <Field label="Preço (R$)" icon={DollarSign}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={f.price}
                  onChange={(e) => setF({ ...f, price: Number(e.target.value) })}
                  className="modal-inp"
                />
              </Field>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <Field label="Acesso" icon={Crown} hint="Plano mínimo para acessar este curso">
                <select value={f.access_level} onChange={(e) => { const v = e.target.value; setF({ ...f, access_level: v, is_premium: v !== "free" }); }} className="modal-inp">
                  <option value="free">Free — Todos os membros</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </Field>
            </div>

            <Field label="URL da capa" icon={ImageIcon}>
              <input
                value={f.cover_url}
                onChange={(e) => setF({ ...f, cover_url: e.target.value })}
                placeholder="https://..."
                className="modal-inp"
              />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span>Recomendado: <span className="text-foreground">1280 × 720 px</span> (16:9, desktop)</span>
                <span>Mobile: <span className="text-foreground">750 × 422 px</span> (16:9, 2x)</span>
                <span>Máx. 1 MB · JPG ou WebP</span>
              </div>
            </Field>

            <Field label="Cores do degradê" icon={Palette}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[11px] text-muted-foreground whitespace-nowrap">De:</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={toHex(f.gradient_from)}
                      onChange={(e) => setF({ ...f, gradient_from: e.target.value })}
                      className="h-9 w-9 rounded-lg border border-white/10 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={f.gradient_from}
                      onChange={(e) => setF({ ...f, gradient_from: e.target.value })}
                      placeholder="#6366f1 ou red"
                      className="modal-inp flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <label className="text-[11px] text-muted-foreground whitespace-nowrap">Até:</label>
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="color"
                      value={toHex(f.gradient_to)}
                      onChange={(e) => setF({ ...f, gradient_to: e.target.value })}
                      className="h-9 w-9 rounded-lg border border-white/10 cursor-pointer bg-transparent shrink-0"
                    />
                    <input
                      type="text"
                      value={f.gradient_to}
                      onChange={(e) => setF({ ...f, gradient_to: e.target.value })}
                      placeholder="#8b5cf6 ou blue"
                      className="modal-inp flex-1 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                {[
                  ["#6366f1", "#8b5cf6"],
                  ["#ec4899", "#f97316"],
                  ["#06b6d4", "#3b82f6"],
                  ["#10b981", "#059669"],
                  ["#f59e0b", "#ef4444"],
                  ["#8b5cf6", "#ec4899"],
                ].map(([from, to]) => (
                  <button
                    key={from + to}
                    type="button"
                    onClick={() => setF({ ...f, gradient_from: from, gradient_to: to })}
                    className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 hover:scale-110 transition-all shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                    title={`${from} → ${to}`}
                  />
                ))}
              </div>
            </Field>

            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
                <Eye className="h-3.5 w-3.5" />
                Preview da capa
              </label>
              <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-white/10">
                {f.cover_url && (
                  <img src={f.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                )}
                <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${f.gradient_from}, ${f.gradient_to}00)` }} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  {f.category_id && (
                    <span className="text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 mb-2 font-medium">
                      {cats.find((c) => c.id === f.category_id)?.name ?? "Categoria"}
                    </span>
                  )}
                  <h3 className="text-white font-bold text-lg leading-tight drop-shadow-lg">
                    {f.title || "Título do curso"}
                  </h3>
                  {f.description && (
                    <p className="text-white/70 text-sm mt-1.5 line-clamp-2 max-w-[80%]">{f.description}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground">
              {f.status === "published" ? "Será publicado ao salvar" : "Salvo como rascunho"}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)] transition"
              >
                {saving ? "Salvando..." : initial.id ? "Salvar alterações" : "Criar curso"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-overlay-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes modal-card-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98) }
          to   { opacity: 1; transform: translateY(0) scale(1) }
        }
        .modal-inp {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: inherit;
          outline: none;
          transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
        }
        .modal-inp::placeholder { color: oklch(0.7 0.02 270 / 0.5) }
        .modal-inp:hover { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.12) }
        .modal-inp:focus {
          background: rgba(255,255,255,0.06);
          border-color: oklch(0.65 0.22 290 / 0.5);
          box-shadow: 0 0 0 3px oklch(0.65 0.22 290 / 0.15);
        }
        select.modal-inp { color-scheme: dark; appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>"); background-repeat: no-repeat; background-position: right 0.75rem center; padding-right: 2rem; }
        select.modal-inp option { background: oklch(0.18 0.015 270); color: oklch(0.98 0.005 270); }
      `}</style>
    </div>,
    document.body
  );
}

function Field({ label, icon: Icon, required, children }: { label: string; icon?: typeof FileText; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
        {required && <span className="text-primary">*</span>}
      </label>
      {children}
    </div>
  );
}