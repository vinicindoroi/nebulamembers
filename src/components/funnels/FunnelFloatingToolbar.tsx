import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Download, Radio, Hand, MousePointer2, Check, Loader2, Group, GraduationCap, Upload, Ungroup, Code, Pencil, StickyNote, Type, Image as ImageIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type InteractionMode = 'select' | 'pan' | 'draw' | 'sticky-note' | 'free-text';

interface FunnelFloatingToolbarProps {
  onExport: (format: 'png' | 'svg') => void;
  onExportJson?: () => void;
  onImportJson?: (file: File) => void;
  isSaving?: boolean;
  liveMode: boolean;
  onLiveModeChange: (enabled: boolean) => void;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  selectedNodesCount?: number;
  onGroupNodes?: () => void;
  onUngroupNodes?: () => void;
  hasGroupedSelection?: boolean;
  educationalMode?: boolean;
  onEducationalModeChange?: (enabled: boolean) => void;
  onOpenTracking?: () => void;
  hasTrackingToken?: boolean;
  onAddStickyNote?: () => void;
  onAddFreeText?: () => void;
  onAddImage?: (base64: string, width: number, height: number) => void;
}

export function FunnelFloatingToolbar({
  onExport,
  onExportJson,
  onImportJson,
  isSaving,
  liveMode,
  onLiveModeChange,
  interactionMode,
  onInteractionModeChange,
  selectedNodesCount = 0,
  onGroupNodes,
  onUngroupNodes,
  hasGroupedSelection = false,
  educationalMode = false,
  onEducationalModeChange,
  onOpenTracking,
  hasTrackingToken = false,
  onAddStickyNote,
  onAddFreeText,
  onAddImage,
}: FunnelFloatingToolbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportJson) {
      onImportJson(file);
      e.target.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onAddImage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        onAddImage(base64, img.width, img.height);
      };
      img.src = base64;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-2 py-1.5 rounded-full bg-[#0f0f12]/95 border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      {/* Interaction Mode Toggle */}
      <div className="flex items-center bg-white/[0.04] rounded-full p-0.5 border border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onInteractionModeChange('select')}
          className={cn(
            "h-7 w-7 p-0 rounded-full transition-all",
            interactionMode === 'select'
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30"
              : "hover:bg-white/[0.06] text-muted-foreground"
          )}
          title="Selecionar (V)"
        >
          <MousePointer2 className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onInteractionModeChange('pan')}
          className={cn(
            "h-7 w-7 p-0 rounded-full transition-all",
            interactionMode === 'pan'
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30"
              : "hover:bg-white/[0.06] text-muted-foreground"
          )}
          title="Mover (H)"
        >
          <Hand className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onInteractionModeChange('draw')}
          className={cn(
            "h-7 w-7 p-0 rounded-full transition-all",
            interactionMode === 'draw'
              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30"
              : "hover:bg-white/[0.06] text-muted-foreground"
          )}
          title="Desenho Livre (D)"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Annotations Tools next to Freehand Drawing */}
      {(onAddStickyNote || onAddFreeText || onAddImage) && (
        <>
          <div className="w-px h-5 bg-white/10" />
          <div className="flex items-center bg-white/[0.04] rounded-full p-0.5 border border-white/5">
            {onAddImage && (
              <>
                <input 
                  type="file" 
                  ref={imageInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload} 
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => imageInputRef.current?.click()}
                  className="h-7 w-7 p-0 rounded-full transition-all hover:bg-white/[0.06] text-muted-foreground"
                  title="Adicionar Imagem"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {onAddStickyNote && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddStickyNote}
                className={cn(
                  "h-7 w-7 p-0 rounded-full transition-all",
                  interactionMode === 'sticky-note'
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30"
                    : "hover:bg-white/[0.06] text-muted-foreground"
                )}
                title="Nota Livre (N)"
              >
                <StickyNote className="w-3.5 h-3.5" />
              </Button>
            )}
            {onAddFreeText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onAddFreeText}
                className={cn(
                  "h-7 w-7 p-0 rounded-full transition-all",
                  interactionMode === 'free-text'
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/30"
                    : "hover:bg-white/[0.06] text-muted-foreground"
                )}
                title="Texto Livre (T)"
              >
                <Type className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </>
      )}

      {/* Group Button - only show when multiple nodes selected */}
      {selectedNodesCount >= 2 && onGroupNodes && (
        <>
          <div className="w-px h-5 bg-white/10" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onGroupNodes}
            className="h-8 px-3 text-xs hover:bg-white/[0.06] text-primary rounded-full"
            title="Agrupar selecionados"
          >
            <Group className="w-3.5 h-3.5 mr-1.5" />
            Agrupar ({selectedNodesCount})
          </Button>
        </>
      )}

      {/* Ungroup Button - only show when grouped nodes are selected */}
      {hasGroupedSelection && onUngroupNodes && (
        <>
          <div className="w-px h-5 bg-white/10" />
          <Button
            variant="ghost"
            size="sm"
            onClick={onUngroupNodes}
            className="h-8 px-3 text-xs hover:bg-white/[0.06] text-orange-400 rounded-full"
            title="Desagrupar selecionados"
          >
            <Ungroup className="w-3.5 h-3.5 mr-1.5" />
            Desagrupar
          </Button>
        </>
      )}

      <div className="w-px h-5 bg-white/10" />

      {/* Auto-save status indicator */}
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors",
        isSaving ? "bg-white/[0.03]" : "bg-emerald-500/10 border border-emerald-500/20"
      )}>
        {isSaving ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground">Salvando...</span>
          </>
        ) : (
          <>
            <Check className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Salvo</span>
          </>
        )}
      </div>

      <div className="w-px h-5 bg-white/10" />

      {/* Export/Import Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-white/[0.06] rounded-full text-foreground/80 hover:text-foreground">
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="bg-popover border-white/10 shadow-2xl">
          <DropdownMenuItem onClick={() => onExport('png')} className="text-xs cursor-pointer">
            Exportar como PNG
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExport('svg')} className="text-xs cursor-pointer">
            Exportar como SVG
          </DropdownMenuItem>
          {onExportJson && (
            <DropdownMenuItem onClick={onExportJson} className="text-xs cursor-pointer">
              Exportar como JSON (backup)
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Import Button */}
      {onImportJson && (
        <label className="cursor-pointer">
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs hover:bg-white/[0.06] rounded-full text-foreground/80 hover:text-foreground" asChild>
            <span>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Importar
            </span>
          </Button>
        </label>
      )}

      <div className="w-px h-5 bg-white/10" />

      {/* Tracking Script Button */}
      {onOpenTracking && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenTracking}
            className={cn(
              "h-8 px-3 text-xs rounded-full transition-all",
              hasTrackingToken
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15"
                : "hover:bg-white/[0.06] text-foreground/80 hover:text-foreground"
            )}
            title="Gerar script de tracking"
          >
            <Code className="w-3.5 h-3.5 mr-1.5" />
            Tracking
            {hasTrackingToken && (
              <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </Button>
          <div className="w-px h-5 bg-white/10" />
        </>
      )}

      {/* Educational Mode Toggle */}
      {onEducationalModeChange && (
        <>
          <button
            onClick={() => onEducationalModeChange(!educationalMode)}
            className={cn(
              'flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-full text-xs transition-all',
              educationalMode
                ? 'bg-purple-500/15 border border-purple-500/30 text-purple-300'
                : 'hover:bg-white/[0.06] text-muted-foreground border border-transparent'
            )}
          >
            <GraduationCap className={cn('w-3.5 h-3.5', educationalMode && 'animate-pulse')} />
            <span className="font-medium">Educacional</span>
            <Switch
              checked={educationalMode}
              onCheckedChange={onEducationalModeChange}
              className="scale-75 -mr-1 pointer-events-none"
            />
          </button>
          <div className="w-px h-5 bg-white/10" />
        </>
      )}

      {/* Live Mode Toggle */}
      <button
        onClick={() => onLiveModeChange(!liveMode)}
        className={cn(
          'flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-full text-xs transition-all',
          liveMode
            ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
            : 'hover:bg-white/[0.06] text-muted-foreground border border-transparent'
        )}
      >
        <Radio className={cn('w-3 h-3', liveMode && 'animate-pulse')} />
        <span className="font-medium">Live</span>
        <Switch
          checked={liveMode}
          onCheckedChange={onLiveModeChange}
          className="scale-75 -mr-1 pointer-events-none"
        />
      </button>
    </div>
  );
}
