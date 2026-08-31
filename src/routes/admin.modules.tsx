import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Trash2, ChevronRight, Layers, BookOpen, Edit3, Video, Clock,
  GripVertical, ArrowUp, ArrowDown, FileText, Link as LinkIcon, Search,
  Paperclip, Upload, X, Download, Crown, ImageIcon, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";
import { uploadAttachment, removeAttachment } from "@/lib/storage";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

export const Route = createFileRoute("/admin/modules")({ component: Page });

type Course = { id: string; title: string };
type Module = { id: string; title: string; description: string | null; position: number; course_id: string; is_premium: boolean | null; offer_id: string | null; cover_url: string | null };
type Lesson = { id: string; title: string; description: string | null; video_url: string | null; duration: number | null; position: number; module_id: string; course_id: string; is_free: boolean | null; is_premium: boolean | null; offer_id: string | null };
type Offer = { id: string; name: string };

function Page() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [openMod, setOpenMod] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [editingModule, setEditingModule] = useState<Partial<Module> | null>(null);
  const [editingLesson, setEditingLesson] = useState<{ moduleId: string; data: Partial<Lesson> } | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: of }] = await Promise.all([
        supabase.from("courses").select("id,title").order("title"),
        supabase.from("offers").select("id,name").eq("active", true),
      ]);
      setCourses((data ?? []) as Course[]);
      if (data?.[0]) setSelected(data[0].id);
      setOffers((of ?? []) as Offer[]);
    })();
  }, []);

  const loadModules = async () => {
    if (!selected) return setModules([]);
    const { data } = await supabase.from("modules").select("*").eq("course_id", selected).order("position");
    setModules((data ?? []) as Module[]);
  };
  useEffect(() => { loadModules(); }, [selected]);

  const loadLessons = async (mid: string) => {
    const { data } = await supabase.from("lessons").select("*").eq("module_id", mid).order("position");
    setLessons((p) => ({ ...p, [mid]: (data ?? []) as Lesson[] }));
  };

  const removeModule = async (id: string) => {
    if (!confirm("Excluir este módulo e todas as suas aulas?")) return;
    const { error } = await supabase.from("modules").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Módulo excluído");
    loadModules();
  };

  const removeLesson = async (lid: string, mid: string) => {
    if (!confirm("Excluir esta aula?")) return;
    const { error } = await supabase.from("lessons").delete().eq("id", lid);
    if (error) return toast.error(error.message);
    toast.success("Aula excluída");
    loadLessons(mid);
  };

  const moveModule = async (id: string, dir: -1 | 1) => {
    const idx = modules.findIndex((m) => m.id === id);
    const swap = modules[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("modules").update({ position: swap.position }).eq("id", id),
      supabase.from("modules").update({ position: modules[idx].position }).eq("id", swap.id),
    ]);
    loadModules();
  };

  const moveLesson = async (mid: string, lid: string, dir: -1 | 1) => {
    const list = lessons[mid] ?? [];
    const idx = list.findIndex((l) => l.id === lid);
    const swap = list[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("lessons").update({ position: swap.position }).eq("id", lid),
      supabase.from("lessons").update({ position: list[idx].position }).eq("id", swap.id),
    ]);
    loadLessons(mid);
  };

  const filtered = useMemo(
    () => modules.filter((m) => !search || m.title.toLowerCase().includes(search.toLowerCase())),
    [modules, search]
  );

  const totalLessons = Object.values(lessons).reduce((s, l) => s + l.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Módulos & Aulas</h1>
          <p className="text-sm text-muted-foreground mt-1">Estruture o conteúdo do curso selecionado.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <select
              value={selected ?? ""}
              onChange={(e) => setSelected(e.target.value)}
              className={`${selectClass} pl-9 min-w-[220px]`}
              style={selectStyle}
            >
              {courses.length === 0 && <option value="">Nenhum curso</option>}
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat icon={Layers} label="Módulos" value={modules.length} />
        <Stat icon={Video} label="Aulas carregadas" value={totalLessons} />
        <Stat icon={Clock} label="Curso" value={courses.find((c) => c.id === selected)?.title ?? "—"} text />
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
        <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar módulo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40"
            />
          </div>
          <button
            onClick={() => selected && setEditingModule({ course_id: selected })}
            disabled={!selected}
            className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 disabled:opacity-40 shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.6)]"
          >
            <Plus className="h-4 w-4" />Novo módulo
          </button>
        </div>

        <div className="p-3 space-y-2">
          {filtered.length === 0 && (
            <div className="py-16 text-center">
              <Layers className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <div className="text-sm font-medium">Nenhum módulo</div>
              <div className="text-xs text-muted-foreground mt-1">
                {selected ? "Crie o primeiro módulo deste curso." : "Selecione um curso para começar."}
              </div>
            </div>
          )}

          {filtered.map((m, idx) => {
            const open = openMod === m.id;
            const ls = lessons[m.id] ?? [];
            return (
              <div key={m.id} className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 group">
                  <div className="flex flex-col -gap-1">
                    <button
                      onClick={() => moveModule(m.id, -1)}
                      disabled={idx === 0}
                      className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
                      aria-label="Mover acima"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => moveModule(m.id, 1)}
                      disabled={idx === modules.length - 1}
                      className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground disabled:opacity-30"
                      aria-label="Mover abaixo"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </div>
                  <GripVertical className="h-4 w-4 text-muted-foreground/30 hidden sm:block" />
                  <button
                    onClick={() => { setOpenMod(open ? null : m.id); if (!open) loadLessons(m.id); }}
                    className="flex items-center gap-2 flex-1 text-left min-w-0"
                  >
                    <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
                    <span className="text-[10px] font-mono text-muted-foreground/60 w-6">{String(idx + 1).padStart(2, "0")}</span>
                    <span className="text-sm font-medium truncate">{m.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground shrink-0">
                      {ls.length} {ls.length === 1 ? "aula" : "aulas"}
                    </span>
                  </button>
                  <button
                    onClick={() => { setOpenMod(m.id); loadLessons(m.id); setEditingLesson({ moduleId: m.id, data: { course_id: selected!, module_id: m.id } }); }}
                    className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground flex items-center gap-1 transition"
                  >
                    <Plus className="h-3 w-3" />Aula
                  </button>
                  <button onClick={() => setEditingModule(m)} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => removeModule(m.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {open && (
                  <div className="border-t border-white/5 bg-black/20 px-3 py-2 space-y-1">
                    {ls.length === 0 && (
                      <div className="text-xs text-muted-foreground py-4 text-center">
                        Nenhuma aula. Clique em "+ Aula" para criar.
                      </div>
                    )}
                    {ls.map((l, li) => (
                      <div key={l.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition group">
                        <div className="flex flex-col">
                          <button
                            onClick={() => moveLesson(m.id, l.id, -1)}
                            disabled={li === 0}
                            className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
                          >
                            <ArrowUp className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={() => moveLesson(m.id, l.id, 1)}
                            disabled={li === ls.length - 1}
                            className="p-0.5 rounded text-muted-foreground/40 hover:text-foreground disabled:opacity-20"
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </button>
                        </div>
                        <div className="h-7 w-7 rounded-md bg-white/5 flex items-center justify-center shrink-0">
                          <Video className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{l.title}</div>
                          {l.video_url && (
                            <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                              <LinkIcon className="h-2.5 w-2.5" />{l.video_url}
                            </div>
                          )}
                        </div>
                        {l.duration ? (
                          <span className="text-[10px] text-muted-foreground tabular-nums">{formatDur(l.duration)}</span>
                        ) : null}
                        {l.is_free && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider">Free</span>
                        )}
                        <button
                          onClick={() => setEditingLesson({ moduleId: m.id, data: l })}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => removeLesson(l.id, m.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {editingModule && (
        <ModuleModal
          initial={editingModule}
          courseId={selected!}
          nextPos={modules.length}
          offers={offers}
          onClose={() => setEditingModule(null)}
          onSaved={() => { setEditingModule(null); loadModules(); }}
        />
      )}

      {editingLesson && (
        <LessonModal
          initial={editingLesson.data}
          moduleId={editingLesson.moduleId}
          courseId={selected!}
          nextPos={(lessons[editingLesson.moduleId] ?? []).length}
          offers={offers}
          modules={modules}
          onClose={() => setEditingLesson(null)}
          onSaved={(savedModuleId) => {
            const originalMid = editingLesson.moduleId;
            setEditingLesson(null);
            loadLessons(originalMid);
            if (savedModuleId && savedModuleId !== originalMid) {
              loadLessons(savedModuleId);
            }
          }}
        />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, text }: { icon: any; label: string; value: number | string; text?: boolean }) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 flex items-center gap-3">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</div>
        <div className={`font-semibold ${text ? "text-sm truncate" : "text-lg"}`}>{value}</div>
      </div>
    </div>
  );
}

function ModuleModal({ initial, courseId, nextPos, offers, onClose, onSaved }: { initial: Partial<Module>; courseId: string; nextPos: number; offers: Offer[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: initial.title ?? "", description: initial.description ?? "", is_premium: initial.is_premium ?? false, offer_id: initial.offer_id ?? "", cover_url: initial.cover_url ?? "" });
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!f.title.trim()) return toast.error("Informe um título");
    setSaving(true);
    const payload = { title: f.title, description: f.description || null, course_id: courseId, is_premium: f.is_premium, offer_id: f.offer_id || null, cover_url: f.cover_url || null };
    const { error } = initial.id
      ? await supabase.from("modules").update(payload).eq("id", initial.id)
      : await supabase.from("modules").insert({ ...payload, position: nextPos });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Módulo salvo"); onSaved();
  };
  return (
    <Modal
      open
      onClose={onClose}
      kicker={initial.id ? "Editar" : "Criar"}
      title={initial.id ? "Editar módulo" : "Novo módulo"}
      description="Agrupe aulas relacionadas em um módulo."
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar módulo"}
          </button>
        </>
      }
    >
      <Field label="Título" icon={FileText} required>
        <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputClass} placeholder="Ex: Fundamentos" />
      </Field>
      <Field label="Descrição" icon={FileText} hint="Opcional. Aparece como subtítulo do módulo.">
        <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} rows={3} className={`${inputClass} resize-none`} />
      </Field>
      <Field label="URL da capa" icon={ImageIcon} hint="URL de imagem para capa do módulo.">
        <input value={f.cover_url} onChange={(e) => setF({ ...f, cover_url: e.target.value })} className={inputClass} placeholder="https://..." />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>Recomendado: <span className="text-foreground">640 × 360 px</span> (16:9)</span>
          <span>Máx. 1 MB · JPG ou WebP</span>
        </div>
      </Field>

      {f.cover_url && (
        <div className="mt-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Eye className="h-3.5 w-3.5" />
            Preview da capa
          </label>
          <div className="relative aspect-[16/10] w-full max-w-[280px] rounded-xl overflow-hidden border border-white/10 mx-auto mb-2">
            <img src={f.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute inset-x-3 bottom-3 text-left">
              <h4 className="text-white font-semibold text-xs truncate">{f.title || "Título do módulo"}</h4>
              <p className="text-[10px] text-white/60">Preview do card</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Field label="Acesso" icon={Crown} hint="Quem pode acessar este módulo">
          <select value={f.is_premium ? (f.offer_id || "pro") : "free"} onChange={(e) => { const v = e.target.value; if (v === "free") { setF({ ...f, is_premium: false, offer_id: "" }); } else { setF({ ...f, is_premium: true, offer_id: v }); } }} className={inputClass}>
            <option value="free">Free — Todos os membros</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}

function LessonModal({ initial, moduleId, courseId, nextPos, offers, modules, onClose, onSaved }: { initial: Partial<Lesson>; moduleId: string; courseId: string; nextPos: number; offers: Offer[]; modules: Module[]; onClose: () => void; onSaved: (savedModuleId?: string) => void }) {
  const [f, setF] = useState({
    title: initial.title ?? "",
    description: initial.description ?? "",
    video_url: initial.video_url ?? "",
    duration: initial.duration ?? 0,
    is_free: initial.is_free ?? false,
    is_premium: initial.is_premium ?? false,
    offer_id: initial.offer_id ?? "",
    module_id: initial.module_id ?? moduleId,
  });
  const [saving, setSaving] = useState(false);

  // Attachments state
  type Attachment = { id: string; file_name: string; file_path: string; file_size: number; mime_type: string | null };
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!initial.id) return;
    supabase
      .from("lesson_attachments")
      .select("*")
      .eq("lesson_id", initial.id)
      .order("created_at")
      .then(({ data }) => setAttachments((data ?? []) as Attachment[]));
  }, [initial.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !initial.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = await uploadAttachment(file);
        const { data, error } = await supabase
          .from("lesson_attachments")
          .insert({ lesson_id: initial.id, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type || null })
          .select()
          .single();
        if (error) throw error;
        setAttachments((prev) => [...prev, data as Attachment]);
      }
      toast.success("Arquivo(s) enviado(s)");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveAttachment = async (att: Attachment) => {
    if (!confirm(`Remover "${att.file_name}"?`)) return;
    try {
      await removeAttachment(att.file_path);
      await supabase.from("lesson_attachments").delete().eq("id", att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
      toast.success("Arquivo removido");
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover");
    }
  };

  const save = async () => {
    if (!f.title.trim()) return toast.error("Informe um título");
    setSaving(true);

    let targetPosition = initial.position ?? nextPos;
    if (f.module_id !== moduleId) {
      try {
        const { count } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true })
          .eq("module_id", f.module_id);
        targetPosition = count ?? 0;
      } catch (err) {
        console.error("Erro ao buscar posição:", err);
      }
    }

    const payload: any = {
      title: f.title,
      description: f.description || null,
      video_url: f.video_url || null,
      duration: f.duration || null,
      is_free: f.is_free,
      is_premium: f.is_premium,
      offer_id: f.offer_id || null,
      module_id: f.module_id,
      course_id: courseId,
    };
    const { error } = initial.id
      ? await supabase.from("lessons").update(payload).eq("id", initial.id)
      : await supabase.from("lessons").insert({ ...payload, position: targetPosition });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Aula salva"); onSaved(f.module_id);
  };
  return (
    <Modal
      open
      onClose={onClose}
      kicker={initial.id ? "Editar" : "Criar"}
      title={initial.id ? "Editar aula" : "Nova aula"}
      description="Detalhes da aula que será exibida para os membros."
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm border border-white/10 hover:bg-white/5">Cancelar</button>
          <button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50">
            {saving ? "Salvando..." : initial.id ? "Salvar" : "Criar aula"}
          </button>
        </>
      }
    >
      <Field label="Título" icon={FileText} required>
        <input autoFocus value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={inputClass} placeholder="Ex: Introdução à arquitetura" />
      </Field>
      <Field label="Módulo" icon={Layers} required>
        <select
          value={f.module_id}
          onChange={(e) => setF({ ...f, module_id: e.target.value })}
          className={inputClass}
        >
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descrição" icon={FileText}>
        <RichTextEditor
          content={f.description ?? ""}
          onChange={(html) => setF({ ...f, description: html })}
          placeholder="Descreva o conteúdo desta aula..."
        />
      </Field>
      <Field label="URL do vídeo" icon={Video} hint="YouTube, Vimeo, Bunny, etc.">
        <input value={f.video_url} onChange={(e) => setF({ ...f, video_url: e.target.value })} className={inputClass} placeholder="https://..." />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Duração (min)" icon={Clock}>
          <input type="number" min="0" value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })} className={inputClass} />
        </Field>
        <Field label="Acesso">
          <label className="flex items-center gap-2 h-[42px] px-3.5 rounded-xl bg-white/[0.04] border border-white/10 cursor-pointer">
            <input type="checkbox" checked={f.is_free} onChange={(e) => setF({ ...f, is_free: e.target.checked })} className="accent-primary" />
            <span className="text-sm">Aula gratuita</span>
          </label>
        </Field>
      </div>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <Field label="Acesso" icon={Crown} hint="Quem pode acessar esta aula">
          <select value={f.is_free ? "free_preview" : f.is_premium ? (f.offer_id || "pro") : "free"} onChange={(e) => { const v = e.target.value; if (v === "free") { setF({ ...f, is_free: false, is_premium: false, offer_id: "" }); } else if (v === "free_preview") { setF({ ...f, is_free: true, is_premium: false, offer_id: "" }); } else { setF({ ...f, is_free: false, is_premium: true, offer_id: v }); } }} className={inputClass}>
            <option value="free">Free — Todos os membros</option>
            <option value="free_preview">Gratuita — Preview aberto</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </Field>
      </div>

      {/* Attachments section */}
      {initial.id && (
        <div className="mt-2 space-y-2">
          <Field label="Arquivos para download" icon={Paperclip} hint="PDF, TXT, DOC, ZIP... (máx 50MB cada)">
            <div className="space-y-2">
              {attachments.map((att) => (
                <div key={att.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
                  <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{att.file_name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatFileSize(att.file_size)}</span>
                  <button
                    onClick={() => handleRemoveAttachment(att)}
                    className="p-1 rounded hover:bg-red-500/10 text-red-400 transition"
                    title="Remover arquivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <label className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border border-dashed border-white/10 hover:border-primary/40 cursor-pointer transition ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                <Upload className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{uploading ? "Enviando..." : "Clique para enviar arquivos"}</span>
                <input type="file" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </Field>
        </div>
      )}
      {!initial.id && (
        <p className="text-xs text-muted-foreground mt-2">Salve a aula primeiro para poder anexar arquivos.</p>
      )}
    </Modal>
  );
}

function formatDur(min: number) {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
