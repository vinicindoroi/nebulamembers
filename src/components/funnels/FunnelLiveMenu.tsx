import { useMemo, useState } from 'react';
import { Node } from '@xyflow/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Radio, Copy, Check, Search, Code, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FunnelLiveMenuProps {
  liveMode: boolean;
  onLiveModeChange: (enabled: boolean) => void;
  nodes: Node[];
  funnelName: string;
  trackingToken: string | null;
  timeRange: number;
  onTimeRangeChange: (value: number) => void;
  getNodeLiveVisitors: (nodeId: string) => number;
  onOpenTracking?: () => void;
  onRefresh?: () => void;
}

const TIME_RANGES = [
  { value: 1, label: 'Última hora' },
  { value: 6, label: 'Últimas 6h' },
  { value: 24, label: 'Últimas 24h' },
  { value: -1, label: 'Hoje' },
  { value: -2, label: 'Ontem' },
  { value: 168, label: 'Últimos 7 dias' },
];

export function FunnelLiveMenu({
  liveMode,
  onLiveModeChange,
  nodes,
  funnelName,
  trackingToken,
  timeRange,
  onTimeRangeChange,
  getNodeLiveVisitors,
  onOpenTracking,
  onRefresh,
}: FunnelLiveMenuProps) {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const trackableNodes = useMemo(
    () =>
      nodes.filter((n) => {
        const data = n.data as { type?: string; label?: string };
        return !!data?.type && !['sticky-note', 'free-text', 'image', 'drawing'].includes(data.type);
      }),
    [nodes],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trackableNodes;
    return trackableNodes.filter((n) => {
      const data = n.data as { label?: string; type?: string };
      return (data.label || '').toLowerCase().includes(q) || (data.type || '').toLowerCase().includes(q);
    });
  }, [trackableNodes, search]);

  const totalLive = useMemo(
    () => trackableNodes.reduce((sum, n) => sum + (getNodeLiveVisitors(n.id) || 0), 0),
    [trackableNodes, getNodeLiveVisitors],
  );

  const buildSnippet = (node: Node) => {
    const data = node.data as { label?: string; pageType?: string; type?: string };
    const label = data.label || node.id;
    if (!trackingToken) return '// Gere um token de tracking primeiro (botão Tracking)';
    const isQuiz = data.pageType === 'quiz' || data.type === 'quiz';
    const opts = isQuiz
      ? `{token:'${trackingToken}',node:'${node.id}',quiz:'auto'}`
      : `{token:'${trackingToken}',node:'${node.id}'}`;
    return `<!-- ${funnelName} — Etapa: ${label} -->
<script>
(function(w,d){
  w._ft=w._ft||[];
  var s=d.createElement('script');
  s.async=1;
  s.src='${supabaseUrl}/functions/v1/funnel-tracker/script.js';
  d.head.appendChild(s);
  w._ft.push(['init',${opts}]);
})(window,document);
</script>`;
  };

  const copy = async (node: Node) => {
    try {
      await navigator.clipboard.writeText(buildSnippet(node));
      setCopiedId(node.id);
      toast.success('Código da etapa copiado!');
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 pl-2.5 pr-2.5 py-1 rounded-full text-xs transition-all',
            liveMode
              ? 'bg-primary/15 border border-primary/30 text-primary'
              : 'hover:bg-muted/50 text-muted-foreground border border-transparent',
          )}
        >
          <Radio className={cn('w-3 h-3', liveMode && 'animate-pulse')} />
          <span className="funnel-toolbar-label font-medium">Live</span>
          {liveMode && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-primary/20 text-[10px] font-semibold text-primary">
              {totalLive}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[360px] p-0 bg-[#16161c] border-border text-foreground"
      >
        {/* Header */}
        <div className="p-3 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className={cn('w-4 h-4 text-primary', liveMode && 'animate-pulse')} />
              <div>
                <p className="text-xs font-semibold">Modo Live</p>
                <p className="text-[11px] text-muted-foreground">
                  {liveMode ? `${totalLive} pessoa(s) ao vivo no funil` : 'Desativado'}
                </p>
              </div>
            </div>
            <Switch checked={liveMode} onCheckedChange={onLiveModeChange} />
          </div>

          <div className="flex items-center gap-2">
            <Select value={String(timeRange)} onValueChange={(v) => onTimeRangeChange(Number(v))}>
              <SelectTrigger className="h-8 text-xs bg-[#0a0a0c] border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a1f] border-border">
                {TIME_RANGES.map((r) => (
                  <SelectItem key={r.value} value={String(r.value)} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {onRefresh && (
              <Button variant="outline" size="sm" className="h-8 px-2 border-border" onClick={onRefresh} title="Atualizar dados">
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div
            className={cn(
              'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-[11px] border',
              trackingToken
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300',
            )}
          >
            <span>{trackingToken ? 'Token de tracking ativo' : 'Nenhum token gerado ainda'}</span>
            {onOpenTracking && (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px]" onClick={onOpenTracking}>
                <Code className="w-3 h-3 mr-1" />
                {trackingToken ? 'Gerenciar' : 'Gerar'}
              </Button>
            )}
          </div>
        </div>

        {/* Blocks list */}
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Código por etapa
            </p>
            <span className="text-[10px] text-muted-foreground">{filtered.length} blocos</span>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar bloco..."
              className="h-8 pl-7 text-xs bg-[#0a0a0c] border-border"
            />
          </div>

          <div className="max-h-[280px] overflow-y-auto space-y-1 pr-1">
            {filtered.map((node) => {
              const data = node.data as { label?: string; type?: string };
              const live = getNodeLiveVisitors(node.id) || 0;
              return (
                <div
                  key={node.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs truncate">{data.label || node.id}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{data.type}</p>
                  </div>
                  {liveMode && live > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-primary/15 text-[10px] text-primary">
                      {live} ao vivo
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 shrink-0"
                    onClick={() => copy(node)}
                    title="Copiar código desta etapa"
                  >
                    {copiedId === node.id ? (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-[11px] text-muted-foreground py-4 text-center">Nenhum bloco encontrado.</p>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Cole o código antes de <code>&lt;/head&gt;</code> da página correspondente para marcar a etapa e
            contar quem está ao vivo nela.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
