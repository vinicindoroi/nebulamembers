import { useState } from 'react';
import { funnelElements, iconMap } from './FunnelNodeTypes';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Layers, Search, X } from 'lucide-react';

interface FunnelElementsSidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
}

// Color mappings for each element type
const colorMap: Record<string, string> = {
  'fb-business-manager': 'bg-facebook',
  'fb-ad-account': 'bg-facebook',
  'fb-page': 'bg-facebook',
  'fb-profile': 'bg-facebook',
  'facebook-ads': 'bg-[#1877F2]',
  'fb-campaign': 'bg-[#1877F2]',
  'fb-adset': 'bg-[#4267B2]',
  'fb-ad': 'bg-[#3578E5]',
  'google-ads': 'bg-gradient-to-r from-[#4285F4] to-[#EA4335]',
  'instagram': 'bg-gradient-to-r from-[#833AB4] via-[#E1306C] to-[#F77737]',
  'youtube': 'bg-[#FF0000]',
  'tiktok-ads': 'bg-gradient-to-r from-[#00F2EA] to-[#FF0050]',
  'lead-capture': 'bg-[#10B981]',
  'pixel': 'bg-[#9333EA]',
  'credit-card': 'bg-[#3B82F6]',
  'boleto': 'bg-[#64748B]',
  'pix': 'bg-[#32BCAD]',
  'recurrence': 'bg-[#8B5CF6]',
  'email': 'bg-[#7C3AED]',
  'whatsapp': 'bg-[#25D366]',
  'whatsapp-message': 'bg-[#25D366]',
  'sms': 'bg-[#6366F1]',
  'cta': 'bg-[#F97316]',
  'ab-test': 'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]',
  'message': 'bg-[#3B82F6]',
  'condition-bought': 'bg-[#22C55E]',
  'condition-not-bought': 'bg-[#EF4444]',
  'condition-timer': 'bg-[#F59E0B]',
  'condition-accepted': 'bg-[#10B981]',
  'condition-rejected': 'bg-[#F43F5E]',
  'sticky-note': 'bg-[#FCD34D]',
  'standalone-line': 'bg-[#6B7280]',
  'ai-tool': 'bg-gradient-to-r from-[#8B5CF6] via-[#6366F1] to-[#3B82F6]',
};

interface ElementItemProps {
  element: { type: string; label: string; icon: any; hasSubcategories?: boolean };
  isPageType?: boolean;
  onDragStart: (e: React.DragEvent, type: string, label: string) => void;
  onExpandFacebook?: () => void;
  isFacebookExpanded?: boolean;
}

function ElementItem({ element, isPageType, onDragStart, onExpandFacebook, isFacebookExpanded }: ElementItemProps) {
  const isCondition = element.type.startsWith('condition-');
  const isStickyNote = element.type === 'sticky-note';
  const isFreeText = element.type === 'free-text';
  const hasSub = element.hasSubcategories;
  
  return (
    <div
      draggable
      data-element-item
      data-element-label={element.label}
      onDragStart={(e) => onDragStart(e, element.type, element.label)}
      onClick={() => hasSub && onExpandFacebook?.()}
      className={cn(
        'funnel-element-item group/item flex items-center gap-2.5 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing',
        'bg-transparent hover:bg-card/70 border border-transparent hover:border-border/80',
        'transition-all duration-150',
        hasSub && 'cursor-pointer'
      )}
    >
      {isPageType ? (
        /* Mini browser mockup for pages */
        <div className="w-9 h-7 rounded-md overflow-hidden bg-[#1f1f24] border border-border shadow-md flex-shrink-0 group-hover/item:border-border transition-colors">
          <div className="h-2 bg-[#26262c] flex items-center px-1 gap-0.5">
            <div className="w-1 h-1 rounded-full bg-[#ff5f57]" />
            <div className="w-1 h-1 rounded-full bg-[#ffbd2e]" />
            <div className="w-1 h-1 rounded-full bg-[#28ca41]" />
          </div>
          <div className="h-5 flex items-center justify-center">
            <element.icon className="w-3 h-3 text-muted-foreground/60" />
          </div>
        </div>
      ) : isCondition ? (
        /* Diamond shape for conditions */
        <div className={cn(
          'w-7 h-7 flex items-center justify-center shadow-md rotate-45 rounded flex-shrink-0',
          colorMap[element.type]
        )}>
          <element.icon className="w-3.5 h-3.5 text-white -rotate-45" />
        </div>
      ) : isStickyNote ? (
        /* Sticky note preview */
        <div className="w-9 h-7 rounded bg-[#FCD34D] shadow-md flex items-center justify-center flex-shrink-0" style={{ transform: 'rotate(-2deg)' }}>
          <element.icon className="w-3.5 h-3.5 text-[#78350F]" />
        </div>
      ) : isFreeText ? (
        /* Free text preview */
        <div className="w-9 h-7 rounded bg-transparent border border-dashed border-muted-foreground/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-medium text-muted-foreground">Aa</span>
        </div>
      ) : (
        /* Circular icon for traffic/actions/payments/automation */
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shadow-md flex-shrink-0 ring-1 ring-white/5',
          colorMap[element.type]
        )}>
          <element.icon className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className="flex-1 flex items-center justify-between min-w-0">
        <span className="text-[11px] text-foreground/70 group-hover/item:text-foreground truncate transition-colors">
          {element.label}
        </span>
        {hasSub && (
          isFacebookExpanded ? (
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
          )
        )}
      </div>
    </div>
  );
}

