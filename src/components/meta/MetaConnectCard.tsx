import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Facebook, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useMetaConnection } from "@/hooks/use-meta-connection";
import { disconnectMeta } from "@/lib/meta.functions";
import { toast } from "sonner";

export function MetaConnectCard() {
  const { connection, connect, busy, userId } = useMetaConnection();
  const doDisconnect = useServerFn(disconnectMeta);
  const qc = useQueryClient();
  const { confirm, dialog } = useConfirm();
  const [removing, setRemoving] = useState(false);
  const remove = async () => {
    if (!await confirm({ title: "Desconectar Facebook?", description: "Sua autorização guardada no painel será apagada e as campanhas deixarão de aparecer.", confirmLabel: "Desconectar", variant: "destructive" })) return;
    setRemoving(true);
    try {
      await doDisconnect();
      qc.removeQueries({ queryKey: ["meta", userId, "campaigns"] });
      await qc.invalidateQueries({ queryKey: ["meta", userId, "connection"] });
      toast.success("Facebook desconectado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível desconectar."); }
    finally { setRemoving(false); }
  };
  const data = connection.data;
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <Facebook className="h-5 w-5 text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{data?.connected ? data.name : "Facebook Ads"}</p>
        <p className="text-xs text-muted-foreground">{connection.isPending ? "Consultando conexão…" : connection.isError ? "Não foi possível consultar sua conexão." : !data?.configured ? "Aguardando ativação" : data.reconnect ? "Autorização expirada" : data.connected ? `${data.accounts.length} conta${data.accounts.length === 1 ? "" : "s"} de anúncios · conectada${data.accounts.length === 1 ? "" : "s"}` : "Não conectado"}</p>
      </div>
      {connection.isError ? <Button variant="outline" size="sm" onClick={() => connection.refetch()}>Tentar novamente</Button> : <>
        <Button size="sm" variant={data?.connected ? "outline" : "default"} onClick={connect} disabled={!data?.configured || busy || removing}>
          {busy ? <Loader2 className="animate-spin" /> : <Facebook />}
          {busy ? "Conectando…" : data?.connected ? "Reconectar Facebook" : "Conectar Facebook"}
        </Button>
        {data?.connected && <Button variant="ghost" size="icon" title="Desconectar Facebook" aria-label="Desconectar Facebook" onClick={remove} disabled={busy || removing}><Unplug /></Button>}
      </>}
    </div>
    {data?.connected && !data.reconnect && data.accounts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma conta de anúncios autorizada.</p>}
    {dialog}
  </div>;
}