import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Orbit, Mail, Lock, ArrowRight, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type LoginSearch = {
  mode?: "signin" | "signup";
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): LoginSearch => {
    return {
      mode: (search.mode === "signup" || search.mode === "signin") ? search.mode : undefined,
    };
  },
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Membros" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { session } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode || "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (search.mode) {
      setMode(search.mode);
    }
  }, [search.mode]);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
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
    } catch (err: any) {
      toast.error(err.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass-strong rounded-2xl p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center glow mb-4">
              <Orbit className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold">
              {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {mode === "signin" ? "Entre para acessar sua área" : "Comece em segundos"}
            </p>
          </div>

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

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field icon={<UserIcon className="h-4 w-4" />} label="Nome" placeholder="Seu nome"
                value={name} onChange={(e) => setName(e.target.value)} required />
            )}
            <Field icon={<Mail className="h-4 w-4" />} type="email" label="Email" placeholder="seu@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Field icon={<Lock className="h-4 w-4" />} type="password" label="Senha" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {loading ? "Aguarde..." : <>{mode === "signin" ? "Entrar" : "Criar conta"} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/landing" className="hover:text-foreground transition-colors">← Ir para a Página de Vendas</a>
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ icon, label, ...props }: { icon: React.ReactNode; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
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