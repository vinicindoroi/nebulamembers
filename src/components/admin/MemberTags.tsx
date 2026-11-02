import { useCallback, useEffect, useState } from "react";
import { Tag, Plus, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

type TagsState = ReturnType<typeof useMemberTags>;

async function applyTag(tagId: string, memberIds: string[]) {
  return supabase.from("member_tag_assignments").upsert(
    memberIds.map((member_id) => ({ member_id, tag_id: tagId })),
    { onConflict: "member_id,tag_id", ignoreDuplicates: true },
  );
}

type PickerProps = TagsState & {
  memberIds: string[];
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
};

export function MemberTagsPicker({ tags, assignments, loading, reload, memberIds, trigger, align = "start" }: PickerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const assignedCount = (tagId: string) => memberIds.filter((id) => assignments.some((item) => item.member_id === id && item.tag_id === tagId)).length;

  const toggle = async (tagId: string) => {
    if (busy || memberIds.length === 0) return;
    const on = assignedCount(tagId) === memberIds.length;
    setBusy(true);
    const { error } = on
      ? await supabase.from("member_tag_assignments").delete().eq("tag_id", tagId).in("member_id", memberIds)
      : await applyTag(tagId, memberIds);
    if (error) toast.error("Não foi possível atualizar as tags.");
    else await reload();
    setBusy(false);
  };

  const createAndApply = async () => {
    const value = name.trim();
    if (!value || busy) return;
    setBusy(true);
    let tagId = tags.find((tag) => tag.name.toLowerCase() === value.toLowerCase())?.id ?? null;
    if (!tagId) {
      const { data, error } = await supabase.from("member_tags").insert({ name: value }).select("id").single();
      if (data?.id) tagId = data.id;
      else if (error?.code === "23505") {
        const { data: existing } = await supabase.from("member_tags").select("id").eq("name", value).maybeSingle();
        tagId = existing?.id ?? null;
      }
      if (!tagId) { toast.error("Não foi possível criar a tag."); setBusy(false); return; }
    }
    if (memberIds.length) {
      const { error } = await applyTag(tagId, memberIds);
      if (error) toast.error("Não foi possível aplicar a tag.");
    }
    setName("");
    await reload();
    setBusy(false);
    toast.success("Tag aplicada");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-60 p-2">
        <div className="max-h-56 overflow-y-auto">
          {loading ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Carregando tags...</p>
          ) : tags.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">Nenhuma tag ainda. Crie a primeira abaixo.</p>
          ) : (
            tags.map((tag) => {
              const on = assignedCount(tag.id) === memberIds.length;
              return (
                <button
                  key={tag.id}
                  type="button"
                  disabled={busy}
                  onClick={() => void toggle(tag.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-muted/60"
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${on ? "border-primary bg-primary/15 text-primary" : "border-border text-transparent"}`}>
                    <Check className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{tag.name}</span>
                </button>
              );
            })
          )}
        </div>
        <form className="mt-2 flex items-center gap-1.5 border-t border-border pt-2" onSubmit={(event) => { event.preventDefault(); void createAndApply(); }}>
          <input
            aria-label="Criar e aplicar tag"
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nova tag + Enter"
            className={`${inputClass} h-8 flex-1 text-xs`}
          />
          <Button type="submit" size="icon" className="size-8 shrink-0" disabled={busy || !name.trim()} aria-label="Criar e aplicar tag"><Plus /></Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

type Props = TagsState & { memberIds: string[]; title: string; onClose: () => void };

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
      ? await applyTag(tagId, memberIds)
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
