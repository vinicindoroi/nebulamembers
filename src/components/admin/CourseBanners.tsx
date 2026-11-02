import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUp, ArrowDown, ImagePlus, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCourseBanners, courseBannerQueryKey } from "@/hooks/use-course-banners";
import { normalizeBannerConfig, type CourseBannerConfig } from "@/lib/course-banners";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function CourseBanners({ open, onOpenChange, courses }: { open: boolean; onOpenChange: (value: boolean) => void; courses: { id: string; title: string }[] }) {
  const query = useCourseBanners();
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>Banners de Cursos</DialogTitle></DialogHeader>
    {query.isPending ? <p role="status">Carregando banners...</p> : query.isError ? <div><p>Não foi possível carregar os banners.</p><Button onClick={() => query.refetch()}>Tentar novamente</Button></div> : <BannerEditor initial={query.data.config} urls={query.data.urls} courses={courses} onClose={() => onOpenChange(false)} />}
  </DialogContent></Dialog>;
}

function BannerEditor({ initial, urls, courses, onClose }: { initial: CourseBannerConfig; urls: Record<string, string>; courses: { id: string; title: string }[]; onClose: () => void }) {
  const [config, setConfig] = useState(initial);
  const [seconds, setSeconds] = useState(String(initial.intervalSeconds));
  const [previews, setPreviews] = useState<Record<string, string>>(urls);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const client = useQueryClient();
  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) { toast.error("Use PNG, JPG ou WebP de até 10 MB."); continue; }
        const id = crypto.randomUUID(); const path = `${id}.${file.type.split('/')[1]}`;
        const { error } = await supabase.storage.from("course-banners").upload(path, file);
        if (error) throw error;
        const signed = await supabase.storage.from("course-banners").createSignedUrl(path, 3600);
        if (signed.error) throw signed.error;
        setPreviews((p) => ({ ...p, [path]: signed.data.signedUrl }));
        setConfig((c) => ({ ...c, banners: [...c.banners, { id, path, label: file.name.replace(/\.[^.]+$/, ""), courseId: "", active: true }] }));
      }
    } catch { toast.error("Não foi possível enviar a imagem."); } finally { setUploading(false); }
  }
  async function save() {
    const interval = Number(seconds);
    if (!Number.isFinite(interval) || interval < 1 || interval > 300) return toast.error("Defina um intervalo de 1 a 300 segundos.");
    setSaving(true);
    const value = normalizeBannerConfig({ ...config, intervalSeconds: interval });
    const { error } = await supabase.from("app_settings").upsert({ key: "course_banners", value: JSON.parse(JSON.stringify(value)), updated_at: new Date().toISOString() }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar os banners.");
    await client.invalidateQueries({ queryKey: courseBannerQueryKey }); toast.success("Banners salvos"); onClose();
  }
  function move(index: number, direction: number) {
    setConfig((c) => { const banners = [...c.banners]; const target = index + direction; if (target < 0 || target >= banners.length) return c; [banners[index], banners[target]] = [banners[target], banners[index]]; return { ...c, banners }; });
  }
  return <div className="space-y-5">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2"><Label htmlFor="banner-seconds">Trocar a cada (segundos)</Label><Input id="banner-seconds" type="number" min={1} max={300} value={seconds} onChange={(e) => setSeconds(e.target.value)} className="w-32" /></div>
      <Button asChild variant="outline" disabled={uploading}><label className="cursor-pointer">{uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}Adicionar imagens<input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={uploading} className="sr-only" onChange={(e) => { void upload(e.target.files); e.target.value = ""; }} /></label></Button>
    </div>
    {!config.banners.length && <p className="border-y border-border py-10 text-center text-sm text-muted-foreground">Nenhum banner. Adicione suas imagens.</p>}
    <div className="space-y-4">{config.banners.map((b, index) => <div key={b.id} className="overflow-hidden rounded-md border border-border">
      <img src={previews[b.path]} alt={b.label} className="aspect-[32/9] w-full object-cover object-center" />
      <div className="flex flex-wrap items-center gap-2 p-3">
        <Input aria-label={`Nome do banner ${index + 1}`} value={b.label} className="min-w-40 flex-1" onChange={(e) => setConfig((c) => ({ ...c, banners: c.banners.map((item) => item.id === b.id ? { ...item, label: e.target.value } : item) }))} />
        <select aria-label={`Curso do banner ${index + 1}`} value={b.courseId} onChange={(e) => setConfig((c) => ({ ...c, banners: c.banners.map((item) => item.id === b.id ? { ...item, courseId: e.target.value } : item) }))} className="h-9 max-w-full rounded-md border border-border bg-background px-2 text-sm"><option value="">Sem link</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.title || "Curso sem título"}</option>)}</select>
        <Switch aria-label={`Ativar banner ${index + 1}`} checked={b.active} onCheckedChange={(active) => setConfig((c) => ({ ...c, banners: c.banners.map((item) => item.id === b.id ? { ...item, active } : item) }))} />
        <Button variant="ghost" size="icon" aria-label={`Mover banner ${index + 1} para cima`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp /></Button>
        <Button variant="ghost" size="icon" aria-label={`Mover banner ${index + 1} para baixo`} disabled={index === config.banners.length - 1} onClick={() => move(index, 1)}><ArrowDown /></Button>
        <Button variant="ghost" size="icon" aria-label={`Remover banner ${index + 1}`} onClick={() => setConfig((c) => ({ ...c, banners: c.banners.filter((item) => item.id !== b.id) }))}><Trash2 /></Button>
      </div>
    </div>)}</div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={save} disabled={saving || uploading}>{saving ? <Loader2 className="animate-spin" /> : <Save />}Salvar banners</Button></div>
  </div>;
}