import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { connectStripe, disconnectStripe, getStripeConnection } from "@/lib/stripe-connect.functions";
import { isRestrictedStripeKey } from "@/lib/stripe-sales";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { inputClass } from "@/components/admin/Modal";

export function StripeConnectCard() {
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const getConn = useServerFn(getStripeConnection);
  const doConnect = useServerFn(connectStripe);
  const doDisconnect = useServerFn(disconnectStripe);
  const conn = useQuery({ queryKey: ["stripe-connection"], queryFn: () => getConn(), retry: false });
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const trimmed = key.trim();
  const looksSecret = /^sk_(live|test)_/.test(trimmed);

  const save = async () => {
    if (!isRestrictedStripeKey(trimmed)) {
      toast.error(looksSecret ? "Essa é a chave secreta. Crie uma chave restrita (rk_...) só de leitura." : "Cole uma chave restrita da Stripe (começa com rk_live_ ou rk_test_).");
      return;
    }
    setBusy(true);
    try {
      const res = await doConnect({ data: { key: trimmed } });
      setKey("");
      setEditing(false);
      await qc.invalidateQueries({ queryKey: ["stripe-connection"] });
      qc.invalidateQueries({ queryKey: ["stripe-sales"] });
      toast.success(res.accountName ? `Stripe conectada: ${res.accountName}` : "Stripe conectada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: "Desconectar Stripe?", description: "Suas vendas param de aparecer no painel. A chave é apagada da plataforma.", confirmLabel: "Desconectar", variant: "destructive" });
    if (!ok) return;
    setBusy(true);
    try {
      await doDisconnect();
      await qc.invalidateQueries({ queryKey: ["stripe-connection"] });
      qc.invalidateQueries({ queryKey: ["stripe-sales"] });
      toast.success("Stripe desconectada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const c = conn.data;

  return (
    <div className="space-y-4">
      {conn.isLoading ? (
        <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
      ) : c && !editing ? (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{c.account_name || "Stripe conectada"}</div>
            <div className="text-xs text-muted-foreground">
              Chave ••••{c.key_last4} · {c.livemode ? "modo real" : "modo teste"} · desde {new Date(c.connected_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
          <button onClick={() => setEditing(true)} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition">Trocar chave</button>
          <button onClick={remove} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-border text-destructive hover:bg-destructive/10 transition inline-flex items-center gap-1.5">
            <Unplug className="h-3.5 w-3.5" /> Desconectar
          </button>
        </div>
      ) : (
        <>
          <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-4">
            <li>
              Na Stripe, abra{" "}
              <a href="https://dashboard.stripe.com/apikeys/create?type=restricted" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                Criar chave restrita <ExternalLink className="h-3 w-3" />
              </a>.
            </li>
            <li>Dê um nome (ex.: Nebula) e marque <b className="text-foreground font-medium">Leitura</b> em <b className="text-foreground font-medium">Charges</b>, <b className="text-foreground font-medium">PaymentIntents</b> e <b className="text-foreground font-medium">Checkout Sessions</b>. O resto pode ficar em “Nenhum”.</li>
            <li>Crie a chave, copie (começa com <code className="font-mono">rk_live_</code>) e cole abaixo.</li>
          </ol>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <KeyRound className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                autoComplete="off"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                placeholder="rk_live_..."
                className={`${inputClass} pl-9 font-mono`}
                aria-label="Chave restrita da Stripe"
              />
            </div>
            <button onClick={save} disabled={busy || !trimmed} className="gradient-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Conectando..." : "Conectar"}
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setKey(""); }} className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-muted/50">Cancelar</button>
            )}
          </div>
          {looksSecret && <p className="text-xs text-destructive">Essa é a chave secreta completa. Por segurança, use uma chave restrita só de leitura.</p>}
        </>
      )}
      <p className="text-[11px] text-muted-foreground">
        A chave só lê suas vendas: não cria cobranças nem mexe no seu dinheiro. Ela fica guardada criptografada e ninguém da plataforma consegue vê-la. Para aparecer a campanha, suas vendas precisam ter <code className="font-mono">utm_campaign</code> nos metadados da Stripe.
      </p>
      {dialog}
    </div>
  );
}
