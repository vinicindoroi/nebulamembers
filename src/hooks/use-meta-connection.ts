import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { finishMetaConnection, getMetaConnection, startMetaConnection } from "@/lib/meta.functions";
import { toast } from "sonner";

function waitForFacebook(popup: Window, signal: AbortSignal) {
  return new Promise<{ code: string; state: string }>((resolve, reject) => {
    const cleanup = () => { window.removeEventListener("message", onMessage); signal.removeEventListener("abort", onAbort); clearInterval(poll); clearTimeout(timeout); };
    const fail = (message: string) => { cleanup(); popup.close(); reject(new Error(message)); };
    const onAbort = () => fail("Conexão cancelada.");
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== popup || event.data?.type !== "nebula-meta-oauth") return;
      if (event.data.cancelled || typeof event.data.code !== "string" || typeof event.data.state !== "string") return fail("A autorização do Facebook não foi concluída.");
      cleanup(); resolve({ code: event.data.code, state: event.data.state });
    };
    const poll = setInterval(() => { if (popup.closed) fail("A janela do Facebook foi fechada."); }, 500);
    const timeout = setTimeout(() => fail("A conexão expirou. Tente novamente."), 180_000);
    window.addEventListener("message", onMessage);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export function useMetaConnection() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const getConnection = useServerFn(getMetaConnection);
  const start = useServerFn(startMetaConnection);
  const finish = useServerFn(finishMetaConnection);
  const abort = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { abort.current?.abort(); }, []);
  const connection = useQuery({ queryKey: ["meta", user?.id, "connection"], queryFn: () => getConnection(), enabled: !!user, staleTime: 15 * 60_000, gcTime: 60 * 60_000, retry: false });
  const connect = async () => {
    if (!user || busy) return;
    const popup = window.open("", "nebula-facebook", "width=640,height=760");
    if (!popup) { toast.error("Permita abrir a janela do Facebook para conectar."); return; }
    setBusy(true);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const { authorizationUrl } = await start();
      if (controller.signal.aborted) { popup.close(); return; }
      const completed = waitForFacebook(popup, controller.signal);
      popup.location.href = authorizationUrl;
      const result = await finish({ data: await completed });
      await queryClient.invalidateQueries({ queryKey: ["meta", user.id] });
      toast.success(`Facebook conectado: ${result.name}`);
    } catch (error) {
      popup.close();
      if (!controller.signal.aborted) toast.error(error instanceof Error ? error.message : "Não foi possível conectar o Facebook.");
    } finally {
      abort.current = null;
      setBusy(false);
    }
  };
  return { connection, connect, busy, userId: user?.id };
}