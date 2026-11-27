import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Facebook, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetaConnectCard } from "./MetaConnectCard";
import { useMetaConnection } from "@/hooks/use-meta-connection";
import { getMetaCampaigns } from "@/lib/meta.functions";
import { META_PERIODS, type MetaPeriod } from "@/lib/meta/core";

const STATUS: Record<string, string> = { ACTIVE: "Ativa", PAUSED: "Pausada", CAMPAIGN_PAUSED: "Pausada", IN_PROCESS: "Em análise", WITH_ISSUES: "Com pendências", DISAPPROVED: "Reprovada" };
export function MetaCampaignPanel() {
  const { connection, userId } = useMetaConnection();
  const [selectedAccount, setAccount] = useState("");
  const [period, setPeriod] = useState<MetaPeriod>(30);
  const getCampaigns = useServerFn(getMetaCampaigns);
  const accounts = connection.data?.accounts ?? [];
  const accountId = accounts.find((account) => account.id === selectedAccount)?.id ?? accounts[0]?.id ?? "";
  const query = useQuery({ queryKey: ["meta", userId, "campaigns", accountId, period], queryFn: () => getCampaigns({ data: { accountId, period } }), enabled: !!userId && !!accountId && !connection.data?.reconnect, staleTime: 15 * 60_000, gcTime: 60 * 60_000, retry: false });
  const report = query.data;
  const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: report?.account.currency ?? "BRL" }).format(value);
  const totals = report?.campaigns.reduce((sum, campaign) => ({ spend: sum.spend + campaign.spend, impressions: sum.impressions + campaign.impressions, clicks: sum.clicks + campaign.linkClicks }), { spend: 0, impressions: 0, clicks: 0 });
  return <section aria-label="Campanhas Meta" className="border-t border-border pt-6 space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3"><Facebook className="h-5 w-5 text-primary" /><div><h2 className="text-lg font-semibold">Campanhas Meta</h2><p className="text-xs text-muted-foreground">Facebook · Instagram</p></div></div>
      {accounts.length > 0 && <div className="flex flex-wrap items-center gap-2 max-w-full">
        <Select value={accountId} onValueChange={setAccount}><SelectTrigger aria-label="Conta de anúncios" className="w-52 max-w-full"><SelectValue /></SelectTrigger><SelectContent>{accounts.map((account) => <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>)}</SelectContent></Select>
        <div className="flex border border-border rounded-lg p-0.5" role="group" aria-label="Período das campanhas">{META_PERIODS.map((value) => <Button key={value} size="sm" variant={value === period ? "secondary" : "ghost"} aria-pressed={value === period} onClick={() => setPeriod(value)}>{value === "today" ? "Hoje" : `${value}d`}</Button>)}</div>
        <Button size="icon" variant="ghost" title="Atualizar campanhas" aria-label="Atualizar campanhas" disabled={query.isFetching} onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? "animate-spin" : ""} /></Button>
      </div>}
    </header>
    {!accountId || connection.data?.reconnect ? <MetaConnectCard /> : <>
      {query.isError && <><MetaConnectCard /><div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-destructive"><span>{query.error.message}</span><Button size="sm" variant="outline" onClick={() => query.refetch()}>Tentar novamente</Button></div></>}
      {query.isPending && <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando campanhas na Meta…</div>}
      {report && totals && <>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[{ label: "Investimento", value: money(totals.spend) }, { label: "Impressões", value: totals.impressions.toLocaleString("pt-BR") }, { label: "Cliques no link", value: totals.clicks.toLocaleString("pt-BR") }, { label: "Campanhas", value: report.campaigns.length.toLocaleString("pt-BR") }].map((metric) => <div key={metric.label} className="min-w-0 border-l border-border pl-4"><p className="text-xs text-muted-foreground">{metric.label}</p><p className="text-xl font-semibold tabular-nums mt-1 break-words">{report.partial ? "≈ " : ""}{metric.value}</p></div>)}
        </div>
        <div className="flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>{report.range.since.split("-").reverse().join("/")} – {report.range.until.split("-").reverse().join("/")} · {report.account.timezone_name}</span><span>Atualizado às {new Date(report.fetchedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></div>
        {report.partial && <p role="status" className="text-xs text-muted-foreground">Relatório parcial; os totais não incluem todas as campanhas.</p>}
        {report.warning && <p role="status" className="text-xs text-muted-foreground">{report.warning}{report.retryAt ? ` · Nova consulta após ${new Date(report.retryAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` : ""}</p>}
        {connection.data?.partial && <p role="status" className="text-xs text-muted-foreground">Lista de contas parcial.</p>}
        {report.campaigns.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma campanha encontrada nesta conta.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="text-xs text-muted-foreground"><tr className="border-b border-border">{["Campanha", "Status", "Investimento", "Cliques no link", "CTR do link", "Compras Meta", "ROAS Meta"].map((label, index) => <th key={label} className={`py-3 font-medium ${index < 2 ? "text-left" : "text-right"} pr-3`}>{label}</th>)}</tr></thead><tbody>{report.campaigns.map((campaign) => <tr key={campaign.id} className="border-b border-border/50"><td className="py-3 pr-4 max-w-64"><p className="truncate" title={campaign.name}>{campaign.name}</p><p className="text-[10px] text-muted-foreground">{campaign.objective}</p></td><td className="pr-3 text-xs"><span className={campaign.status === "ACTIVE" ? "text-primary" : "text-muted-foreground"}>{STATUS[campaign.status] ?? campaign.status}</span></td><td className="text-right pr-3 tabular-nums">{campaign.metricsAvailable ? money(campaign.spend) : "—"}</td><td className="text-right pr-3 tabular-nums">{campaign.metricsAvailable ? campaign.linkClicks.toLocaleString("pt-BR") : "—"}</td><td className="text-right pr-3 tabular-nums">{campaign.metricsAvailable ? `${campaign.ctr.toFixed(2)}%` : "—"}</td><td className="text-right pr-3 tabular-nums">{campaign.purchases ?? "—"}</td><td className="text-right pr-3 tabular-nums">{campaign.roas === null ? "—" : `${campaign.roas.toFixed(2)}×`}</td></tr>)}</tbody></table></div>}
      </>}
    </>}
  </section>;
}