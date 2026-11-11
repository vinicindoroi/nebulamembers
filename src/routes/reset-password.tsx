import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyAuthError } from "@/lib/auth-errors";
import { isRecoveryHash } from "@/lib/password-reset";
import { Field } from "@/components/auth/AuthCard";
import brandLogo from "@/assets/nebula-wordmark.png.asset.json";

// O hash é lido assim que o módulo entra na página, antes de o cliente de auth limpá-lo da URL.
const HASH_AT_LOAD = typeof window === "undefined" ? "" : window.location.hash;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({ meta: [
    { title: "Criar nova senha — Nebula Members" },
    { name: "description", content: "Defina uma nova senha para acessar sua área Nebula Members." },
    { property: "og:title", content: "Criar nova senha — Nebula Members" },
    { property: "og:description", content: "Defina uma nova senha para acessar sua área Nebula Members." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

type Status = "checking" | "ready" | "invalid" | "saving" | "done";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>(isRecoveryHash(HASH_AT_LOAD) ? "ready" : "checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Sem link de recuperação válido, não deixa a tela presa em "verificando".
  useEffect(() => {
    if (status !== "checking") return;
    const t = setTimeout(() => setStatus("invalid"), 2000);
    return () => clearTimeout(t);
  }, [status]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setStatus("saving");
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setStatus("done");
      toast.success("Senha alterada com sucesso!");
    } catch (err) {
      const message = friendlyAuthError(err);
      setStatus(/expirou|usado/i.test(message) ? "invalid" : "ready");
      setError(message);
      toast.error(message);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass-strong rounded-2xl p-8 md:p-10">
          <div className="flex flex-col items-center text-center mb-6">
            <img src={brandLogo.url} alt="Nebula Members" className="mb-5 h-12 w-full max-w-xs object-contain" />
            <h1 className="text-2xl font-semibold">
              {status === "done" ? "Senha atualizada" : "Criar nova senha"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {status === "done"
                ? "Agora é só entrar com a senha nova."
                : "Escolha uma senha que você não use em outros sites."}
            </p>
          </div>

          {status === "checking" && (
            <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
              Verificando seu link de recuperação...
            </div>
          )}

          {status === "invalid" && (
            <div className="glass rounded-xl p-5 text-sm">
              <p className="font-medium text-foreground">Link inválido ou expirado</p>
              <p className="text-muted-foreground mt-1">
                Esse link já foi usado ou venceu. Solicite um novo e use o botão do e-mail em até uma hora.
              </p>
              {error && <p className="text-destructive text-xs mt-2">{error}</p>}
              <button
                type="button"
                onClick={() => navigate({ to: "/login", search: { mode: "forgot" } })}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow"
              >
                Solicitar novo link <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {(status === "ready" || status === "saving") && (
            <form onSubmit={onSubmit} className="space-y-4">
              <Field icon={<KeyRound className="h-4 w-4" />} type="password" label="Nova senha" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
              <Field icon={<Lock className="h-4 w-4" />} type="password" label="Confirmar nova senha" placeholder="••••••••"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} autoComplete="new-password" />
              {error && <p className="text-destructive text-xs">{error}</p>}
              <button
                type="submit"
                disabled={status === "saving"}
                className="w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow transition-transform hover:scale-[1.01] disabled:opacity-70"
              >
                {status === "saving" ? "Salvando..." : <>Salvar nova senha <ArrowRight className="h-4 w-4" /></>}
              </button>
            </form>
          )}

          {status === "done" && (
            <div className="space-y-4">
              <div className="glass rounded-xl p-5 text-sm flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">
                  Sua senha foi alterada. Use ela na próxima vez que entrar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium glow"
              >
                Ir para minha área <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <p className="text-center text-xs text-muted-foreground mt-6">
            <a href="/landing" className="hover:text-foreground transition-colors">← Ir para a Página de Vendas</a>
          </p>
        </div>
      </div>
    </main>
  );
}
