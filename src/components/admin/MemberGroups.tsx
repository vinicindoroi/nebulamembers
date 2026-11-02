import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { useMemberGroups } from "@/hooks/use-member-groups";

type GroupsState = ReturnType<typeof useMemberGroups>;

export function MemberGroupSelect({ state, memberIds, label }: { state: GroupsState; memberIds: string[]; label: string }) {
  const value = memberIds.length === 1 ? state.groupOf[memberIds[0]] ?? "" : "choose";
  return <select aria-label={label} value={value} disabled={state.loading} onChange={(e) => void state.setGroup(memberIds, e.target.value)} className="h-9 max-w-48 rounded-md border border-border bg-background px-2 text-sm text-foreground">
    {memberIds.length > 1 && <option value="choose" disabled>Alterar grupo...</option>}
    <option value="">Sem grupo</option>
    {state.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
  </select>;
}

export function MemberGroupsDialog({ state, open, onOpenChange }: { state: GroupsState; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Grupos de membros</DialogTitle><DialogDescription>Membros e Agendamento</DialogDescription></DialogHeader>
    <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { if (await state.createGroup(name)) setName(""); } finally { setSaving(false); } }}>
      <Input aria-label="Nome do novo grupo" placeholder="Nome do grupo" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      <Button type="submit" disabled={saving || !name.trim()}><Plus />Criar</Button>
    </form>
    <div className="max-h-80 divide-y divide-border overflow-y-auto">
      {state.groups.map((g) => <div key={g.id} className="flex items-center justify-between gap-3 py-3"><span className="break-words text-sm">{g.name}</span><Button variant="ghost" size="icon" aria-label={`Excluir grupo ${g.name}`} onClick={() => { if (confirm(`Excluir o grupo "${g.name}"? Os alunos ficam sem grupo.`)) void state.deleteGroup(g.id); }}><Trash2 /></Button></div>)}
      {!state.groups.length && <p className="py-4 text-sm text-muted-foreground">Nenhum grupo cadastrado.</p>}
    </div>
  </DialogContent></Dialog>;
}