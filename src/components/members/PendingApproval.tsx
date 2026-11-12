import { Clock, LogOut, RefreshCw } from "lucide-react";
import brandLogo from "@/assets/nebula-wordmark.png.asset.json";

export function PendingApproval({
  email,
  checking,
  onRefresh,
  onSignOut,
}: {
  email: string;
  checking: boolean;
  onRefresh: () => void;
  onSignOut: () => void;
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass-strong rounded-2xl p-8 md:p-10 text-center">
          <img src={brandLogo.url} alt="Nebula Members" className="mx-auto mb-6 h-12 w-full max-w-xs object-contain" />
          <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold">Aguarde a confirmação do seu cadastro</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta foi criada e está em análise. Assim que for aprovada, o acesso à plataforma é liberado
            automaticamente nesta tela.
          </p>
          {email && (
            <p className="mt-4 text-xs text-muted-foreground">
              Conta: <span className="text-foreground">{email}</span>
            </p>
          )}
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={checking}
              className="w-full inline-flex items-center justify-center gap-2 gradient-primary text-primary-foreground rounded-xl px-6 py-3 text-sm font-medium disabled:opacity-70"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Verificando..." : "Verificar novamente"}
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full inline-flex items-center justify-center gap-2 glass rounded-xl px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
