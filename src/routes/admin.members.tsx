import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Trash2, Edit3, Download, Plus, MoreVertical, Shield, Pause, Play, UserPlus, Mail, User, FileText, Activity, Eye, Phone, MapPin, Instagram, ExternalLink, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Modal, Field, inputClass, selectClass, selectStyle } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/members")({ component: Page });

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

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (planFilter !== "all" && (r.plan ?? "Free") !== planFilter) return false;
    if (q && !(r.full_name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

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
    const head = "Nome,Plano,Status,Cadastro\n";
    const body = filtered.map((r) => `"${r.full_name ?? ""}","${r.plan ?? "Free"}","${r.status}","${r.created_at}"`).join("\n");
    const blob = new Blob([head + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "membros.csv"; a.click();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} de {rows.length} membros</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCsv} className="glass px-3.5 py-2 rounded-xl text-sm flex items-center gap-2 hover:bg-white/10"><Download className="h-4 w-4" />CSV</button>
          <button onClick={() => setAdding(true)} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm flex items-center gap-2"><Plus className="h-4 w-4" />Adicionar</button>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white" style={{ colorScheme: "dark" }}>
          <option value="all">Todos status</option><option value="active">Ativo</option><option value="suspended">Suspenso</option><option value="pending">Pendente</option>
        </select>
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white" style={{ colorScheme: "dark" }}>
          <option value="all">Todos planos</option><option>Free</option><option>Pro</option><option>Premium</option>
        </select>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 bg-primary/5 border border-primary/20 animate-fade-in flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-primary">{selectedIds.length} selecionados</span>
            <button onClick={() => setSelectedIds([])} className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer">Limpar seleção</button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Plano:</span>
              <select
                onChange={async (e) => {
                  const plan = e.target.value;
                  if (!plan) return;
                  await bulkUpdatePlan(plan);
                  e.target.value = "";
                }}
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
                style={{ colorScheme: "dark" }}
              >
                <option value="">Alterar...</option>
                <option value="Free">Free</option>
                <option value="Pro">Pro</option>
                <option value="Premium">Premium</option>
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
                className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs cursor-pointer hover:bg-white/10 outline-none [&>option]:bg-[#121214] [&>option]:text-white"
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
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground bg-white/[0.02] sticky top-0">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map(r => r.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="accent-primary rounded cursor-pointer scale-105"
                  />
                </th>
                <th className="text-left font-medium px-4 py-3">Membro</th>
                <th className="text-left font-medium px-4 py-3">Plano</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3">Cadastro</th>
                <th className="text-left font-medium px-4 py-3">Último acesso</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-xs">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-xs">Nenhum membro encontrado</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className={`hover:bg-white/[0.02] transition cursor-pointer select-none group ${selectedIds.includes(r.id) ? "bg-primary/[0.02]" : ""}`}>
                  <td className="px-4 py-3 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(r.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, r.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== r.id));
                        }
                      }}
                      className="accent-primary rounded cursor-pointer scale-105"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={() => setViewing(r)}>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground group-hover:scale-105 transition duration-200">
                        {(r.full_name ?? "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="font-medium group-hover:text-primary transition duration-200">{r.full_name ?? "Sem nome"}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3" onClick={() => setViewing(r)}><span className="text-xs px-2 py-1 rounded-md bg-white/5">{r.plan ?? "Free"}</span></td>
                  <td className="px-4 py-3" onClick={() => setViewing(r)}>
                    <span className={`text-xs px-2 py-1 rounded-md ${r.status === "active" ? "bg-emerald-500/10 text-emerald-400" : r.status === "suspended" ? "bg-red-500/10 text-red-400" : "bg-amber-500/10 text-amber-400"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground" onClick={() => setViewing(r)}>{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
                  <td className="px-4 py-3 text-muted-foreground" onClick={() => setViewing(r)}>{r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("pt-BR") : "—"}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex gap-1">
                      <button onClick={() => setViewing(r)} className="p-1.5 rounded-lg hover:bg-white/10" title="Visualizar Detalhes"><Eye className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setEditing(r)} className="p-1.5 rounded-lg hover:bg-white/10" title="Editar"><Edit3 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => setStatus(r.id, r.status === "active" ? "suspended" : "active")} className="p-1.5 rounded-lg hover:bg-white/10" title="Suspender/Reativar">
                        {r.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400" title="Excluir"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewing && <MemberDetailsModal member={viewing} onClose={() => setViewing(null)} onEdit={() => setEditing(viewing)} />}
      {editing && <EditModal member={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {adding && <AddMemberModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function EditModal({ member, onClose, onSaved }: { member: Member; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ 
    full_name: member.full_name ?? "", 
    plan: member.plan ?? "Free", 
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
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button>
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
          <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className={selectClass} style={selectStyle}>
            <option>Free</option><option>Pro</option><option>Premium</option>
          </select>
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
    plan: "Free", 
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
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground px-3.5 py-2 rounded-xl text-sm disabled:opacity-50">
            {saving ? "Salvando..." : mode === "invite" ? "Enviar convite" : "Adicionar"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/10">
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
          <select
            value={form.plan}
            onChange={(e) => setForm({ ...form, plan: e.target.value })}
            className={selectClass}
            style={selectStyle}
          >
            <option value="Free">Free</option>
            <option value="Pro">Pro</option>
            <option value="Premium">Premium</option>
          </select>
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

  const waLink = formatWhatsAppLink(member.phone);

  return (
    <Modal
      open
      onClose={onClose}
      title="Detalhes do Membro"
      kicker="Visualização"
      size="md"
      footer={
        <>
          <button onClick={onClose} className="px-3.5 py-2 rounded-xl text-sm hover:bg-white/5 text-muted-foreground hover:text-foreground">Fechar</button>
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
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
          <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.25)] shrink-0">
            {(member.full_name ?? "U").slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-foreground truncate leading-snug">{member.full_name ?? "Sem nome"}</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-foreground">
                {member.plan ?? "Free"}
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
          <p className="text-xs text-foreground/80 leading-relaxed p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] min-h-[50px] whitespace-pre-wrap">
            {member.bio || "Nenhuma biografia descrita para este membro."}
          </p>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Email */}
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
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
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
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
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" /> Localização
            </div>
            <div className="text-xs text-foreground/90 font-medium truncate mt-1">
              {member.location || <span className="text-muted-foreground/40 italic">Não informado</span>}
            </div>
          </div>

          {/* Instagram */}
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
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
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" /> Membro Desde
            </div>
            <div className="text-xs text-foreground/80 mt-1">
              {new Date(member.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Último Acesso */}
          <div className="p-3.5 rounded-xl border border-white/[0.04] bg-white/[0.01] space-y-1">
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