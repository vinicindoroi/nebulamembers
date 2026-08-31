import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Orbit, GraduationCap, ArrowRight, Play, Users, Target,
  MessageSquare, Zap, CheckCircle2, Rocket, Crown,
  Unlock, Flame, Star, Shield, ChevronDown, Trophy, Check
} from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/landing")({
  component: LandingPage,
});

/* ─── Scroll Reveal Hook ─── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(el); } },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, isVisible };
}

/* ─── Parallax Hook ─── */
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return scrollY;
}

/* ─── Deterministic Star Field Generation ─── */
const STARS = Array.from({ length: 70 }).map((_, i) => ({
  id: i,
  left: `${(i * 17) % 100}%`,
  top: `${(i * 23) % 100}%`,
  size: ((i * 7) % 3) + 1, // 1px to 3px
  delay: `${((i * 13) % 50) / 10}s`,
  duration: `${(((i * 19) % 30) / 10) + 2}s`,
}));

/* ─── Main Page ─── */
function LandingPage() {
  const scrollY = useParallax();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sections = [
    { id: "recursos", label: "Recursos" },
    { id: "calculadora", label: "Calculadora" },
    { id: "planos", label: "Planos" },
    { id: "faq", label: "FAQ" }
  ];

  const handleScrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden relative text-white">
      <NebulaBackground scrollY={scrollY} />
      <NebulaStyles />
      <nav className="relative z-30 px-5 md:px-10 py-4 max-w-7xl mx-auto mt-3">
        <div 
          className="flex items-center justify-between rounded-2xl border border-white/[0.1] px-5 py-3 relative z-30" 
          style={{ 
            background: "rgba(255, 255, 255, 0.03)", 
            backdropFilter: "blur(40px) saturate(1.5)", 
            WebkitBackdropFilter: "blur(40px) saturate(1.5)", 
            boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" 
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shadow-[0_4px_14px_oklch(0.65_0.22_290/0.35)]">
              <Orbit className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Nebula</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6 text-xs text-white/50 font-medium">
            {sections.map((sec) => (
              <button 
                key={sec.id}
                onClick={() => handleScrollTo(sec.id)} 
                className="hover:text-white transition-colors cursor-pointer"
              >
                {sec.label}
              </button>
            ))}
          </div>

          {/* Desktop Entrar CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium gradient-primary text-white rounded-xl px-5 py-2 transition-all hover:scale-[1.04] shadow-[0_4px_20px_-4px_oklch(0.65_0.22_290/0.45)]">Entrar</Link>
          </div>

          {/* Mobile Menu Controls */}
          <div className="flex md:hidden items-center gap-3">
            <Link to="/login" className="text-xs font-semibold text-white bg-white/5 border border-white/10 rounded-xl px-3.5 py-1.5 hover:bg-white/10 transition-colors">
              Entrar
            </Link>
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white/60 hover:text-white focus:outline-none p-1 cursor-pointer flex items-center justify-center"
            >
              {mobileMenuOpen ? (
                <span className="text-sm font-bold w-5 h-5 flex items-center justify-center">✕</span>
              ) : (
                <div className="flex flex-col gap-1 w-4">
                  <div className="h-0.5 bg-white rounded-full w-full" />
                  <div className="h-0.5 bg-white rounded-full w-full" />
                  <div className="h-0.5 bg-white rounded-full w-full" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel Menu */}
        {mobileMenuOpen && (
          <div 
            className="absolute top-full left-5 right-5 mt-2 rounded-2xl border border-white/[0.08] p-4 flex flex-col gap-3.5 z-20 animate-fade-in"
            style={{ 
              background: "rgba(15, 10, 25, 0.92)", 
              backdropFilter: "blur(50px) saturate(1.5)", 
              WebkitBackdropFilter: "blur(50px) saturate(1.5)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
          >
            {sections.map((sec) => (
              <button 
                key={sec.id}
                onClick={() => handleScrollTo(sec.id)}
                className="text-left text-xs font-semibold text-white/50 hover:text-white transition-colors py-1 cursor-pointer"
              >
                {sec.label}
              </button>
            ))}
            <div className="h-[1px] bg-white/[0.06] my-1" />
            <Link 
              to="/login" 
              search={{ mode: "signup" }}
              className="gradient-primary text-white text-center text-xs font-bold py-2.5 rounded-xl hover:scale-[1.02] transition-transform btn-glow"
            >
              Começar Gratuitamente
            </Link>
          </div>
        )}
      </nav>
      <HeroSection />
      <DashboardPreview />
      <UrgencyBar />
      <TrustBadges />
      <RevenueCalculator />
      <PlansSection />
      <FeaturesSection />
      <JourneySection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <footer className="relative z-10 px-5 py-8 max-w-7xl mx-auto flex items-center justify-between border-t border-white/[0.04]">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md gradient-primary flex items-center justify-center"><Orbit className="h-3 w-3 text-white" /></div>
          <span className="text-xs text-white/40">Nebula</span>
        </div>
        <span className="text-[11px] text-white/20 italic">Onde estrelas nascem.</span>
      </footer>
    </div>
  );
}

/* ─── Hero ─── */
function HeroSection() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 flex flex-col items-center text-center px-5 pt-16 sm:pt-24 pb-12 max-w-4xl mx-auto">
      <div className={`inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-4 py-1.5 text-[11px] uppercase tracking-widest text-white/60 mb-8 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(40px) saturate(1.5)", WebkitBackdropFilter: "blur(40px) saturate(1.5)" }}>
        <Flame className="h-3 w-3 text-orange-400 animate-pulse" />
        Últimas vagas abertas — turma fecha em breve
      </div>
      <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-[4.75rem] font-bold tracking-tight leading-[1.02] transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        Pare de assistir.<br /><span className="text-gradient">Comece a faturar.</span>
      </h1>
      <p className={`mt-8 text-base sm:text-lg text-white/50 max-w-xl leading-relaxed transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        Você já consumiu dezenas de cursos e continua no mesmo lugar. O problema nunca foi falta de conteúdo — foi falta de <strong className="text-white/70">método, direção e acompanhamento</strong>. Aqui dentro, cada passo te aproxima dos seus primeiros 5 dígitos.
      </p>
      <div className={`mt-10 flex flex-col sm:flex-row items-center gap-4 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <Link to="/login" search={{ mode: "signup" }} className="group inline-flex items-center gap-2.5 gradient-primary text-white rounded-2xl px-8 py-4 text-sm font-semibold shadow-[0_8px_36px_-6px_oklch(0.65_0.22_290/0.55),inset_0_1px_0_oklch(1_0_0/0.2)] transition-all hover:scale-[1.04] hover:shadow-[0_14px_50px_-6px_oklch(0.65_0.22_290/0.7)] will-change-transform btn-glow">
          Quero meu acesso gratuito <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      <p className={`mt-5 text-[11px] text-white/25 transition-all duration-700 delay-[400ms] ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>Sem cartão. Acesso em 30 segundos. Cancele quando quiser.</p>
    </section>
  );
}

/* ─── Dashboard Preview Mockup ─── */
function DashboardPreview() {
  const { ref, isVisible } = useScrollReveal();
  const [activeTab, setActiveTab] = useState("Dashboard");
  
  // Community Feed State
  const [posts, setPosts] = useState([
    { id: 1, name: "Pedro H.", action: "fechou 2 novos clientes de tráfego usando a nossa estrutura!", time: "há 3 min", avatarGrad: "from-blue-500 to-indigo-600", init: "PH", likes: 14, liked: false },
    { id: 2, name: "Camila R.", action: "compartilhou um novo post no fórum: 'Como fiz R$ 5.000 em 15 dias'", time: "há 12 min", avatarGrad: "from-pink-500 to-rose-500", init: "CR", likes: 29, liked: false }
  ]);
  const [newPostText, setNewPostText] = useState("");

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;
    const newPost = {
      id: Date.now(),
      name: "Você (Simulador)",
      action: `postou: "${newPostText}"`,
      time: "agora mesmo",
      avatarGrad: "from-purple-500 to-indigo-500",
      init: "VC",
      likes: 0,
      liked: false
    };
    setPosts([newPost, ...posts]);
    setNewPostText("");
  };

  const handleLike = (id: number) => {
    setPosts(posts.map(p => {
      if (p.id === id) {
        return {
          ...p,
          likes: p.liked ? p.likes - 1 : p.likes + 1,
          liked: !p.liked
        };
      }
      return p;
    }));
  };

  // Funnels Flowchart State
  const [activeFunnel, setActiveFunnel] = useState("whatsapp");

  // Forum Q&A State
  const [tickets, setTickets] = useState([
    { id: 1, title: "Erro na URL de retorno do webhook no Kiwify", category: "Integrações", status: "Resolvido", time: "há 15 min", answer: "Ajustamos o endpoint nas suas configurações e funcionou perfeitamente." },
    { id: 2, title: "Qual o melhor orçamento diário para teste de criativo?", category: "Anúncios", status: "Resolvido", time: "há 1 hora", answer: "Recomendamos começar com o valor de 1 conversão estimada por dia (R$ 20 a R$ 50)." }
  ]);
  const [ticketInput, setTicketInput] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketInput.trim() || ticketLoading) return;
    
    const newId = Date.now();
    const userTicket = {
      id: newId,
      title: ticketInput,
      category: "Dúvida Geral",
      status: "Aguardando Suporte",
      time: "agora mesmo",
      answer: ""
    };

    setTickets([userTicket, ...tickets]);
    setTicketInput("");
    setTicketLoading(true);

    setTimeout(() => {
      setTickets(prev => prev.map(t => {
        if (t.id === newId) {
          return { 
            ...t, 
            status: "Resolvido", 
            time: "há poucos segundos",
            answer: "Excelente dúvida! Já disponibilizamos um template pronto de resposta para essa questão na aba lateral do seu painel."
          };
        }
        return t;
      }));
      setTicketLoading(false);
    }, 1500);
  };

  // Video Player Modal State
  const [activeVideoCourse, setActiveVideoCourse] = useState<{ title: string; category: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(102); // 1:42
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    let interval: any;
    if (activeVideoCourse && isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= 750) return 0; // Loop back after 12:30
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeVideoCourse, isPlaying]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  const progressPercent = activeVideoCourse ? (currentTime / 750) * 100 : 0;

  return (
    <section ref={ref} className="relative z-10 px-5 pb-20 max-w-5xl mx-auto w-full">
      <div className={`transition-all duration-1000 delay-100 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-12 scale-95"}`}>
        {/* Sleek Floating Mouse Scroll Indicator */}
        <div className="flex flex-col items-center justify-center mb-10">
          <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center p-1.5">
            <div className="w-1 h-1.5 bg-primary rounded-full animate-bounce" />
          </div>
          <span className="text-[9px] uppercase tracking-widest text-white/30 mt-2">Explore a Experiência por Dentro</span>
        </div>

        {/* Dashboard Mockup Container */}
        <div className="glass-strong rounded-2xl overflow-hidden border border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] relative group">
          <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          {/* Top Window Bar */}
          <div className="h-10 border-b border-white/[0.06] bg-white/[0.02] flex items-center px-4 justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-white/10" />
              <span className="w-2 h-2 rounded-full bg-white/10" />
              <span className="w-2 h-2 rounded-full bg-white/10" />
            </div>
            <div className="text-[10px] text-white/30 font-medium tracking-tight bg-white/[0.03] px-4 py-1 rounded-md border border-white/[0.04]">
              nebula.app/dashboard
            </div>
            <div className="w-8" />
          </div>

          <div className="flex min-h-[420px] flex-col md:flex-row">
            {/* Sidebar Mock */}
            <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-white/[0.06] bg-white/[0.01] p-4 flex md:flex-col gap-1 overflow-x-auto whitespace-nowrap shrink-0 md:overflow-x-visible md:whitespace-normal">
              {[
                { label: "Dashboard", icon: Target },
                { label: "Cursos", icon: Play },
                { label: "Comunidade", icon: Users },
                { label: "Fórum de Dúvidas", icon: MessageSquare },
                { label: "Funis de Vendas", icon: Zap },
              ].map((item, idx) => {
                const isActive = activeTab === item.label;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveTab(item.label)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs transition-all shrink-0 text-left w-full cursor-pointer ${
                      isActive
                        ? "bg-primary/10 text-white font-medium border border-primary/20 shadow-[0_0_15px_rgba(180,120,255,0.06)]"
                        : "text-white/40 hover:text-white/70 hover:bg-white/[0.02] border border-transparent"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary animate-pulse" : "text-white/30"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Main Area Mock */}
            <div className="flex-1 p-5 md:p-6 bg-black/20 overflow-y-auto">
              
              {/* Tab 1: Dashboard */}
              {activeTab === "Dashboard" && (
                <div className="space-y-5 animate-fade-in">
                  {/* Top Banner Widget */}
                  <div className="rounded-xl border border-white/[0.06] bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Orbit className="h-3.5 w-3.5 text-primary" /> Bem-vindo à Nebula, Lucas!
                      </h3>
                      <p className="text-[10px] text-white/50 mt-1">Seu plano de ação de 90 dias está ativo. Aplique a tarefa da aula de hoje.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Suporte Ativo</span>
                    </div>
                  </div>

                  {/* Grid content widgets */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Active Course Play Widget */}
                    <button 
                      onClick={() => { setActiveVideoCourse({ title: "Criando seu primeiro Funil de WhatsApp", category: "Módulo 02 • Aula Prática" }); setIsPlaying(true); setCurrentTime(102); }}
                      className="glass rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between min-h-[160px] relative overflow-hidden group/card hover:border-primary/20 transition-all text-left w-full cursor-pointer"
                    >
                      <div className="absolute top-0 right-0 p-3 opacity-20 group-hover/card:opacity-40 transition-opacity">
                        <Play className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-primary font-bold">Módulo 02 • Aula Prática</span>
                        <h4 className="text-xs font-bold text-white mt-1 leading-snug">Criando seu primeiro Funil de WhatsApp</h4>
                        <p className="text-[10px] text-white/40 mt-1">Tempo de aplicação: 25 minutos</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-white/[0.04] w-full">
                        <div className="flex justify-between text-[9px] text-white/40 mb-1.5">
                          <span>Seu progresso da aula</span>
                          <span className="text-white/70 font-semibold">75%</span>
                        </div>
                        <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden w-full">
                          <div className="h-full gradient-primary rounded-full shadow-[0_0_8px_oklch(0.65_0.22_290/0.5)]" style={{ width: "75%" }} />
                        </div>
                      </div>
                    </button>

                    {/* Live Gamification Widget */}
                    <div className="glass rounded-xl p-4 border border-white/[0.06] flex flex-col justify-between min-h-[160px] hover:border-primary/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1">
                            <Crown className="h-3 w-3 fill-amber-400" /> Nível Explorer III
                          </span>
                          <div className="text-lg font-bold text-white mt-1">1.450 <span className="text-[10px] text-white/40 font-normal">XP</span></div>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.05)]">
                          <Trophy className="h-4 w-4 text-amber-400" />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[9px] text-white/40 mb-1.5">
                          <span>Próximo nível</span>
                          <span className="text-white/60 font-semibold">450 XP restantes</span>
                        </div>
                        <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" style={{ width: "65%" }} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="text-[8px] bg-white/[0.04] border border-white/[0.06] text-white/60 px-1.5 py-0.5 rounded uppercase font-semibold">Insignia: Lucro Rápido</span>
                          <span className="text-[8px] bg-primary/10 border border-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-semibold">Ativa</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live Community Feed Widget Summary */}
                  <button 
                    onClick={() => setActiveTab("Comunidade")}
                    className="glass rounded-xl p-4 border border-white/[0.06] hover:border-primary/20 transition-all space-y-3 text-left w-full cursor-pointer"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                      <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 text-primary" /> Atividade da Comunidade
                      </span>
                      <span className="text-[9px] text-white/20">Acesse o fórum completo</span>
                    </div>
                    <div className="space-y-2.5">
                      {posts.slice(0, 2).map((post, pIdx) => (
                        <div key={pIdx} className="flex items-center justify-between gap-3 text-[10px] hover:bg-white/[0.01] p-1 rounded-lg transition-all">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`h-6 w-6 rounded-full bg-gradient-to-tr ${post.avatarGrad} flex items-center justify-center text-[8px] font-bold text-white shrink-0 shadow-sm`}>
                              {post.init}
                            </div>
                            <p className="text-white/60 truncate leading-relaxed">
                              <strong className="text-white/80 font-medium">{post.name}</strong> {post.action}
                            </p>
                          </div>
                          <span className="text-[9px] text-white/20 shrink-0 font-medium">{post.time}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                </div>
              )}

              {/* Tab 2: Cursos */}
              {activeTab === "Cursos" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Play className="h-3.5 w-3.5 text-primary" /> Seus Cursos & Trilhas
                    </span>
                    <span className="text-[10px] text-white/40">3 Módulos ativos</span>
                  </div>

                  <div className="space-y-3">
                    {[
                      { title: "Formação em Funis de WhatsApp", category: "Trilha Principal", prog: 75, active: true },
                      { title: "Copywriting de Altíssima Conversão", category: "Trilha Copy", prog: 30, active: false },
                      { title: "Tráfego Estelar Avançado (Meta & Google)", category: "Trilha Tráfego", prog: 0, locked: true },
                    ].map((course, idx) => (
                      <div
                        key={idx}
                        className={`glass rounded-xl p-4 border border-white/[0.06] flex items-center justify-between gap-4 transition-all ${
                          course.locked ? "opacity-60 bg-white/[0.01]" : "hover:border-primary/25"
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{course.category}</span>
                          <h4 className="text-xs font-bold text-white leading-snug">{course.title}</h4>
                          {!course.locked ? (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="h-1 w-20 bg-white/[0.08] rounded-full overflow-hidden">
                                <div className="h-full gradient-primary" style={{ width: `${course.prog}%` }} />
                              </div>
                              <span className="text-[9px] text-white/45 font-medium">{course.prog}% concluído</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-amber-400 font-semibold flex items-center gap-1">
                              <Unlock className="h-2.5 w-2.5" /> Desbloqueie no plano Premium
                            </span>
                          )}
                        </div>

                        {!course.locked ? (
                          <button 
                            onClick={() => { setActiveVideoCourse({ title: course.title, category: course.category }); setIsPlaying(true); setCurrentTime(0); }}
                            className="h-7 px-3 rounded-lg gradient-primary text-white text-[10px] font-bold shadow-md flex items-center gap-1 hover:scale-[1.03] transition-all cursor-pointer"
                          >
                            <Play className="h-3 w-3 fill-white" /> Assistir
                          </button>
                        ) : (
                          <div className="h-7 w-7 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0">
                            <Unlock className="h-3.5 w-3.5 text-white/20" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Comunidade (Fully Interactive Simulator) */}
              {activeTab === "Comunidade" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" /> Feed da Comunidade (Simulador)
                    </span>
                    <span className="text-[10px] text-white/40">Digite e faça um post!</span>
                  </div>

                  {/* Create simulated Post */}
                  <form onSubmit={handleCreatePost} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Compartilhe um resultado ou dúvida..."
                      value={newPostText}
                      onChange={(e) => setNewPostText(e.target.value)}
                      className="flex-1 text-xs bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
                    />
                    <button
                      type="submit"
                      className="gradient-primary text-white text-xs font-bold px-4 rounded-xl hover:scale-[1.02] transition-transform cursor-pointer"
                    >
                      Postar
                    </button>
                  </form>

                  {/* Posts List */}
                  <div className="space-y-3.5 mt-2">
                    {posts.map((post) => (
                      <div key={post.id} className="glass rounded-xl p-3 border border-white/[0.06] space-y-2 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`h-6 w-6 rounded-full bg-gradient-to-tr ${post.avatarGrad} flex items-center justify-center text-[8px] font-bold text-white shadow-sm`}>
                              {post.init}
                            </div>
                            <div>
                              <div className="text-[10px] font-semibold text-white/80">{post.name}</div>
                              <div className="text-[8px] text-white/30">{post.time}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center gap-1 text-[9px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                              post.liked
                                ? "bg-primary/20 border-primary text-primary font-bold shadow-[0_0_8px_rgba(180,120,255,0.08)]"
                                : "bg-white/[0.02] border-white/[0.04] text-white/40 hover:text-white/60"
                            }`}
                          >
                            <Trophy className={`h-3 w-3 ${post.liked ? "fill-primary text-primary animate-bounce" : "text-white/30"}`} />
                            <span>{post.likes}</span>
                          </button>
                        </div>
                        <p className="text-[10px] text-white/60 leading-relaxed pl-8">{post.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Fórum de Dúvidas (Fully Functional Support Simulation with AI Auto-Answer) */}
              {activeTab === "Fórum de Dúvidas" && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" /> Fórum de Dúvidas Práticas
                    </span>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Tutor Online</span>
                  </div>

                  {/* Ask simulated Ticket form */}
                  <form onSubmit={handleCreateTicket} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Dúvida com webhook, tráfego ou API? Pergunte aqui..."
                      value={ticketInput}
                      onChange={(e) => setTicketInput(e.target.value)}
                      disabled={ticketLoading}
                      className="flex-1 text-xs bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:border-primary/40 disabled:opacity-50 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={ticketLoading}
                      className="gradient-primary text-white text-xs font-bold px-4 rounded-xl hover:scale-[1.02] disabled:opacity-50 transition-transform cursor-pointer"
                    >
                      {ticketLoading ? "Digitando..." : "Perguntar"}
                    </button>
                  </form>

                  {/* Tickets List */}
                  <div className="space-y-3 mt-2">
                    {tickets.map((t) => (
                      <div key={t.id} className="glass rounded-xl p-4 border border-white/[0.06] space-y-3">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <span className="text-[8px] bg-white/[0.03] border border-white/[0.06] text-white/50 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider">{t.category}</span>
                            <h4 className="text-xs font-bold text-white mt-1 leading-snug">{t.title}</h4>
                            <span className="text-[8px] text-white/30 block mt-0.5">{t.time}</span>
                          </div>
                          <span
                            className={`text-[8px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              t.status === "Resolvido"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        {t.answer && (
                          <div className="bg-black/25 border-l-2 border-primary p-3 rounded-r-xl space-y-1">
                            <span className="text-[9px] font-bold text-primary flex items-center gap-1.5">
                              <GraduationCap className="h-3.5 w-3.5" /> Resposta do Tutor de Suporte
                            </span>
                            <p className="text-[10px] text-white/60 leading-relaxed italic">
                              "{t.answer}"
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Funis de Vendas (Interactive Schematic Flowchart Simulator) */}
              {activeTab === "Funis de Vendas" && (
                <div className="space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> Visualizador de Funis Ativos
                    </span>
                    <span className="text-[10px] text-white/40">Selecione o modelo abaixo</span>
                  </div>

                  {/* Selector Buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "whatsapp", label: "Whats Automatizado" },
                      { id: "vsl", label: "Página VSL" },
                      { id: "organic", label: "Tráfego Orgânico" },
                    ].map((funnel) => (
                      <button
                        key={funnel.id}
                        onClick={() => setActiveFunnel(funnel.id)}
                        className={`py-2 px-1 text-center rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                          activeFunnel === funnel.id
                            ? "border-primary bg-primary/10 text-white shadow-[0_0_10px_rgba(180,120,255,0.06)]"
                            : "border-white/[0.04] bg-white/[0.01] text-white/40 hover:text-white/60"
                        }`}
                      >
                        {funnel.label}
                      </button>
                    ))}
                  </div>

                  {/* Flowchart Schematic representation */}
                  <div className="glass rounded-xl p-5 border border-white/[0.06] bg-black/10 flex flex-col items-center justify-center min-h-[160px] text-center space-y-4 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />
                    
                    {activeFunnel === "whatsapp" && (
                      <div className="space-y-4 w-full animate-fade-in">
                        <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Estrutura WhatsApp</span>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-white/80">
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Anúncio (Meta Ads)</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 shadow-[0_0_10px_rgba(180,120,255,0.05)]">WhatsApp Automático</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Script Oferta</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold">Venda Confirmada!</div>
                        </div>
                        <p className="text-[9px] text-white/40 max-w-[340px] mx-auto leading-relaxed">
                          Ideal para produtos de Ticket Médio (R$ 97 a R$ 297) com remarketing agressivo e conversão imediata de contatos frios.
                        </p>
                      </div>
                    )}

                    {activeFunnel === "vsl" && (
                      <div className="space-y-4 w-full animate-fade-in">
                        <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Estrutura Vídeo de Vendas</span>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-white/80">
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Tráfego Pago</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Página VSL</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5">Oferta Pitch</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold">Checkout + Order Bump</div>
                        </div>
                        <p className="text-[9px] text-white/40 max-w-[340px] mx-auto leading-relaxed">
                          Perfeito para escalar volumes gigantescos no automático, focado na quebra de objeções em massa via narrativas de vídeo.
                        </p>
                      </div>
                    )}

                    {activeFunnel === "organic" && (
                      <div className="space-y-4 w-full animate-fade-in">
                        <span className="text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded uppercase font-bold tracking-widest">Estrutura Conteúdo Orgânico</span>
                        <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] font-semibold text-white/80">
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Reels / TikTok</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5">Direct Chat (ManyChat)</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02]">Isca Digital</div>
                          <div className="text-primary">➔</div>
                          <div className="px-2.5 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-bold">Venda no Pix</div>
                        </div>
                        <p className="text-[9px] text-white/40 max-w-[340px] mx-auto leading-relaxed">
                          Estratégia sem nenhum gasto com anúncios. Atração por conteúdo viral de valor e fechamento automático de leads via Direct.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Simulated Video Player Modal Overlay */}
      {activeVideoCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div 
            className="glass-strong w-full max-w-2xl rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.06)] relative"
            style={{ background: "rgba(15, 10, 25, 0.8)", backdropFilter: "blur(50px)" }}
          >
            {/* Modal Header */}
            <div className="h-12 border-b border-white/[0.06] bg-white/[0.02] flex items-center px-5 justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Demonstração Interativa</span>
              </div>
              <button 
                onClick={() => { setActiveVideoCourse(null); setIsPlaying(false); }}
                className="text-white/40 hover:text-white transition-colors cursor-pointer text-sm font-semibold p-1"
              >
                Fechar ✕
              </button>
            </div>

            {/* Video Player Box (16:9 ratio) */}
            <div className="relative aspect-video w-full bg-black/50 overflow-hidden flex flex-col items-center justify-center group/player">
              {/* Simulated presenter content/Cosmic visualizer */}
              {isPlaying ? (
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/40 via-black to-indigo-950/40 flex flex-col items-center justify-center">
                  {/* Spinning cosmic light */}
                  <div className="absolute w-[200px] h-[200px] rounded-full bg-primary/5 blur-[50px] animate-pulse" />
                  
                  {/* Dynamic Soundwaves / Equalizer */}
                  <div className="flex items-end gap-1.5 h-16 mb-4">
                    {[20, 45, 30, 60, 40, 75, 50, 85, 35, 65, 45, 20].map((h, i) => (
                      <div 
                        key={i} 
                        className="w-1 rounded-full gradient-primary"
                        style={{ 
                          height: `${h}%`,
                          animation: `bounce-slow 1s ease-in-out infinite alternate`,
                          animationDelay: `${i * 0.08}s`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-white/50 tracking-wide font-medium flex items-center gap-1.5 uppercase">
                    <Play className="h-3 w-3 fill-primary text-primary animate-pulse" /> Transmitindo Aula Prática...
                  </span>
                </div>
              ) : (
                <div 
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center cursor-pointer hover:bg-black/75 transition-colors"
                >
                  <div className="h-14 w-14 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary glow hover:scale-[1.08] transition-transform shadow-lg">
                    <Play className="h-6 w-6 fill-primary" />
                  </div>
                  <span className="text-[10px] text-white/40 mt-3 uppercase tracking-wider font-semibold">Pausado</span>
                </div>
              )}

              {/* Player controls */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col gap-2">
                {/* Timeline Progress Bar */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer relative overflow-hidden group/bar">
                    <div 
                      className="absolute left-0 top-0 bottom-0 gradient-primary rounded-full" 
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Icons row */}
                <div className="flex items-center justify-between text-white/60">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {isPlaying ? (
                        <span className="text-[10px] font-bold">❚❚ Pausar</span>
                      ) : (
                        <Play className="h-3.5 w-3.5 fill-white" />
                      )}
                    </button>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className="hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                    >
                      {isMuted ? (
                        <span className="text-[10px] font-semibold">🔇 Mudo</span>
                      ) : (
                        <span className="text-[10px] font-semibold">🔊 Som</span>
                      )}
                    </button>
                    <span className="text-[10px] text-white/45 font-semibold tracking-wider tabular-nums">
                      {formatTime(currentTime)} / 12:30
                    </span>
                  </div>
                  <span className="text-[9px] bg-white/10 px-2 py-0.5 rounded font-mono uppercase tracking-widest text-white/60">
                    1080p HD
                  </span>
                </div>
              </div>
            </div>

            {/* Video details & CTA Block */}
            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <span className="text-[8px] font-bold text-primary uppercase tracking-widest">{activeVideoCourse.category}</span>
                <h4 className="text-base font-bold text-white mt-1 leading-snug">{activeVideoCourse.title}</h4>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">
                  Descubra os pilares práticos que geram resultados imediatos na escala de vendas automáticas usando a nossa metodologia exclusiva.
                </p>
              </div>

              {/* Premium Call to Action */}
              <div className="rounded-xl border border-white/[0.08] p-4 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: "linear-gradient(135deg, rgba(140, 80, 220, 0.1), rgba(40, 20, 80, 0.05))" }}>
                <div className="text-center sm:text-left space-y-1">
                  <h5 className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Orbit className="h-3.5 w-3.5 text-primary" /> Desbloqueie todo o ambiente Nebula!
                  </h5>
                  <p className="text-[10px] text-white/50 leading-relaxed max-w-sm">
                    Crie sua conta em 30 segundos para assistir às aulas completas, baixar os scripts validados e obter suporte.
                  </p>
                </div>
                <Link 
                  to="/login" 
                  search={{ mode: "signup" }}
                  onClick={() => setActiveVideoCourse(null)}
                  className="gradient-primary text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:scale-[1.03] transition-transform shadow-[0_4px_16px_oklch(0.65_0.22_290/0.4)] btn-glow shrink-0 w-full sm:w-auto text-center"
                >
                  Criar Conta Gratuita
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ─── Urgency Bar ─── */
function UrgencyBar() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-16 max-w-2xl mx-auto">
      <div className={`flex items-center justify-center gap-6 sm:gap-10 py-5 px-6 rounded-2xl border border-white/[0.1] transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`} style={{ background: "rgba(255, 255, 255, 0.03)", backdropFilter: "blur(40px) saturate(1.5)", WebkitBackdropFilter: "blur(40px) saturate(1.5)", boxShadow: "0 4px 24px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)" }}>
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">500+</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">membros lucram</div></div>
        <div className="w-[1px] h-8 bg-white/[0.06]" />
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">3x</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">mais faturamento</div></div>
        <div className="w-[1px] h-8 bg-white/[0.06]" />
        <div className="text-center"><div className="text-lg sm:text-xl font-bold text-gradient">97%</div><div className="text-[9px] uppercase tracking-wider text-white/30 mt-0.5">recomendam</div></div>
      </div>
    </section>
  );
}

/* ─── Trust Badges ─── */
function TrustBadges() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-24 max-w-4xl mx-auto text-center">
      <div className={`transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`}>
        <p className="text-[10px] uppercase tracking-widest text-white/20 mb-5">Integrado com a infraestrutura das principais plataformas de escala</p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-35 hover:opacity-50 transition-opacity duration-300">
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">Stripe</span>
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">Hotmart</span>
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">Kiwify</span>
          <span className="text-xs font-semibold tracking-wider uppercase text-white/70">Eduzz</span>
        </div>
      </div>
    </section>
  );
}

/* ─── Interactive Revenue Calculator ─── */
function RevenueCalculator() {
  const { ref, isVisible } = useScrollReveal();
  const [hours, setHours] = useState(3);
  const [niche, setNiche] = useState("afiliado");

  const getMultiplier = () => {
    switch (niche) {
      case "afiliado": return 1200;
      case "coproducao": return 2200;
      case "trafego": return 3100;
      case "infoproduto": return 4500;
      default: return 1200;
    }
  };

  const estimatedIncome = Math.round(hours * getMultiplier());

  return (
    <section id="calculadora" ref={ref} className="relative z-10 px-5 pb-28 max-w-4xl mx-auto w-full">
      <SectionHeader
        title="Simule seus resultados com a Nebula"
        subtitle="Escolha sua área e tempo de dedicação diária para calcular a estimativa de escala com base na execução do nosso plano prático."
        isVisible={isVisible}
      />
      <div className={`mt-12 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        <GlowCard>
          <div className="grid md:grid-cols-2 gap-8 items-center py-4">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-medium text-white/70 mb-2.5">
                  <span>Tempo dedicado por dia</span>
                  <span className="text-primary font-bold">{hours} {hours === 1 ? "hora" : "horas"}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.08] rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
                />
                <div className="flex justify-between text-[9px] text-white/30 mt-1.5 font-medium">
                  <span>1 hora</span>
                  <span>8 horas</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-2.5">Seu modelo de negócios preferido</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "afiliado", name: "Afiliado" },
                    { id: "coproducao", name: "Coprodução" },
                    { id: "trafego", name: "Tráfego Pago" },
                    { id: "infoproduto", name: "Infoproduto" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setNiche(item.id)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
                        niche === item.id
                          ? "border-primary bg-primary/10 text-white shadow-[0_0_15px_rgba(180,120,255,0.08)]"
                          : "border-white/[0.06] bg-white/[0.02] text-white/50 hover:border-white/10 hover:text-white"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-center md:border-l border-white/[0.06] md:pl-8 py-4 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Projeção Estimada (90 dias)</span>
              <div className="text-3xl sm:text-4xl font-extrabold text-gradient tracking-tight">
                R$ {estimatedIncome.toLocaleString("pt-BR")}
              </div>
              <p className="text-[11px] text-white/35 max-w-[240px] mt-3 leading-relaxed">
                Resultados baseados na média histórica de membros dedicados que seguiram rigorosamente as tarefas práticas.
              </p>
              <Link to="/login" search={{ mode: "signup" }} className="mt-6 inline-flex items-center gap-2 text-xs font-semibold gradient-primary text-white rounded-xl px-5 py-3 transition-all hover:scale-[1.03] shadow-[0_4px_16px_oklch(0.65_0.22_290/0.4)] btn-glow">
                Quero acelerar meu faturamento <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </GlowCard>
      </div>
    </section>
  );
}

/* ─── Plans ─── */
function PlansSection() {
  const { ref, isVisible } = useScrollReveal();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => {
    if (!user) return;
    const fetchUserPlan = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("plan")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.plan) {
          setCurrentPlan(data.plan.toLowerCase());
        }
      } catch (_) {}
    };
    fetchUserPlan();
  }, [user]);

  const targetLink = user ? "/settings" : "/login";

  return (
    <section id="planos" ref={ref} className="relative z-10 px-5 pb-32 max-w-5xl mx-auto">
      <SectionHeader title="Escolha seu ritmo. O resultado é inevitável." subtitle="Não importa onde você está hoje — existe um plano sob medida para o seu momento de escala." isVisible={isVisible} />
      <div className="grid lg:grid-cols-3 gap-6 mt-14">
        
        {/* PLANO 1: FREE / STARTER STYLE */}
        <GlowCard delay={0} isVisible={isVisible}>
          <div className="flex flex-col h-full relative py-2 min-h-[500px]">
            {/* Top Cyan Glow Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-28 bg-gradient-to-b from-cyan-500/10 via-cyan-500/5 to-transparent blur-[32px] rounded-full pointer-events-none" />
            
            {currentPlan === "free" && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-widest shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Atual
              </div>
            )}
            
            <div className="text-center mt-4">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-cyan-400/40">NEBULA.HUB</span>
              <h3 className="text-2xl font-black text-white tracking-tight mt-1">Free</h3>
            </div>

            <div className="text-center my-6 flex flex-col items-center">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white tracking-tight">R$ 0</span>
              </div>
              <span className="text-xs text-white/40 font-semibold mt-1">acesso vitalício</span>
              <span className="text-[10px] font-bold text-cyan-400/90 mt-3 bg-cyan-950/40 border border-cyan-800/30 px-3 py-1 rounded-full inline-block">
                2 cursos liberados
              </span>
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

            <ul className="space-y-3.5 px-2 mb-4">
              <PlanCheckItem color="text-cyan-400">2 cursos e 5 módulos essenciais</PlanCheckItem>
              <PlanCheckItem color="text-cyan-400">Acesso à comunidade de membros</PlanCheckItem>
              <PlanCheckItem color="text-cyan-400">Fórum prático para solução de dúvidas</PlanCheckItem>
              <PlanCheckItem color="text-cyan-400">Aulas estruturadas com tarefas de fixação</PlanCheckItem>
              <span className="text-[10px] text-white/30 italic block mt-2 ml-7">+ 2 recursos essenciais</span>
            </ul>

            <button className="text-[10px] text-white/40 hover:text-white/60 transition-all font-bold flex items-center justify-center gap-1 mx-auto mt-4 mb-6">
              Ver tudo que está incluso <ChevronDown className="h-3 w-3" />
            </button>

            <Link 
              to={targetLink} 
              search={user ? undefined : { mode: "signup" }} 
              className="w-full py-3 px-4 rounded-xl text-center text-xs font-bold border border-white/10 bg-white/[0.01] hover:bg-white/[0.06] hover:border-white/20 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
            >
              Começar Agora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlowCard>

        {/* PLANO 2: PRO / PRO STYLE */}
        <GlowCard delay={150} isVisible={isVisible} featured>
          <div className="flex flex-col h-full relative py-2 min-h-[500px]">
            {/* Top Purple Glow Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-28 bg-gradient-to-b from-violet-600/15 via-violet-600/5 to-transparent blur-[32px] rounded-full pointer-events-none" />
            
            {currentPlan === "pro" && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-widest shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Atual
              </div>
            )}
            
            <div className="text-center mt-4">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-violet-400/40">NEBULA.HUB</span>
              <h3 className="text-2xl font-black text-white tracking-tight mt-1">Pro</h3>
            </div>

            <div className="text-center my-6 flex flex-col items-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-white tracking-tight">R$ 97</span>
                <span className="text-xs text-white/40 font-medium">/ mês</span>
              </div>
              <span className="text-xs text-white/40 font-semibold mt-1">cobrado mensalmente</span>
              <span className="text-[10px] font-bold text-violet-400/90 mt-3 bg-violet-950/40 border border-violet-800/30 px-3 py-1 rounded-full inline-block">
                10 cursos & Kanban
              </span>
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

            <ul className="space-y-3.5 px-2 mb-4">
              <PlanCheckItem color="text-violet-400">Todos os recursos do Free</PlanCheckItem>
              <PlanCheckItem color="text-violet-400">10 cursos e 50 módulos inclusos</PlanCheckItem>
              <PlanCheckItem color="text-violet-400">Acesso total ao Organizador (Kanban)</PlanCheckItem>
              <PlanCheckItem color="text-violet-400">Acesso ao Notas Tiptap com IA Híbrida</PlanCheckItem>
              <span className="text-[10px] text-white/30 italic block mt-2 ml-7">+ 3 recursos adicionais</span>
            </ul>

            <button className="text-[10px] text-white/40 hover:text-white/60 transition-all font-bold flex items-center justify-center gap-1 mx-auto mt-4 mb-6">
              Ver tudo que está incluso <ChevronDown className="h-3 w-3" />
            </button>

            <Link 
              to={targetLink} 
              search={user ? undefined : { mode: "signup" }} 
              className="w-full py-3.5 px-4 rounded-xl text-center text-xs font-bold bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 hover:from-violet-500 hover:to-indigo-600 text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.8)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto btn-glow"
            >
              Começar Agora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </GlowCard>

        {/* PLANO 3: PREMIUM / CREATOR STYLE */}
        <GlowCard delay={300} isVisible={isVisible}>
          <div className="flex flex-col h-full relative py-2 min-h-[500px]">
            {/* Top Gold Glow Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-28 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent blur-[32px] rounded-full pointer-events-none" />
            
            {currentPlan === "premium" && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-widest shadow-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Atual
              </div>
            )}
            
            <div className="text-center mt-4">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-400/40">NEBULA.HUB</span>
              <h3 className="text-2xl font-black text-white tracking-tight mt-1">Premium</h3>
            </div>

            <div className="text-center my-6 flex flex-col items-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-5xl font-black text-white tracking-tight">R$ 197</span>
                <span className="text-xs text-white/40 font-medium">/ mês</span>
              </div>
              <span className="text-xs text-white/40 font-semibold mt-1">cobrado mensalmente</span>
              <span className="text-[10px] font-bold text-amber-400/90 mt-3 bg-amber-950/40 border border-amber-800/30 px-3 py-1 rounded-full inline-block">
                Cursos ilimitados & Funis
              </span>
            </div>

            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

            <ul className="space-y-3.5 px-2 mb-4">
              <PlanCheckItem color="text-amber-400">Todos os recursos do Pro</PlanCheckItem>
              <PlanCheckItem color="text-amber-400">Cursos e módulos ilimitados (acesso total)</PlanCheckItem>
              <PlanCheckItem color="text-amber-400">Acesso ao Visual Funnel Builder (Funis)</PlanCheckItem>
              <PlanCheckItem color="text-amber-400">Domínio customizado e Analytics Avançado</PlanCheckItem>
              <span className="text-[10px] text-white/30 italic block mt-2 ml-7">+ 4 recursos adicionais</span>
            </ul>

            <button className="text-[10px] text-white/40 hover:text-white/60 transition-all font-bold flex items-center justify-center gap-1 mx-auto mt-4 mb-6">
              Ver tudo que está incluso <ChevronDown className="h-3 w-3" />
            </button>

            <Link 
              to={targetLink} 
              className="w-full py-3 px-4 rounded-xl text-center text-xs font-bold border border-amber-500/30 hover:border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_4px_12px_rgba(245,158,11,0.05)] mt-auto"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Renovar Plano
            </Link>
            <span className="text-[9px] text-white/30 text-center block mt-3 font-medium">
              Acesso total à API • suporte prioritário de elite
            </span>
          </div>
        </GlowCard>
      </div>
    </section>
  );
}

function PlanCheckItem({ children, color = "text-primary" }: { children: React.ReactNode; color?: string }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-white/60 leading-relaxed font-medium">
      <Check className={`h-4 w-4 ${color} shrink-0 mt-0.5`} />
      <span>{children}</span>
    </li>
  );
}

/* ─── Features ─── */
function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();
  const features = [
    { icon: Play, title: "Aulas que geram ação", desc: "Cada aula termina com uma tarefa. Você aplica no mesmo dia e vê resultado." },
    { icon: Users, title: "Comunidade de quem faz", desc: "Não é grupo de motivação. É gente compartilhando o que funciona de verdade." },
    { icon: MessageSquare, title: "Suporte em tempo real", desc: "Travou? Pergunta. Resposta rápida de quem já passou pelo mesmo." },
    { icon: Zap, title: "Gamificação inteligente", desc: "XP, níveis e conquistas que te mantêm no jogo quando a motivação falha." },
    { icon: Target, title: "Mapa de progresso", desc: "Saiba exatamente onde você está e o que falta pro próximo nível de faturamento." },
    { icon: Shield, title: "Método validado", desc: "Não é teoria. É o mesmo processo que gerou múltiplos 5 dígitos pra centenas de alunos." },
  ];
  return (
    <section id="recursos" ref={ref} className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
      <SectionHeader title="Tudo que você precisa. Nada que você não precisa." subtitle="Um ecossistema completo pra você sair do zero e nunca mais voltar." isVisible={isVisible} />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
        {features.map((item, i) => (
          <GlowCard key={item.title} delay={i * 100} isVisible={isVisible}>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 290 / 0.12), oklch(0.65 0.22 290 / 0.04))", border: "1px solid oklch(0.65 0.22 290 / 0.18)" }}>
                <item.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-white/40 mt-1.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── Journey ─── */
function JourneySection() {
  const { ref, isVisible } = useScrollReveal();
  const steps = [
    { step: "01", title: "Crie sua conta em 30 segundos", desc: "Sem cartão, sem formulário gigante. Acesso imediato ao conteúdo que importa." },
    { step: "02", title: "Assista. Aplique. Fature.", desc: "Cada aula é uma ação prática. Resultado vem de execução, não de anotação." },
    { step: "03", title: "Cresça com quem já chegou lá", desc: "Tire dúvidas, copie estratégias validadas e encurte seu caminho." },
    { step: "04", title: "Escale quando sentir que é hora", desc: "Premium e VIP existem pra quando você quiser acelerar. Sem pressão." },
  ];
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-4xl mx-auto">
      <SectionHeader title="4 passos. Sem burocracia." subtitle="Do cadastro ao resultado em tempo recorde." isVisible={isVisible} />
      <div className="mt-12 space-y-4">
        {steps.map((item, i) => (
          <GlowCard key={item.step} delay={i * 120} isVisible={isVisible}>
            <div className="flex items-center gap-5">
              <div className="text-2xl font-bold text-gradient shrink-0 w-10">{item.step}</div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <p className="text-xs text-white/40 mt-1 leading-relaxed">{item.desc}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-primary/30 shrink-0 hidden sm:block" />
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── Testimonials ─── */
function TestimonialsSection() {
  const { ref, isVisible } = useScrollReveal();
  const testimonials = [
    { name: "Lucas M.", role: "Afiliado", quote: "Em 60 dias saí do zero pra R$4.200/mês. O método é simples, mas funciona de verdade.", stars: 5, initials: "LM", grad: "from-blue-500 to-indigo-600" },
    { name: "Camila R.", role: "Infoprodutora", quote: "Já tinha tentado 3 cursos antes. Aqui foi a primeira vez que tive acompanhamento real.", stars: 5, initials: "CR", grad: "from-purple-500 to-pink-500" },
    { name: "Pedro H.", role: "Gestor de tráfego", quote: "A comunidade sozinha já vale. Fechei 2 clientes só com networking dentro da plataforma.", stars: 5, initials: "PH", grad: "from-amber-400 to-orange-500" },
  ];
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-5xl mx-auto">
      <SectionHeader title="Quem entrou, não voltou atrás." subtitle="Resultados reais de pessoas reais." isVisible={isVisible} />
      <div className="grid sm:grid-cols-3 gap-4 mt-12">
        {testimonials.map((item, i) => (
          <GlowCard key={item.name} delay={i * 120} isVisible={isVisible}>
            <div className="flex flex-col gap-3 py-2 h-full">
              <div className="flex gap-0.5">
                {Array.from({ length: item.stars }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-white/50 leading-relaxed italic">&ldquo;{item.quote}&rdquo;</p>
              <div className="mt-auto pt-3 border-t border-white/[0.05] flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full bg-gradient-to-tr ${item.grad} flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0`}>
                  {item.initials}
                </div>
                <div>
                  <div className="text-xs font-semibold text-white/70">{item.name}</div>
                  <div className="text-[10px] text-white/30">{item.role}</div>
                </div>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>
    </section>
  );
}

/* ─── FAQ Accordion Section ─── */
function FAQSection() {
  const { ref, isVisible } = useScrollReveal();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Preciso ter conhecimento de tráfego ou vendas para começar?",
      a: "De forma alguma. O ecossistema Nebula foi inteiramente planejado para guiar pessoas do zero absoluto. Ensinamos os fundamentos básicos de anúncios e funis até as automações mais sofisticadas passo a passo."
    },
    {
      q: "Por quanto tempo terei acesso à plataforma Nebula?",
      a: "No plano gratuito, seu acesso é vitalício ao conteúdo inicial de introdução. Ao assinar o plano Premium ou VIP, seu acesso é mantido enquanto sua assinatura estiver ativa, garantindo direito a todas as atualizações semanais."
    },
    {
      q: "Como funciona o suporte técnico e estratégico?",
      a: "Nós valorizamos a velocidade. Se você tiver qualquer dúvida prática enquanto executa as aulas, basta publicar no nosso Fórum de Dúvidas integrado ou conversar na comunidade. Nossa equipe e outros membros qualificados auxiliam de imediato."
    },
    {
      q: "Existe fidelidade ou posso cancelar quando quiser?",
      a: "Não há fidelidade alguma. Você é totalmente livre para assinar, fazer o upgrade ou cancelar sua assinatura mensal Premium ou VIP quando preferir, diretamente pelas configurações do seu perfil de usuário com apenas 1 clique."
    }
  ];

  return (
    <section id="faq" ref={ref} className="relative z-10 px-5 pb-28 max-w-3xl mx-auto">
      <SectionHeader
        title="Perguntas Frequentes"
        subtitle="Tudo o que você precisa saber para tomar a sua decisão e iniciar hoje."
        isVisible={isVisible}
      />
      <div className="mt-12 space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border border-white/[0.06] transition-all duration-300 overflow-hidden ${
                isOpen ? "bg-white/[0.03] border-white/10" : "bg-white/[0.01] hover:border-white/[0.08]"
              }`}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left text-xs font-semibold text-white/90 focus:outline-none"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-white/40 shrink-0 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>
              <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${
                  isOpen ? "max-h-[200px] border-t border-white/[0.04]" : "max-h-0 opacity-0"
                }`}
              >
                <p className="p-5 text-xs text-white/50 leading-relaxed bg-black/10">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function CTASection() {
  const { ref, isVisible } = useScrollReveal();
  return (
    <section ref={ref} className="relative z-10 px-5 pb-28 max-w-3xl mx-auto text-center">
      <GlowCard isVisible={isVisible}>
        <div className="py-6 sm:py-10">
          <Rocket className="h-8 w-8 text-primary mx-auto mb-5 opacity-60 animate-bounce-slow" />
          <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight text-white transition-all duration-700 delay-100 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>Daqui a 90 dias você vai se arrepender de não ter começado hoje.</h2>
          <p className={`mt-4 text-sm text-white/40 max-w-md mx-auto leading-relaxed transition-all duration-700 delay-200 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>O acesso gratuito não vai durar pra sempre. Enquanto a porta tá aberta, entra.</p>
          <Link to="/login" search={{ mode: "signup" }} className={`mt-8 inline-flex items-center gap-2.5 gradient-primary text-white rounded-2xl px-8 py-4 text-sm font-semibold shadow-[0_8px_36px_-6px_oklch(0.65_0.22_290/0.55),inset_0_1px_0_oklch(1_0_0/0.2)] transition-all hover:scale-[1.04] will-change-transform btn-glow duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            Garantir minha vaga agora <ArrowRight className="h-4 w-4" />
          </Link>
          <p className={`mt-4 text-[11px] text-white/25 transition-all duration-700 delay-[400ms] ${isVisible ? "opacity-100" : "opacity-0"}`}>Sem cartão. Sem compromisso. Acesso imediato.</p>
        </div>
      </GlowCard>
    </section>
  );
}

/* ─── Utility Components ─── */

function PlanItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-xs text-white/50 leading-relaxed">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />{children}
    </li>
  );
}

function SectionHeader({ title, subtitle, isVisible }: { title: string; subtitle: string; isVisible: boolean }) {
  return (
    <div className={`text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{title}</h2>
      <p className="mt-3 text-sm text-white/40 max-w-lg mx-auto leading-relaxed">{subtitle}</p>
    </div>
  );
}

function GlowCard({ children, delay = 0, isVisible = true, featured = false }: { children: React.ReactNode; delay?: number; isVisible?: boolean; featured?: boolean }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current; const glow = glowRef.current;
    if (!card || !glow) return;
    const rect = card.getBoundingClientRect();
    glow.style.opacity = "1";
    glow.style.background = `radial-gradient(300px circle at ${e.clientX - rect.left}px ${e.clientY - rect.top}px, rgba(180, 120, 255, 0.12), transparent 60%)`;
  }, []);
  const handleMouseLeave = useCallback(() => { if (glowRef.current) glowRef.current.style.opacity = "0"; }, []);
  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-700 hover:scale-[1.02] will-change-transform ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${featured ? "ring-1 ring-purple-400/20" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div ref={glowRef} className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 will-change-[opacity] z-10" />
      <div className="relative rounded-2xl p-5 sm:p-6 h-full border border-white/[0.1]" style={{
        background: featured
          ? "rgba(255, 255, 255, 0.04)"
          : "rgba(255, 255, 255, 0.02)",
        backdropFilter: "blur(40px) saturate(1.5) brightness(1.1)",
        WebkitBackdropFilter: "blur(40px) saturate(1.5) brightness(1.1)",
        boxShadow: featured
          ? "0 8px 32px rgba(140, 80, 220, 0.08), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(255,255,255,0.02)"
          : "0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(255,255,255,0.02)",
      }}>
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        <div className="relative z-10">{children}</div>
      </div>
    </div>
  );
}

/* ─── Background ─── */
function NebulaBackground({ scrollY }: { scrollY: number }) {
  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      {/* Base Space Dark Gradient */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 100%, rgba(40, 15, 80, 0.2), rgba(20, 8, 50, 0.08) 50%, transparent 80%), black" }} />
      
      {/* Minimalist Nebula Clouds with Parallax & Slow Drifting Animations */}
      <div className="absolute inset-0 overflow-hidden opacity-75">
        {/* Purple Nebula Cloud */}
        <div 
          className="absolute -top-[10%] -left-[10%] w-[80vw] h-[80vw] rounded-full mix-blend-screen animate-nebula-1 will-change-transform"
          style={{
            background: "radial-gradient(circle at 40% 40%, rgba(140, 60, 255, 0.18) 0%, rgba(80, 30, 160, 0.05) 50%, transparent 80%)",
            filter: "blur(110px)",
            transform: `translateY(${scrollY * 0.04}px)`,
          }}
        />
        
        {/* Deep Violet / Pinkish Nebula Cloud */}
        <div 
          className="absolute top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full mix-blend-screen animate-nebula-2 will-change-transform"
          style={{
            background: "radial-gradient(circle at 60% 60%, rgba(180, 70, 220, 0.14) 0%, rgba(100, 30, 180, 0.04) 55%, transparent 85%)",
            filter: "blur(120px)",
            transform: `translateY(${scrollY * -0.03}px)`,
          }}
        />

        {/* Celestial Indigo/Blue Center Cloud for depth contrast */}
        <div 
          className="absolute top-[35%] left-[15%] w-[65vw] h-[65vw] rounded-full mix-blend-screen animate-nebula-1 will-change-transform"
          style={{
            background: "radial-gradient(circle at 50% 50%, rgba(45, 100, 245, 0.1) 0%, rgba(30, 60, 180, 0.03) 50%, transparent 80%)",
            filter: "blur(130px)",
            transform: `translateY(${scrollY * 0.015}px)`,
          }}
        />
      </div>
      
      {/* Interactive Twinkling Stars */}
      {STARS.map((star) => (
        <div
          key={star.id}
          className="absolute bg-white rounded-full animate-twinkle pointer-events-none"
          style={{
            left: star.left,
            top: star.top,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: star.delay,
            animationDuration: star.duration,
            opacity: 0.25,
            willChange: "opacity",
          }}
        />
      ))}
    </div>
  );
}

/* ─── Styles ─── */
function NebulaStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @keyframes btn-glow-pulse {
        0%, 100% { box-shadow: 0 8px 36px -6px oklch(0.65 0.22 290/0.55), inset 0 1px 0 oklch(1 0 0/0.2); }
        50% { box-shadow: 0 8px 50px -4px oklch(0.65 0.22 290/0.7), inset 0 1px 0 oklch(1 0 0/0.2); }
      }
      @keyframes bounce-slow {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes twinkle {
        0%, 100% { opacity: 0.15; transform: scale(0.8); }
        50% { opacity: 0.95; transform: scale(1.2); }
      }
      @keyframes nebula-slow-1 {
        0%, 100% { transform: translate(0px, 0px) scale(1); }
        50% { transform: translate(30px, -20px) scale(1.05); }
      }
      @keyframes nebula-slow-2 {
        0%, 100% { transform: translate(0px, 0px) scale(1.04); }
        50% { transform: translate(-25px, 25px) scale(0.96); }
      }
      .btn-glow { animation: btn-glow-pulse 3s ease-in-out infinite; }
      .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
      .animate-twinkle { animation: twinkle linear infinite; }
      .animate-nebula-1 { animation: nebula-slow-1 25s ease-in-out infinite; }
      .animate-nebula-2 { animation: nebula-slow-2 30s ease-in-out infinite; }
    `}} />
  );
}

