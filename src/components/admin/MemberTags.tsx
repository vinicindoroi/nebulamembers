import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Modal, inputClass } from "@/components/admin/Modal";
import type { MemberTag, TagAssignment } from "@/lib/member-tags";

export function useMemberTags() {
  const [tags, setTags] = useState<MemberTag[]>([]);
  const [assignments, setAssignments] = useState<TagAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const [catalog, links] = await Promise.all([
      supabase.from("member_tags").select("id,name").order("name"),
      supabase.from("member_tag_assignments").select("member_id,tag_id"),
    ]);
    if (catalog.error || links.error) toast.error("Não foi possível carregar as tags.");
    else { setTags(catalog.data ?? []); setAssignments(links.data ?? []); }
    setLoading(false);
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { tags, assignments, loading, reload };
}

type Props = ReturnType<typeof useMemberTags> & { memberIds: string[]; title: string; onClose: () => void };

export function MemberTagsModal({ tags, assignments, loading, reload, memberIds, title, onClose }: Props) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase.from("member_tags").insert({ name: name.trim() });
    if (error) toast.error(error.code === "23505" ? "Essa tag já existe." : "Não foi possível criar a tag.");
    else { setName(""); await reload(); toast.success("Tag criada"); }
    setBusy(false);
  };
  const toggle = async (tagId: string, add: boolean) => {
    setBusy(true);
    const { error } = add
      ? await supabase.from("member_tag_assignments").upsert(memberIds.map((member_id) => ({ member_id, tag_id: tagId })), { onConflict: "member_id,tag_id", ignoreDuplicates: true })
      : await supabase.from("member_tag_assignments").delete().eq("tag_id", tagId).in("member_id", memberIds);
    if (error) toast.error("Não foi possível atualizar as tags.");
    else await reload();
    setBusy(false);
  };
  const remove = async (tag: MemberTag) => {
    if (!confirm(`Excluir a tag “${tag.name}” de todos os alunos?`)) return;
    setBusy(true);
    const { error } = await supabase.from("member_tags").delete().eq("id", tag.id);
    if (error) toast.error("Não foi possível excluir a tag.");
    else await reload();
    setBusy(false);
  };
  const saveName = async (id: string) => {
    if (!rename.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("member_tags").update({ name: rename.trim() }).eq("id", id);
    if (error) toast.error(error.code === "23505" ? "Essa tag já existe." : "Não foi possível renomear a tag.");
    else { setRenaming(null); await reload(); }
    setBusy(false);
  };
  return <Modal open onClose={onClose} title={title} size="md" footer={<Button variant="outline" onClick={onClose}>Concluir</Button>}>
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <input aria-label="Nova tag" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="Nova tag, ex.: Pagantes" className={inputClass} />
      <Button type="submit" disabled={busy || !name.trim()}><Plus />Criar</Button>
    </form>
    {loading ? <p className="text-sm text-muted-foreground">Carregando tags...</p> : tags.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada.</p> :
      <div className="divide-y divide-border">
        {tags.map((tag) => {
          const assigned = memberIds.filter((id) => assignments.some((item) => item.member_id === id && item.tag_id === tag.id)).length;
          const all = memberIds.length > 0 && assigned === memberIds.length;
          return <div key={tag.id} className="flex items-center gap-3 py-3">
            {memberIds.length > 0 && <input type="checkbox" aria-label={`Tag ${tag.name}`} checked={all} ref={(element) => { if (element) element.indeterminate = assigned > 0 && !all; }} disabled={busy} onChange={(event) => void toggle(tag.id, event.target.checked)} className="size-4 shrink-0 accent-primary" />}
            <Tag className="size-4 shrink-0 text-primary" />
            {renaming === tag.id ? <form className="flex flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); void saveName(tag.id); }}><input aria-label="Nome da tag" value={rename} maxLength={60} onChange={(event) => setRename(event.target.value)} className={inputClass} /><Button type="submit" size="icon" disabled={busy} aria-label="Salvar nome"><Check /></Button></form> : <span className="min-w-0 flex-1 break-words text-sm">{tag.name}</span>}
            <Button variant="ghost" size="icon" disabled={busy} title={`Renomear ${tag.name}`} aria-label={`Renomear ${tag.name}`} onClick={() => { setRenaming(tag.id); setRename(tag.name); }}><Pencil /></Button>
            <Button variant="ghost" size="icon" disabled={busy} className="text-destructive" title={`Excluir ${tag.name}`} aria-label={`Excluir ${tag.name}`} onClick={() => void remove(tag)}><Trash2 /></Button>
          </div>;
        })}
      </div>}
  </Modal>;
}