import { useState } from 'react';
import { funnelElements, iconMap } from './FunnelNodeTypes';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Facebook, MoveRight } from 'lucide-react';

interface FunnelElementsSidebarProps {
  collapsed?: boolean;
}

// Color mappings for each element type
const colorMap: Record<string, string> = {
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
        'group/item flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-grab active:cursor-grabbing',
        'bg-transparent hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06]',
        'transition-all duration-150',
        hasSub && 'cursor-pointer'
      )}
    >
      {isPageType ? (
        /* Mini browser mockup for pages */
        <div className="w-9 h-7 rounded-md overflow-hidden bg-[#1f1f24] border border-white/5 shadow-md flex-shrink-0 group-hover/item:border-white/10 transition-colors">
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
}: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1.5 hover:bg-white/[0.03] rounded-md transition-colors group/section">
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
          {elements.map((element) => (
            <div key={element.type}>
              <ElementItem
                element={element}
                isPageType={isPageType}
                onDragStart={onDragStart}
                onExpandFacebook={element.hasSubcategories ? onToggleFacebookExpanded : undefined}
                isFacebookExpanded={facebookExpanded}
              />
              {/* Facebook subcategories */}
              {element.hasSubcategories && facebookExpanded && showFacebookSubcategories && (
                <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-[#1877F2]/30 pl-2">
                  {funnelElements.facebookSubcategories.map((subElement) => (
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

export function FunnelElementsSidebar({ collapsed }: FunnelElementsSidebarProps) {
  const [facebookExpanded, setFacebookExpanded] = useState(false);

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
    <div className="w-60 border-r border-white/5 bg-gradient-to-b from-[#0a0a0c] to-[#08080a] flex flex-col">
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <MoveRight className="w-3 h-3 text-primary" />
          </div>
          <h3 className="font-semibold text-sm text-foreground font-display tracking-tight">Elementos</h3>
        </div>
        <p className="text-[10px] text-muted-foreground/70 ml-8">
          Arraste para o canvas
        </p>
        {/* Search for elements */}
        <div className="relative mt-3">
          <input
            type="text"
            placeholder="Filtrar elementos..."
            className="w-full text-[11px] bg-white/[0.02] border border-white/5 rounded-md px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-colors"
            onChange={(e) => {
              const val = e.target.value.toLowerCase();
              document.querySelectorAll('[data-element-item]').forEach((el) => {
                const label = el.getAttribute('data-element-label')?.toLowerCase() || '';
                (el as HTMLElement).style.display = label.includes(val) ? '' : 'none';
              });
            }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          <Section 
            title="Tráfego" 
            elements={funnelElements.traffic} 
            onDragStart={onDragStart}
            showFacebookSubcategories
            facebookExpanded={facebookExpanded}
            onToggleFacebookExpanded={() => setFacebookExpanded(!facebookExpanded)}
          />
          
          <Section 
            title="Páginas" 
            elements={funnelElements.pages} 
            isPageType
            onDragStart={onDragStart}
          />
          
          <Section 
            title="Pagamento" 
            elements={funnelElements.payment} 
            onDragStart={onDragStart}
          />

          <Section 
            title="IA" 
            elements={funnelElements.ai} 
            onDragStart={onDragStart}
          />
          
          <Section 
            title="Automação" 
            elements={funnelElements.automation} 
            onDragStart={onDragStart}
          />
          
          <Section 
            title="Ações" 
            elements={funnelElements.actions} 
            onDragStart={onDragStart}
          />
          
          <Section 
            title="Condições" 
            elements={funnelElements.conditions} 
            onDragStart={onDragStart}
          />
          
          <Section 
            title="Conectores" 
            elements={funnelElements.connectors || []} 
            onDragStart={onDragStart}
            defaultOpen={false}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
