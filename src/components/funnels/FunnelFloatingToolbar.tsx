import { useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Download,
  Radio,
  Hand,
  MousePointer2,
  Loader2,
  Group,
  GraduationCap,
  Upload,
  Ungroup,
  Code,
  Pencil,
  StickyNote,
  Type,
  Image as ImageIcon,
  MoreHorizontal,
  Presentation,
  GitBranch,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type InteractionMode = "select" | "pan" | "draw" | "sticky-note" | "free-text";
interface FunnelFloatingToolbarProps {
  onExport: (format: "png" | "svg") => void;
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
  liveMenu?: ReactNode;
  funnelName?: string;
  nodeCount?: number;
  onPresent?: () => void;
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
  hasGroupedSelection,
  educationalMode,
  onEducationalModeChange,
  onOpenTracking,
  hasTrackingToken,
  onAddStickyNote,
  onAddFreeText,
  onAddImage,
  liveMenu,
  funnelName,
  nodeCount,
  onPresent,
}: FunnelFloatingToolbarProps) {
  const imageInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);
  function handleImage(file?: File) {
    if (!file || !onAddImage) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onload = () => onAddImage(src, img.width, img.height);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }
  const tools = [
    { mode: "select" as const, icon: MousePointer2, label: "Selecionar (V)" },
    { mode: "pan" as const, icon: Hand, label: "Mover (H)" },
    { mode: "draw" as const, icon: Pencil, label: "Desenho livre (D)" },
  ];
  return (
    <>
      <header className="funnel-editor-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className="funnel-editor-mark">
            <GitBranch className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="funnel-editor-eyebrow">ESTÚDIO DE FUNIS</p>
            <h1 className="truncate text-sm font-semibold" title={funnelName}>
              {funnelName || "Editor visual"}
            </h1>
          </div>
          <span className="funnel-block-count">{nodeCount ?? 0} blocos</span>
        </div>
        <div className="funnel-header-actions">
          <span className="funnel-save-hint" title="As alterações são salvas automaticamente">
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            )}
            {isSaving ? "Salvando..." : "Autosave"}
          </span>
          {onOpenTracking && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onOpenTracking}
              className="funnel-header-button"
              aria-label="Configurar tracking"
            >
              <Code className="h-3.5 w-3.5" />
              <span className="funnel-header-label">Tracking</span>
              {hasTrackingToken && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
            </Button>
          )}
          {liveMenu ?? (
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={liveMode}
              onClick={() => onLiveModeChange(!liveMode)}
            >
              <Radio className="h-3.5 w-3.5" />
              Live
            </Button>
          )}
          <div className="funnel-header-divider" />
          {onPresent && (
            <Button
              variant="outline"
              size="sm"
              className="funnel-header-button"
              onClick={onPresent}
              aria-label="Apresentar funil"
            >
              <Presentation className="h-3.5 w-3.5" />
              <span className="funnel-header-label">Apresentar</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Mais ações do funil"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onSelect={() => onExport("png")}>
                <Download className="h-4 w-4" />
                Exportar imagem PNG
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onExport("svg")}>
                <Download className="h-4 w-4" />
                Exportar imagem SVG
              </DropdownMenuItem>
              {onExportJson && (
                <DropdownMenuItem onSelect={onExportJson}>
                  <Download className="h-4 w-4" />
                  Exportar backup JSON
                </DropdownMenuItem>
              )}
              {onImportJson && (
                <DropdownMenuItem onSelect={() => importInput.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Importar JSON
                </DropdownMenuItem>
              )}
              {onEducationalModeChange && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={educationalMode}
                    onCheckedChange={onEducationalModeChange}
                  >
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Modo educacional
                  </DropdownMenuCheckboxItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="funnel-tools-dock" role="toolbar" aria-label="Ferramentas do canvas">
        {tools.map((tool) => (
          <Button
            key={tool.mode}
            variant="ghost"
            size="icon"
            title={tool.label}
            aria-label={tool.label}
            aria-pressed={interactionMode === tool.mode}
            onClick={() => onInteractionModeChange(tool.mode)}
            className={cn("funnel-tool-button", interactionMode === tool.mode && "is-active")}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
        <div className="funnel-dock-divider" />
        {onAddStickyNote && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("funnel-tool-button", interactionMode === "sticky-note" && "is-active")}
            title="Nota livre (N)"
            aria-label="Nota livre (N)"
            aria-pressed={interactionMode === "sticky-note"}
            onClick={onAddStickyNote}
          >
            <StickyNote className="h-4 w-4" />
          </Button>
        )}
        {onAddFreeText && (
          <Button
            variant="ghost"
            size="icon"
            className={cn("funnel-tool-button", interactionMode === "free-text" && "is-active")}
            title="Texto livre (T)"
            aria-label="Texto livre (T)"
            aria-pressed={interactionMode === "free-text"}
            onClick={onAddFreeText}
          >
            <Type className="h-4 w-4" />
          </Button>
        )}
        {onAddImage && (
          <Button
            variant="ghost"
            size="icon"
            className="funnel-tool-button"
            title="Adicionar imagem"
            aria-label="Adicionar imagem"
            onClick={() => imageInput.current?.click()}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        )}
        {selectedNodesCount >= 2 && onGroupNodes && (
          <>
            <div className="funnel-dock-divider" />
            <Button
              variant="ghost"
              size="icon"
              className="funnel-tool-button"
              title={`Agrupar ${selectedNodesCount} blocos`}
              aria-label="Agrupar blocos selecionados"
              onClick={onGroupNodes}
            >
              <Group className="h-4 w-4" />
            </Button>
          </>
        )}
        {hasGroupedSelection && onUngroupNodes && (
          <Button
            variant="ghost"
            size="icon"
            className="funnel-tool-button"
            title="Desagrupar"
            aria-label="Desagrupar"
            onClick={onUngroupNodes}
          >
            <Ungroup className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        type="file"
        ref={imageInput}
        hidden
        accept="image/*"
        onChange={(e) => {
          handleImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        type="file"
        ref={importInput}
        hidden
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportJson?.(file);
          e.target.value = "";
        }}
      />
    </>
  );
}
