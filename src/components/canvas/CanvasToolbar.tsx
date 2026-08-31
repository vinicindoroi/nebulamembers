import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MousePointer,
  Hand,
  Pencil,
  Square,
  Circle,
  Diamond,
  Triangle,
  Type,
  StickyNote,
  ImageIcon,
  Eraser,
  Undo2,
  Redo2,
  Grid,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Trash2,
  ChevronDown,
  Plus,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export type CanvasTool =
  | 'select'
  | 'pan'
  | 'draw'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'triangle'
  | 'text'
  | 'sticky'
  | 'image'
  | 'eraser';

interface CanvasToolbarProps {
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  fillShape: boolean;
  setFillShape: (fill: boolean) => void;
  snapToGrid: boolean;
  setSnapToGrid: (snap: boolean) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  zoomPercent: number;
  onExport: (format: 'png' | 'svg' | 'json') => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddImageUrl: (url: string) => void;
  stickyColor?: string;
  setStickyColor?: (color: string) => void;
  hasSelectedSticky?: boolean;
}

const PRESET_COLORS = [
  { name: 'Roxo', value: '#8B5CF6' },
  { name: 'Esmeralda', value: '#10B981' },
  { name: 'Azul', value: '#3B82F6' },
  { name: 'Laranja', value: '#F59E0B' },
  { name: 'Rosa', value: '#EC4899' },
  { name: 'Vermelho', value: '#EF4444' },
  { name: 'Branco', value: '#FFFFFF' },
];

const STICKY_COLORS = [
  { value: '#FEF9C3', name: 'Amarelo Claro' },
  { value: '#FDE68A', name: 'Amarelo Médio' },
  { value: '#FED7AA', name: 'Laranja Past.' },
  { value: '#FECACA', name: 'Salmão Past.' },
  { value: '#FBCFE8', name: 'Rosa Claro' },
  { value: '#F9A8D4', name: 'Rosa Past.' },
  { value: '#E0E7FF', name: 'Lavanda' },
  { value: '#C7D2FE', name: 'Roxo Past.' },
  { value: '#CFFAFE', name: 'Ciano Claro' },
  { value: '#93C5FD', name: 'Azul Past.' },
  { value: '#D1FAE5', name: 'Menta Past.' },
  { value: '#A7F3D0', name: 'Verde Past.' },
  { value: '#ECFCCB', name: 'Lima Past.' },
  { value: '#D9F99D', name: 'Verde Lima' },
  { value: '#FFFFFF', name: 'Branco' },
  { value: '#1E293B', name: 'Preto Carvão' },
];

