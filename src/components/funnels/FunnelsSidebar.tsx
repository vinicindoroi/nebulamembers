import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Search, Trash2, ChevronLeft, ChevronRight, GitFork, Pencil, Upload, Brain, Folder, FolderPlus, FolderOpen, ChevronDown, Move, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Funnel } from '@/hooks/useFunnels';
import { FunnelFolder } from '@/hooks/useFunnelFolders';
import { FunnelFolderDialog } from './FunnelFolderDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Node, Edge, Viewport } from '@xyflow/react';

interface FunnelsSidebarProps {
  funnels: Funnel[];
  folders?: FunnelFolder[];
  selectedFunnel: Funnel | null;
  onSelectFunnel: (funnel: Funnel) => void;
  onCreateFunnel: () => void;
  onDeleteFunnel: (id: string) => void;
  onRenameFunnel?: (id: string, name: string) => void;
  onDuplicateFunnel?: (funnel: Funnel) => void;
  onImportFunnel?: (data: { name: string; nodes: Node[]; edges: Edge[]; viewport?: Viewport; funnel_type?: string }) => void;
  onCreateFolder?: (name: string) => void;
  onRenameFolder?: (id: string, name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onMoveFunnel?: (funnelId: string, folderId: string | null) => void;
  isLoading?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function FunnelsSidebar({
  funnels,
  folders = [],
  selectedFunnel,
  onSelectFunnel,
  onCreateFunnel,
  onDeleteFunnel,
  onRenameFunnel,
  onDuplicateFunnel,
  onImportFunnel,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFunnel,
  isLoading,
  collapsed,
  onToggleCollapse,
}: FunnelsSidebarProps) {
  const [search, setSearch] = useState('');
  
  // Funnel states
  const [funnelToDelete, setFunnelToDelete] = useState<string | null>(null);
  const [funnelToRename, setFunnelToRename] = useState<Funnel | null>(null);
  const [newName, setNewName] = useState('');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [importName, setImportName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Folder states
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [folderToRename, setFolderToRename] = useState<FunnelFolder | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const filteredFunnels = funnels.filter((funnel) =>
    funnel.name.toLowerCase().includes(search.toLowerCase())
  );

  const funnelsByFolder = filteredFunnels.reduce((acc, funnel) => {
    const folderId = funnel.folder_id || 'root';
    if (!acc[folderId]) acc[folderId] = [];
    acc[folderId].push(funnel);
    return acc;
  }, {} as Record<string, Funnel[]>);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const handleDeleteConfirm = () => {
    if (funnelToDelete) {
      onDeleteFunnel(funnelToDelete);
      setFunnelToDelete(null);
    }
  };

  const handleRenameConfirm = () => {
    if (funnelToRename && newName.trim() && onRenameFunnel) {
      onRenameFunnel(funnelToRename.id, newName.trim());
      setFunnelToRename(null);
      setNewName('');
    }
  };

  const openRenameDialog = (funnel: Funnel) => {
    setFunnelToRename(funnel);
    setNewName(funnel.name);
  };

  const handleFolderDeleteConfirm = () => {
    if (folderToDelete && onDeleteFolder) {
      onDeleteFolder(folderToDelete);
      setFolderToDelete(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      try {
        const parsed = JSON.parse(content);
        if (parsed.name) {
          setImportName(parsed.name);
        }
      } catch {
        // Invalid JSON
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!importJson.trim()) {
      toast.error('Por favor, cole o JSON do funil ou selecione um arquivo');
      return;
    }

    if (!importName.trim()) {
      toast.error('Por favor, digite um nome para o funil');
      return;
    }

    try {
      const parsed = JSON.parse(importJson);
      
      if (!Array.isArray(parsed.nodes)) {
        toast.error('JSON inválido: propriedade "nodes" deve ser um array');
        return;
      }
      if (!Array.isArray(parsed.edges)) {
        toast.error('JSON inválido: propriedade "edges" deve ser um array');
        return;
      }

      if (onImportFunnel) {
        onImportFunnel({
          name: importName.trim(),
          nodes: parsed.nodes,
          edges: parsed.edges,
          viewport: parsed.viewport,
          funnel_type: parsed.funnel_type,
        });
      }

      setIsImportDialogOpen(false);
      setImportJson('');
      setImportName('');
    } catch (error) {
      toast.error('JSON inválido. Verifique o formato e tente novamente.');
    }
  };

  const renderFunnelItem = (funnel: Funnel, isNested: boolean = false) => {
    const isSelected = selectedFunnel?.id === funnel.id;
    const isMind = funnel.funnel_type === 'mind';
    const isCanvas = funnel.funnel_type === 'canvas';
    return (
      <div
        key={funnel.id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('application/json', JSON.stringify({ type: 'funnel', id: funnel.id }));
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => onSelectFunnel(funnel)}
        className={cn(
          'w-full overflow-hidden group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150',
          isNested && 'ml-4 w-[calc(100%-1rem)]',
          isSelected
            ? 'bg-primary/[0.08] border border-primary/20 shadow-[0_0_0_1px_oklch(0.65_0.22_290/0.1)]'
            : 'border border-transparent hover:bg-white/[0.03] hover:border-white/5'
        )}
      >
        {isSelected && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />
        )}

        <div
          className={cn(
            'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            isSelected
              ? isMind
                ? 'bg-purple-500/15 text-purple-400'
                : isCanvas
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-primary/15 text-primary'
              : 'bg-white/[0.03] text-muted-foreground group-hover:bg-white/[0.06]'
          )}
        >
          {isMind ? (
            <Brain className="w-3.5 h-3.5" />
          ) : isCanvas ? (
            <Pencil className="w-3.5 h-3.5" />
          ) : (
            <GitFork className="w-3.5 h-3.5" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'font-medium text-[13px] truncate leading-tight',
              isSelected ? 'text-foreground' : 'text-foreground/90'
            )}
          >
            {funnel.name}
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {format(new Date(funnel.updated_at), "dd MMM, HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity shrink-0 mr-2"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover border-white/10 shadow-2xl w-48">
            <DropdownMenuItem
              onSelect={() => openRenameDialog(funnel)}
              className="text-xs cursor-pointer"
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Renomear
            </DropdownMenuItem>

            {onDuplicateFunnel && (
              <DropdownMenuItem
                onSelect={() => onDuplicateFunnel(funnel)}
                className="text-xs cursor-pointer"
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Duplicar
              </DropdownMenuItem>
            )}
            
            {onMoveFunnel && (folders.length > 0 || funnel.folder_id) && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="text-xs">
                  <Move className="mr-2 h-3.5 w-3.5" />
                  Mover para...
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="bg-popover border-white/10 shadow-2xl w-48">
                    {funnel.folder_id && (
                      <DropdownMenuItem
                        onSelect={() => {
                          onMoveFunnel(funnel.id, null);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        [Sem Pasta]
                      </DropdownMenuItem>
                    )}
                    {folders.map(folder => folder.id !== funnel.folder_id && (
                      <DropdownMenuItem
                        key={folder.id}
                        onSelect={() => {
                          onMoveFunnel(funnel.id, folder.id);
                        }}
                        className="text-xs cursor-pointer"
                      >
                        <Folder className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                        <span className="truncate">{folder.name}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            )}

            <DropdownMenuSeparator className="bg-white/10" />

            <DropdownMenuItem
              onSelect={() => setFunnelToDelete(funnel.id)}
              className="text-xs text-destructive cursor-pointer focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (collapsed) {
    return (
      <div className="w-14 border-r border-white/5 bg-gradient-to-b from-[#0a0a0c] to-[#08080a] flex flex-col items-center py-4 gap-2 shrink-0 h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onToggleCollapse} className="hover:bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Expandir</TooltipContent>
        </Tooltip>

        <div className="w-6 h-px bg-white/5 my-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCreateFunnel}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Novo Funil</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsImportDialogOpen(true)}
              className="hover:bg-white/5"
            >
              <Upload className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Importar JSON</TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <>
      <div className="w-full sm:w-72 shrink-0 border-r border-white/5 bg-gradient-to-b from-[#0a0a0c] to-[#08080a] flex flex-col h-full z-10">
        {/* Header */}
        <div className="px-4 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <GitFork className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm font-display tracking-tight">Funis</h2>
              <p className="text-[10px] text-muted-foreground">
                {funnels.length} {funnels.length === 1 ? 'funil' : 'funis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCreateFunnel}
                  className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Novo Funil</TooltipContent>
            </Tooltip>

            {onCreateFolder && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsNewFolderDialogOpen(true)}
                    className="h-8 w-8 hover:bg-white/5"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Nova Pasta</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsImportDialogOpen(true)}
                  className="h-8 w-8 hover:bg-white/5"
                >
                  <Upload className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Importar JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleCollapse}
                  className="h-8 w-8 hover:bg-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Recolher</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <Input
              placeholder="Buscar funis ou pastas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 bg-white/[0.02] border-white/5 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50 text-sm"
            />
          </div>
        </div>

        {/* Funnels List */}
        <ScrollArea className="flex-1 w-full overflow-hidden">
          <div className="pl-2 pr-5 pb-3 space-y-0.5 w-full max-w-[calc(100vw-1rem)] sm:max-w-[260px] overflow-x-hidden">
            {isLoading ? (
              <div className="space-y-2 px-1">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : filteredFunnels.length === 0 && folders.length === 0 ? (
              <div className="text-center py-12 px-4">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center">
                  <GitFork className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground">
                  {search ? 'Nenhum funil encontrado' : 'Nenhum funil criado'}
                </p>
                {!search && (
                  <button
                    onClick={onCreateFunnel}
                    className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                  >
                    + Criar primeiro funil
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Folders */}
                {folders.filter(f => search === '' || f.name.toLowerCase().includes(search.toLowerCase()) || (funnelsByFolder[f.id] && funnelsByFolder[f.id].length > 0)).map((folder) => {
                  const isExpanded = expandedFolders[folder.id];
                  const folderFunnels = funnelsByFolder[folder.id] || [];
                  
                  return (
                    <div key={folder.id} className="mb-1">
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          try {
                            const data = JSON.parse(e.dataTransfer.getData('application/json'));
                            if (data.type === 'funnel' && onMoveFunnel) {
                              onMoveFunnel(data.id, folder.id);
                            }
                          } catch (err) {}
                        }}
                        className="group w-full overflow-hidden flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-white/[0.03] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                          {isExpanded ? (
                            <FolderOpen className="w-4 h-4 shrink-0 text-primary/70" />
                          ) : (
                            <Folder className="w-4 h-4 shrink-0" />
                          )}
                          <span className="text-[13px] font-medium truncate min-w-0">{folder.name}</span>
                          <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded-full ml-1 shrink-0">
                            {folderFunnels.length}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-white/10 transition-opacity mr-2"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border-white/10 shadow-2xl">
                              <DropdownMenuItem
                                onSelect={() => setFolderToRename(folder)}
                                className="text-xs cursor-pointer"
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Renomear Pasta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => setFolderToDelete(folder.id)}
                                className="text-xs text-destructive cursor-pointer focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Excluir Pasta
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <ChevronDown 
                            className={cn("w-3.5 h-3.5 transition-transform opacity-50", isExpanded ? "rotate-180" : "")} 
                          />
                        </div>
                      </div>

                      {/* Folder Content */}
                      {isExpanded && (
                        <div className="mt-1 space-y-0.5 relative before:absolute before:left-[22px] before:top-0 before:bottom-3 before:w-px before:bg-white/5">
                          {folderFunnels.length === 0 ? (
                            <div className="pl-9 py-2 text-[11px] text-muted-foreground/50">
                              Pasta vazia
                            </div>
                          ) : (
                            folderFunnels.map(funnel => renderFunnelItem(funnel, true))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Root Funnels (No Folder) */}
                {funnelsByFolder['root'] && funnelsByFolder['root'].map(funnel => renderFunnelItem(funnel, false))}
              </>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Delete Funnel Confirmation */}
      <AlertDialog open={!!funnelToDelete} onOpenChange={() => setFunnelToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funil?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O funil será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!folderToDelete} onOpenChange={() => setFolderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta pasta? Os funis dentro dela não serão excluídos, apenas movidos para a área raiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFolderDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir Pasta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Funnel Dialog */}
      <Dialog open={!!funnelToRename} onOpenChange={() => setFunnelToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Funil</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o funil.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="funnel-name" className="sr-only">Nome</Label>
            <Input
              id="funnel-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do funil"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFunnelToRename(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRenameConfirm} disabled={!newName.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import JSON Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Funil
            </DialogTitle>
            <DialogDescription>
              Cole o JSON do funil ou selecione um arquivo para importar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="import-name">Nome do Funil</Label>
              <Input
                id="import-name"
                value={importName}
                onChange={(e) => setImportName(e.target.value)}
                placeholder="Digite o nome do funil"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="import-json">JSON do Funil</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='{"nodes": [...], "edges": [...], "viewport": {...}}'
                rows={8}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsImportDialogOpen(false);
                setImportJson('');
                setImportName('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleImportConfirm} 
              disabled={!importJson.trim() || !importName.trim()}
            >
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      {onCreateFolder && (
        <FunnelFolderDialog
          open={isNewFolderDialogOpen}
          onOpenChange={setIsNewFolderDialogOpen}
          onConfirm={(name) => {
            onCreateFolder(name);
            setIsNewFolderDialogOpen(false);
          }}
          title="Nova Pasta"
          description="Crie uma pasta para organizar seus funis."
        />
      )}

      {/* Rename Folder Dialog */}
      {onRenameFolder && (
        <FunnelFolderDialog
          open={!!folderToRename}
          onOpenChange={(open) => !open && setFolderToRename(null)}
          initialName={folderToRename?.name || ''}
          onConfirm={(name) => {
            if (folderToRename) {
              onRenameFolder(folderToRename.id, name);
              setFolderToRename(null);
            }
          }}
          title="Renomear Pasta"
          description="Digite o novo nome para a pasta."
        />
      )}
    </>
  );
}
