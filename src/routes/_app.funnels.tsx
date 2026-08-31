import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from 'react';
import { Node, Edge, Viewport, ReactFlowProvider } from '@xyflow/react';
import { useQueryClient } from '@tanstack/react-query';
import { FunnelsSidebar } from '@/components/funnels/FunnelsSidebar';
import { FunnelCanvas } from '@/components/funnels/FunnelCanvas';
import { FunnelsEmptyState } from '@/components/funnels/FunnelsEmptyState';
import { NewFunnelDialog } from '@/components/funnels/NewFunnelDialog';
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas';
import { CanvasWhiteboard } from '@/components/canvas/CanvasWhiteboard';
import { useFunnels, Funnel } from '@/hooks/useFunnels';
import { useFunnelFolders, FunnelFolder } from '@/hooks/useFunnelFolders';
import { useIsMobile } from '@/hooks/use-mobile';
import { useOrganizationContext } from '@/contexts/OrganizationContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export const Route = createFileRoute("/_app/funnels")({
  component: FunnelsPage,
  head: () => ({ meta: [{ title: "Funis — Membros" }] }),
});

function FunnelsPage() {
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [isNewFunnelDialogOpen, setIsNewFunnelDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768);

  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { organization } = useOrganizationContext();
  const { funnels, isLoading: isLoadingFunnels, createFunnel, importFunnel, updateFunnel, deleteFunnel, duplicateFunnel } = useFunnels();
  const { folders, isLoading: isLoadingFolders, createFolder, updateFolder, deleteFolder } = useFunnelFolders();

  const isLoading = isLoadingFunnels || isLoadingFolders;

  const flushCanvasRef = useRef<(() => void) | null>(null);
  const silentSaveInFlightRef = useRef(false);
  const justSwitchedRef = useRef(false);

  const handleSelectFunnel = useCallback((funnel: Funnel) => {
    if (selectedFunnel?.id !== funnel.id) {
      try { flushCanvasRef.current?.(); } catch { /* ignore flush errors during transition */ }
      // Prevent stale cache updates from overwriting the new funnel during transition
      justSwitchedRef.current = true;
      setTimeout(() => { justSwitchedRef.current = false; }, 3000);
    }
    setSelectedFunnel(funnel);
  }, [selectedFunnel?.id]);

  useEffect(() => {
    const onBeforeUnload = () => flushCanvasRef.current?.();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => { window.removeEventListener('beforeunload', onBeforeUnload); flushCanvasRef.current?.(); };
  }, []);

  useEffect(() => {
    if (silentSaveInFlightRef.current || justSwitchedRef.current) return;
    if (selectedFunnel && funnels.length > 0) {
      const updatedFunnel = funnels.find((f) => f.id === selectedFunnel.id);
      if (updatedFunnel) setSelectedFunnel(updatedFunnel);
    }
  }, [funnels, selectedFunnel?.id]);

  useEffect(() => {
    if (!selectedFunnel && funnels.length > 0) setSelectedFunnel(funnels[0]);
  }, [funnels, selectedFunnel]);

  const handleCreateFunnel = async (data: { name: string; description?: string; funnel_type?: string }) => {
    const result = await createFunnel.mutateAsync(data);
    setSelectedFunnel(result as unknown as Funnel);
    setIsNewFunnelDialogOpen(false);
  };

  const handleDeleteFunnel = async (id: string) => {
    await deleteFunnel.mutateAsync(id);
    if (selectedFunnel?.id === id) setSelectedFunnel(null);
  };

  const handleRenameFunnel = async (id: string, name: string) => {
    await updateFunnel.mutateAsync({ id, name });
  };

  const handleDuplicateFunnel = async (funnelToDuplicate: Funnel) => {
    const result = await duplicateFunnel.mutateAsync(funnelToDuplicate);
    setSelectedFunnel(result as unknown as Funnel);
  };

  const handleImportFunnel = async (data: { name: string; nodes: Node[]; edges: Edge[]; viewport?: Viewport; funnel_type?: string }) => {
    const result = await importFunnel.mutateAsync(data);
    setSelectedFunnel(result as unknown as Funnel);
  };

  const handleSaveFunnel = useCallback((funnelId: string, nodes: Node[], edges: Edge[], viewport: Viewport) => {
    if (!funnelId) return;
    silentSaveInFlightRef.current = true;

    queryClient.setQueryData(['funnels', organization?.id], (old: Funnel[] | undefined) => {
      if (!old) return old;
      return old.map((f) => f.id === funnelId ? { ...f, nodes: nodes as unknown as Funnel['nodes'], edges: edges as unknown as Funnel['edges'], viewport: viewport as unknown as Funnel['viewport'] } : f);
    });

    supabase.from('funnels').update({ nodes: nodes as unknown as Json, edges: edges as unknown as Json, viewport: viewport as unknown as Json }).eq('id', funnelId)
      .then(({ error }) => { if (error) console.error('[Funnels] Save error:', error.message); setTimeout(() => { silentSaveInFlightRef.current = false; }, 2000); });
  }, [queryClient, organization?.id]);

  return (
    <div className={cn("flex flex-col bg-background overflow-hidden", isMobile ? "h-[calc(100dvh-4rem)]" : "h-[100dvh]")}>
      <main className="flex-1 flex overflow-hidden h-full">
        <FunnelsSidebar 
          funnels={funnels} 
          folders={folders}
          selectedFunnel={selectedFunnel} 
          onSelectFunnel={handleSelectFunnel} 
          onCreateFunnel={() => setIsNewFunnelDialogOpen(true)} 
          onDeleteFunnel={handleDeleteFunnel} 
          onRenameFunnel={handleRenameFunnel} 
          onDuplicateFunnel={handleDuplicateFunnel}
          onMoveFunnel={async (id, folderId) => { await updateFunnel.mutateAsync({ id, folder_id: folderId }); }}
          onImportFunnel={handleImportFunnel} 
          onCreateFolder={async (name) => { await createFolder.mutateAsync({ name }); }}
          onRenameFolder={async (id, name) => { await updateFolder.mutateAsync({ id, name }); }}
          onDeleteFolder={async (id) => { await deleteFolder.mutateAsync(id); }}
          isLoading={isLoading} 
          collapsed={sidebarCollapsed} 
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} 
        />
        <div className="flex-1 h-full overflow-hidden">
          {selectedFunnel ? (
            selectedFunnel.funnel_type === 'mind' ? (
              <ReactFlowProvider key={`mind-${selectedFunnel.id}`}>
                <MindMapCanvas funnel={selectedFunnel} onSave={handleSaveFunnel} isSaving={false} onRegisterFlush={(fn) => { flushCanvasRef.current = fn; }} />
              </ReactFlowProvider>
            ) : selectedFunnel.funnel_type === 'canvas' ? (
              <ReactFlowProvider key={`canvas-${selectedFunnel.id}`}>
                <CanvasWhiteboard funnel={selectedFunnel} onSave={handleSaveFunnel} isSaving={false} onRegisterFlush={(fn) => { flushCanvasRef.current = fn; }} />
              </ReactFlowProvider>
            ) : (
              <ReactFlowProvider key={`funnel-${selectedFunnel.id}`}>
                <FunnelCanvas funnel={selectedFunnel} onSave={handleSaveFunnel} isSaving={false} onRegisterFlush={(fn) => { flushCanvasRef.current = fn; }} />
              </ReactFlowProvider>
            )
          ) : (
            <FunnelsEmptyState onCreateFunnel={() => setIsNewFunnelDialogOpen(true)} />
          )}
        </div>
      </main>
      <NewFunnelDialog open={isNewFunnelDialogOpen} onOpenChange={setIsNewFunnelDialogOpen} onCreateFunnel={handleCreateFunnel} isLoading={createFunnel.isPending} />
    </div>
  );
}
