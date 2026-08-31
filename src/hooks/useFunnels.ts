import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Node, Edge, Viewport } from '@xyflow/react';
import { Json } from '@/integrations/supabase/types';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface Funnel {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  tracking_token: string | null;
  folder_id: string | null;
  funnel_type: string;
  created_at: string;
  updated_at: string;
}

interface CreateFunnelData {
  name: string;
  description?: string;
  funnel_type?: string;
}

interface ImportFunnelData {
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  viewport?: Viewport;
  funnel_type?: string;
}

interface UpdateFunnelData {
  id: string;
  name?: string;
  description?: string;
  nodes?: Node[];
  edges?: Edge[];
  viewport?: Viewport;
  folder_id?: string | null;
}

export function useFunnels() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationContext();

  const { data: funnels = [], isLoading, error } = useQuery({
    queryKey: ['funnels', organization?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(funnel => ({
        ...funnel,
        nodes: (funnel.nodes as unknown as Node[]) || [],
        edges: (funnel.edges as unknown as Edge[]) || [],
        viewport: (funnel.viewport as unknown as Viewport) || { x: 0, y: 0, zoom: 1 },
        tracking_token: funnel.tracking_token || null,
        folder_id: funnel.folder_id || null,
        funnel_type: funnel.funnel_type || 'funnelytics',
      })) as Funnel[];
    },
    enabled: !!organization?.id,
  });

  const createFunnel = useMutation({
    mutationFn: async (data: CreateFunnelData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: funnel, error } = await supabase
        .from('funnels')
        .insert({
          user_id: user.id,
          organization_id: organization?.id || null,
          name: data.name,
          description: data.description || null,
          funnel_type: data.funnel_type || 'funnelytics',
          nodes: [] as unknown as Json,
          edges: [] as unknown as Json,
          viewport: { x: 0, y: 0, zoom: 1 } as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      return funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar funil: ' + error.message);
    }
  });

  const importFunnel = useMutation({
    mutationFn: async (data: ImportFunnelData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: funnel, error } = await supabase
        .from('funnels')
        .insert({
          user_id: user.id,
          organization_id: organization?.id || null,
          name: data.name,
          description: data.description || null,
          funnel_type: data.funnel_type || 'funnelytics',
          nodes: data.nodes as unknown as Json,
          edges: data.edges as unknown as Json,
          viewport: (data.viewport || { x: 0, y: 0, zoom: 1 }) as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      return funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil importado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao importar funil: ' + error.message);
    }
  });

  const duplicateFunnel = useMutation({
    mutationFn: async (funnelToDuplicate: Funnel) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: funnel, error } = await supabase
        .from('funnels')
        .insert({
          user_id: user.id,
          organization_id: organization?.id || null,
          name: `${funnelToDuplicate.name} (Cópia)`,
          description: funnelToDuplicate.description || null,
          funnel_type: funnelToDuplicate.funnel_type,
          folder_id: funnelToDuplicate.folder_id || null,
          nodes: funnelToDuplicate.nodes as unknown as Json,
          edges: funnelToDuplicate.edges as unknown as Json,
          viewport: funnelToDuplicate.viewport as unknown as Json
        })
        .select()
        .single();

      if (error) throw error;
      return funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil duplicado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao duplicar funil: ' + error.message);
    }
  });

  const updateFunnel = useMutation({
    mutationFn: async (data: UpdateFunnelData) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.nodes !== undefined) updateData.nodes = data.nodes as unknown as Json;
      if (data.edges !== undefined) updateData.edges = data.edges as unknown as Json;
      if (data.viewport !== undefined) updateData.viewport = data.viewport as unknown as Json;
      if (data.folder_id !== undefined) updateData.folder_id = data.folder_id;

      const { data: funnel, error } = await supabase
        .from('funnels')
        .update(updateData)
        .eq('id', data.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!funnel) throw new Error('Funil não encontrado ou sem permissão');
      return funnel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar funil: ' + error.message);
    }
  });

  const deleteFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir funil: ' + error.message);
    }
  });

  return {
    funnels,
    isLoading,
    error,
    createFunnel,
    importFunnel,
    duplicateFunnel,
    updateFunnel,
    deleteFunnel
  };
}
