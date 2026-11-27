import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, MoreHorizontal, Pencil, Trash2, GitFork } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Funnel } from '@/hooks/useFunnels';

function FunnelPreview({ funnel }: { funnel: Funnel }) {
  const nodes = funnel.nodes.filter(node => Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y)).slice(0, 36);
  if (!nodes.length) return <GitFork className="fgf-empty-preview" />;
  const minX = Math.min(...nodes.map(node => node.position.x));
  const minY = Math.min(...nodes.map(node => node.position.y));
  const scale = Math.min(130 / Math.max(120, Math.max(...nodes.map(node => node.position.x)) - minX), 58 / Math.max(100, Math.max(...nodes.map(node => node.position.y)) - minY));
  const points = new Map(nodes.map(node => [node.id, { x: 15 + (node.position.x - minX) * scale, y: 14 + (node.position.y - minY) * scale }]));
  return <svg viewBox="0 0 160 88" className="fgf-preview" aria-hidden="true">
    {funnel.edges.slice(0, 60).map(edge => {
      const a = points.get(edge.source);
      const b = points.get(edge.target);
      if (!a || !b) return null;
      return <path key={edge.id} d={`M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y},${(a.x + b.x) / 2} ${b.y},${b.x} ${b.y}`} />;
    })}
    {nodes.map(node => {
      const point = points.get(node.id);
      if (!point) return null;
      return <rect key={node.id} x={point.x - 4} y={point.y - 4} width="8" height="8" rx="2" />;
    })}
  </svg>;
}

interface FunnelGlassFolderProps {
  label: string;
  funnels: Funnel[];
  open: boolean;
  onToggle: () => void;
  onSelect: (funnel: Funnel) => void;
  onMove?: (funnelId: string) => void;
  onRename?: () => void;
  onDelete?: () => void;
  children: ReactNode;
}

export function FunnelGlassFolder({ label, funnels, open, onToggle, onSelect, onMove, onRename, onDelete, children }: FunnelGlassFolderProps) {
  const contentId = useId();
  const [dragOver, setDragOver] = useState(false);
  return <section className="fgf-group" data-open={open || undefined} data-drag-over={dragOver || undefined}
    onDragOver={event => { if (!onMove) return; event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOver(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as globalThis.Node | null)) setDragOver(false); }}
    onDrop={event => {
      event.preventDefault(); setDragOver(false);
      try {
        const data: unknown = JSON.parse(event.dataTransfer.getData('application/json'));
        if (data && typeof data === 'object' && 'type' in data && data.type === 'funnel' && 'id' in data && typeof data.id === 'string') onMove?.(data.id);
      } catch { /* Ignore drops unrelated to funnels. */ }
    }}>
    <div className="fgf-stage">
      <div className="fgf-back" aria-hidden="true"><div className="fgf-back-contours" /></div>
      <div className="fgf-sheets" aria-hidden={!open}>
        {funnels.slice(0, 3).map((funnel, index) => <Button key={funnel.id} variant="ghost" tabIndex={open ? 0 : -1}
          draggable={open}
          onDragStart={event => {
            event.dataTransfer.setData('application/json', JSON.stringify({ type: 'funnel', id: funnel.id }));
            event.dataTransfer.effectAllowed = 'move';
          }}
          className={`fgf-sheet fgf-sheet-${index}`} aria-label={`Abrir funil ${funnel.name}`} onClick={() => onSelect(funnel)} title={funnel.name}>
          <span className="fgf-sheet-title">{funnel.name}</span>
          <FunnelPreview funnel={funnel} />
        </Button>)}
      </div>
      <div className="fgf-front">
        <Button variant="ghost" className="fgf-hit" aria-label={`${open ? 'Fechar' : 'Abrir'} pasta ${label}`} aria-expanded={open} aria-controls={contentId} onClick={onToggle}>
          <span className="fgf-label"><span className="fgf-title">{label}</span><span className="fgf-meta" key={funnels.length}>{funnels.length} {funnels.length === 1 ? 'funil' : 'funis'}</span></span>
          <ChevronDown className="fgf-chevron" />
        </Button>
      </div>
      {(onRename || onDelete) && <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="fgf-menu-trigger" aria-label={`Opções da pasta ${label}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-glass border-glass-border backdrop-blur-xl">
          <DropdownMenuItem onSelect={onToggle}>{open ? 'Fechar pasta' : 'Abrir pasta'}</DropdownMenuItem>
          {onRename && <DropdownMenuItem onSelect={onRename}><Pencil className="h-3.5 w-3.5" />Renomear pasta</DropdownMenuItem>}
          {onDelete && <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive"><Trash2 className="h-3.5 w-3.5" />Excluir pasta</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>}
    </div>
    <div id={contentId} className="fgf-content" hidden={!open}>{funnels.length ? children : <p className="py-3 text-center text-xs text-muted-foreground">Pasta vazia</p>}</div>
  </section>;
}