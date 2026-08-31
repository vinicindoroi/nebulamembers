import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Code, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Funnel } from '@/hooks/useFunnels';
import { Node } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface FunnelTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funnel: Funnel;
  nodes: Node[];
  onTokenGenerated?: (token: string) => void;
}

export function FunnelTrackingDialog({
  open,
  onOpenChange,
  funnel,
  nodes,
  onTokenGenerated,
}: FunnelTrackingDialogProps) {
  const [trackingToken, setTrackingToken] = useState(funnel.tracking_token || '');
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('purchase');
  const [activeTab, setActiveTab] = useState('basic');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  // Get page nodes for dropdown
  const pageNodes = nodes.filter((n) => {
    const data = n.data as { type?: string };
    const type = data.type || '';
    // Include all trackable node types (pages, payment, traffic sources, etc.)
    return ['page', 'checkout', 'upsell', 'downsell', 'thank-you', 'optin', 'webinar', 'vsl', 'bridge', 'quiz', 'blog', 'social', 'ad', 'email', 'whatsapp', 'sms', 'telegram', 'traffic-source', 'custom', 'members-area', 'presell'].includes(type) || type !== '';
  });

  useEffect(() => {
    if (pageNodes.length > 0 && !selectedNode) {
      setSelectedNode(pageNodes[0].id);
    }
  }, [pageNodes, selectedNode]);

  const generateToken = async () => {
    setIsGenerating(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 32);

      const { error } = await supabase
        .from('funnels')
        .update({ tracking_token: token })
        .eq('id', funnel.id);

      if (error) throw error;

      setTrackingToken(token);
      onTokenGenerated?.(token);
      toast.success('Token de tracking gerado com sucesso!');
    } catch (error) {
      console.error('Error generating token:', error);
      toast.error('Erro ao gerar token');
    } finally {
      setIsGenerating(false);
    }
  };

  const getTrackingScript = () => {
    if (!trackingToken) return '// Gere um token primeiro';

    const nodeLabel = nodes.find((n) => n.id === selectedNode)?.data?.label || selectedNode;
    const nodeData = nodes.find((n) => n.id === selectedNode)?.data as { pageType?: string; type?: string } | undefined;
    const isQuizNode = nodeData?.pageType === 'quiz' || nodeData?.type === 'quiz';
    const initOptions = isQuizNode
      ? `{token:'${trackingToken}',node:'${selectedNode}',quiz:'auto'}`
      : `{token:'${trackingToken}',node:'${selectedNode}'}`;

    return `<!-- Tracking Script - Funil: ${funnel.name} - Página: ${nodeLabel} -->
<script>
(function(w,d,f,t,n){
  w._ft=w._ft||[];
  var s=d.createElement('script');
  s.async=1;
  s.src='${supabaseUrl}/functions/v1/funnel-tracker/script.js';
  d.head.appendChild(s);
  w._ft.push(['init',${initOptions}]);
})(window,document,'_ft');
</script>`;
  };

  const eventOptions = [
    { value: 'purchase', label: 'Compra', buttonText: 'Comprar Agora', meta: '', nodeTypes: ['condition-bought', 'thank-you', 'checkout'] },
    { value: 'add_to_cart', label: 'Adicionou ao Carrinho', buttonText: 'Adicionar ao Carrinho', meta: "value: 97.00", nodeTypes: ['cart', 'checkout', 'sales-page'] },
    { value: 'initiate_checkout', label: 'Iniciou Checkout', buttonText: 'Ir para Checkout', meta: "value: 97.00", nodeTypes: ['checkout', 'sales-page'] },
    { value: 'lead', label: 'Captura de Lead', buttonText: 'Quero Receber', meta: "source: 'landing-page'", nodeTypes: ['optin', 'sales-page', 'page'] },
    { value: 'view_content', label: 'Visualizou Conteúdo', buttonText: 'Ver Mais', meta: "content_id: '123'", nodeTypes: ['sales-page', 'page', 'blog', 'vsl', 'webinar'] },
    { value: 'upsell_accept', label: 'Aceitou Upsell', buttonText: 'Sim, Eu Quero!', meta: "value: 47.00, offer: 'upsell-1'", nodeTypes: ['upsell'] },
    { value: 'upsell_reject', label: 'Rejeitou Upsell', buttonText: 'Não, Obrigado', meta: "offer: 'upsell-1'", nodeTypes: ['downsell', 'upsell'] },
    { value: 'quiz_step', label: 'Etapa do Quiz', buttonText: '', meta: '', nodeTypes: ['sales-page'] },
  ];

  // Auto-select the matching node when event changes
  const handleEventChange = (eventValue: string) => {
    setSelectedEvent(eventValue);
    const evt = eventOptions.find(e => e.value === eventValue);
    if (!evt) return;

    // Try each preferred node type in order of priority
    for (const targetType of evt.nodeTypes) {
      const match = nodes.find((n) => {
        const data = n.data as { type?: string; pageType?: string };
        if (eventValue === 'quiz_step') return data.pageType === 'quiz';
        return data.type === targetType;
      });
      if (match) {
        setSelectedNode(match.id);
        return;
      }
    }
  };

  const getEventTrackingCode = () => {
    const evt = eventOptions.find(e => e.value === selectedEvent);
    if (!evt) return '';

    if (evt.value === 'quiz_step') {
      return `// Cole no botão de cada etapa do quiz
_ft.push(['quiz_step', {
  step: 1,
  total_steps: 5,
  question: 'Qual seu objetivo?',
  answer: 'Emagrecer',
  node: '${selectedNode}'
}]);`;
    }

    const metaLine = evt.meta ? `\n  meta: { ${evt.meta} }` : '';
    const metaLineComma = evt.meta ? `,\n  meta: { ${evt.meta} }` : '';

    return `<!-- Cole no HTML do botão -->
<button onclick="_ft.push(['track', {
  event: '${evt.value}',
  node: '${selectedNode}'${metaLineComma}
}])">
  ${evt.buttonText}
</button>

<!-- Ou via JavaScript -->
<script>
document.getElementById('meu-botao')
  .addEventListener('click', function() {
    _ft.push(['track', {
      event: '${evt.value}',
      node: '${selectedNode}'${metaLineComma}
    }]);
  });
</script>`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Falha ao copiar');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-[#1a1a1f] border-[#2a2a30]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Code className="w-5 h-5 text-primary" />
            Script de Tracking
          </DialogTitle>
          <DialogDescription>
            Adicione este script às suas páginas para coletar dados de tráfego em tempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Token Section */}
          <div className="space-y-3">
            <Label>Token de Tracking</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={trackingToken}
                readOnly
                placeholder="Clique em gerar para criar um token"
                className="font-mono text-xs sm:text-sm bg-[#0a0a0c] border-[#2a2a30] min-w-0"
              />
              <Button
                variant="outline"
                onClick={generateToken}
                disabled={isGenerating}
                className="shrink-0"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', isGenerating && 'animate-spin')} />
                {trackingToken ? 'Regenerar' : 'Gerar'}
              </Button>
            </div>
            {trackingToken && (
              <p className="text-xs text-muted-foreground">
                ⚠️ Regenerar o token invalidará scripts já instalados.
              </p>
            )}
          </div>

          {/* Node Selection - only active on basic tab */}
          {activeTab === 'basic' && (
            <div className="space-y-3">
              <Label>Página para Tracking</Label>
              <Select value={selectedNode} onValueChange={setSelectedNode}>
                <SelectTrigger className="bg-[#0a0a0c] border-[#2a2a30]">
                  <SelectValue placeholder="Selecione uma página" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                  {pageNodes.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {(node.data as { label?: string }).label || node.id}
                    </SelectItem>
                  ))}
                  {pageNodes.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhuma página encontrada
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Script Tabs */}
          <Tabs defaultValue="basic" onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#0a0a0c]">
              <TabsTrigger value="basic">Script Básico</TabsTrigger>
              <TabsTrigger value="events">Eventos Personalizados</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-3">
              <div className="relative">
                <pre className="p-4 rounded-lg bg-[#0a0a0c] border border-[#2a2a30] overflow-x-auto text-[11px] sm:text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {getTrackingScript()}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(getTrackingScript())}
                  disabled={!trackingToken}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole este script antes do <code>&lt;/head&gt;</code> ou <code>&lt;/body&gt;</code> da sua página.
              </p>
            </TabsContent>

            <TabsContent value="events" className="space-y-3">
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Evento</Label>
                <Select value={selectedEvent} onValueChange={handleEventChange}>
                  <SelectTrigger className="bg-[#0a0a0c] border-[#2a2a30]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1f] border-[#2a2a30]">
                    {eventOptions.map((evt) => (
                      <SelectItem key={evt.value} value={evt.value}>
                        {evt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show which node will receive the event */}
              {(() => {
                const matchedNode = nodes.find(n => n.id === selectedNode);
                const matchedLabel = (matchedNode?.data as { label?: string })?.label || selectedNode;
                return (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                    <Zap className="w-3.5 h-3.5 text-primary shrink-0" />
                    <p className="text-[11px] text-foreground">
                      Evento será registrado no bloco: <strong>{matchedLabel}</strong>
                    </p>
                  </div>
                );
              })()}

              <div className="relative">
                <pre className="p-4 rounded-lg bg-[#0a0a0c] border border-[#2a2a30] overflow-x-auto text-[11px] sm:text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                  {getEventTrackingCode()}
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(getEventTrackingCode())}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O evento será vinculado automaticamente ao bloco correspondente no funil.
              </p>
            </TabsContent>
          </Tabs>

          {/* Features */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Tempo Real
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              Auto UTM
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              fbclid / ttclid / gclid
            </Badge>
            <Badge variant="secondary" className="text-[10px] sm:text-xs">
              Device & Browser
            </Badge>
          </div>

          {/* Help Link */}
          <div className="pt-2 border-t border-[#2a2a30]">
            <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground">
              <ExternalLink className="w-3 h-3 mr-1" />
              Como integrar com GTM, WordPress, etc.
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
