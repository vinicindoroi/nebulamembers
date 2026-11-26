import { NebulaCanvas } from "./NebulaCanvas";
import { StarText } from "./StarText";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Loader2, CalendarCheck, Eye, EyeOff, Lock, Mail, PlayCircle, User as UserIcon, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { friendlyAuthError } from "@/lib/auth-errors";
import { resetRedirectUrl } from "@/lib/password-reset";
import brandLogo from "@/assets/nebula-wordmark.png.asset.json";

export type AuthMode = "signin" | "signup" | "forgot";

const COPY: Record<AuthMode, { title: string; subtitle: string; submit: string }> = {
  signin: { title: "Bem-vindo de volta", subtitle: "Entre para acessar sua área", submit: "Entrar" },
  signup: { title: "Crie sua conta", subtitle: "Comece em segundos", submit: "Criar conta" },
  forgot: { title: "Recuperar senha", subtitle: "Informe seu e-mail para receber o link", submit: "Enviar link de recuperação" },
};

export function AuthCard({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const last = localStorage.getItem("nebula:last-email");
    if (last) setEmail(last);
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const goSignIn = () => {
    setMode("signin");
    setSent(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo: resetRedirectUrl(window.location.origin),
        });
        if (error) throw error;
        setSent(true);
        toast.success("Link de recuperação enviado. Confira seu e-mail.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Entrando...");
      } else {
        const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem("nebula:last-email", email.trim().toLowerCase());

        // After successful auth, check if restrict_to_leads is active
        const { data: settings } = await supabase
          .from("global_settings")
          .select("restrict_to_leads")
          .eq("id", "current")
          .maybeSingle();

        if (settings?.restrict_to_leads && authData.user) {
          // Check if user is admin via user_roles table — admins always bypass
          const { data: roleData } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", authData.user.id)
            .eq("role", "admin")
            .maybeSingle();

          if (!roleData) {
            // Not admin — check if email exists in leads table
            const { data: exists, error: rpcError } = await supabase
              .rpc("check_email_in_leads", { check_email: email.trim().toLowerCase() });

            if (rpcError) {
              console.warn("[Login] RPC check_email_in_leads failed, allowing login:", rpcError.message);
            } else if (!exists) {
              // Not in leads — sign them out and block
              await supabase.auth.signOut();
              toast.error("Este e-mail não consta na nossa lista de leads autorizados. Por favor, preencha o formulário de aplicação em /forms primeiro!");
              setLoading(false);
              return;
            }
          }
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = COPY[mode];

  let i = 0;
  const rise = () => ({ className: "auth-rise", style: { ["--i" as string]: i++ } as React.CSSProperties });

  return (
    <main className="auth-page relative min-h-svh grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] bg-background overflow-hidden">
      <div aria-hidden className="auth-ambient pointer-events-none absolute -left-40 top-1/4 h-[36rem] w-[36rem] rounded-full" />
      <section className="relative flex items-center justify-center px-6 py-12 sm:px-10">
      <div className="w-full max-w-md 2xl:max-w-lg 2xl:text-[1.05rem]">
          <div className="mb-8">
            <img {...rise()} src={brandLogo.url} alt="Nebula Members" className="auth-rise mb-10 h-10 2xl:h-12 w-auto object-contain" />
            <h1 {...rise()} className="auth-rise text-3xl md:text-4xl 2xl:text-5xl font-semibold tracking-tight">{copy.title}</h1>
            <p {...rise()} className="auth-rise text-sm text-muted-foreground mt-2">{copy.subtitle}</p>
          </div>

          {mode === "forgot" ? (
            <button
              type="button"
              onClick={goSignIn}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para entrar
            </button>
          ) : null}

          {mode === "forgot" && sent ? (
            <div className="glass rounded-2xl p-5 text-sm">
              <p className="font-medium text-foreground">Link enviado</p>
              <p className="text-muted-foreground mt-1">
                Se existir uma conta para <span className="text-foreground">{email.trim()}</span>, você vai receber
                um link para criar uma nova senha. Confira também a caixa de spam.
              </p>
              <button
                type="button"
                onClick={goSignIn}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 glass rounded-2xl px-6 py-3 text-sm font-medium hover:bg-muted transition"
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "signup" && (
                <div {...rise()}><Field icon={<UserIcon className="h-4 w-4" />} label="Nome" placeholder="Seu nome" name="name"
                  value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" /></div>
              )}
              <div {...rise()}><Field icon={<Mail className="h-4 w-4" />} type="email" label="E-mail" placeholder="seu@email.com" name="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" autoFocus={!email} /></div>
              {mode !== "forgot" && (
                <div {...rise()}><PasswordField value={password} onChange={setPassword}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"} /></div>
              )}

              {mode === "signin" && (
                <div {...rise()} className="auth-rise flex justify-end -mt-1">
                  <button type="button" onClick={() => setMode("forgot")}
                    className="text-xs text-primary hover:underline underline-offset-4">
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                {...rise()}
                type="submit"
                disabled={loading}
                className="auth-rise auth-submit group relative overflow-hidden w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-2xl px-6 py-3.5 text-sm font-medium glow transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Aguarde...</> : <>{copy.submit} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
              </button>
            </form>
          )}

          {mode !== "forgot" && (
            <p {...rise()} className="auth-rise text-center text-sm text-muted-foreground mt-8">
              {mode === "signin" ? "Novo por aqui? " : "Já tem conta? "}
              <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-primary hover:underline underline-offset-4">
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          )}
          {mode !== "forgot" && (
            <div {...rise()} className="auth-rise mt-8 flex items-center justify-center gap-4 border-t border-border/50 pt-6">
              <Users aria-hidden className="h-5 w-5 shrink-0 text-primary" />
              <div>
                {/* Verified aggregate of profiles on 2026-11-26; not a live activity count. */}
                <p className="text-sm text-foreground"><span className="font-semibold tabular-nums">60</span> membros cadastrados</p>
                <p className="mt-1 text-xs text-muted-foreground">Nebula Members · 26 nov 2026</p>
              </div>
            </div>
          )}
      </div>
      </section>

      <aside className="relative hidden lg:block p-4">
        <div className="auth-hero relative h-full w-full overflow-hidden rounded-3xl bg-background">
          <NebulaCanvas className="absolute inset-0 h-full w-full" />
          <StarText className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex gap-4 p-8 2xl:p-10">
            {HIGHLIGHTS.map((h, k) => (
              <div key={h.title} className={`auth-card auth-glass rounded-2xl p-5 flex-1 max-w-xs ${k === 1 ? "hidden xl:block" : ""} ${k === 2 ? "hidden 2xl:block" : ""}`} style={{ animationDelay: `${1 + k * 0.2}s` }}>
                <h.icon className="h-5 w-5 text-primary" />
                <p className="mt-3 text-sm font-medium text-foreground">{h.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </main>
  );
}

const HIGHLIGHTS = [
  { icon: PlayCircle, title: "Cursos completos", text: "Aulas organizadas para você avançar no seu ritmo." },
  { icon: CalendarCheck, title: "Mentoria ao vivo", text: "Calls semanais para destravar seus resultados." },
  { icon: Users, title: "Comunidade", text: "Troque experiências com quem está na mesma jornada." },
];

function PasswordField({ value, onChange, autoComplete }: { value: string; onChange: (v: string) => void; autoComplete: string }) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground mb-1.5 block">Senha</span>
      <div className="auth-field relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          <Lock className="h-4 w-4" />
        </span>
        <input type={show ? "text" : "password"} name="password" placeholder="••••••••" required autoComplete={autoComplete}
          value={value} onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))} onBlur={() => setCaps(false)}
          className="w-full glass rounded-2xl pl-11 pr-11 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all" />
        <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Esconder a senha" : "Mostrar a senha"}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {caps && <span className="mt-1.5 block text-[11px] text-primary">Caps Lock está ativado</span>}
    </label>
  );
}

export function Field({ icon, label, ...props }: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground mb-1.5 block">{label}</span>
      <div className="auth-field relative group">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          {...props}
          className="w-full glass rounded-2xl pl-11 pr-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/25 transition-all"
        />
      </div>
    </label>
  );
}
