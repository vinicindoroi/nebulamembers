import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { MemberGroup, GroupAssignments } from "@/lib/member-groups";

const changedEvent = "nebula-member-groups-changed";

export function useMemberGroups() {
  const [groups, setGroups] = useState<MemberGroup[]>([]);
  const [groupOf, setGroupOf] = useState<GroupAssignments>({});
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const [g, m] = await Promise.all([
      supabase.from("member_groups").select("id,name").order("name"),
      supabase.from("member_group_members").select("member_id,group_id"),
    ]);
    setLoading(false);
    if (g.error || m.error) { toast.error("Não foi possível carregar os grupos."); return; }
    setGroups(g.data ?? []);
    setGroupOf(Object.fromEntries((m.data ?? []).map((row) => [row.member_id, row.group_id])));
  }, []);

  useEffect(() => {
    void reload();
    const refresh = () => { void reload(); };
    window.addEventListener(changedEvent, refresh);
    window.addEventListener("focus", refresh);
    const timer = window.setInterval(refresh, 30000);
    return () => { window.removeEventListener(changedEvent, refresh); window.removeEventListener("focus", refresh); window.clearInterval(timer); };
  }, [reload]);

  const notify = async () => { await reload(); window.dispatchEvent(new Event(changedEvent)); };
  async function createGroup(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const { error } = await supabase.from("member_groups").insert({ name: trimmed });
    if (error) { toast.error(error.code === "23505" ? "Esse grupo já existe." : "Não foi possível criar o grupo."); return false; }
    await notify(); toast.success("Grupo criado"); return true;
  }
  async function deleteGroup(id: string) {
    const { error } = await supabase.from("member_groups").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir o grupo."); return; }
    await notify(); toast.success("Grupo excluído");
  }
  async function setGroup(memberIds: string[], groupId: string) {
    if (!memberIds.length) return;
    const { error } = groupId
      ? await supabase.from("member_group_members").upsert(memberIds.map((member_id) => ({ member_id, group_id: groupId })), { onConflict: "member_id" })
      : await supabase.from("member_group_members").delete().in("member_id", memberIds);
    if (error) { toast.error("Não foi possível atualizar o grupo."); return; }
    await notify(); toast.success(groupId ? "Grupo atualizado" : "Membro removido do grupo");
  }
  return { groups, groupOf, loading, reload, createGroup, deleteGroup, setGroup };
}