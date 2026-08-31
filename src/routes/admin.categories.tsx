import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, FolderTree, Search, Hash, Palette, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/categories")({ component: Page });

type Category = { id: string; name: string; slug: string; color: string | null; icon: string | null; courses?: { count: number }[] };

const PRESET_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#3b82f6", "#84cc16"];

function Page() {
  const [rows, setRows] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("categories").select("*, courses(count)").order("name");
    setRows((data ?? []) as Category[]);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Categoria excluída"); load();
  };

  const filtered = rows.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground mt-1">Organize os cursos em categorias.</p>
        </div>
        <button
          onClick={() => setEditing({ color: PRESET_COLORS[0] })}
          className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
        >
          <Plus className="h-4 w-4" />Nova categoria
        </button>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar categorias..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <div className="text-xs text-muted-foreground">{filtered.length} de {rows.length}</div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <FolderTree className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhuma categoria</div>
            <div className="text-xs text-muted-foreground mt-1">Crie a primeira para organizar seus cursos.</div>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const count = c.courses?.[0]?.count ?? 0;
              return (
                <div key={c.id} className="group relative rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:border-white/10 transition">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg shrink-0"
                      style={{ background: c.color ?? "#8b5cf6" }}
                    >
                      {(c.icon || c.name.slice(0, 2)).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground font-mono truncate">/{c.slug}</div>
                      <div className="text-[11px] text-muted-foreground mt-1.5">
                        {count} {count === 1 ? "curso" : "cursos"}
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setEditing(c)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <CategoryModal
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function CategoryModal({ initial, onClose, onSaved }: { initial: Partial<Category>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    name: initial.name ?? "",
    slug: initial.slug ?? "",
    color: initial.color ?? PRESET_COLORS[0],
    icon: initial.icon ?? "",
  });
  const [slugDirty, setSlugDirty] = useState(!!initial.slug);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!f.name.trim()) return toast.error("Informe um nome");
    if (!f.slug.trim()) return toast.error("Informe um slug");
    setSaving(true);
    const payload = { ...f };
    const { error } = initial.id
      ? await supabase.from("categories").update(payload).eq("id", initial.id)
      : await supabase.from("categories").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Categoria salva"); onSaved();
  };

  return (
    <Modal
      open
      onClose={onClose}
      kicker={initial.id ? "Editar" : "Criar"}
      title={initial.id ? "Editar categoria" : "Nova categoria"}
      description="Categorias ajudam alunos a navegar pelos cursos."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar"}
          </button>
        </>
      }
    >
      <div className="flex items-center justify-center pb-2">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center text-lg font-bold text-white shadow-2xl"
          style={{ background: f.color }}
        >
          {(f.icon || f.name.slice(0, 2) || "??").toUpperCase()}
        </div>
      </div>

      <Field label="Nome" icon={Type} required>
        <input
          autoFocus
          value={f.name}
          onChange={(e) => {
            const name = e.target.value;
            setF((prev) => ({
              ...prev,
              name,
              slug: slugDirty ? prev.slug : name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            }));
          }}
          className={inputClass}
          placeholder="Ex: Design"
        />
      </Field>

      <Field label="Slug" icon={Hash} hint="Usado nas URLs. Apenas letras minúsculas, números e hífens.">
        <input
          value={f.slug}
          onChange={(e) => { setSlugDirty(true); setF({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }); }}
          className={`${inputClass} font-mono`}
          placeholder="design"
        />
      </Field>

      <Field label="Ícone" icon={Type} hint="2 letras ou emoji que representam a categoria.">
        <input
          value={f.icon}
          maxLength={4}
          onChange={(e) => setF({ ...f, icon: e.target.value })}
          className={inputClass}
          placeholder="DS"
        />
      </Field>

      <Field label="Cor" icon={Palette}>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setF({ ...f, color: c })}
              className={`h-9 w-9 rounded-lg border-2 transition ${f.color === c ? "border-white scale-110" : "border-white/10 hover:border-white/30"}`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <label className="h-9 w-9 rounded-lg border border-dashed border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer transition">
            <input
              type="color"
              value={f.color}
              onChange={(e) => setF({ ...f, color: e.target.value })}
              className="sr-only"
            />
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
          </label>
        </div>
      </Field>
    </Modal>
  );
}
