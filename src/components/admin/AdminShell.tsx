import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, BookOpen, Layers, FolderTree, MessageSquare, MessagesSquare,
  CreditCard, Ticket, Bell, Settings, ScrollText, Search, Menu, X, LogOut, Shield, ArrowLeft, Play, Crown, Package,
} from "lucide-react";
import { NotificationBell } from "@/components/members/NotificationBell";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import brandLogo from "@/assets/nebula-members-wordmark.png.asset.json";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Conteúdo",
    items: [
      { to: "/admin/courses", label: "Cursos", icon: BookOpen },
      { to: "/admin/modules", label: "Módulos & Aulas", icon: Layers },
      { to: "/admin/categories", label: "Categorias", icon: FolderTree },
      { to: "/admin/player", label: "Player", icon: Play },
      { to: "/admin/community", label: "Comunidade", icon: MessagesSquare },
      { to: "/admin/comments", label: "Comentários", icon: MessageSquare },
    ],
  },
  {
    label: "Comercial",
    items: [
      { to: "/admin/members", label: "Membros", icon: Users },
      { to: "/admin/forms", label: "Respostas Forms", icon: ScrollText },
      { to: "/admin/offers", label: "Ofertas", icon: Crown },
      { to: "/admin/plans", label: "Planos", icon: Package },
      { to: "/admin/sales", label: "Vendas", icon: CreditCard },
      { to: "/admin/coupons", label: "Cupons", icon: Ticket },
    ],
  },
  {
    label: "Sistema",
    items: [
      { to: "/admin/notifications", label: "Notificações", icon: Bell },
      { to: "/admin/settings", label: "Configurações", icon: Settings },
      { to: "/admin/logs", label: "Logs", icon: ScrollText },
    ],
  },
];

const allNav: NavItem[] = navGroups.flatMap((g) => g.items);

export function AdminShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const email = user?.email ?? "";
  const name = (user?.user_metadata as any)?.full_name || email.split("@")[0] || "Admin";
  const initials = name.slice(0, 2).toUpperCase();
  const current = allNav.find((n) => path.startsWith(n.to))?.label ?? "Admin";
  const onSignOut = async () => { await signOut(); navigate({ to: "/login" }); };

  return (
    <div className="min-h-screen flex">
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-72 shrink-0 transition-transform duration-300 border-r border-border bg-background ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="h-full flex flex-col p-5">
          <Link to="/admin/dashboard" className="flex items-center gap-3 px-2 py-2 mb-8">
            <img src={brandLogo.url} alt="Nebula Members" className="h-11 w-44 object-contain object-left" />
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20">ADMIN</span>
          </Link>

          <nav className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = path.startsWith(item.to);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                          active
                            ? "bg-primary/10 text-primary border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r gradient-primary" />
                        )}
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl p-4 flex items-center gap-3 bg-card border border-border">
            <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-primary/20">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{email}</div>
            </div>
            <button
              onClick={onSignOut}
              className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/60 backdrop-blur-xl flex items-center gap-3 px-4 md:px-8">
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/50"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">{current}</span>
          </div>
          <div className="flex-1 max-w-md mx-auto md:mx-0 md:ml-8">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="search"
                placeholder="Buscar... (Cmd+K)"
                autoComplete="off"
                data-lpignore="true"
                className="w-full bg-card border border-border rounded-full pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white/[0.05] transition"
              />
            </div>
          </div>
          <NotificationBell />
          <Link
            to="/dashboard"
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-white/20 bg-card hover:bg-muted/50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Área de membros
          </Link>
          <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">
          <div key={path} className="admin-route-slot">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}