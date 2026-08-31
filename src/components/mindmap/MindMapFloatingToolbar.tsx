import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  CheckCircle2, GitFork, MessageSquare, StickyNote, Image, Paperclip, Smile, Link2,
  Palette, Type, Copy, ClipboardPaste,
  Square, Circle, Cloud, RectangleHorizontal, Minus, Plus,
  MoreHorizontal, ChevronDown, ChevronRight,
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MindMapNodeData } from './MindMapNode';
import { MindMapTheme } from './mindMapThemes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';

const BG_COLORS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  '#2d2f3d', '#1e293b', '#E3F2FD', '#E8F5E9', '#FFF3E0',
];

const TEXT_COLORS = ['#ffffff', '#1a1a1a', '#6366f1', '#ef4444', '#10b981', '#f59e0b', '#3b82f6'];

const EMOJIS = ['💡', '⭐', '🎯', '🔥', '✅', '❌', '⚡', '💎', '🚀', '📌', '❤️', '👍', '📊', '🧠', '🎨', '⚙️', '📦', '🏆', '🔑', '💰', '📢', '🎬', '📱', '💻', ''];

const SHAPES: { id: string; icon: React.ComponentType<any>; label: string }[] = [
  { id: 'rounded', icon: RectangleHorizontal, label: 'Arredondado' },
  { id: 'rectangle', icon: Square, label: 'Retângulo' },
  { id: 'ellipse', icon: Circle, label: 'Elipse' },
  { id: 'cloud', icon: Cloud, label: 'Nuvem' },
];

const BORDERS = [
  { id: 'solid', label: 'Sólida' },
  { id: 'dashed', label: 'Tracejada' },
  { id: 'dotted', label: 'Pontilhada' },
  { id: 'none', label: 'Sem borda' },
];

interface Props {
  node: Node;
  theme: MindMapTheme;
  copiedStyle: Partial<MindMapNodeData> | null;
  onUpdateData: (updates: Partial<MindMapNodeData>) => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onOpenDetail: (tab?: string) => void;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
  hasChildren: boolean;
  hasTextSelection?: boolean;
  selectionFormat?: { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean } | null;
  onReportSelection?: (has: boolean, fmt?: { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean }) => void;
}

interface ToolbarIconButtonProps {
  icon: React.ComponentType<any>;
  label: string;
  onClick: () => void;
  active?: boolean;
}

