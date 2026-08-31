import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Trello, Plus, Trash2, ChevronLeft, ChevronRight, CheckSquare, 
  Clock, Sparkles, Pencil, Flame, LayoutGrid, Notebook, StickyNote, Zap,
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Coins, Percent, Calculator,
  ArrowUp, ArrowDown, ChevronDown, Users, Link2
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/admin/Modal";
import { useMemberProgress } from "@/hooks/use-member-progress";
import { useCourses } from "@/hooks/use-courses";

export const Route = createFileRoute("/_app/organizer")({
  component: OrganizerPage,
  head: () => ({ meta: [{ title: "Organização Operacional — Nebula" }] }),
});


type Project = {
  id: string;
  name: string;
  color: string;
};

const DEFAULT_PROJECTS: Project[] = [
  { id: "default", name: "Operação Principal", color: "purple" }
];

type TaskPriority = "alta" | "media" | "baixa";

type Task = {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  column: string; // Dynamic column ID
  category: string;
  date: string;
  subtasks?: { id: string; text: string; completed: boolean }[];
  links?: { id: string; url: string; title: string }[];
  urgente?: boolean;
  importante?: boolean;
};

type TeamMember = {
  id: string;
  email: string;
  role: "owner" | "member";
  avatar?: string;
};

const DEFAULT_TEAM: TeamMember[] = [
  { id: "u-1", email: "você@nebula.com", role: "owner", avatar: "https://i.pravatar.cc/150?u=1" }
];

type Note = {
  id: string;
  content: string;
  color: "purple" | "blue" | "pink" | "amber";
  date: string;
};

type Column = {
  id: string;
  title: string;
  color: "red" | "amber" | "emerald" | "blue" | "purple" | "pink" | "cyan";
};

const DEFAULT_COLUMNS: Column[] = [
  { id: "todo", title: "A Fazer", color: "red" },
  { id: "in_progress", title: "Em Andamento", color: "amber" },
  { id: "done", title: "Concluído", color: "emerald" }
];

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
};

const DEFAULT_TRANSACTIONS: Transaction[] = [
  { id: "t-1", description: "Vendas Checkout Kiwify - Nebula Hub", amount: 4850.00, type: "income", category: "Infoproduto", date: "2026-05-27" },
  { id: "t-2", description: "Facebook Ads Campaign - Dropshipping", amount: 1200.00, type: "expense", category: "Tráfego Pago", date: "2026-05-26" },
  { id: "t-3", description: "Mensalidade Shopify + Domínio", amount: 189.90, type: "expense", category: "Ferramentas", date: "2026-05-25" },
  { id: "t-4", description: "Faturamento Vendas Mentoria Black", amount: 3500.00, type: "income", category: "Mentoria", date: "2026-05-28" },
  { id: "t-5", description: "Hospedagem VPS Hostinger", amount: 99.00, type: "expense", category: "Ferramentas", date: "2026-05-24" }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Ajustar criativos de vídeo para tráfego pago",
    description: "Editar os ganchos dos criativos focados no público de Dropshipping para aumentar CTR.",
    priority: "alta",
    column: "todo",
    category: "Tráfego",
    date: "2026-05-29",
    urgente: true,
    importante: true,
    subtasks: [
      { id: "sub-1-1", text: "Gravar 3 variações de gancho (Hook)", completed: true },
      { id: "sub-1-2", text: "Adicionar legendas dinâmicas", completed: false },
      { id: "sub-1-3", text: "Exportar na resolução 4:5 e 9:16", completed: false }
    ]
  },
  {
    id: "task-2",
    title: "Escrever nova copy para VSL de vendas",
    description: "Aplicar a estrutura de quebra de objeções da mentoria na introdução da VSL.",
    priority: "alta",
    column: "todo",
    category: "Copy",
    date: "2026-05-30",
    urgente: false,
    importante: true,
    subtasks: [
      { id: "sub-2-1", text: "Redigir introdução de 3 minutos", completed: false },
      { id: "sub-2-2", text: "Estruturar oferta e bônus", completed: false }
    ]
  },
  {
    id: "task-3",
    title: "Configurar Pixel e Webhook no Checkout",
    description: "Garantir o tracking correto das conversões do checkout na Kiwify/Appmax.",
    priority: "media",
    column: "in_progress",
    category: "Tecnologia",
    date: "2026-05-28",
    urgente: true,
    importante: false,
    subtasks: [
      { id: "sub-3-1", text: "Criar Pixel no Facebook Ads", completed: true },
      { id: "sub-3-2", text: "Integrar webhook com painel Nebula", completed: true },
      { id: "sub-3-3", text: "Testar compra de R$ 1,00 para homologar", completed: false }
    ]
  },
  {
    id: "task-4",
    title: "Modelagem e precificação da Mentoria Black",
    description: "Definir ofertas e entregáveis para o lançamento da mentoria de alto ticket.",
    priority: "alta",
    column: "in_progress",
    category: "Estratégia",
    date: "2026-05-28",
    urgente: true,
    importante: true,
    subtasks: [
      { id: "sub-4-1", text: "Estruturar tabela de entregáveis", completed: true },
      { id: "sub-4-2", text: "Definir bônus exclusivos", completed: false },
      { id: "sub-4-3", text: "Validar precificação com sócios", completed: false }
    ]
  },
  {
    id: "task-5",
    title: "Criar conta na Nebula Hub",
    description: "Primeiro acesso efetuado na área de membros.",
    priority: "baixa",
    column: "done",
    category: "Sucesso",
    date: "2026-05-27",
    urgente: false,
    importante: false,
    subtasks: [
      { id: "sub-5-1", text: "Preencher formulário de onboarding", completed: true },
      { id: "sub-5-2", text: "Acessar plataforma e configurar perfil", completed: true }
    ]
  }
];