interface SectionProps {
  title: string;
  elements: typeof funnelElements.traffic;
  isPageType?: boolean;
  onDragStart: (e: React.DragEvent, type: string, label: string) => void;
  defaultOpen?: boolean;
  showFacebookSubcategories?: boolean;
  facebookExpanded?: boolean;
  onToggleFacebookExpanded?: () => void;
  query?: string;
}

function Section({ 
  title, 
  elements, 
  isPageType, 
  onDragStart, 
  defaultOpen = true,
  showFacebookSubcategories,
  facebookExpanded,
  onToggleFacebookExpanded,
  query = "",
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const matches = (label: string) => label.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR'));
  const visible = elements.filter(element => matches(element.label) || (element.hasSubcategories && funnelElements.facebookSubcategories.some(child => matches(child.label))));
  if (!visible.length) return null;
  return (
    <Collapsible open={query ? true : isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-2 hover:bg-card/60 rounded-md transition-colors group/section">
        <h4 className="text-[9px] font-semibold text-muted-foreground/80 uppercase tracking-[0.12em] group-hover/section:text-foreground/80 transition-colors">
          {title}
        </h4>
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-0.5 mt-1">
          {visible.map((element) => (
            <div key={element.type}>
              <ElementItem
                element={element}
                isPageType={isPageType}
                onDragStart={onDragStart}
                onExpandFacebook={element.hasSubcategories ? onToggleFacebookExpanded : undefined}
                isFacebookExpanded={facebookExpanded}
              />
              {/* Facebook subcategories */}
              {element.hasSubcategories && (facebookExpanded || !!query) && showFacebookSubcategories && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1877F2]/30 pl-2">
                  {funnelElements.facebookSubcategories.filter(child => !query || matches(child.label) || matches(element.label)).map((subElement) => (
                    <ElementItem
                      key={subElement.type}
                      element={subElement}
                      onDragStart={onDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function FunnelElementsSidebar({ collapsed, onClose }: FunnelElementsSidebarProps) {
  const [facebookExpanded, setFacebookExpanded] = useState(false);
  const [query, setQuery] = useState("");

  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow/type', nodeType);
    event.dataTransfer.setData('application/reactflow/label', label);
    event.dataTransfer.effectAllowed = 'move';
    
    // Create a custom drag image
    const dragElement = event.currentTarget.cloneNode(true) as HTMLElement;
    dragElement.style.opacity = '0.8';
    dragElement.style.transform = 'scale(1.05)';
    document.body.appendChild(dragElement);
    event.dataTransfer.setDragImage(dragElement, 40, 40);
    setTimeout(() => document.body.removeChild(dragElement), 0);
  };

  if (collapsed) {
    return null;
  }

  return (
    <div className="funnel-panel funnel-elements-panel w-60 border-r border-border flex flex-col">
      <div className="funnel-library-header">
        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Biblioteca de blocos</h2></div><Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose} aria-label="Fechar biblioteca de blocos"><X className="h-3.5 w-3.5" /></Button></div>
        <p className="mt-1 text-xs text-muted-foreground">Arraste uma ideia para o canvas.</p>
        <div className="relative mt-4"><Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><input type="search" aria-label="Buscar blocos" placeholder="Buscar blocos..." value={query} onChange={e => setQuery(e.target.value)} className="funnel-search w-full rounded-lg border border-border py-2 pl-9 pr-3 text-xs outline-none focus:border-primary/60" /></div>
      </div>

      <ScrollArea className="flex-1">
        <div className="funnel-library-sections p-3 space-y-3">
          {query && !Object.values(funnelElements).some(group => Array.isArray(group) && group.some(element => element.label.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")))) && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhum bloco encontrado.</p>}
          <Section query={query}
            title="Tráfego" 
            elements={funnelElements.traffic} 
            onDragStart={onDragStart}
            showFacebookSubcategories
            facebookExpanded={facebookExpanded}
            onToggleFacebookExpanded={() => setFacebookExpanded(!facebookExpanded)}
          />
          
          <Section query={query}
            title="Páginas" 
            elements={funnelElements.pages} 
            isPageType
            onDragStart={onDragStart}
          />
          
          <Section query={query}
            title="Pagamento" 
            elements={funnelElements.payment} 
            onDragStart={onDragStart}
          />

          <Section query={query}
            title="IA" 
            elements={funnelElements.ai} 
            onDragStart={onDragStart}
          />
          
          <Section query={query}
            title="Automação" 
            elements={funnelElements.automation} 
            onDragStart={onDragStart}
          />
          
          <Section query={query}
            title="Ações" 
            elements={funnelElements.actions} 
            onDragStart={onDragStart}
          />
          
          <Section query={query}
            title="Condições" 
            elements={funnelElements.conditions} 
            onDragStart={onDragStart}
          />
          
          <Section query={query}
            title="Conectores" 
            elements={funnelElements.connectors || []} 
            onDragStart={onDragStart}
            defaultOpen={false}
          />
        </div>
      </ScrollArea>
      <div className="funnel-library-footer"><span>Selecionar <kbd>V</kbd></span><span>Mover <kbd>H</kbd></span></div>
    </div>
  );
}