function ToolbarIconButton({ icon: Icon, label, onClick, active }: ToolbarIconButtonProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn('h-8 w-8 rounded-lg', active && 'bg-primary/15 text-primary')}
            onClick={onClick}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MindMapFloatingToolbar({
  node, theme, copiedStyle, onUpdateData, onCopyStyle, onPasteStyle,
  onOpenDetail, onToggleCollapse, isCollapsed, hasChildren, hasTextSelection, selectionFormat,
  onReportSelection,
}: Props) {
  const data = node.data as MindMapNodeData;
  const [styleOpen, setStyleOpen] = useState(false);

  // Helper: after execCommand, re-report selection state so toolbar stays visible
  const execAndReport = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    // Re-read format state after the command
    const sel = window.getSelection();
    const hasSelection = !!(sel && sel.toString().length > 0);
    if (hasSelection && onReportSelection) {
      onReportSelection(true, {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
      });
    }
  };

  // Auto-open style popover when text is selected, with delay to avoid interrupting drag selection
  useEffect(() => {
    if (hasTextSelection) {
      const timer = setTimeout(() => setStyleOpen(true), 350);
      return () => clearTimeout(timer);
    }
  }, [hasTextSelection]);

  return (
    <div
      className="bg-[#111115]/95 backdrop-blur-md border border-[#2a2a35] rounded-xl shadow-2xl shadow-black/50 px-1.5 py-1 flex items-center gap-0.5 whitespace-nowrap animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {/* Primary MindMeister-style action icons */}
      <ToolbarIconButton icon={CheckCircle2} label="Criar task" onClick={() => onOpenDetail('tasks')} />
      <ToolbarIconButton icon={GitFork} label="Adicionar conexão" onClick={() => onOpenDetail('connections')} />
      <ToolbarIconButton icon={MessageSquare} label="Adicionar comentário" onClick={() => onOpenDetail('comments')} />
      <ToolbarIconButton icon={StickyNote} label="Adicionar nota" onClick={() => onOpenDetail('notes')} />
      <ToolbarIconButton icon={Image} label="Adicionar mídia" onClick={() => onOpenDetail('media')} />
      <ToolbarIconButton icon={Paperclip} label="Adicionar anexo" onClick={() => onOpenDetail('attachments')} />
      <ToolbarIconButton icon={Smile} label="Adicionar ícone" onClick={() => {}} active={!!data.emoji} />
      <ToolbarIconButton icon={Link2} label="Adicionar link" onClick={() => onOpenDetail('links')} />

      <div className="w-px h-5 bg-white/10 mx-0.5" />

      {/* Emoji popover (inline since it's quick) */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Emoji/Ícone">
            <span className="text-sm">{data.emoji || '😀'}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-2" side="top" onOpenAutoFocus={(e) => e.preventDefault()}>
          <p className="text-[10px] text-muted-foreground mb-1.5">Ícone do nó</p>
          <div className="grid grid-cols-5 gap-1">
            {EMOJIS.map((e) => (
              <button key={e || 'none'} onClick={() => onUpdateData({ emoji: e })}
                className={cn('h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-sm', data.emoji === e && 'bg-primary/15')}>
                {e || '✕'}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Style popover (Forma/Borda/Linha like MindMeister) */}
      <Popover open={styleOpen} onOpenChange={setStyleOpen}>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className={cn('h-8 w-8 rounded-lg', styleOpen && 'bg-primary/15 text-primary')} title="Estilo">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[260px] p-3" side="top" onOpenAutoFocus={(e) => e.preventDefault()} onKeyDown={(e) => e.stopPropagation()}>
          <Tabs defaultValue="texto">
            <TabsList className="w-full h-8">
              <TabsTrigger value="texto" className="text-xs flex-1">Texto</TabsTrigger>
              <TabsTrigger value="forma" className="text-xs flex-1">Forma</TabsTrigger>
              <TabsTrigger value="borda" className="text-xs flex-1">Borda</TabsTrigger>
            </TabsList>

            <TabsContent value="forma" className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Cores do tema</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {BG_COLORS.map((c) => (
                    <button key={c} onClick={() => onUpdateData({ color: c })}
                      className={cn('w-7 h-7 rounded-full border-2 hover:scale-110 transition-transform',
                        data.color === c ? 'border-primary ring-2 ring-primary/30' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Formato</p>
                <div className="flex gap-1.5">
                  {SHAPES.map((s) => (
                    <Button key={s.id} size="icon" variant={data.shape === s.id ? 'secondary' : 'ghost'}
                      className={cn('h-9 w-9', data.shape === s.id && 'ring-2 ring-primary/30')}
                      onClick={() => onUpdateData({ shape: s.id as any })} title={s.label}>
                      <s.icon className="h-4 w-4" />
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="borda" className="mt-3 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {BORDERS.map((b) => (
                  <Button key={b.id} size="sm" variant={data.borderStyle === b.id ? 'secondary' : 'ghost'}
                    className="h-8 text-xs px-3" onClick={() => onUpdateData({ borderStyle: b.id as any })}>
                    {b.label}
                  </Button>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="texto" className="mt-3 space-y-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Formatação</p>
                <div className="flex gap-1.5">
                  {(() => {
                    const isBold = hasTextSelection ? selectionFormat?.bold : data.fontWeight === 'bold';
                    const isItalic = hasTextSelection ? selectionFormat?.italic : data.fontStyle === 'italic';
                    const isUnderline = hasTextSelection ? selectionFormat?.underline : data.textDecoration === 'underline';
                    const isStrike = hasTextSelection ? selectionFormat?.strikeThrough : data.textDecoration === 'line-through';
                    return (<>
                      <Button size="icon" variant={isBold ? 'secondary' : 'ghost'}
                        className={cn('h-8 w-8', isBold && 'ring-2 ring-primary/30')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (hasTextSelection) { execAndReport('bold'); }
                          else { onUpdateData({ fontWeight: data.fontWeight === 'bold' ? 'normal' : 'bold' }); }
                        }}
                        title="Negrito">
                        <Bold className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant={isItalic ? 'secondary' : 'ghost'}
                        className={cn('h-8 w-8', isItalic && 'ring-2 ring-primary/30')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (hasTextSelection) { execAndReport('italic'); }
                          else { onUpdateData({ fontStyle: data.fontStyle === 'italic' ? 'normal' : 'italic' }); }
                        }}
                        title="Itálico">
                        <Italic className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant={isUnderline ? 'secondary' : 'ghost'}
                        className={cn('h-8 w-8', isUnderline && 'ring-2 ring-primary/30')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (hasTextSelection) { execAndReport('underline'); }
                          else { onUpdateData({ textDecoration: data.textDecoration === 'underline' ? 'none' : 'underline' }); }
                        }}
                        title="Sublinhado">
                        <Underline className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant={isStrike ? 'secondary' : 'ghost'}
                        className={cn('h-8 w-8', isStrike && 'ring-2 ring-primary/30')}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          if (hasTextSelection) { execAndReport('strikeThrough'); }
                          else { onUpdateData({ textDecoration: data.textDecoration === 'line-through' ? 'none' : 'line-through' }); }
                        }}
                        title="Tachado">
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                    </>);
                  })()}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Alinhamento</p>
                <div className="flex gap-1.5">
                  <Button size="icon" variant={data.textAlign === 'left' ? 'secondary' : 'ghost'}
                    className={cn('h-8 w-8', data.textAlign === 'left' && 'ring-2 ring-primary/30')}
                    onClick={() => onUpdateData({ textAlign: 'left' })}
                    title="Esquerda">
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant={(!data.textAlign || data.textAlign === 'center') ? 'secondary' : 'ghost'}
                    className={cn('h-8 w-8', (!data.textAlign || data.textAlign === 'center') && 'ring-2 ring-primary/30')}
                    onClick={() => onUpdateData({ textAlign: 'center' })}
                    title="Centralizar">
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant={data.textAlign === 'right' ? 'secondary' : 'ghost'}
                    className={cn('h-8 w-8', data.textAlign === 'right' && 'ring-2 ring-primary/30')}
                    onClick={() => onUpdateData({ textAlign: 'right' })}
                    title="Direita">
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Tamanho</p>
                <div className="flex gap-1.5">
                  {[{ label: 'P', value: 12 }, { label: 'M', value: 15 }, { label: 'G', value: 20 }].map((f) => (
                    <Button key={f.label} size="sm" variant={data.fontSize === f.value ? 'secondary' : 'ghost'}
                      className="h-8 w-8 text-xs font-semibold p-0" onClick={() => onUpdateData({ fontSize: f.value })}>
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Cor do texto</p>
                <div className="flex gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button key={c}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (hasTextSelection) { execAndReport('foreColor', c); }
                        else { onUpdateData({ textColor: c }); }
                      }}
                      className={cn('w-6 h-6 rounded-full border-2 hover:scale-110 transition-transform',
                        data.textColor === c ? 'border-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>

      {/* More options */}
      <Popover>
        <PopoverTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" title="Mais opções">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[160px] p-1.5" side="top">
          <div className="flex flex-col gap-0.5">
            <Button size="sm" variant="ghost" className="h-7 text-xs justify-start gap-2" onClick={onCopyStyle}>
              <Copy className="h-3.5 w-3.5" /> Copiar estilo
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs justify-start gap-2" onClick={onPasteStyle} disabled={!copiedStyle}>
              <ClipboardPaste className="h-3.5 w-3.5" /> Colar estilo
            </Button>
            {hasChildren && (
              <Button size="sm" variant="ghost" className="h-7 text-xs justify-start gap-2" onClick={onToggleCollapse}>
                {isCollapsed ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {isCollapsed ? 'Expandir' : 'Colapsar'}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