function OrganizerPage() {
  const { data: memberProgress } = useMemberProgress();
  const { data: courses = [] } = useCourses();
  const streak = memberProgress?.streak;
  const realStreak = streak?.currentStreak ?? 0;

  // Safeguard: force body scroll on mount in case leftover modal states locked it
  useEffect(() => {
    if (typeof window !== "undefined") {
      document.body.style.overflow = "auto";
      document.body.style.overflowY = "auto";
    }
    return () => {
      if (typeof window !== "undefined") {
        document.body.style.overflow = "";
        document.body.style.overflowY = "";
      }
    };
  }, []);

  // --- STATE WITH INSTANT LOCAL STORAGE MOUNT INITIALIZATION ---
  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nebula_kanban_projects");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (_) {}
      }
    }
    return DEFAULT_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("nebula_kanban_active_project");
      if (saved) return saved;
    }
    return "default";
  });

  // Effect to load data when project changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("nebula_kanban_active_project", activeProjectId);
    
    const loadState = <T,>(key: string, oldKey: string, defaultVal: T): T => {
      const saved = localStorage.getItem(`${key}_${activeProjectId}`);
      if (saved) { try { return JSON.parse(saved); } catch {} }
      else if (activeProjectId === "default") {
        const oldSaved = localStorage.getItem(oldKey);
        if (oldSaved) { try { return JSON.parse(oldSaved); } catch {} }
      }
      return defaultVal;
    };

    setTasks(loadState<Task[]>("nebula_kanban_tasks", "nebula_kanban_tasks", activeProjectId === "default" ? DEFAULT_TASKS : []));
    setColumns(loadState<Column[]>("nebula_kanban_columns", "nebula_kanban_columns", DEFAULT_COLUMNS));
    setCategories(loadState<string[]>("nebula_kanban_categories", "nebula_kanban_categories", ["Geral", "Tráfego", "Copy", "Tecnologia", "Estratégia", "Sucesso"]));
    setTransactions(loadState<Transaction[]>("nebula_finances", "nebula_finances", []));
    setNotes(loadState<Note[]>("nebula_organizer_sticky_notes", "nebula_organizer_sticky_notes", []));
    setTeamMembers(loadState<TeamMember[]>("nebula_team_members", "nebula_team_members", DEFAULT_TEAM));
  }, [activeProjectId]);

  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_kanban_tasks_${pId}`);
      if (saved) { try { return JSON.parse(saved); } catch (_) {} }
      if (pId === "default") {
        const old = localStorage.getItem("nebula_kanban_tasks");
        if (old) { try { return JSON.parse(old); } catch (_) {} }
      }
    }
    return DEFAULT_TASKS;
  });

  const [columns, setColumns] = useState<Column[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_kanban_columns_${pId}`);
      if (saved) { try { return JSON.parse(saved); } catch (_) {} }
      if (pId === "default") {
        const old = localStorage.getItem("nebula_kanban_columns");
        if (old) { try { return JSON.parse(old); } catch (_) {} }
      }
    }
    return DEFAULT_COLUMNS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_kanban_categories_${pId}`);
      if (saved) { try { return JSON.parse(saved); } catch (_) {} }
      if (pId === "default") {
        const old = localStorage.getItem("nebula_kanban_categories");
        if (old) { try { return JSON.parse(old); } catch (_) {} }
      }
    }
    return ["Geral", "Tráfego", "Copy", "Tecnologia", "Estratégia", "Sucesso"];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_organizer_sticky_notes_${pId}`);
      if (!saved && pId === "default") {
          const old = localStorage.getItem("nebula_organizer_sticky_notes");
          if (old) return JSON.parse(old);
      }
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
    }
    return [
      { id: "note-1", content: "Lembrar de planejar a mentoria de dropshipping com foco em CTR e ROAS", color: "purple", date: "2026-05-28" },
      { id: "note-2", content: "Gravar vídeos de criativos na próxima sexta-feira à tarde", color: "blue", date: "2026-05-28" }
    ];
  });
  const [showAllNotes, setShowAllNotes] = useState(false);
  const displayedNotes = showAllNotes ? notes : notes.slice(0, 8);

  // Project creation modal states
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState<string>("purple");

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newP: Project = { id: crypto.randomUUID(), name: newProjectName.trim(), color: newProjectColor };
    const updated = [...projects, newP];
    setProjects(updated);
    localStorage.setItem("nebula_kanban_projects", JSON.stringify(updated));
    setActiveProjectId(newP.id);
    setIsProjectModalOpen(false);
    setNewProjectName("");
  };

  const handleDeleteProject = (id: string) => {
    if (projects.length <= 1) return;
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    localStorage.setItem("nebula_kanban_projects", JSON.stringify(updated));
    if (activeProjectId === id) setActiveProjectId(updated[0].id);
  };

  // Column creation modal state
  const [isColModalOpen, setIsColModalOpen] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [newColColor, setNewColColor] = useState<Column["color"]>("purple");

  // Column editing inline states
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState("");
  const [editColColor, setEditColColor] = useState<Column["color"]>("purple");

  // Task creation modal states
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("media");
  const [taskCol, setTaskCol] = useState<string>(() => columns[0]?.id || "todo");
  const [taskCategory, setTaskCategory] = useState("Geral");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskSubtasks, setTaskSubtasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [taskLinks, setTaskLinks] = useState<{ id: string; url: string; title: string }[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [taskUrgente, setTaskUrgente] = useState(false);
  const [taskImportante, setTaskImportante] = useState(true);

  // Task editing modal states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("media");
  const [editCol, setEditCol] = useState<string>("todo");
  const [editCategory, setEditCategory] = useState("Geral");
  const [editDueDate, setEditDueDate] = useState("");
  const [editSubtasks, setEditSubtasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [editNewSubtaskText, setEditNewSubtaskText] = useState("");
  const [editLinks, setEditLinks] = useState<{ id: string; url: string; title: string }[]>([]);
  const [editNewLinkUrl, setEditNewLinkUrl] = useState("");
  const [editNewLinkTitle, setEditNewLinkTitle] = useState("");
  const [editUrgente, setEditUrgente] = useState(false);
  const [editImportante, setEditImportante] = useState(true);

  // View modes: standard Kanban vs Eisenhower Matrix vs Financial Control
  const [viewMode, setViewMode] = useState<"kanban" | "eisenhower" | "finance">("kanban");

  // --- TEAM STATE ---
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_team_members_${pId}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
    }
    return DEFAULT_TEAM;
  });
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const syncTeamMembers = (newTeam: TeamMember[]) => {
    setTeamMembers(newTeam);
    localStorage.setItem(`nebula_team_members_${activeProjectId}`, JSON.stringify(newTeam));
  };

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    const newMember: TeamMember = {
      id: crypto.randomUUID(),
      email: newMemberEmail.trim(),
      role: "member",
      avatar: `https://i.pravatar.cc/150?u=${Math.random()}`
    };
    syncTeamMembers([...teamMembers, newMember]);
    setNewMemberEmail("");
    toast.success("Convite enviado com sucesso!");
  };

  const handleRemoveTeamMember = (id: string) => {
    syncTeamMembers(teamMembers.filter(m => m.id !== id));
    toast.success("Membro removido da equipe.");
  };

  // --- FINANCIAL CONTROL STATES ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window !== "undefined") {
      const pId = localStorage.getItem("nebula_kanban_active_project") || "default";
      const saved = localStorage.getItem(`nebula_finances_${pId}`);
      if (!saved && pId === "default") {
          const old = localStorage.getItem("nebula_finances");
          if (old) return JSON.parse(old);
      }
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {}
      }
    }
    return [];
  });

  const [finDesc, setFinDesc] = useState("");
  const [finAmount, setFinAmount] = useState("");
  const [finType, setFinType] = useState<"income" | "expense">("income");
  const [finCategory, setFinCategory] = useState("Tráfego Pago");
  const [finDate, setFinDate] = useState("");

  // Campaign ROI calculator states
  const [roiAdSpend, setRoiAdSpend] = useState("");
  const [roiRevenue, setRoiRevenue] = useState("");
  const [roiSales, setRoiSales] = useState("");
  const [roiTab, setRoiTab] = useState<"real" | "simulator">("real");

  // Advanced dynamic traffic ROI states (Feature 7)
  const [roiBudget, setRoiBudget] = useState("1000");
  const [roiCpc, setRoiCpc] = useState("1.50");
  const [roiConv, setRoiConv] = useState("2.0");
  const [roiTicket, setRoiTicket] = useState("197");

  // Table search & filter states
  const [finSearchQuery, setFinSearchQuery] = useState("");
  const [finTypeFilter, setFinTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [finCategoryFilter, setFinCategoryFilter] = useState<string>("all");

  // Sync finances helper
  const syncTransactions = (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem(`nebula_finances_${activeProjectId}`, JSON.stringify(newTransactions));
    window.dispatchEvent(new Event("storage"));
  };

  const [newNoteText, setNewNoteText] = useState("");
  const [newNoteColor, setNewNoteColor] = useState<"purple" | "blue" | "pink" | "amber">("purple");

  // Drag states for glowing neon drop indicators
  const [isDragging, setIsDragging] = useState(false);
  const [activeDragCol, setActiveDragCol] = useState<string | null>(null);
  const [activeDragEisenhower, setActiveDragEisenhower] = useState<string | null>(null);

  // Write base triggers in case localStorage gets wiped
  useEffect(() => {
    if (!localStorage.getItem("nebula_kanban_tasks")) {
      localStorage.setItem("nebula_kanban_tasks", JSON.stringify(DEFAULT_TASKS));
    }
    if (!localStorage.getItem("nebula_kanban_columns")) {
      localStorage.setItem("nebula_kanban_columns", JSON.stringify(DEFAULT_COLUMNS));
    }
    if (!localStorage.getItem("nebula_kanban_categories")) {
      localStorage.setItem("nebula_kanban_categories", JSON.stringify(categories));
    }

  }, []);

  // Autofill edit form when task is clicked
  useEffect(() => {
    if (editingTask) {
      setEditTitle(editingTask.title);
      setEditDesc(editingTask.description);
      setEditPriority(editingTask.priority);
      setEditCol(editingTask.column);
      setEditCategory(editingTask.category);
      setEditDueDate(editingTask.date || "");
      setEditSubtasks(editingTask.subtasks || []);
      setEditNewSubtaskText("");
      setEditUrgente(editingTask.urgente || false);
      setEditImportante(editingTask.importante !== undefined ? editingTask.importante : true);
    }
  }, [editingTask]);

  // Sync tasks helper
  const syncTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem(`nebula_kanban_tasks_${activeProjectId}`, JSON.stringify(newTasks));
  };

  // Keyboard shortcut: N to open new task modal (when not typing in an input)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setIsTaskModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Dynamic category registration helper
  const registerCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (trimmed && !categories.includes(trimmed)) {
      const updated = [...categories, trimmed];
      setCategories(updated);
      localStorage.setItem("nebula_kanban_categories", JSON.stringify(updated));
    }
  };

  // Column creator handler
  const handleAddColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColTitle.trim()) {
      toast.error("O título da coluna é obrigatório!");
      return;
    }
    const newColId = "col-" + Date.now();
    const newCol: Column = {
      id: newColId,
      title: newColTitle.trim(),
      color: newColColor
    };
    const updated = [...columns, newCol];
    setColumns(updated);
    localStorage.setItem(`nebula_kanban_columns_${activeProjectId}`, JSON.stringify(updated));
    setNewColTitle("");
    setNewColColor("purple");
    toast.success("Coluna adicionada com sucesso!");
  };

  // Column deleter handler
  const handleDeleteColumn = (colId: string) => {
    const updatedCols = columns.filter((c) => c.id !== colId);
    if (updatedCols.length === 0) {
      toast.error("Não é possível excluir a última coluna do quadro!");
      return;
    }
    setColumns(updatedCols);
    localStorage.setItem(`nebula_kanban_columns_${activeProjectId}`, JSON.stringify(updatedCols));

    // Reassign tasks to the first remaining column
    const fallbackColId = updatedCols[0].id;
    const fallbackColTitle = updatedCols[0].title;
    const updatedTasks = tasks.map((t) => {
      if (t.column === colId) {
        return { ...t, column: fallbackColId };
      }
      return t;
    });
    syncTasks(updatedTasks);
    toast.success(`Coluna removida! Tarefas reatribuídas para "${fallbackColTitle}".`);
  };

  const handleSaveColumn = (colId: string) => {
    if (!editColTitle.trim()) {
      toast.error("O título da coluna é obrigatório!");
      return;
    }
    const updatedCols = columns.map((c) => {
      if (c.id === colId) {
        return { ...c, title: editColTitle.trim(), color: editColColor };
      }
      return c;
    });
    setColumns(updatedCols);
    localStorage.setItem(`nebula_kanban_columns_${activeProjectId}`, JSON.stringify(updatedCols));
    setEditingColId(null);
    toast.success("Coluna editada com sucesso!");
  };

  // Reorder columns helper
  const handleMoveColumn = (colId: string, direction: "up" | "down") => {
    const index = columns.findIndex((c) => c.id === colId);
    if (index === -1) return;
    
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= columns.length) return;
    
    const updated = [...columns];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    
    setColumns(updated);
    localStorage.setItem(`nebula_kanban_columns_${activeProjectId}`, JSON.stringify(updated));
  };

  // Add subtask helpers
  const addSubtaskToAddModal = () => {
    if (!newSubtaskText.trim()) return;
    setTaskSubtasks([...taskSubtasks, { id: "sub-" + Date.now(), text: newSubtaskText.trim(), completed: false }]);
    setNewSubtaskText("");
  };

  const removeSubtaskFromAddModal = (id: string) => {
    setTaskSubtasks(taskSubtasks.filter((st) => st.id !== id));
  };

  const addSubtaskToEditModal = () => {
    if (!editNewSubtaskText.trim()) return;
    setEditSubtasks([...editSubtasks, { id: "sub-" + Date.now(), text: editNewSubtaskText.trim(), completed: false }]);
    setEditNewSubtaskText("");
  };

  const removeSubtaskFromEditModal = (id: string) => {
    setEditSubtasks(editSubtasks.filter((st) => st.id !== id));
  };

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks?.map((st) => st.id === subtaskId ? { ...st, completed: !st.completed } : st) || []
        };
      }
      return t;
    });
    syncTasks(updated);
  };

  // Add Task handler
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("O título da tarefa é obrigatório!");
      return;
    }

    const cat = taskCategory.trim() || "Geral";
    registerCategory(cat);

    const newTask: Task = {
      id: "task-" + Date.now(),
      title: taskTitle.trim(),
      description: taskDesc.trim(),
      priority: taskPriority,
      column: taskCol,
      category: cat,
      date: taskDueDate || new Date().toISOString().split("T")[0],
      subtasks: taskSubtasks,
      links: taskLinks,
      urgente: taskCol === (columns[0]?.id || "todo") ? true : taskUrgente,
      importante: taskImportante
    };

    const updated = [...tasks, newTask];
    syncTasks(updated);
    setIsTaskModalOpen(false);
    
    // Reset Add Form
    setTaskTitle("");
    setTaskDesc("");
    setTaskPriority("media");
    setTaskCol(columns[0]?.id || "todo");
    setTaskCategory("Geral");
    setTaskDueDate("");
    setTaskSubtasks([]);
    setNewSubtaskText("");
    setTaskLinks([]);
    setNewLinkUrl("");
    setNewLinkTitle("");
    setTaskUrgente(false);
    setTaskImportante(true);
    toast.success("Tarefa adicionada com sucesso!");
  };

  // Edit Task handler
  const handleEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editTitle.trim()) {
      toast.error("O título é obrigatório!");
      return;
    }

    const cat = editCategory.trim() || "Geral";
    registerCategory(cat);

    const updated = tasks.map((t) => {
      if (t.id === editingTask.id) {
        return {
          ...t,
          title: editTitle.trim(),
          description: editDesc.trim(),
          priority: editPriority,
          column: editCol,
          category: cat,
          date: editDueDate,
          subtasks: editSubtasks,
          urgente: editUrgente,
          importante: editImportante
        };
      }
      return t;
    });

    syncTasks(updated);
    setEditingTask(null);
    toast.success("Tarefa editada com sucesso!");
  };

  // Move task column quick actions
  const moveTask = (id: string, dir: "left" | "right") => {
    const task = tasks.find((t) => t.id === id);
    const currIndex = task ? columns.findIndex((c) => c.id === task.column) : -1;
    const nextIndex = currIndex + (dir === "right" ? 1 : -1);
    const nextCol = nextIndex >= 0 && nextIndex < columns.length ? columns[nextIndex] : null;
    const isMovingToDone = nextCol && (nextCol.id === doneColId);
    if (isMovingToDone) {
      setCompletingIds((prev) => new Set([...prev, id]));
      setTimeout(() => {
        setCompletingIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        const updated = tasks.map((t) => t.id === id ? { ...t, column: nextCol.id } : t);
        syncTasks(updated);
      }, 400);
      return;
    }
    const updated = tasks.map((t) => {
      if (t.id === id) {
        if (nextIndex >= 0 && nextIndex < columns.length) {
          return { ...t, column: columns[nextIndex].id };
        }
      }
      return t;
    });
    syncTasks(updated);
  };

  // Delete Task
  const deleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    syncTasks(updated);
    toast.success("Tarefa excluída.");
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setActiveDragCol(null);
    setActiveDragEisenhower(null);
  };

  const handleDragOver = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    if (activeDragCol !== column) {
      setActiveDragCol(column);
    }
  };

  const handleDragLeave = () => {
    setActiveDragCol(null);
    setActiveDragEisenhower(null);
  };

  const handleDrop = (e: React.DragEvent, column: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, column };
      }
      return t;
    });
    syncTasks(updated);
    setIsDragging(false);
    setActiveDragCol(null);
  };

  const handleDropEisenhower = (e: React.DragEvent, urgente: boolean, importante: boolean) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const updated = tasks.map((t) => {
      if (t.id === id) {
        return { ...t, urgente, importante };
      }
      return t;
    });
    syncTasks(updated);
    setIsDragging(false);
    setActiveDragEisenhower(null);
  };

  // Sticky Note handlers
  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote: Note = {
      id: "note-" + Date.now(),
      content: newNoteText.trim(),
      color: newNoteColor,
      date: new Date().toISOString().split("T")[0]
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem(`nebula_organizer_sticky_notes_${activeProjectId}`, JSON.stringify(updated));
    setNewNoteText("");
    toast.success("Nota adicionada ao mural!");
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    localStorage.setItem(`nebula_organizer_sticky_notes_${activeProjectId}`, JSON.stringify(updated));
    toast.success("Nota removida.");
  };

  const handleUpdateNoteContent = (id: string, newContent: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, content: newContent } : n));
    setNotes(updated);
    localStorage.setItem(`nebula_organizer_sticky_notes_${activeProjectId}`, JSON.stringify(updated));
  };

  // --- FINANCIAL CONTROL HANDLERS ---
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finDesc.trim()) {
      toast.error("A descrição é obrigatória!");
      return;
    }
    const amountVal = parseFloat(finAmount.replace(/[^\d.,]/g, "").replace(",", "."));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Digite um valor válido maior que zero!");
      return;
    }

    const newTx: Transaction = {
      id: "t-" + Date.now(),
      description: finDesc.trim(),
      amount: amountVal,
      type: finType,
      category: finCategory,
      date: finDate || new Date().toISOString().split("T")[0]
    };

    const updated = [newTx, ...transactions];
    syncTransactions(updated);

    // Reset Form
    setFinDesc("");
    setFinAmount("");
    setFinDate("");
    toast.success("Transação adicionada com sucesso!");
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    syncTransactions(updated);
    toast.success("Transação removida!");
  };

  // Dynamic column resolution for statistics & Eisenhower filtering
  const doneColId = columns.find(c => c.id === "done" || c.title?.toLowerCase().includes("conclu"))?.id || columns[columns.length - 1]?.id || "done";

  // Stats calculations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.column === doneColId).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const highPriorityPending = tasks.filter((t) => t.priority === "alta" && t.column !== doneColId).length;

  // Financial calculations
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpense;
  const averageROI = totalExpense > 0 ? Math.round(((totalIncome - totalExpense) / totalExpense) * 100) : 0;

  // Real Campaign ROI calculations (based on REAL data)
  const realAdSpend = transactions
    .filter((t) => t.type === "expense" && t.category === "Tráfego Pago")
    .reduce((sum, t) => sum + t.amount, 0);

  const realRevenue = transactions
    .filter((t) => t.type === "income" && ["Infoproduto", "Mentoria", "Dropshipping"].includes(t.category))
    .reduce((sum, t) => sum + t.amount, 0);

  const realROI = realAdSpend > 0 ? Math.round(((realRevenue - realAdSpend) / realAdSpend) * 100) : 0;
  const realROIMultiplier = realAdSpend > 0 ? (realRevenue / realAdSpend).toFixed(2) : "0.00";

  // Filtered transactions list
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.description.toLowerCase().includes(finSearchQuery.toLowerCase());
    const matchesType = finTypeFilter === "all" ? true : tx.type === finTypeFilter;
    const matchesCategory = finCategoryFilter === "all" ? true : tx.category === finCategoryFilter;
    return matchesSearch && matchesType && matchesCategory;
  });

  const exportTransactionsToCSV = () => {
    if (transactions.length === 0) {
      toast.error("Nenhuma transação disponível para exportar!");
      return;
    }
    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor (R$)"];
    const rows = transactions.map((tx) => [
      tx.date.split("-").reverse().join("/"),
      tx.description,
      tx.category,
      tx.type === "income" ? "Receita" : "Despesa",
      tx.amount.toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nebula_financeiro_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Histórico financeiro exportado com sucesso!");
  };

  const handleResetTransactions = () => {
    syncTransactions([]);
    toast.success("Todos os lançamentos financeiros foram removidos!");
  };

  // Real course/student progress statistics from database
  const studyTotalLessons = courses.reduce((s, c) => s + c.totalLessons, 0);
  const studyCompletedLessons = courses.reduce((s, c) => s + c.completedLessons, 0);
  const studyCompletionRate = studyTotalLessons ? Math.round((studyCompletedLessons / studyTotalLessons) * 100) : 0;

  return (
    <div className="space-y-6 stagger-enter pb-16">
      {/* Hero Welcome Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 relative z-50">
        <div>
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-primary mb-2">
            <Sparkles className="h-3 w-3" /> Workspace Pessoal
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
              Quadro de Operações
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-md leading-relaxed">
            Organize suas estratégias, campanhas e tarefas diárias em uma interface limpa e focada.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 bg-white/[0.02] border border-white/5 rounded-xl p-1 shadow-sm">
             <div className="relative z-[100]">
               <button
                 onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                 className="flex items-center justify-between bg-transparent hover:bg-white/5 rounded-lg text-[11px] font-bold text-foreground border-none outline-none py-1.5 px-3 cursor-pointer w-[160px] transition"
               >
                 <span className="truncate">{projects.find(p => p.id === activeProjectId)?.name || "Selecione o Projeto"}</span>
                 <ChevronDown className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />
               </button>
               
               {isProjectDropdownOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsProjectDropdownOpen(false)} />
                   <div className="absolute top-full left-0 mt-1 w-full bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                     <div className="max-h-[200px] overflow-y-auto py-1">
                       {projects.map(p => (
                         <button
                           key={p.id}
                           type="button"
                           onMouseDown={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             setActiveProjectId(p.id);
                             setIsProjectDropdownOpen(false);
                           }}
                           className={`w-full text-left px-3 py-2 text-[11px] font-medium transition hover:bg-white/5 ${activeProjectId === p.id ? 'text-primary bg-primary/5' : 'text-foreground/80'}`}
                         >
                           {p.name}
                         </button>
                       ))}
                     </div>
                   </div>
                 </>
               )}
             </div>
             <button
               onClick={() => setIsProjectModalOpen(true)}
               className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition"
               title="Novo Projeto"
             >
               <Plus className="h-3.5 w-3.5" />
             </button>
             {projects.length > 1 && (
               <button
                 onClick={() => handleDeleteProject(activeProjectId)}
                 className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition"
                 title="Excluir Projeto"
               >
                 <Trash2 className="h-3.5 w-3.5" />
               </button>
             )}
          </div>
                    <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTeamModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                <div className="flex -space-x-2 mr-1">
                  {teamMembers.slice(0, 3).map((m, i) => (
                    <img key={m.id} src={m.avatar} alt="avatar" className="w-5 h-5 rounded-full border border-black z-10" style={{ zIndex: 3 - i }} />
                  ))}
                </div>
                <Users className="h-3.5 w-3.5" /> Equipe
              </button>
              <button
                onClick={() => setIsColModalOpen(true)}
              className="px-3.5 py-2 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.04] text-muted-foreground hover:text-foreground text-[11px] font-semibold flex items-center gap-2 transition cursor-pointer"
            >
              <Trello className="h-3.5 w-3.5" /> Colunas
            </button>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="px-4 py-2 rounded-xl gradient-primary text-white text-[11px] font-bold shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Nova Tarefa
            </button>
          </div>
        </div>
      </header>

      {/* Dynamic Statistics Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: General Progress */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.04] rounded-full blur-[20px] pointer-events-none" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Progresso Geral</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-foreground tracking-tight">{studyCompletionRate}%</span>
              <span className="text-[10px] text-muted-foreground/60">{studyCompletedLessons} de {studyTotalLessons} aulas concluídas</span>
            </div>
            <div className="h-1.5 w-full bg-white/[0.04] rounded-full overflow-hidden relative">
              <div 
                className="h-full gradient-primary rounded-full transition-all duration-500" 
                style={{ width: `${studyCompletionRate}%` }}
              />
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 2: High Priority Tasks */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.02] rounded-full blur-[20px] pointer-events-none" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Foco Crítico</span>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-black tracking-tight ${highPriorityPending > 0 ? "text-red-400" : "text-emerald-400"}`}>
                {highPriorityPending} {highPriorityPending === 1 ? "Pendente" : "Pendentes"}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 block leading-tight">
              {highPriorityPending > 0 ? "Tarefas de prioridade alta pendentes" : "Nenhum gargalo de alta prioridade ativo!"}
            </span>
          </div>
          <div className={`h-10 w-10 rounded-xl shrink-0 flex items-center justify-center border transition-all duration-300 ${
            highPriorityPending > 0 
              ? "bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.1)]" 
              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
          }`}>
            <span className={`h-2.5 w-2.5 rounded-full ${highPriorityPending > 0 ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          </div>
        </div>

        {/* Stat 3: Ofensiva Streak */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/[0.02] rounded-full blur-[20px] pointer-events-none" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Ofensiva Operacional</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-orange-400 tracking-tight flex items-center gap-1.5">
                <Flame className="h-5 w-5 text-orange-500 animate-pulse fill-orange-500/20" /> {realStreak} {realStreak === 1 ? "Dia" : "Dias"}
              </span>
              <span className="text-[10px] text-muted-foreground/60">Fogo ativo</span>
            </div>
            <span className="text-[10px] text-muted-foreground/60 block leading-tight">
              {realStreak > 0 ? "Sua ofensiva estelar está carregada!" : "Assista a uma aula hoje para iniciar seu streak!"}
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 flex items-center justify-center text-orange-500">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Stat 4: Mini Weekly Chart */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.02] rounded-full blur-[20px] pointer-events-none" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Frequência Semanal</span>
            <div className="flex items-end justify-between gap-1.5 h-8 pt-1">
              {(streak?.weekDays ?? Array(7).fill({ active: false })).map((day: any, i: number) => {
                const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];
                const label = day.date ? dayLabels[new Date(day.date + "T12:00:00").getDay()] : "-";
                const heightVal = day.active ? 85 : 12;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-1.5 h-6 bg-white/[0.04] rounded-t relative overflow-hidden flex items-end">
                      <div 
                        className="w-full gradient-primary rounded-t transition-all duration-500" 
                        style={{ height: `${heightVal}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-extrabold text-muted-foreground/50">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary">
            <Notebook className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Kanban (Full Width) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            {viewMode === "kanban" && (
              <>
                <Trello className="h-4 w-4 text-primary animate-pulse" /> Kanban Operacional
              </>
            )}
            {viewMode === "eisenhower" && (
              <>
                <LayoutGrid className="h-4 w-4 text-primary animate-pulse" /> Matriz de Eisenhower
              </>
            )}
            {viewMode === "finance" && (
              <>
                <DollarSign className="h-4 w-4 text-emerald-400 animate-pulse" /> Controle Financeiro & ROI
              </>
            )}
          </h2>
          
          {/* View Mode Toggle Segmented Control */}
          <div className="flex items-center bg-white/[0.03] border border-white/[0.06] rounded-full p-1 shadow-inner">
            <button 
              onClick={() => setViewMode("kanban")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${viewMode === "kanban" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Trello className="h-3.5 w-3.5" /> Kanban
            </button>
            <button 
              onClick={() => setViewMode("eisenhower")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${viewMode === "eisenhower" ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Eisenhower
            </button>
            <button 
              onClick={() => setViewMode("finance")}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition select-none cursor-pointer ${viewMode === "finance" ? "bg-emerald-500/10 text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-emerald-400/80"}`}
            >
              <DollarSign className="h-3.5 w-3.5" /> Finanças
            </button>
          </div>
        </div>

        {viewMode === "finance" ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Faturamento */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/[0.03] rounded-full blur-[20px] pointer-events-none" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Faturamento (Receita)</span>
                  <span className="text-2xl font-black text-emerald-400 tracking-tight block">
                    R$ {totalIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 block">Soma de todas as entradas</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0 flex items-center justify-center text-emerald-400">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
              </div>

              {/* Card 2: Despesas */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/[0.03] rounded-full blur-[20px] pointer-events-none" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Custos Operacionais</span>
                  <span className="text-2xl font-black text-red-400 tracking-tight block">
                    R$ {totalExpense.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 block">Hospedagem, anúncios e ferramentas</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0 flex items-center justify-center text-red-400">
                  <ArrowDownRight className="h-5 w-5" />
                </div>
              </div>

              {/* Card 3: Lucro Líquido */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/[0.03] rounded-full blur-[20px] pointer-events-none" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Lucro Líquido Real</span>
                  <span className={`text-2xl font-black tracking-tight block ${netProfit >= 0 ? "text-cyan-400" : "text-rose-455 animate-pulse"}`}>
                    R$ {netProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 block">Sobra operacional limpa</span>
                </div>
                <div className={`h-10 w-10 rounded-xl shrink-0 flex items-center justify-center border ${netProfit >= 0 ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                  <Coins className="h-5 w-5" />
                </div>
              </div>

              {/* Card 4: ROI Médio */}
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.05] bg-white/[0.01] p-4 flex items-center justify-between gap-4">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/[0.03] rounded-full blur-[20px] pointer-events-none" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Média de Retorno (ROI)</span>
                  <span className="text-2xl font-black text-primary tracking-tight block">
                    {averageROI}%
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 block">Eficiência de conversão: {(totalExpense > 0 ? (totalIncome / totalExpense).toFixed(1) : 0)}x</span>
                </div>
                <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Input & List Form + Ad Campaign ROI Calculator */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Box 1: Registrar Transação */}
              <div className="glass rounded-2xl border border-white/[0.05] p-5 space-y-4">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Plus className="h-3.5 w-3.5 text-primary" /> Registrar Movimentação
                </h3>
                
                <form onSubmit={handleAddTransaction} className="space-y-3.5">
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Descrição</span>
                    <input
                      type="text"
                      placeholder="Ex: Venda VSL Shopify, Facebook Ads..."
                      value={finDesc}
                      onChange={(e) => setFinDesc(e.target.value)}
                      className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 transition bg-background"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Valor (R$)</span>
                      <input
                        type="text"
                        placeholder="0,00"
                        value={finAmount}
                        onChange={(e) => setFinAmount(e.target.value)}
                        className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 transition bg-background"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tipo</span>
                      <select
                        value={finType}
                        onChange={(e) => setFinType(e.target.value as any)}
                        className="w-full glass rounded-lg px-3 py-2.5 text-xs text-foreground outline-none bg-background cursor-pointer"
                      >
                        <option value="income">Receita (+)</option>
                        <option value="expense">Despesa (-)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Categoria</span>
                      <select
                        value={finCategory}
                        onChange={(e) => setFinCategory(e.target.value)}
                        className="w-full glass rounded-lg px-3 py-2.5 text-xs text-foreground outline-none bg-background cursor-pointer"
                      >
                        <option value="Tráfego Pago">Tráfego Pago</option>
                        <option value="Mentoria">Mentoria</option>
                        <option value="Infoproduto">Infoproduto</option>
                        <option value="Dropshipping">Dropshipping</option>
                        <option value="Ferramentas">Ferramentas</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Data</span>
                      <input
                        type="date"
                        value={finDate}
                        onChange={(e) => setFinDate(e.target.value)}
                        className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2.5 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer flex items-center gap-1.5 w-full justify-center"
                    >
                      <Plus className="h-3.5 w-3.5" /> Confirmar Lançamento
                    </button>
                  </div>
                </form>
              </div>

              {/* Box 2: Calculadora de ROI de Campanhas */}
              <div className="glass rounded-2xl border border-white/[0.05] p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                      <Calculator className="h-3.5 w-3.5 text-primary animate-pulse" /> ROI de Tráfego
                    </h3>
                    
                    {/* Tab Selector */}
                    <div className="flex bg-white/[0.03] border border-white/[0.06] rounded-lg p-0.5 scale-90 origin-right">
                      <button
                        type="button"
                        onClick={() => setRoiTab("real")}
                        className={`px-2.5 py-0.5 rounded-md text-[8px] font-bold transition select-none cursor-pointer ${roiTab === "real" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Dados Reais
                      </button>
                      <button
                        type="button"
                        onClick={() => setRoiTab("simulator")}
                        className={`px-2.5 py-0.5 rounded-md text-[8px] font-bold transition select-none cursor-pointer ${roiTab === "simulator" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        Simulador
                      </button>
                    </div>
                  </div>

                  {roiTab === "real" ? (
                    <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold">Investimento Real (Ads)</span>
                          <span className="font-extrabold text-red-400">
                            R$ {realAdSpend.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-[9px] text-muted-foreground/60 uppercase tracking-widest font-bold">Retorno em Vendas</span>
                          <span className="font-extrabold text-emerald-400">
                            R$ {realRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {realAdSpend > 0 ? (
                        <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl mt-2 space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ROI das Campanhas:</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-full ${realROI >= 0 ? "bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]" : "bg-red-500/10 text-red-400 animate-pulse"}`}>
                              {realROI}% ({realROIMultiplier}x)
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Saldo de Tráfego:</span>
                            <span className={`font-extrabold ${realRevenue - realAdSpend >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                              R$ {(realRevenue - realAdSpend).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white/[0.01] border border-dashed border-white/[0.05] p-3.5 rounded-xl text-center text-[10px] text-muted-foreground/45">
                          Nenhum investimento registrado em "Tráfego Pago" para calcular o ROI automático. Adicione despesas com essa categoria!
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in fade-in duration-200 text-xs">
                      {/* Budget input with slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Orçamento de Tráfego:</span>
                          <span className="font-extrabold text-foreground">R$ {parseFloat(roiBudget || "0").toLocaleString("pt-BR")}</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="20000"
                          step="100"
                          value={roiBudget}
                          onChange={(e) => setRoiBudget(e.target.value)}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* CPC input with slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">CPC Médio (Ads):</span>
                          <span className="font-extrabold text-foreground">R$ {parseFloat(roiCpc || "0").toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.10"
                          max="5.00"
                          step="0.05"
                          value={roiCpc}
                          onChange={(e) => setRoiCpc(e.target.value)}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Conv% input with slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Taxa de Conversão:</span>
                          <span className="font-extrabold text-foreground">{parseFloat(roiConv || "0").toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="10.0"
                          step="0.1"
                          value={roiConv}
                          onChange={(e) => setRoiConv(e.target.value)}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Product Ticket input with slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Ticket do Produto:</span>
                          <span className="font-extrabold text-foreground">R$ {parseFloat(roiTicket || "0").toLocaleString("pt-BR")}</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="1997"
                          step="10"
                          value={roiTicket}
                          onChange={(e) => setRoiTicket(e.target.value)}
                          className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Calculados Avançados do Simulador (Feature 7) */}
                {roiTab === "simulator" && (() => {
                  const spend = parseFloat(roiBudget) || 0;
                  const cpc = parseFloat(roiCpc) || 1.5;
                  const convRate = (parseFloat(roiConv) || 2.0) / 100;
                  const ticket = parseFloat(roiTicket) || 197;

                  const estimatedClicks = cpc > 0 ? Math.round(spend / cpc) : 0;
                  const estimatedSales = Math.round(estimatedClicks * convRate);
                  const expectedRevenue = estimatedSales * ticket;
                  const expectedProfit = expectedRevenue - spend;
                  const roiPercent = spend > 0 ? Math.round((expectedProfit / spend) * 100) : 0;
                  const roiMultiplier = spend > 0 ? (expectedRevenue / spend).toFixed(2) : "0.00";
                  const cpa = estimatedSales > 0 ? (spend / estimatedSales).toFixed(2) : "0.00";

                  // Semaphore configurations
                  let statusColor = "from-red-500/20 to-red-500/5 border-red-500/30 text-red-400";
                  let statusTitle = "Operação com Risco Alto ⚠️";
                  let statusDesc = "Campanha no vermelho. Otimize a copy da página e reduza o CPC para sair do prejuízo.";
                  let statusGlow = "shadow-[0_0_15px_rgba(239,68,68,0.1)]";

                  if (roiPercent >= 150) {
                    statusColor = "from-emerald-500/20 to-emerald-500/5 border-emerald-500/30 text-emerald-400";
                    statusTitle = "Campanha Super Lucrativa! 🚀";
                    statusDesc = "Excelente ROI! O funil está validado e pronto para escala vertical acelerada.";
                    statusGlow = "shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                  } else if (roiPercent >= 0) {
                    statusColor = "from-amber-500/20 to-amber-500/5 border-amber-500/30 text-amber-400";
                    statusTitle = "Lucro Moderado / Break-Even ⚖️";
                    statusDesc = "Operação sustentável, mas sob margens estreitas. Melhore a CTR para melhorar os custos.";
                    statusGlow = "shadow-[0_0_15px_rgba(245,158,11,0.1)]";
                  }

                  return (
                    <div className="space-y-3.5 mt-4 pt-3.5 border-t border-white/[0.04] animate-in fade-in duration-200">
                      {/* Breakdown grid */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                          <span className="text-muted-foreground/60 block">Cliques Previstos</span>
                          <span className="font-extrabold text-foreground text-xs">{estimatedClicks.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                          <span className="text-muted-foreground/60 block">Vendas Previstas</span>
                          <span className="font-extrabold text-foreground text-xs">{estimatedSales.toLocaleString()}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                          <span className="text-muted-foreground/60 block">CPA Estimado</span>
                          <span className="font-extrabold text-cyan-400 text-xs">R$ {parseFloat(cpa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="bg-white/[0.01] border border-white/[0.03] p-2.5 rounded-xl">
                          <span className="text-muted-foreground/60 block">Faturamento Previsto</span>
                          <span className="font-extrabold text-emerald-400 text-xs">R$ {expectedRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>

                      {/* ROI Summary bar */}
                      <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded-xl flex justify-between items-center text-xs">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ROI da Operação:</span>
                        <span className={`font-black px-2 py-0.5 rounded-full ${roiPercent >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {roiPercent}% ({roiMultiplier}x)
                        </span>
                      </div>

                      {/* Profit/Loss details */}
                      <div className="flex justify-between items-center text-xs px-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Lucro Líquido Estimado:</span>
                        <span className={`font-extrabold text-sm ${expectedProfit >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                          R$ {expectedProfit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Semáforo de Risco Operacional Widget */}
                      <div className={`rounded-xl border p-3 bg-gradient-to-br ${statusColor} ${statusGlow} flex flex-col gap-1`}>
                        <div className="font-black text-xs uppercase tracking-wider flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full bg-current animate-pulse" /> {statusTitle}
                        </div>
                        <p className="text-[9px] text-muted-foreground/80 leading-relaxed font-semibold">
                          {statusDesc}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Box 3: Balanço CSS Proporcional */}
              <div className="glass rounded-2xl border border-white/[0.05] p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> Balanço de Caixa
                  </h3>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">Visão visual proporcional das entradas (faturamento) em comparação com as despesas gerais.</p>
                </div>

                <div className="space-y-4 py-3 flex-1 flex flex-col justify-center">
                  {/* Entrada Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-emerald-400">Faturamento Operacional</span>
                      <span>{totalIncome > 0 ? "100%" : "0%"}</span>
                    </div>
                    <div className="h-3.5 w-full bg-white/[0.03] rounded-lg overflow-hidden border border-white/5 relative">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-lg shadow-[0_0_12px_rgba(16,185,129,0.3)] transition-all duration-500" style={{ width: totalIncome > 0 ? "100%" : "0%" }} />
                    </div>
                  </div>

                  {/* Saída Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-bold">
                      <span className="text-red-400">Despesas Totais</span>
                      <span>{totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}%</span>
                    </div>
                    <div className="h-3.5 w-full bg-white/[0.03] rounded-lg overflow-hidden border border-white/5 relative">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 to-rose-500 rounded-lg shadow-[0_0_12px_rgba(239,68,68,0.3)] transition-all duration-500" 
                        style={{ width: `${totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0}%` }} 
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl text-center text-[10px] text-muted-foreground/60">
                  {netProfit >= 0 ? (
                    <span className="text-cyan-400 font-extrabold">Operação Saudável! Lucro líquido positivo de R$ {netProfit.toLocaleString("pt-BR")}.</span>
                  ) : (
                    <span className="text-red-400 font-extrabold animate-pulse">Atenção! Custos maiores que faturamento bruto.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Histórico Completo de Transações */}
            <div className="glass rounded-2xl border border-white/[0.05] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Coins className="h-3.5 w-3.5 text-primary" /> Histórico de Lançamentos ({filteredTransactions.length} de {transactions.length})
                </h3>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportTransactionsToCSV}
                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-foreground text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Exportar dados para Excel/CSV"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" /> Exportar CSV
                  </button>
                  <button
                    onClick={handleResetTransactions}
                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] text-muted-foreground hover:text-foreground text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Remover todas as transações"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" /> Limpar Histórico
                  </button>
                </div>
              </div>

              {/* Search & Filters Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white/[0.01] border border-white/[0.03] p-3 rounded-xl">
                <div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Buscar Lançamento</span>
                  <input
                    type="text"
                    placeholder="Filtrar por descrição..."
                    value={finSearchQuery}
                    onChange={(e) => setFinSearchQuery(e.target.value)}
                    className="w-full glass rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 transition bg-background"
                  />
                </div>
                <div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Tipo de Lançamento</span>
                  <select
                    value={finTypeFilter}
                    onChange={(e) => setFinTypeFilter(e.target.value as any)}
                    className="w-full glass rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none bg-background cursor-pointer"
                  >
                    <option value="all">Todos os Lançamentos</option>
                    <option value="income">Apenas Receitas (+)</option>
                    <option value="expense">Apenas Despesas (-)</option>
                  </select>
                </div>
                <div>
                  <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Filtrar Categoria</span>
                  <select
                    value={finCategoryFilter}
                    onChange={(e) => setFinCategoryFilter(e.target.value)}
                    className="w-full glass rounded-lg px-2.5 py-1.5 text-xs text-foreground outline-none bg-background cursor-pointer"
                  >
                    <option value="all">Todas as Categorias</option>
                    <option value="Tráfego Pago">Tráfego Pago</option>
                    <option value="Mentoria">Mentoria</option>
                    <option value="Infoproduto">Infoproduto</option>
                    <option value="Dropshipping">Dropshipping</option>
                    <option value="Ferramentas">Ferramentas</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-[9px] text-muted-foreground uppercase tracking-widest font-black">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                    {filteredTransactions.map((tx) => {
                      const isIncome = tx.type === "income";
                      const catColors = {
                        "Tráfego Pago": "bg-red-500/10 border-red-500/20 text-red-400",
                        "Mentoria": "bg-primary/10 border-primary/20 text-primary",
                        "Infoproduto": "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
                        "Dropshipping": "bg-pink-500/10 border-pink-500/20 text-pink-400",
                        "Ferramentas": "bg-amber-500/10 border-amber-500/20 text-amber-400",
                        "Outros": "bg-white/[0.04] border-white/5 text-muted-foreground"
                      }[tx.category] || "bg-white/[0.02] border-white/5 text-muted-foreground";

                      return (
                        <tr key={tx.id} className="text-xs hover:bg-white/[0.01] transition duration-150">
                          <td className="py-3 px-3 text-muted-foreground font-medium">{tx.date.split("-").reverse().join("/")}</td>
                          <td className="py-3 px-3 font-semibold text-foreground truncate max-w-[200px]">{tx.description}</td>
                          <td className="py-3 px-3">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${catColors}`}>
                              {tx.category}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[9px] font-bold ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                              {isIncome ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td className={`py-3 px-3 font-black text-right ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
                            {isIncome ? "+ " : "- "}R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => handleDeleteTransaction(tx.id)}
                              className="p-1 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-rose-450 transition cursor-pointer"
                              title="Remover movimentação"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredTransactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground/40 font-medium">
                          Nenhum lançamento financeiro corresponde aos filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : viewMode === "eisenhower" ? (
          <div className="grid sm:grid-cols-2 gap-4 stagger-enter">
            
            {/* QUADRANT 1: URGENT & IMPORTANT (DO NOW) */}
            <div 
              onDragOver={(e) => { e.preventDefault(); if (activeDragEisenhower !== "q1") setActiveDragEisenhower("q1"); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEisenhower(e, true, true)}
              className={`rounded-2xl border transition-all duration-300 p-4 min-h-[240px] flex flex-col gap-3 relative overflow-hidden ${
                activeDragEisenhower === "q1" 
                  ? "border-red-500/40 bg-red-500/[0.04] shadow-[0_0_20px_rgba(239,68,68,0.15)] scale-[1.005]" 
                  : isDragging 
                    ? "border-dashed border-red-500/20 bg-red-500/[0.01] opacity-85" 
                    : "border-red-500/10 bg-red-500/[0.02]"
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/30" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse" />
                  Q1: Fazer Agora (Urgente & Importante)
                </span>
                <span className="text-[10px] bg-red-500/10 px-2 py-0.5 rounded-full text-red-400 font-extrabold">
                  {tasks.filter((t) => (t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).length}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 leading-tight">Gargalos críticos e decisões imediatas. Resolva já.</p>
 
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] pr-0.5 pt-1">
                {tasks.filter((t) => (t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).map((t) => (
                  <div key={t.id} className={`transition-all duration-400 ${completingIds.has(t.id) ? 'opacity-0 scale-95 translate-y-1' : 'opacity-100'}`}><KanbanCard task={t} columnColor="red" onMove={moveTask} onDelete={deleteTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onEdit={setEditingTask} onToggleSubtask={handleToggleSubtask} /></div>
                ))}
                {tasks.filter((t) => (t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).length === 0 && <EmptyColumnState />}
              </div>
            </div>
 
            {/* QUADRANT 2: IMPORTANT, NOT URGENT (PLAN/SCHEDULE) */}
            <div 
              onDragOver={(e) => { e.preventDefault(); if (activeDragEisenhower !== "q2") setActiveDragEisenhower("q2"); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEisenhower(e, false, true)}
              className={`rounded-2xl border transition-all duration-300 p-4 min-h-[240px] flex flex-col gap-3 relative overflow-hidden ${
                activeDragEisenhower === "q2" 
                  ? "border-amber-500/40 bg-amber-500/[0.04] shadow-[0_0_20px_rgba(245,158,11,0.15)] scale-[1.005]" 
                  : isDragging 
                    ? "border-dashed border-amber-500/20 bg-amber-500/[0.01] opacity-85" 
                    : "border-amber-500/10 bg-amber-500/[0.02]"
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/30" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  Q2: Agendar (Importante, Não Urgente)
                </span>
                <span className="text-[10px] bg-amber-500/10 px-2 py-0.5 rounded-full text-amber-400 font-extrabold">
                  {tasks.filter((t) => !(t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).length}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 leading-tight">Estratégias de médio prazo, copy, modelagem. Agende horário na agenda.</p>
 
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] pr-0.5 pt-1">
                {tasks.filter((t) => !(t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).map((t) => (
                  <div key={t.id} className={`transition-all duration-400 ${completingIds.has(t.id) ? 'opacity-0 scale-95 translate-y-1' : 'opacity-100'}`}><KanbanCard task={t} columnColor="amber" onMove={moveTask} onDelete={deleteTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onEdit={setEditingTask} onToggleSubtask={handleToggleSubtask} /></div>
                ))}
                {tasks.filter((t) => !(t.urgente) && (t.importante || t.importante === undefined) && t.column !== doneColId).length === 0 && <EmptyColumnState />}
              </div>
            </div>
 
            {/* QUADRANT 3: URGENT, NOT IMPORTANT (DELEGATE) */}
            <div 
              onDragOver={(e) => { e.preventDefault(); if (activeDragEisenhower !== "q3") setActiveDragEisenhower("q3"); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEisenhower(e, true, false)}
              className={`rounded-2xl border transition-all duration-300 p-4 min-h-[240px] flex flex-col gap-3 relative overflow-hidden ${
                activeDragEisenhower === "q3" 
                  ? "border-blue-500/40 bg-blue-500/[0.04] shadow-[0_0_20px_rgba(59,130,246,0.15)] scale-[1.005]" 
                  : isDragging 
                    ? "border-dashed border-blue-500/20 bg-blue-500/[0.01] opacity-85" 
                    : "border-blue-500/10 bg-blue-500/[0.02]"
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-blue-500/30" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  Q3: Delegar (Urgente, Não Importante)
                </span>
                <span className="text-[10px] bg-blue-500/10 px-2 py-0.5 rounded-full text-blue-400 font-extrabold">
                  {tasks.filter((t) => (t.urgente) && !(t.importante) && t.column !== doneColId).length}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 leading-tight">Interrupções ou tarefas mecânicas. Delegue ou automatize se possível.</p>
 
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] pr-0.5 pt-1">
                {tasks.filter((t) => (t.urgente) && !(t.importante) && t.column !== doneColId).map((t) => (
                  <div key={t.id} className={`transition-all duration-400 ${completingIds.has(t.id) ? 'opacity-0 scale-95 translate-y-1' : 'opacity-100'}`}><KanbanCard task={t} columnColor="blue" onMove={moveTask} onDelete={deleteTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onEdit={setEditingTask} onToggleSubtask={handleToggleSubtask} /></div>
                ))}
                {tasks.filter((t) => (t.urgente) && !(t.importante) && t.column !== doneColId).length === 0 && <EmptyColumnState />}
              </div>
            </div>
 
            {/* QUADRANT 4: NOT URGENT, NOT IMPORTANT (ELIMINATE) */}
            <div 
              onDragOver={(e) => { e.preventDefault(); if (activeDragEisenhower !== "q4") setActiveDragEisenhower("q4"); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDropEisenhower(e, false, false)}
              className={`rounded-2xl border transition-all duration-300 p-4 min-h-[240px] flex flex-col gap-3 relative overflow-hidden ${
                activeDragEisenhower === "q4" 
                  ? "border-emerald-500/40 bg-emerald-500/[0.04] shadow-[0_0_20px_rgba(16,185,129,0.15)] scale-[1.005]" 
                  : isDragging 
                    ? "border-dashed border-emerald-500/20 bg-emerald-500/[0.01] opacity-85" 
                    : "border-white/[0.03] bg-white/[0.01]"
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500/30" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Q4: Eliminar (Não Urgente & Não Importante)
                </span>
                <span className="text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded-full text-emerald-400 font-extrabold">
                  {tasks.filter((t) => !(t.urgente) && !(t.importante) && t.column !== doneColId).length}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground/60 leading-tight">Distrações ou tarefas obsoletas. Considere eliminar da operação.</p>
 
              <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px] pr-0.5 pt-1">
                {tasks.filter((t) => !(t.urgente) && !(t.importante) && t.column !== doneColId).map((t) => (
                  <div key={t.id} className={`transition-all duration-400 ${completingIds.has(t.id) ? 'opacity-0 scale-95 translate-y-1' : 'opacity-100'}`}><KanbanCard task={t} columnColor="emerald" onMove={moveTask} onDelete={deleteTask} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onEdit={setEditingTask} onToggleSubtask={handleToggleSubtask} /></div>
                ))}
                {tasks.filter((t) => !(t.urgente) && !(t.importante) && t.column !== doneColId).length === 0 && <EmptyColumnState />}
              </div>
            </div>
 
          </div>
        ) : (
          <div 
            className="flex flex-row md:grid md:grid-flow-col gap-4 overflow-x-auto pb-4 pr-1 select-none w-full stagger-enter no-scrollbar"
            style={{
              gridTemplateColumns: `repeat(${columns.length}, minmax(290px, 1fr))`
            }}
          >
            {columns.map((col) => {
              const colTasks = tasks.filter((t) => t.column === col.id);
 
              const colColors = {
                red: { border: "border-red-500/20 bg-red-500/[0.005]", activeBorder: "border-red-500/40 bg-red-500/[0.02] shadow-[0_0_20px_rgba(239,68,68,0.15)]", bar: "bg-red-500", dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" },
                amber: { border: "border-amber-500/20 bg-amber-500/[0.005]", activeBorder: "border-amber-500/40 bg-amber-500/[0.02] shadow-[0_0_20px_rgba(245,158,11,0.15)]", bar: "bg-amber-500", dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" },
                emerald: { border: "border-emerald-500/20 bg-emerald-500/[0.005]", activeBorder: "border-emerald-500/40 bg-emerald-500/[0.02] shadow-[0_0_20px_rgba(16,185,129,0.15)]", bar: "bg-emerald-500", dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" },
                blue: { border: "border-blue-500/20 bg-blue-500/[0.005]", activeBorder: "border-blue-500/40 bg-blue-500/[0.02] shadow-[0_0_20px_rgba(59,130,246,0.15)]", bar: "bg-blue-500", dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" },
                purple: { border: "border-primary/20 bg-primary/[0.005]", activeBorder: "border-primary/40 bg-primary/[0.02] shadow-[0_0_20px_rgba(139,92,246,0.15)]", bar: "bg-primary", dot: "bg-primary shadow-[0_0_8px_rgba(139,92,246,0.5)]" },
                pink: { border: "border-pink-500/20 bg-pink-500/[0.005]", activeBorder: "border-pink-500/40 bg-pink-500/[0.02] shadow-[0_0_20px_rgba(236,72,153,0.15)]", bar: "bg-pink-500", dot: "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.5)]" },
                cyan: { border: "border-cyan-500/20 bg-cyan-500/[0.005]", activeBorder: "border-cyan-500/40 bg-cyan-500/[0.02] shadow-[0_0_20px_rgba(6,182,212,0.15)]", bar: "bg-cyan-500", dot: "bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]" }
              }[col.color] || colColors.purple;
 
              return (
                <div 
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`w-[290px] sm:w-[320px] md:w-auto shrink-0 rounded-2xl p-2 min-h-[480px] flex flex-col gap-3 relative transition-all duration-300 ${
                    activeDragCol === col.id 
                      ? colColors.activeBorder + " scale-[1.01]" 
                      : isDragging 
                        ? colColors.border + " opacity-80" 
                        : "bg-white/[0.015] border border-white/[0.03] backdrop-blur-md shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between px-2 pt-1 pb-1">
                    <span className="text-xs font-bold text-foreground/90 flex items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${colColors.dot}`} style={{boxShadow: '0 0 8px currentColor'}} />
                      {col.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 font-semibold">
                      {colTasks.length} {colTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                  </div>
 
                  <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[580px] pr-0.5">
                    {colTasks.map((t) => (
                      <KanbanCard 
                        key={t.id} 
                        task={t} 
                        columnColor={col.color}
                        onMove={moveTask} 
                        onDelete={deleteTask} 
                        onDragStart={handleDragStart} 
                        onDragEnd={handleDragEnd} 
                        onEdit={setEditingTask} 
                        onToggleSubtask={handleToggleSubtask} 
                      />
                    ))}
                    {colTasks.length === 0 && <EmptyColumnState />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION: STICKY NOTES MURAL */}
      <section className="space-y-4 pt-6 border-t border-white/[0.04] stagger-enter">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-primary animate-pulse" /> Mural de Insights & Notas Rápidas
            </h2>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Capture rascunhos, copies rápidas e ideias para a operação sem formalidades. Dê dois cliques para editar.</p>
          </div>
          
          <form onSubmit={handleAddNote} className="flex items-center gap-2 shrink-0">
            <select
              value={newNoteColor}
              onChange={(e) => setNewNoteColor(e.target.value as any)}
              className="glass rounded-lg px-2.5 py-2 text-[10px] text-foreground outline-none bg-background cursor-pointer"
            >
              <option value="purple">Roxo Space</option>
              <option value="blue">Azul Ads</option>
              <option value="pink">Rosa Copy</option>
              <option value="amber">Laranja Insight</option>
            </select>
            <input
              type="text"
              placeholder="Insight rápido..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="glass rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 transition bg-background w-44 sm:w-60"
            />
            <button
              type="submit"
              className="px-3.5 py-2 rounded-lg gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
            >
              + Anotar
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {displayedNotes.map((note) => {
            const colorClasses = {
              purple: "from-primary/[0.08] to-primary/[0.01] border-primary/20 hover:border-primary/40 focus-within:border-primary/50 shadow-[0_4px_20px_rgba(147,51,234,0.02)]",
              blue: "from-blue-500/[0.08] to-blue-500/[0.01] border-blue-500/20 hover:border-blue-500/40 focus-within:border-blue-500/50 shadow-[0_4px_20px_rgba(59,130,246,0.02)]",
              pink: "from-pink-500/[0.08] to-pink-500/[0.01] border-pink-500/20 hover:border-pink-500/40 focus-within:border-pink-500/50 shadow-[0_4px_20px_rgba(236,72,153,0.02)]",
              amber: "from-amber-500/[0.08] to-amber-500/[0.01] border-amber-500/20 hover:border-amber-500/40 focus-within:border-amber-500/50 shadow-[0_4px_20px_rgba(245,158,11,0.02)]"
            }[note.color];

            const bulletColor = {
              purple: "bg-primary shadow-[0_0_6px_rgba(147,51,234,0.5)]",
              blue: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]",
              pink: "bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.5)]",
              amber: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]"
            }[note.color];

            return (
              <div 
                key={note.id} 
                className={`glass rounded-xl p-4 border bg-gradient-to-br transition-all duration-300 relative group flex flex-col justify-between min-h-[120px] ${colorClasses}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[7px] text-muted-foreground/50 font-bold tracking-widest flex items-center gap-1 uppercase">
                      <span className={`h-1.5 w-1.5 rounded-full ${bulletColor}`} />
                      Nota de Insight
                    </span>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 text-muted-foreground/30 hover:text-destructive opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer shrink-0"
                      title="Excluir nota"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  
                  <textarea
                    value={note.content}
                    onChange={(e) => handleUpdateNoteContent(note.id, e.target.value)}
                    className="w-full bg-transparent text-xs text-foreground/90 font-medium placeholder:text-muted-foreground/30 border-none outline-none resize-none leading-relaxed focus:ring-0 p-0"
                    rows={3}
                  />
                </div>

                <div className="text-[8px] text-muted-foreground/40 font-semibold text-right pt-2 border-t border-white/[0.02] mt-2">
                  Criada em {note.date.split("-").reverse().join("/")}
                </div>
              </div>
            );
          })}

          {notes.length === 0 && (
            <div className="col-span-full py-10 text-center rounded-xl border border-dashed border-white/[0.04] bg-white/[0.003] text-xs text-muted-foreground/40 space-y-2">
              <Notebook className="h-8 w-8 mx-auto text-muted-foreground/10 animate-pulse" />
              <p>Nenhum rascunho ou insight anotado no mural.</p>
              <p className="text-[10px] text-muted-foreground/20">Digite uma ideia no formulário acima para registrar!</p>
            </div>
          )}
        </div>

        {notes.length > 8 && (
          <div className="pt-2 flex justify-center animate-fade-up">
            <button
              onClick={() => setShowAllNotes(!showAllNotes)}
              className="px-5 py-2 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-primary/30 text-xs font-bold text-foreground transition-all duration-300 hover:scale-102 cursor-pointer shadow-md"
            >
              {showAllNotes ? "Recolher mural de insights ▴" : `Ver todos os insights (${notes.length}) ▾`}
            </button>
          </div>
        )}
      </section>

      {/* --- UNIFIED POPUP MODAL: MANAGE & CREATE COLUMNS --- */}
      <Modal
        open={isColModalOpen}
        onClose={() => setIsColModalOpen(false)}
        title="Gerenciar Colunas da Operação"
      >
        <div className="space-y-6">
          {/* Form: Adicionar Nova Coluna */}
          <form onSubmit={handleAddColumn} className="space-y-4 pb-5 border-b border-white/[0.05]">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Plus className="h-3.5 w-3.5 text-primary" /> Adicionar Nova Coluna
            </h3>
            
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Título da Coluna</span>
              <input
                type="text"
                placeholder="Ex: Em Revisão, Backlog..."
                value={newColTitle}
                onChange={(e) => setNewColTitle(e.target.value)}
                className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
              />
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Cor Temática de Destaque</span>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { name: "red", colorClass: "bg-red-500" },
                  { name: "amber", colorClass: "bg-amber-500" },
                  { name: "emerald", colorClass: "bg-emerald-500" },
                  { name: "blue", colorClass: "bg-blue-500" },
                  { name: "purple", colorClass: "bg-primary" },
                  { name: "pink", colorClass: "bg-pink-500" },
                  { name: "cyan", colorClass: "bg-cyan-500" }
                ].map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setNewColColor(c.name as any)}
                    className={`h-6 w-6 rounded-lg ${c.colorClass} border transition-all ${
                      newColColor === c.name 
                        ? "ring-2 ring-white border-white scale-110 shadow-lg" 
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
              >
                + Criar Coluna
              </button>
            </div>
          </form>

          {/* List: Gerenciar Existentes */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Trello className="h-3.5 w-3.5 text-primary" /> Colunas Ativas ({columns.length})
            </h3>
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              Crie, edite ou exclua colunas livremente para adaptar o quadro ao seu fluxo de trabalho de alta performance.
            </p>
            
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {columns.map((col, index) => {
                const colColors = {
                  red: "bg-red-500",
                  amber: "bg-amber-500",
                  emerald: "bg-emerald-500",
                  blue: "bg-blue-500",
                  purple: "bg-primary",
                  pink: "bg-pink-500",
                  cyan: "bg-cyan-500"
                }[col.color] || "bg-primary";

                if (editingColId === col.id) {
                  return (
                    <div 
                      key={col.id}
                      className="flex flex-col gap-2.5 p-2.5 rounded-lg border border-primary/20 bg-primary/[0.02] animate-in fade-in slide-in-from-top-1 duration-150"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editColTitle}
                          onChange={(e) => setEditColTitle(e.target.value)}
                          className="flex-1 glass rounded-lg px-2.5 py-1.5 text-xs text-foreground bg-background border border-white/10 outline-none focus:border-primary/40"
                          placeholder="Título da coluna"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveColumn(col.id);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveColumn(col.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition cursor-pointer"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingColId(null)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-foreground text-xs font-bold transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mr-1">Cor:</span>
                        {[
                          { name: "red", colorClass: "bg-red-500" },
                          { name: "amber", colorClass: "bg-amber-500" },
                          { name: "emerald", colorClass: "bg-emerald-500" },
                          { name: "blue", colorClass: "bg-blue-500" },
                          { name: "purple", colorClass: "bg-primary" },
                          { name: "pink", colorClass: "bg-pink-500" },
                          { name: "cyan", colorClass: "bg-cyan-500" }
                        ].map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setEditColColor(c.name as any)}
                            className={`h-4.5 w-4.5 rounded-full ${c.colorClass} border transition-all ${
                              editColColor === c.name 
                                ? "ring-1.5 ring-white border-white scale-110 shadow-md" 
                                : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                }

                const isFirst = index === 0;
                const isLast = index === columns.length - 1;

                return (
                  <div 
                    key={col.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-white/[0.04] bg-white/[0.01]"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${colColors}`} />
                      <span className="text-xs font-semibold text-foreground">{col.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(col.id, "up")}
                        disabled={isFirst}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Mover para cima"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveColumn(col.id, "down")}
                        disabled={isLast}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingColId(col.id);
                          setEditColTitle(col.title);
                          setEditColColor(col.color);
                        }}
                        className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                        title="Editar Coluna"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteColumn(col.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-rose-450 transition cursor-pointer"
                        title="Excluir Coluna"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>

          <div className="flex justify-end pt-3 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={() => setIsColModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] transition text-foreground"
            >
              Fechar Painel
            </button>
          </div>
        </div>
      </Modal>

      {/* --- MODAL: CREATE TASK --- */}
      <Modal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Criar Nova Tarefa"
      >
        <form onSubmit={handleAddTask} className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Título da Tarefa</span>
            <input
              type="text"
              placeholder="Digite o título da tarefa..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Descrição (Opcional)</span>
            <textarea
              placeholder="Descreva os detalhes desta operação..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 border border-transparent outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none transition bg-background"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Coluna Inicial</span>
              <select
                value={taskCol}
                onChange={(e) => setTaskCol(e.target.value)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Prioridade</span>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Classificação de Eisenhower</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={taskImportante}
                  onChange={(e) => setTaskImportante(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.02] text-primary focus:ring-primary/20 accent-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Importante</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={taskUrgente}
                  onChange={(e) => setTaskUrgente(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.02] text-primary focus:ring-primary/20 accent-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Urgente</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Categoria</span>
              <input
                type="text"
                placeholder="Ex: Tráfego, Copy, Geral"
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
              />
              {/* Dynamic tag selector */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5 max-h-[60px] overflow-y-auto">
                  {categories.slice(0, 8).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTaskCategory(cat)}
                      className={`text-[8px] font-bold px-2 py-0.5 rounded border transition-all ${
                        taskCategory === cat
                          ? "bg-primary/20 border-primary/45 text-primary-foreground shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Data Limite</span>
              <input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              />
            </div>
          </div>

          {/* Subtasks builder */}
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Subtarefas (Checklist)</span>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Adicionar etapa..."
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtaskToAddModal();
                  }
                }}
                className="flex-1 glass rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
              />
              <button
                type="button"
                onClick={addSubtaskToAddModal}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-xs font-bold transition text-foreground"
              >
                +
              </button>
            </div>
            {taskSubtasks.length > 0 && (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto bg-black/20 p-2.5 rounded-lg border border-white/5 stagger-enter">
                {taskSubtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-2 text-xs text-foreground/80">
                    <span className="truncate">{st.text}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtaskFromAddModal(st.id)}
                      className="text-muted-foreground/50 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-transparent transition text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition"
            >
              Criar Tarefa
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL: EDIT TASK --- */}
      <Modal
        open={editingTask !== null}
        onClose={() => setEditingTask(null)}
        title="Editar Tarefa"
      >
        <form onSubmit={handleEditTask} className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Título da Tarefa</span>
            <input
              type="text"
              placeholder="Digite o título da tarefa..."
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Descrição (Opcional)</span>
            <textarea
              placeholder="Descreva os detalhes desta operação..."
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 border border-transparent outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 resize-none transition bg-background"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Coluna</span>
              <select
                value={editCol}
                onChange={(e) => setEditCol(e.target.value)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Prioridade</span>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.04] p-3 rounded-xl space-y-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Classificação de Eisenhower</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editImportante}
                  onChange={(e) => setEditImportante(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.02] text-primary focus:ring-primary/20 accent-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Importante</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={editUrgente}
                  onChange={(e) => setEditUrgente(e.target.checked)}
                  className="rounded border-white/10 bg-white/[0.02] text-primary focus:ring-primary/20 accent-primary h-3.5 w-3.5 cursor-pointer"
                />
                <span>Urgente</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Categoria</span>
              <input
                type="text"
                placeholder="Ex: Tráfego, Copy, Geral"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full glass rounded-lg px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
              />
              {/* Dynamic tag selector */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5 max-h-[60px] overflow-y-auto">
                  {categories.slice(0, 8).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setEditCategory(cat)}
                      className={`text-[8px] font-bold px-2 py-0.5 rounded border transition-all ${
                        editCategory === cat
                          ? "bg-primary/20 border-primary/45 text-primary-foreground shadow-[0_0_8px_rgba(139,92,246,0.2)]"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Data Limite</span>
              <input
                type="date"
                value={editDueDate}
                onChange={(e) => setEditDueDate(e.target.value)}
                className="w-full glass rounded-lg px-3 py-2 text-xs text-foreground outline-none bg-background cursor-pointer"
              />
            </div>
          </div>

          {/* Subtasks builder */}
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Subtarefas (Checklist)</span>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Adicionar etapa..."
                value={editNewSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSubtaskToEditModal();
                  }
                }}
                className="flex-1 glass rounded-lg px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/10 transition bg-background"
              />
              <button
                type="button"
                onClick={addSubtaskToEditModal}
                className="px-3.5 py-2 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] text-xs font-bold transition text-foreground"
              >
                +
              </button>
            </div>
            {editSubtasks.length > 0 && (
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto bg-black/20 p-2.5 rounded-lg border border-white/5 stagger-enter">
                {editSubtasks.map((st) => (
                  <div key={st.id} className="flex items-center justify-between gap-2 text-xs text-foreground/80">
                    <span className="truncate">{st.text}</span>
                    <button
                      type="button"
                      onClick={() => removeSubtaskFromEditModal(st.id)}
                      className="text-muted-foreground/50 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.04]">
            <button
              type="button"
              onClick={() => setEditingTask(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-transparent transition text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </Modal>


      {/* --- MODAL: TEAM & INVITES --- */}
      <Modal open={isTeamModalOpen} onClose={() => setIsTeamModalOpen(false)} title="Equipe do Projeto">
        <div className="space-y-6">
          <form onSubmit={handleAddTeamMember} className="flex gap-2">
            <div className="flex-1">
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="w-full glass rounded-xl px-4 py-2.5 text-sm text-foreground outline-none bg-background focus:border-primary/50 transition-colors"
                placeholder="E-mail do colaborador..."
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer whitespace-nowrap"
            >
              Convidar
            </button>
          </form>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Membros Atuais ({teamMembers.length})</h4>
            {teamMembers.map(member => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-3">
                  <img src={member.avatar} alt="avatar" className="w-8 h-8 rounded-full border border-white/10" />
                  <div>
                    <p className="text-xs font-bold text-foreground">{member.email}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{member.role === "owner" ? "Proprietário" : "Membro"}</p>
                  </div>
                </div>
                {member.role !== "owner" && (
                  <button
                    onClick={() => handleRemoveTeamMember(member.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-red-400 transition"
                    title="Remover Membro"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Novo Projeto">
        <form onSubmit={handleAddProject} className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Nome do Projeto</label>
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full glass rounded-xl px-4 py-2.5 text-sm text-foreground outline-none bg-background focus:border-primary/50 transition-colors"
              placeholder="Ex: Lançamento A..."
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold hover:bg-white/5 border border-transparent transition text-foreground"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl gradient-primary text-white text-xs font-bold shadow hover:scale-[1.01] active:scale-[0.99] transition cursor-pointer"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

interface KanbanCardProps {
  task: Task;
  columnColor?: string;
  onMove: (taskId: string, direction: "left" | "right") => void;
  onDelete: (taskId: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: () => void;
  onEdit: (task: Task) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
}

function KanbanCard({ task, columnColor, onMove, onDelete, onDragStart, onDragEnd, onEdit, onToggleSubtask }: KanbanCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((st) => st.completed).length;
  const totalSubtasks = subtasks.length;
  const subtasksProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const colColor = columnColor || "purple";

  // Dynamic minimalist accents
  const colDot = {
    red: "bg-red-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    purple: "bg-primary",
    pink: "bg-pink-500",
    cyan: "bg-cyan-500"
  }[colColor] || "bg-primary";

  const priorityColors = {
    alta: "bg-red-500/20 text-red-400 border-red-500/30",
    media: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    baixa: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  };
  const prioData = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.media;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(task)}
      className="group glass rounded-xl p-3.5 border border-white/[0.04] hover:border-white/10 bg-gradient-to-br from-white/[0.015] to-transparent hover:from-white/[0.03] active:scale-[0.985] cursor-pointer hover:shadow-lg hover:shadow-black/20 transition-all duration-300 relative flex flex-col justify-between"
    >
      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full opacity-60" className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-r-full opacity-60 ${colDot}`} />
      
      <div className="pl-2 w-full">
        {/* Header Badges */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span className="text-[9px] text-muted-foreground/50 font-bold uppercase tracking-widest flex-1 truncate">
            {task.category}
          </span>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider border ${prioData}`}>
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <h4 className="text-xs font-bold text-foreground/90 leading-relaxed tracking-tight group-hover:text-primary transition-colors duration-200 break-words">
          {task.title}
        </h4>
        
        {/* Description */}
        {task.description && (
          <p className="text-[10.5px] text-muted-foreground/60 leading-relaxed mt-1.5 mb-2 line-clamp-3 break-words">
            {task.description}
          </p>
        )}

        {/* Minimal Subtasks */}
        {totalSubtasks > 0 && (
          <div className="mt-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${subtasksProgress === 100 ? 'bg-emerald-500' : 'bg-primary/60'}`}
                  style={{ width: `${subtasksProgress}%` }}
                />
              </div>
              <span className={`text-[9px] font-bold ${subtasksProgress === 100 ? 'text-emerald-400' : 'text-muted-foreground/60'}`}>
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
          </div>
        )}

        {/* Actions Menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md border border-white/10 rounded-lg p-0.5 flex items-center gap-0.5 translate-x-2 group-hover:translate-x-0">
          <button
            onClick={(e) => { e.stopPropagation(); onMove(task.id, "left"); }}
            className="p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-white transition"
            title="Mover para esquerda"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(task.id, "right"); }}
            className="p-1.5 hover:bg-white/10 rounded-md text-muted-foreground hover:text-white transition"
            title="Mover para direita"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="p-1.5 hover:bg-destructive/20 rounded-md text-muted-foreground hover:text-red-400 transition"
            title="Excluir tarefa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyColumnState() {
  return (
    <div className="py-8 text-center text-[10px] text-muted-foreground/30 border border-dashed border-white/[0.04] rounded-xl bg-white/[0.005]">
      <CheckSquare className="h-6 w-6 mx-auto mb-2 text-muted-foreground/10" />
      Sem tarefas nesta coluna
    </div>
  );
}