export function CanvasToolbar({
  activeTool,
  setActiveTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  fillShape,
  setFillShape,
  snapToGrid,
  setSnapToGrid,
  onZoomIn,
  onZoomOut,
  onFitView,
  zoomPercent,
  onExport,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddImageUrl,
  stickyColor = '#FEF9C3',
  setStickyColor,
  hasSelectedSticky = false,
}: CanvasToolbarProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [isShapesPopoverOpen, setIsShapesPopoverOpen] = useState(false);

  const handleAddImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl.trim()) {
      onAddImageUrl(imageUrl.trim());
      setImageUrl('');
      setIsImagePopoverOpen(false);
      setActiveTool('select');
    }
  };

  const getShapeIcon = () => {
    switch (activeTool) {
      case 'rectangle': return Square;
      case 'ellipse': return Circle;
      case 'diamond': return Diamond;
      case 'triangle': return Triangle;
      default: return Square;
    }
  };

  const ActiveShapeIcon = getShapeIcon();

  return (
    <>
      {/* 1. MIRO DARK VERTICAL SIDEBAR TOOLBAR (LEFT SIDE) */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 bg-[#0f0f13]/95 border border-white/10 py-4 px-2 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] select-none w-14 backdrop-blur-md">
        
        {/* Select Tool */}
        <Button
          variant="ghost"
          size="icon"
          title="Selecionar (V)"
          onClick={() => setActiveTool('select')}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            activeTool === 'select'
              ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <MousePointer className="w-5 h-5 fill-current" />
        </Button>

        {/* Sticky Note Tool */}
        <Button
          variant="ghost"
          size="icon"
          title="Post-it (S)"
          onClick={() => setActiveTool('sticky')}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            activeTool === 'sticky'
              ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <StickyNote className="w-5 h-5" />
        </Button>

        {/* Shapes Menu Popover (Miro Shape Box style) */}
        <Popover open={isShapesPopoverOpen} onOpenChange={setIsShapesPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Formas Geométricas"
              className={cn(
                "w-10 h-10 rounded-full transition-all duration-150 relative flex items-center justify-center",
                ['rectangle', 'ellipse', 'diamond', 'triangle'].includes(activeTool)
                  ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              )}
            >
              <ActiveShapeIcon className="w-5 h-5" />
              <div className="absolute bottom-1 right-1 w-1 h-1 border-r border-b border-current opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="start" sideOffset={12} className="w-56 bg-[#0f0f13]/95 border border-white/10 text-slate-200 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
            <div className="flex flex-col gap-0.5 text-xs">
              <button
                onClick={() => { setActiveTool('rectangle'); setIsShapesPopoverOpen(false); }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer",
                  activeTool === 'rectangle' ? "bg-[#8b5cf6]/20 text-[#c084fc] font-semibold" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Retângulo</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">R</span>
              </button>

              <button
                onClick={() => { setActiveTool('ellipse'); setIsShapesPopoverOpen(false); }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer",
                  activeTool === 'ellipse' ? "bg-[#8b5cf6]/20 text-[#c084fc] font-semibold" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Circle className="w-4 h-4 text-slate-400" />
                  <span>Círculo (Oval)</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">O</span>
              </button>

              <button
                onClick={() => { setActiveTool('diamond'); setIsShapesPopoverOpen(false); }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer",
                  activeTool === 'diamond' ? "bg-[#8b5cf6]/20 text-[#c084fc] font-semibold" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Diamond className="w-4 h-4 text-slate-400" />
                  <span>Losango (Rhombus)</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">L</span>
              </button>

              <button
                onClick={() => { setActiveTool('triangle'); setIsShapesPopoverOpen(false); }}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left cursor-pointer",
                  activeTool === 'triangle' ? "bg-[#8b5cf6]/20 text-[#c084fc] font-semibold" : "hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Triangle className="w-4 h-4 text-slate-400" />
                  <span>Triângulo</span>
                </div>
                <span className="text-[9px] text-slate-500 font-mono">▲</span>
              </button>

              <div className="h-px bg-white/5 my-1 mx-2" />

              <div className="px-3 py-1 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">Preencher Forma</span>
                <button
                  type="button"
                  onClick={() => setFillShape(!fillShape)}
                  className={cn(
                    "relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none",
                    fillShape ? "bg-[#8b5cf6]" : "bg-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200",
                      fillShape ? "translate-x-3" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Text Tool */}
        <Button
          variant="ghost"
          size="icon"
          title="Texto Livre (T)"
          onClick={() => setActiveTool('text')}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            activeTool === 'text'
              ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <Type className="w-5 h-5" />
        </Button>

        {/* Pencil/Drawing Tool */}
        <Button
          variant="ghost"
          size="icon"
          title="Desenhar (D)"
          onClick={() => setActiveTool('draw')}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            activeTool === 'draw' || activeTool === 'eraser'
              ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <Pencil className="w-5 h-5" />
        </Button>

        {/* Pan Tool */}
        <Button
          variant="ghost"
          size="icon"
          title="Arrastar Tela (H)"
          onClick={() => setActiveTool('pan')}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            activeTool === 'pan'
              ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <Hand className="w-5 h-5" />
        </Button>

        <div className="w-6 h-px bg-white/10 my-0.5" />

        {/* Inserir Imagem */}
        <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              title="Inserir Imagem (I)"
              className={cn(
                "w-10 h-10 rounded-full transition-all duration-150",
                activeTool === 'image'
                  ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_15px_rgba(139,92,246,0.35)]"
                  : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
              )}
            >
              <ImageIcon className="w-5 h-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent side="right" align="center" sideOffset={12} className="w-80 bg-[#0f0f13]/95 border border-white/10 text-slate-200 p-4 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
            <form onSubmit={handleAddImage} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="image-url" className="text-xs text-slate-400 font-medium">
                  URL da Imagem
                </Label>
                <Input
                  id="image-url"
                  placeholder="https://exemplo.com/imagem.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="bg-transparent border-white/10 text-slate-200 text-sm focus-visible:ring-primary focus-visible:border-white/20 focus-visible:ring-[#8b5cf6] placeholder:text-slate-600"
                  required
                />
              </div>
              <Button type="submit" size="sm" className="w-full text-xs bg-[#8b5cf6] hover:bg-[#7c3aed] text-white rounded-xl cursor-pointer shadow-[0_0_15px_rgba(139,92,246,0.25)]">
                Inserir Imagem
              </Button>
            </form>
          </PopoverContent>
        </Popover>

        {/* Snap to grid toggle */}
        <Button
          variant="ghost"
          size="icon"
          title={snapToGrid ? "Desativar Grade" : "Ativar Grade"}
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={cn(
            "w-10 h-10 rounded-full transition-all duration-150",
            snapToGrid
              ? "text-[#8b5cf6] bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/35"
              : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
          )}
        >
          <Grid className="w-5 h-5" />
        </Button>

        {/* Limpar Canvas */}
        <Button
          variant="ghost"
          size="icon"
          title="Limpar Canvas"
          onClick={onClear}
          className="w-10 h-10 rounded-full text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>

      {/* 2. MIRO LOWER-LEFT SEPARATE WHITE CARD FOR UNDO / REDO */}
      <div className="absolute left-4 bottom-4 z-50 flex items-center gap-1.5 bg-[#0f0f13]/95 border border-white/10 p-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] select-none nodrag nopan backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          title="Desfazer (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all duration-150"
        >
          <Undo2 className="w-4.5 h-4.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Refazer (Ctrl+Y)"
          onClick={onRedo}
          disabled={!canRedo}
          className="w-9 h-9 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none transition-all duration-150"
        >
          <Redo2 className="w-4.5 h-4.5" />
        </Button>
      </div>

      {/* 3. MIRO PEN VERTICAL SUB-BAR (FLOATS NEXT TO SIDEBAR WHEN PENCIL ACTIVE) */}
      {(activeTool === 'draw' || activeTool === 'eraser') && (
        <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3.5 bg-[#0f0f13]/95 border border-white/10 py-4.5 px-2 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] w-12 nodrag nopan select-none backdrop-blur-md">
          {/* Active Tool selection indicators (Pen / Eraser) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTool('draw')}
            className={cn(
              "w-8 h-8 rounded-full transition-all duration-150",
              activeTool === 'draw'
                ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_10px_rgba(139,92,246,0.3)]"
                : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
            )}
            title="Caneta (D)"
          >
            <Pencil className="w-4.5 h-4.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveTool('eraser')}
            className={cn(
              "w-8 h-8 rounded-full transition-all duration-150",
              activeTool === 'eraser'
                ? "bg-[#8b5cf6] text-white scale-[1.03] shadow-[0_0_10px_rgba(139,92,246,0.35)]"
                : "text-slate-400 hover:text-slate-100 hover:bg-white/5"
            )}
            title="Borracha (E)"
          >
            <Eraser className="w-4.5 h-4.5" />
          </Button>

          <div className="w-6 h-px bg-white/10 my-0.5" />

          {/* Size 1 (Fino): A circle with a small dot in the selected color */}
          <button
            type="button"
            onClick={() => setStrokeWidth(2)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 hover:bg-white/5 hover:border-slate-700 relative outline-none cursor-pointer",
              strokeWidth === 2 ? "border-[#8b5cf6] ring-2 ring-purple-500/20 bg-[#8b5cf6]/10" : "border-white/5"
            )}
            title="Bitola Fina (2px)"
          >
            <div className="w-1.5 h-1.5 rounded-full transition-transform" style={{ backgroundColor: color }} />
          </button>

          {/* Size 2 (Médio): A circle with a medium dot in the selected color */}
          <button
            type="button"
            onClick={() => setStrokeWidth(5)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 hover:bg-white/5 hover:border-slate-700 relative outline-none cursor-pointer",
              strokeWidth === 5 ? "border-[#8b5cf6] ring-2 ring-purple-500/20 bg-[#8b5cf6]/10" : "border-white/5"
            )}
            title="Bitola Média (5px)"
          >
            <div className="w-2.5 h-2.5 rounded-full transition-transform" style={{ backgroundColor: color }} />
          </button>

          {/* Size 3 (Grosso): A circle with a thick dot in the selected color */}
          <button
            type="button"
            onClick={() => setStrokeWidth(9)}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border transition-all duration-150 hover:bg-white/5 hover:border-slate-700 relative outline-none cursor-pointer",
              strokeWidth === 9 ? "border-[#8b5cf6] ring-2 ring-purple-500/20 bg-[#8b5cf6]/10" : "border-white/5"
            )}
            title="Bitola Grossa (9px)"
          >
            <div className="w-3.5 h-3.5 rounded-full transition-transform" style={{ backgroundColor: color }} />
          </button>

          <div className="w-6 h-px bg-white/10 my-0.5" />

          {/* Active color dot with color picker popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="w-8 h-8 rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all flex items-center justify-center relative shadow-sm cursor-pointer"
                style={{ backgroundColor: color }}
                title="Cor da Caneta"
              >
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-black border border-white/10 rounded-full flex items-center justify-center shadow-xs">
                  <div className="w-1.5 h-1.5 border-r border-b border-white/60 transform rotate-45 -translate-y-[1.5px] -translate-x-[0.5px]" style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="center" sideOffset={12} className="w-56 bg-[#0f0f13]/95 border border-white/10 text-slate-200 p-3 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
              <div className="space-y-2">
                <Label className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
                  Paleta de Cores
                </Label>
                <div className="grid grid-cols-7 gap-1.5">
                  {PRESET_COLORS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setColor(preset.value)}
                      className={cn(
                        "w-5 h-5 rounded-full border transition-all duration-150 hover:scale-115 cursor-pointer relative",
                        color === preset.value
                          ? "border-[#8b5cf6] ring-2 ring-purple-500/30 scale-105"
                          : "border-white/10"
                      )}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    >
                      {color === preset.value && (
                        <div className="absolute inset-0 m-auto w-1 h-1 rounded-full bg-white shadow-xs" style={{ backgroundColor: preset.value === '#FFFFFF' ? '#000000' : '#FFFFFF' }} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* 3b. MIRO STICKY NOTE COLOR SUB-BAR */}
      {(activeTool === 'sticky' || hasSelectedSticky) && (
        <div className="absolute left-[72px] top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3 bg-[#0f0f13]/95 border border-white/10 py-4.5 px-3 rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] w-[96px] nodrag nopan select-none backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-150">
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center mb-0.5">
            Cor da Nota
          </div>
          
          <div className="grid grid-cols-2 gap-1.5 w-full">
            {STICKY_COLORS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setStickyColor?.(preset.value)}
                className={cn(
                  "w-full h-8.5 rounded-md border shadow-xs transition-all duration-150 hover:scale-110 active:scale-95 cursor-pointer relative",
                  stickyColor === preset.value
                    ? "border-[#8b5cf6] ring-2 ring-purple-500/30 scale-105"
                    : "border-white/10"
                )}
                style={{ backgroundColor: preset.value }}
                title={preset.name}
              >
                {stickyColor === preset.value && (
                  <div className="absolute inset-0 m-auto w-1 h-1 rounded-full shadow-xs" style={{ backgroundColor: preset.value === '#1E293B' ? '#FFFFFF' : '#334155' }} />
                )}
              </button>
            ))}
          </div>

          <div className="w-full h-px bg-white/10 my-0.5" />

          {/* Sparkles / Generate Button */}
          <button
            type="button"
            className="w-full py-1.5 px-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[9px] font-semibold flex items-center justify-center gap-1 transition-all border border-white/5 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-2.5 h-2.5 text-[#8b5cf6] animate-pulse" />
            <span>Generate</span>
          </button>

          {/* Stack / Stack Button */}
          <button
            type="button"
            className="w-full py-1.5 px-1 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-[9px] font-semibold flex items-center justify-center gap-1 transition-all border border-white/5 active:scale-95 cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5 text-slate-400" />
            <span>Stack</span>
          </button>
        </div>
      )}

      {/* 4. DYNAMIC TOP-RIGHT ZOOM & EXPORT INDICATOR (DARK CARD) */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-[#0f0f13]/95 border border-white/10 px-3.5 py-1.5 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.5)] select-none nodrag nopan backdrop-blur-md">
        <Button
          variant="ghost"
          size="icon"
          title="Zoom Out"
          onClick={onZoomOut}
          className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-150"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-[11px] font-mono w-10 text-center text-slate-300 font-semibold">
          {zoomPercent}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          title="Zoom In"
          onClick={onZoomIn}
          className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-150"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Zoom to Fit"
          onClick={onFitView}
          className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-150"
        >
          <Maximize className="w-4 h-4" />
        </Button>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-4 gap-1.5 rounded-full text-[11px] text-slate-300 hover:text-slate-100 hover:bg-white/5 border border-white/10 bg-transparent font-semibold transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0f0f13]/95 border border-white/10 text-slate-200 min-w-[120px] rounded-xl shadow-2xl backdrop-blur-md">
            <DropdownMenuItem
              onClick={() => onExport('png')}
              className="cursor-pointer text-xs focus:bg-white/5 focus:text-slate-100 rounded-lg focus:outline-none"
            >
              Imagem PNG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport('svg')}
              className="cursor-pointer text-xs focus:bg-white/5 focus:text-slate-100 rounded-lg focus:outline-none"
            >
              Vetor SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport('json')}
              className="cursor-pointer text-xs focus:bg-white/5 focus:text-slate-100 rounded-lg focus:outline-none"
            >
              Ficheiro JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
