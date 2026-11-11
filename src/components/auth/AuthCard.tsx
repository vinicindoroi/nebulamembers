import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Lock, Mail, User as UserIcon } from "lucide-react";
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

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass-strong rounded-2xl p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-6">
            <img src={brandLogo.url} alt="Nebula Members" className="mb-5 h-12 w-full max-w-xs object-contain" />
            <h1 className="text-2xl font-semibold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
          </div>

          {mode === "forgot" ? (
            <button
              type="button"
              onClick={goSignIn}
              className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para entrar
            </button>
          ) : (
            <div className="grid grid-cols-2 glass rounded-xl p-1 mb-6 text-xs">
              <button
                onClick={() => setMode("signin")}
                className={`py-2 rounded-lg transition ${mode === "signin" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`py-2 rounded-lg transition ${mode === "signup" ? "bg-white/10 text-foreground" : "text-muted-foreground"}`}
              >
                Criar conta
              </button>
            </div>
          )}

          {mode === "forgot" && sent ? (
            <div className="glass rounded-xl p-5 text-sm">
              <p className="font-medium text-foreground">Link enviado</p>
              <p className="text-muted-foreground mt-1">
                Se existir uma conta para <span className="text-foreground">{email.trim()}</span>, você vai receber
                um link para criar uma nova senha. Confira também a caixa de spam.
              </p>
              <button
                type="button"
                onClick={goSignIn}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 glass rounded-xl px-6 py-3 text-sm font-medium hover:bg-white/5 transition"
              >
                Voltar para entrar
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <Field icon={<UserIcon className="h-4 w-4" />} label="Nome" placeholder="Seu nome"
                  value={name} onChange={(e) => setName(e.target.value)} required />
              )}
              <Field icon={<Mail className="h-4 w-4" />} type="email" label="Email" placeholder="seu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              {mode !== "forgot" && (
                <Field icon={<Lock className="h-4 w-4" />} type="password" label="Senha" placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"} />
              )}

              {mode === "signin" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {loading ? "Aguarde..." : <>{copy.submit} <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/landing" className="hover:text-foreground transition-colors">← Ir para a Página de Vendas</a>
          </p>
        </div>
      </div>
    </main>
  );
}

export function Field({ icon, label, ...props }: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground mb-1.5 block">{label}</span>
      <div className="relative group">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          {...props}
          className="w-full glass rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>
    </label>
  );
}
