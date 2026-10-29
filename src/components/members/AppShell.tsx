import { Link, useRouterState, Outlet, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, GraduationCap, Users, User, Settings, Search, Bell,
  Menu, X, Orbit, LogOut, Shield, MessageSquare, Bookmark, GitBranch,
  PanelLeftClose, PanelLeftOpen, StickyNote, HelpCircle, Trello, Mic, Lock, Package, Flame,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { usePresence } from "@/hooks/use-presence";
import { useScrollRestore } from "@/hooks/use-scroll-restore";
import { NotificationBell } from "@/components/members/NotificationBell";
import { TutorialWizard } from "@/components/tutorial/TutorialWizard";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { fetchPlans, isPendingPlan, NO_ACCESS_FEATURES, FULL_ACCESS_FEATURES } from "@/hooks/use-plans";
import brandLogo from "@/assets/nebula-members-wordmark.png.asset.json";


type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: "Visão geral",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/organizer", label: "Organização", icon: Trello },
    ],
  },
  {
    label: "Aprendizado",
    items: [
      { to: "/courses", label: "Cursos", icon: GraduationCap },
      { to: "/offers", label: "Ofertas", icon: Package },
      { to: "/community", label: "Comunidade", icon: Users },
      { to: "/forum", label: "Fórum", icon: MessageSquare },
      { to: "/saved", label: "Salvos", icon: Bookmark },
      { to: "/notes", label: "Notas", icon: StickyNote },
      { to: "/funnels", label: "Funis", icon: GitBranch },
      { to: "/pixel-feeder", label: "Pixel Feeder", icon: Flame, badge: "BETA" },
      { to: "/transcript", label: "Transcrição", icon: Mic },
    ],
  },
  {
    label: "Conta",
    items: [
      { to: "/profile", label: "Perfil", icon: User },
      { to: "/settings", label: "Configurações", icon: Settings },
    ],
  },
];

