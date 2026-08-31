import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search, RefreshCw, Trash2, Mail, Phone, Calendar, Copy, Check, Crown } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/admin/Modal";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/forms")({
  component: AdminFormsPage,
  head: () => ({ meta: [{ title: "Respostas Formulários — Admin" }] }),
});

type Submission = {
  id: string;
  name: string;
  phone: string;
  email: string;
  mentorship: string;
  date: string;
};

const DEFAULT_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    name: "Vinicio Barbosa",
    phone: "(31) 99676-5089",
    email: "viniciobdf@gmail.com",
    mentorship: "Infoproduto",
    date: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "sub-2",
    name: "Ana Clara Souza",
    phone: "(21) 97777-7777",
    email: "ana.souza@outlook.com",
    mentorship: "Dropshipping",
    date: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "sub-3",
    name: "Carlos Eduardo Lima",
    phone: "(31) 99654-3210",
    email: "carlos.edu@gmail.com",
    mentorship: "Mentoria Avançada Black",
    date: new Date(Date.now() - 3600000 * 24).toISOString(),
  }
];

function AdminFormsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Modal selection state
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const { data: supabaseData, error } = await supabase
        .from("form_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedSubmissions = (supabaseData || []).map((sub) => ({
        id: sub.id,
        name: sub.name,
        phone: sub.phone,
        email: sub.email,
        mentorship: sub.mentorship,
        date: sub.created_at
      }));

      // Also merge any submissions from localStorage that are not in Supabase yet
      const localData = localStorage.getItem("nebula_form_submissions");
      if (localData) {
        try {
          const parsedLocal = JSON.parse(localData) as Submission[];
          // Filter out the default mock submissions from local storage if they are there
          const nonMockLocal = parsedLocal.filter(s => !s.id.startsWith("sub-"));
          
          // Filter out any local submission that already exists in Supabase
          const uniqueLocal = nonMockLocal.filter(
            local => !mappedSubmissions.some(sub => sub.id === local.id || (sub.email === local.email && sub.name === local.name))
          );
          
          if (uniqueLocal.length > 0) {
            mappedSubmissions.unshift(...uniqueLocal);
          }
        } catch (e) {
          console.error("Error parsing local submissions:", e);
        }
      }

      setSubmissions(mappedSubmissions);
    } catch (error: any) {
      console.error("Error loading submissions from Supabase:", error);
      toast.error("Erro ao carregar do Supabase. Carregando dados locais...");
      
      // Fallback: load only from localStorage if Supabase is unavailable
      let data = localStorage.getItem("nebula_form_submissions");
      if (!data) {
        localStorage.setItem("nebula_form_submissions", JSON.stringify(DEFAULT_SUBMISSIONS));
        data = JSON.stringify(DEFAULT_SUBMISSIONS);
      }
      try {
        const parsed = JSON.parse(data) as Submission[];
        setSubmissions(parsed);
      } catch (e) {
        setSubmissions([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const handleClear = async () => {
    if (confirm("Tem certeza que deseja apagar todas as respostas recebidas do banco de dados e localmente?")) {
      setLoading(true);
      try {
        // Delete all submissions from Supabase
        const { error } = await supabase.from("form_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (error) throw error;
        
        localStorage.removeItem("nebula_form_submissions");
        setSubmissions([]);
        setSelectedSub(null);
        toast.success("Todas as respostas foram excluídas com sucesso!");
      } catch (error: any) {
        console.error("Error clearing submissions:", error);
        toast.error("Erro ao excluir do banco de dados.");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row click modal
    if (!confirm("Tem certeza que deseja excluir esta resposta?")) return;
    
    setLoading(true);
    try {
      // Check if it's a UUID (length 36) before attempting Supabase delete
      if (id.length === 36) {
        const { error } = await supabase
          .from("form_submissions")
          .delete()
          .eq("id", id);
          
        if (error) throw error;
      }
      
      // Also clean up local storage
      const localData = localStorage.getItem("nebula_form_submissions");
      if (localData) {
        try {
          const parsed = JSON.parse(localData) as Submission[];
          const filteredLocal = parsed.filter((s) => s.id !== id);
          localStorage.setItem("nebula_form_submissions", JSON.stringify(filteredLocal));
        } catch (err) {
          console.error("Error clearing local storage entry:", err);
        }
      }

      const filtered = submissions.filter((s) => s.id !== id);
      setSubmissions(filtered);
      if (selectedSub?.id === id) {
        setSelectedSub(null);
      }
      toast.success("Resposta removida com sucesso!");
    } catch (error: any) {
      console.error("Error deleting submission:", error);
      toast.error("Erro ao excluir resposta do banco de dados.");
    } finally {
      setLoading(false);
    }
  };

  const { totalSubmissions, mostPopularMentorship } = useMemo(() => {
    const counts: Record<string, number> = {};
    submissions.forEach((sub) => {
      const key = sub.mentorship || "Não especificado";
      counts[key] = (counts[key] || 0) + 1;
    });

    let bestName = "Nenhuma";
    let bestCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    });

    const formattedBestName = bestName.charAt(0).toUpperCase() + bestName.slice(1);

    return {
      totalSubmissions: submissions.length,
      mostPopularMentorship: {
        name: formattedBestName,
        count: bestCount,
      },
    };
  }, [submissions]);

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const searchStr = `${s.name} ${s.email} ${s.phone} ${s.mentorship}`.toLowerCase();
      return !q || searchStr.includes(q.toLowerCase());
    });
  }, [submissions, q]);

  // Clipboard copy handlers
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Respostas do Formulário</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lista de contatos e seleções de mentoria. Clique em uma linha para ver os detalhes completos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSubmissions}
            disabled={loading}
            className="text-xs px-3 py-2 rounded-xl border border-white/10 hover:bg-white/5 flex items-center gap-2 disabled:opacity-50 transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          {submissions.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs px-3 py-2 rounded-xl border border-destructive/20 hover:bg-destructive/10 text-destructive-foreground flex items-center gap-2 transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Limpar tudo
            </button>
          )}
        </div>
      </div>

      {/* Sleek Dynamic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total applications card */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] bg-white/[0.01] flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total de Aplicações</span>
            <div className="text-2xl font-bold text-foreground">{totalSubmissions}</div>
            <p className="text-[10px] text-muted-foreground/60">Contatos únicos capturados no forms</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <ScrollText className="h-5 w-5" />
          </div>
        </div>

        {/* Most popular mentorship card */}
        <div className="glass rounded-2xl p-5 border border-white/[0.06] bg-white/[0.01] flex items-center justify-between relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Mentoria Mais Procurada</span>
            <div className="text-2xl font-bold text-foreground capitalize">
              {mostPopularMentorship.count > 0 ? (
                <>
                  {mostPopularMentorship.name}{" "}
                  <span className="text-sm font-semibold text-amber-400">({mostPopularMentorship.count} {mostPopularMentorship.count === 1 ? "aluno" : "alunos"})</span>
                </>
              ) : (
                "Nenhuma"
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60">Maior volume de interesse selecionado</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="h-5 w-5 fill-amber-400/20" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
        {/* Search Header */}
        <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-4 flex-wrap bg-white/[0.01]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar por nome, e-mail, mentoria..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} de {submissions.length} respostas
          </div>
        </div>

        {/* Content Table or Empty State */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ScrollText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <div className="text-sm font-medium">Nenhuma resposta encontrada</div>
            <div className="text-xs text-muted-foreground mt-1">
              {q ? "Nenhum resultado corresponde à busca." : "As respostas enviadas aparecerão listadas nesta tabela."}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground bg-white/[0.02] border-b border-white/5">
                  <th className="text-left px-5 py-3 font-medium">Nome Completo</th>
                  <th className="text-left px-5 py-3 font-medium">Contato</th>
                  <th className="text-left px-5 py-3 font-medium">Mentoria</th>
                  <th className="text-left px-5 py-3 font-medium">Enviado em</th>
                  <th className="text-center px-5 py-3 font-medium w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((sub) => (
                  <tr 
                    key={sub.id} 
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-white/[0.02] transition cursor-pointer group"
                  >
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full gradient-primary/20 border border-primary/20 flex items-center justify-center text-xs font-semibold text-primary transition-all group-hover:scale-[1.05]">
                          {sub.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{sub.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Mail className="h-3 w-3 text-muted-foreground/60" />
                          <span>{sub.email}</span>
                        </div>
                        <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                          <Phone className="h-3 w-3 text-muted-foreground/60" />
                          <span>{sub.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/25 capitalize">
                        {sub.mentorship}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-muted-foreground/50" />
                        <span>{new Date(sub.date).toLocaleString("pt-BR")}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => handleDelete(sub.id, e)}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                        title="Excluir resposta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission details Modal */}
      <Modal
        open={!!selectedSub}
        onClose={() => setSelectedSub(null)}
        title="Detalhes da Resposta"
        kicker="Ficha do Lead"
        size="sm"
      >
        {selectedSub && (
          <div className="space-y-6">
            {/* Card Avatar / Title */}
            <div className="flex flex-col items-center text-center pb-4 border-b border-white/5">
              <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-xl font-bold text-primary-foreground shadow-lg mb-3 ring-4 ring-primary/15 animate-fade-in">
                {selectedSub.name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-base font-semibold text-foreground">{selectedSub.name}</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize">
                {selectedSub.mentorship}
              </span>
            </div>

            {/* Fields List */}
            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/75">E-mail</span>
                <div className="text-xs font-medium text-foreground bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <span className="truncate select-all">{selectedSub.email}</span>
                  <button
                    onClick={() => handleCopy(selectedSub.email, "E-mail")}
                    className="text-[10px] font-bold text-primary hover:underline px-2.5 py-1.5 hover:bg-primary/10 rounded-lg shrink-0 flex items-center gap-1 transition"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/75">Celular / WhatsApp</span>
                <div className="text-xs font-medium text-foreground bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <span className="select-all">{selectedSub.phone}</span>
                  <button
                    onClick={() => handleCopy(selectedSub.phone, "Celular")}
                    className="text-[10px] font-bold text-primary hover:underline px-2.5 py-1.5 hover:bg-primary/10 rounded-lg shrink-0 flex items-center gap-1 transition"
                  >
                    <Copy className="h-3 w-3" /> Copiar
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/75">Enviado em</span>
                <div className="text-xs font-medium text-foreground bg-white/[0.02] border border-white/5 rounded-xl px-4 py-3 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/60" />
                  <span>{new Date(selectedSub.date).toLocaleString("pt-BR")}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
