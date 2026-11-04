import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, RefreshCw, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  listMonitoredSites, addMonitoredSite, removeMonitoredSite, toggleMonitoredSite, getUptimeStats, checkSiteNow,
  updateMonitoredSite,
} from "@/lib/uptime.functions";

const INTERVALS = [
  { v: 60, label: "1 minuto" },
  { v: 300, label: "5 minutos" },
  { v: 900, label: "15 minutos" },
  { v: 1800, label: "30 minutos" },
  { v: 3600, label: "1 hora" },
  { v: 86400, label: "24 horas" },
  { v: 172800, label: "48 horas" },
];

export const Route = createFileRoute("/_app/uptime")({
  component: UptimePage,
  head: () => ({
    meta: [
      { title: "Uptime — Nebula" },
      { property: "og:title", content: "Uptime — Nebula" },
      { property: "og:description", content: "Monitore se seus domínios estão no ar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Monitore se seus domínios estão no ar, com verificação a cada 5 minutos." },
    ],
  }),
});

function UptimePage() {
  const { user } = useAuth();
  const workspaceId = user?.id ?? "";
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const showUrl = (u: string) => u;

  const listSites = useServerFn(listMonitoredSites);
  const fetchStats = useServerFn(getUptimeStats);
  const addSite = useServerFn(addMonitoredSite);
  const removeSite = useServerFn(removeMonitoredSite);
  const toggleSite = useServerFn(toggleMonitoredSite);

  const { data: sites, isLoading } = useQuery({
    queryKey: ["uptime-sites", workspaceId],
    queryFn: () => listSites({ data: { workspaceId } }),
    enabled: !!workspaceId,
  });
  const { data: stats } = useQuery({
    queryKey: ["uptime-stats", workspaceId],
    queryFn: () => fetchStats({ data: { workspaceId } }),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["uptime-sites", workspaceId] });
    qc.invalidateQueries({ queryKey: ["uptime-stats", workspaceId] });
  };

  const addMut = useMutation({
    mutationFn: () => addSite({ data: { workspaceId, url, label: label || undefined } }),
    onSuccess: () => { setUrl(""); setLabel(""); invalidate(); toast.success("Domínio adicionado — primeira verificação feita agora."); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar"),
  });

  const removeMut = useMutation({
    mutationFn: (siteId: string) => removeSite({ data: { siteId } }),
    onSuccess: invalidate,
  });
  const toggleMut = useMutation({
    mutationFn: (v: { siteId: string; active: boolean }) => toggleSite({ data: v }),
    onSuccess: invalidate,
  });
  const checkNowFn = useServerFn(checkSiteNow);
  const checkMut = useMutation({
    mutationFn: (siteId: string) => checkNowFn({ data: { siteId } }),
    onSuccess: (r) => { invalidate(); toast.success(r.ok ? "Domínio no ar" : "Domínio FORA DO AR"); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao verificar"),
  });

  const updateSite = useServerFn(updateMonitoredSite);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    url: "", label: "", check_interval_seconds: 300, notify_email: false, notify_push: true,
  });
  const openEdit = (site: any) => {
    setEditing(site);
    setForm({
      url: site.url,
      label: site.label ?? "",
      check_interval_seconds: site.check_interval_seconds ?? 300,
      notify_email: !!site.notify_email,
      notify_push: site.notify_push !== false,
    });
  };
  const editMut = useMutation({
    mutationFn: () => updateSite({ data: { siteId: editing.id, ...form, label: form.label || undefined } }),
    onSuccess: () => { setEditing(null); invalidate(); toast.success("Domínio atualizado."); },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Uptime <span className="ml-1 rounded-md bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-primary">BETA</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verificamos seus domínios a cada 5 minutos e guardamos 7 dias de histórico.
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Domínio ou URL</label>
            <Input placeholder="minhaoferta.com.br" value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>
          <div className="sm:w-48">
            <label className="mb-1 block text-xs text-muted-foreground">Apelido (opcional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button disabled={!url.trim() || addMut.isPending} onClick={() => addMut.mutate()}>
            <Plus className="mr-1 h-4 w-4" /> Monitorar
          </Button>
        </CardContent>
      </Card>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {!isLoading && !sites?.length && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum domínio monitorado ainda. Adicione o primeiro acima.
        </div>
      )}

      <div className="space-y-3">
        {sites?.map((site: any) => {
          const s = stats?.[site.id];
          const up = s?.last?.ok;
          return (
            <Card key={site.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn(
                      "relative flex h-2.5 w-2.5 shrink-0",
                    )}>
                      <span className={cn(
                        "absolute inline-flex h-full w-full rounded-full opacity-60",
                        !s ? "bg-muted-foreground" : up ? "animate-ping bg-emerald-500" : "bg-destructive",
                      )} />
                      <span className={cn(
                        "relative inline-flex h-2.5 w-2.5 rounded-full",
                        !s ? "bg-muted-foreground" : up ? "bg-emerald-500" : "bg-destructive",
                      )} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{site.label || showUrl(site.url)}</span>
                        {s && (
                          <Badge variant={up ? "default" : "destructive"} className={cn(up && "bg-emerald-600 hover:bg-emerald-600")}>
                            {!s ? "aguardando" : up ? "No ar" : "FORA DO AR"}
                          </Badge>
                        )}
                        {!site.active && <Badge variant="secondary">Pausado</Badge>}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {showUrl(site.url)}
                        {s?.last?.status_code ? ` · HTTP ${s.last.status_code}` : ""}
                        {s?.last?.error ? ` · ${s.last.error}` : ""}
                        {s?.last?.checked_at ? ` · há ${Math.max(0, Math.round((Date.now() - new Date(s.last.checked_at).getTime()) / 60000))} min` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-4 text-xs">
                      <div className="text-center">
                        <div className="text-muted-foreground">24h</div>
                        <div className="font-semibold">{s?.uptime24h != null ? `${s.uptime24h.toFixed(2)}%` : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">7 dias</div>
                        <div className="font-semibold">{s?.uptime7d != null ? `${s.uptime7d.toFixed(2)}%` : "—"}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-muted-foreground">Resp.</div>
                        <div className="font-semibold">{s?.avgMs24h != null ? `${s.avgMs24h}ms` : "—"}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Verificar agora"
                      disabled={checkMut.isPending}
                      onClick={() => checkMut.mutate(site.id)}
                    >
                      <RefreshCw className={cn("h-4 w-4 text-muted-foreground", checkMut.isPending && "animate-spin")} />
                    </Button>
                    <Button variant="ghost" size="sm" title="Editar" onClick={() => openEdit(site)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Switch
                      checked={site.active}
                      onCheckedChange={(active) => toggleMut.mutate({ siteId: site.id, active })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeMut.mutate(site.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {(() => {
                  const total = 48;
                  const recent: any[] = s?.recent ?? [];
                  const empty = Math.max(0, total - recent.length);
                  const pct = recent.length ? (recent.filter((r: any) => r.ok).length / recent.length) * 100 : null;
                  return (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex flex-1 gap-0.5">
                        {Array.from({ length: empty }).map((_, i) => (
                          <span key={`e${i}`} className="h-5 flex-1 rounded-sm bg-muted/40" />
                        ))}
                        {recent.map((r: any, i: number) => (
                          <span
                            key={i}
                            title={`${new Date(r.at).toLocaleString("pt-BR")} — ${r.ok ? "no ar" : "fora do ar"}`}
                            className={cn("h-5 flex-1 rounded-sm", r.ok ? "bg-emerald-500" : "bg-destructive")}
                          />
                        ))}
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">
                        {pct != null ? `${pct.toFixed(2).replace(".", ",")}%` : "—"}
                      </span>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar domínio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Domínio ou URL</label>
              <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tag / apelido</label>
              <Input
                placeholder="OFFER 1 — VERDINHA"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Intervalo de monitoramento</label>
              <Select
                value={String(form.check_interval_seconds)}
                onValueChange={(v) => setForm((f) => ({ ...f, check_interval_seconds: Number(v) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTERVALS.map((i) => (
                    <SelectItem key={i.v} value={String(i.v)}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Avisar no celular</div>
                <div className="text-xs text-muted-foreground">Notificação push se o domínio cair ou voltar.</div>
              </div>
              <Switch
                checked={form.notify_push}
                onCheckedChange={(v) => setForm((f) => ({ ...f, notify_push: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Avisar por e-mail</div>
                <div className="text-xs text-muted-foreground">Requer domínio de envio configurado.</div>
              </div>
              <Switch
                checked={form.notify_email}
                onCheckedChange={(v) => setForm((f) => ({ ...f, notify_email: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!form.url.trim() || editMut.isPending} onClick={() => editMut.mutate()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