const allNav: NavItem[] = navGroups.flatMap((g) => g.items);

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar_collapsed");
    return saved === "true";
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [userPlanFeatures, setUserPlanFeatures] = useState<any>(null);
  const [planPending, setPlanPending] = useState(false);

  const fallbackFeatures = NO_ACCESS_FEATURES;

  useEffect(() => {
    if (!user) return;
    const loadUserPlan = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();

        if (isPendingPlan(profile?.plan)) {
          setPlanPending(true);
          setUserPlanFeatures(NO_ACCESS_FEATURES);
          return;
        }

        const userPlanSlug = (profile?.plan || "").toLowerCase();
        const plans = await fetchPlans();
        const userPlan = plans.find(
          (p) => p.slug?.toLowerCase() === userPlanSlug || p.name?.toLowerCase() === userPlanSlug,
        );

        if (!userPlan) {
          // Plano definido pelo admin mas não listado na config — libera acesso total
          setPlanPending(false);
          setUserPlanFeatures(FULL_ACCESS_FEATURES);
          return;
        }

        setPlanPending(false);
        setUserPlanFeatures(userPlan.features ?? FULL_ACCESS_FEATURES);
      } catch (err) {
        console.error("Error loading user plan features:", err);
        setPlanPending(true);
        setUserPlanFeatures(NO_ACCESS_FEATURES);
      }
    };
    loadUserPlan();
  }, [user]);


  const ALWAYS_ALLOWED = ["/profile", "/settings"];

  const isLocked = useMemo(() => {
    const features = userPlanFeatures || fallbackFeatures;
    return (to: string) => {
      if (isAdmin) return false;
      if (ALWAYS_ALLOWED.includes(to)) return false;
      if (planPending) return true;
      if (to === "/organizer") return features.organizer_access === false;
      if (to === "/courses") return features.courses_access === false;
      if (to === "/community") return features.community_access === false;
      if (to === "/forum") return features.forum_access === false;
      if (to === "/notes") return features.notes_access === false;
      if (to === "/funnels") return features.funnels_access === false;
      return false;
    };
  }, [userPlanFeatures, planPending, isAdmin]);

  const filteredNavGroups = useMemo(
    () => navGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({ ...item, locked: isLocked(item.to) })),
    })),
    [isLocked],
  );

  const allNav = useMemo(() => {
    return filteredNavGroups.flatMap((g) => g.items);
  }, [filteredNavGroups]);

  const hasAccess = useMemo(() => {
    const base = "/" + (path.split("/")[1] ?? "");
    return !isLocked(base);
  }, [path, isLocked]);


  usePresence();

  // Auto-show tutorial on first visit
  useEffect(() => {
    const seen = localStorage.getItem("nebula_tutorial_seen");
    if (!seen) {
      const timer = setTimeout(() => setShowTutorial(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("nebula_tutorial_seen", "true");
  };

  const isFunnelsPage = path === '/funnels' || path.startsWith('/funnels/');
  const preCollapsedRef = useRef<boolean | null>(null);

  // Auto-collapse on funnels page, restore when leaving
  useEffect(() => {
    if (isFunnelsPage) {
      if (!collapsed) {
        preCollapsedRef.current = collapsed;
        setCollapsed(true);
      }
    } else {
      if (preCollapsedRef.current !== null) {
        setCollapsed(preCollapsedRef.current);
        preCollapsedRef.current = null;
      }
    }
  }, [isFunnelsPage]);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(collapsed));
  }, [collapsed]);

  const email = user?.email ?? "";
  const name = (user?.user_metadata as any)?.full_name || email.split("@")[0] || "Membro";
  const initials = name.slice(0, 2).toUpperCase();
  const current = allNav.find((n) => path === n.to || path.startsWith(n.to + "/"))?.label ?? "Membros";

  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useScrollRestore(mainRef);
  const [siteSettings, setSiteSettings] = useState({ name: "Nebula Members", logoUrl: brandLogo.url, primaryColor: "#7ad3d8" });

  useEffect(() => {
    // Try to load from localStorage first for instant initial render
    try {
      const raw = localStorage.getItem("admin_settings_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.general) {
          setSiteSettings({
            name: parsed.general.name || "Nebula Members",
            logoUrl: parsed.general.logoUrl || brandLogo.url,
            primaryColor: parsed.general.primaryColor || "#7ad3d8"
          });
        }
      }
    } catch (_) {}

    // Then fetch the official settings in real-time from Supabase
    const fetchGlobalSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("global_settings")
          .select("name, logo_url, primary_color")
          .eq("id", "current")
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const fetched = {
            name: data.name,
            logoUrl: data.logo_url,
            primaryColor: data.primary_color
          };
          setSiteSettings(fetched);
          
          // Sync back to localstorage as cache for next instant load
          const raw = localStorage.getItem("admin_settings_v1") || "{}";
          try {
            const parsed = JSON.parse(raw);
            parsed.general = {
              name: data.name,
              logoUrl: data.logo_url,
              primaryColor: data.primary_color
            };
            localStorage.setItem("admin_settings_v1", JSON.stringify(parsed));
          } catch (_) {}
        }
      } catch (err) {
        console.error("Error fetching global settings from Supabase:", err);
      }
    };

    fetchGlobalSettings();
  }, []);

  // ⌘K / Ctrl+K focuses the search input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ESC fecha o menu mobile e trava o scroll quando aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar - single element with smooth width transition */}
      <aside
        className={`hidden md:flex fixed md:sticky top-0 left-0 z-40 h-screen shrink-0 border-r border-border bg-background flex-col transition-all duration-300 ease-in-out overflow-visible ${
          collapsed ? "w-14" : "w-72"
        }`}
      >
        {/* Toggle button — centered on the right edge */}
        <Tooltip>
          <TooltipTrigger asChild>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-1/2 -translate-y-1/2 -right-3 z-50 h-6 w-6 rounded-full border border-border bg-background/80 backdrop-blur-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all shadow-md"
          aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform duration-300 ${collapsed ? "rotate-0" : "rotate-180"}`}>
            <path d="M3.5 1.5L7 5L3.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
          </TooltipTrigger>
          <TooltipContent side="right">{collapsed ? "Expandir menu" : "Recolher menu"}</TooltipContent>
        </Tooltip>
        {/* Collapsed content */}
        <div className={`absolute inset-0 flex flex-col items-center py-4 gap-1 transition-opacity duration-200 ${collapsed ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Link to="/dashboard" className="mb-3">
            {siteSettings.logoUrl ? (
              <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Orbit className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </Link>
          <div className="w-6 h-px bg-muted/40 mb-2" />
          {allNav.map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Tooltip key={item.to}>
                <TooltipTrigger asChild>
                  {item.locked ? (
                    <div className="relative p-2.5 rounded-xl text-muted-foreground/40 cursor-not-allowed">
                      <Icon className="h-4 w-4" />
                      <Lock className="h-2.5 w-2.5 absolute right-1 bottom-1" />
                    </div>
                  ) : (
                  <Link
                    to={item.to}
                    className={`relative p-2.5 rounded-xl transition-colors ${
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </Link>
                  )}
                </TooltipTrigger>
                <TooltipContent side="right">{item.locked ? `${item.label} — Indisponível` : item.label}</TooltipContent>
              </Tooltip>
            );
          })}
          {isAdmin && (
            <>
              <div className="w-6 h-px bg-muted/40 my-2" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="/admin/dashboard" className="p-2.5 rounded-xl text-primary hover:bg-primary/10 transition-colors">
                    <Shield className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent side="right">Painel Admin</TooltipContent>
              </Tooltip>
            </>
          )}
          <div className="w-6 h-px bg-muted/40 my-2" />
          <div className="mt-auto flex flex-col items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onSignOut}
                  className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Expanded content */}
        <div className={`h-full flex flex-col p-5 min-w-[18rem] transition-opacity duration-200 ${collapsed ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
          <div className="flex items-center justify-between mb-8">
            <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2">
              {siteSettings.logoUrl ? (
                <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-16 w-60 max-w-full object-contain object-left" />
              ) : (
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center shadow-[0_0_24px_-4px_oklch(0.65_0.22_290/0.6)]">
                  <Orbit className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
               {!siteSettings.logoUrl && <div>
                <div className="font-semibold text-sm leading-none">{siteSettings.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5">Members</div>
               </div>}
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto -mx-1 px-1 space-y-5">
            {filteredNavGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = path === item.to || path.startsWith(item.to + "/");
                    const Icon = item.icon;
                    if (item.locked) {
                      return (
                        <div
                          key={item.to}
                          aria-disabled="true"
                          title="Indisponível no seu nível de acesso"
                          className="relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground/40 cursor-not-allowed border border-transparent"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{item.label}</span>
                          <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wide">
                            <Lock className="h-3 w-3" />Indisponível
                          </span>
                        </div>
                      );
                    }
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
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
                        {item.badge && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            {isAdmin && (
              <div>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Administração
                </div>
                <a
                  href="/admin/dashboard"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-primary border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all"
                >
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">Painel Admin</span>
                </a>
              </div>
            )}
          </nav>

          <div className="mt-4 rounded-2xl p-4 flex items-center gap-3 bg-card border border-border">
            <div
              role="img"
              aria-label={`Avatar de ${name}`}
              className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground ring-2 ring-primary/20"
            >
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

      {/* Mobile sidebar */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        className={`fixed md:hidden top-0 left-0 z-40 h-screen w-72 border-r border-border bg-background transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col p-5">
          <div className="flex items-center justify-between mb-8">
            <Link to="/dashboard" className="flex items-center gap-3 px-2 py-2" onClick={() => setOpen(false)}>
              {siteSettings.logoUrl ? (
                 <img src={siteSettings.logoUrl} alt={siteSettings.name} className="h-16 w-60 max-w-full object-contain object-left" />
              ) : (
                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center">
                  <Orbit className="h-5 w-5 text-primary-foreground" />
                </div>
              )}
               {!siteSettings.logoUrl && <div>
                <div className="font-semibold text-sm leading-none">{siteSettings.name}</div>
                <div className="text-[10px] text-muted-foreground mt-1.5">Members</div>
               </div>}
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto space-y-5">
            {filteredNavGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{group.label}</div>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = path === item.to || path.startsWith(item.to + "/");
                    const Icon = item.icon;
                    if (item.locked) {
                      return (
                        <div key={item.to} aria-disabled="true" className="relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground/40 cursor-not-allowed">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{item.label}</span>
                          <Lock className="h-3 w-3 ml-auto" />
                        </div>
                      );
                    }
                    return (
                      <Link key={item.to} to={item.to} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
                        className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${active ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-card border border-transparent"}`}>
                        {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r gradient-primary" />}
                        <Icon className={`h-4 w-4 ${active ? "text-primary" : ""}`} />
                        <span className="font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        {!isFunnelsPage && (
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-background/60 backdrop-blur-xl flex items-center gap-3 px-4 md:px-8">
            <button className="md:hidden p-2 rounded-lg hover:bg-muted/50" onClick={() => setOpen(true)} aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
            </button>
            <button
              className="sm:hidden p-2 rounded-lg hover:bg-muted/50 text-muted-foreground"
              onClick={() => setMobileSearch((v) => !v)}
              aria-label="Buscar"
            >
              <Search className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden md:inline text-muted-foreground">{siteSettings.name}</span>
              <span className="hidden md:inline text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">{current}</span>
            </div>
            <div className="hidden sm:block flex-1 max-w-md mx-auto md:mx-0 md:ml-8">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  ref={searchRef}
                  type="search"
                  placeholder="Buscar cursos, comunidade... ⌘K"
                  autoComplete="off"
                  data-lpignore="true"
                  className="w-full bg-card border border-border rounded-full pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/30 focus:bg-white/[0.05] transition"
                />
              </div>
            </div>
            <NotificationBell />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowTutorial(true)}
                  className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors"
                  aria-label="Tutorial"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Tutorial da plataforma</TooltipContent>
            </Tooltip>
            <div
              role="img"
              aria-label={`Avatar de ${name}`}
              className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center text-xs font-semibold text-primary-foreground"
            >
              {initials}
            </div>
          </header>
        )}
        {!isFunnelsPage && mobileSearch && (
          <div className="sm:hidden sticky top-16 z-20 px-4 py-2 border-b border-border bg-background/90 backdrop-blur-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                type="search"
                placeholder="Buscar cursos, comunidade..."
                className="w-full bg-card border border-border rounded-full pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        )}
        <main ref={mainRef} className={`flex-1 ${isFunnelsPage ? 'p-0 overflow-hidden' : 'px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8'}`}>
          <div className={isFunnelsPage ? 'h-full' : 'admin-route-slot w-full max-w-[1600px] mx-auto'}>
            {hasAccess ? (
              <Outlet />
            ) : (
              <PlanLockScreen pending={planPending} />
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav (mobile) */}
      {!isFunnelsPage && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur-xl flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
          {[
            { to: "/dashboard", label: "Início", icon: LayoutDashboard },
            { to: "/courses", label: "Cursos", icon: GraduationCap },
            { to: "/community", label: "Comunidade", icon: Users },
            { to: "/notes", label: "Notas", icon: StickyNote },
            { to: "/profile", label: "Perfil", icon: User },
          ].map((item) => {
            const active = path === item.to || path.startsWith(item.to + "/");
            const Icon = item.icon;
            if (isLocked(item.to)) {
              return (
                <div key={item.to} aria-disabled="true" className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground/40">
                  <Lock className="h-5 w-5" />
                  {item.label}
                </div>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Tutorial Wizard */}
      <TutorialWizard open={showTutorial} onClose={handleCloseTutorial} />
    </div>
  );
}

function PlanLockScreen({ pending }: { pending?: boolean }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto space-y-5 animate-fade-in relative z-10">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10" />
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_30px_oklch(0.65_0.22_290/0.2)] mb-2">
        <Shield className="h-8 w-8 stroke-[1.5]" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          {pending ? "Acesso pendente" : "Recurso indisponível"}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {pending
            ? "Sua conta ainda não tem um nível de acesso definido. Assim que um administrador liberar seu acesso, todas as áreas serão desbloqueadas."
            : "Esta funcionalidade não está disponível no seu nível de acesso atual."}
        </p>
      </div>
      <div className="pt-2 flex flex-col gap-2 w-full">
        <Link
          to="/settings"
          className="w-full inline-flex items-center justify-center gradient-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold transition hover:scale-[1.01] shadow-[0_8px_24px_-8px_oklch(0.65_0.22_290/0.4)] cursor-pointer"
        >
          Ver Upgrade de Planos
        </Link>
        <Link
          to="/profile"
          className="w-full inline-flex items-center justify-center bg-muted/40 border border-border hover:bg-white/10 text-foreground py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
        >
          Voltar ao Meu Perfil
        </Link>
      </div>
    </div>
  );
}
