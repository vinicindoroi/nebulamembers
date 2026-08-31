import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrganizationContext } from '@/contexts/OrganizationContext';

export interface FunnelFolder {
  id: string;
  user_id: string;
  organization_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

interface CreateFolderData {
  name: string;
}

interface UpdateFolderData {
  id: string;
  name: string;
}

export function useFunnelFolders() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationContext();

  const { data: folders = [], isLoading, error } = useQuery({
    queryKey: ['funnel_folders', organization?.id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('funnel_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      return data as FunnelFolder[];
    },
    enabled: !!organization?.id,
  });

  const createFolder = useMutation({
    mutationFn: async (data: CreateFolderData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data: folder, error } = await supabase
        .from('funnel_folders')
        .insert({
          user_id: user.id,
          organization_id: organization?.id || null,
          name: data.name,
        })
        .select()
        .single();

      if (error) throw error;
      return folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel_folders'] });
      toast.success('Pasta criada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar pasta: ' + error.message);
    }
  });

  const updateFolder = useMutation({
    mutationFn: async (data: UpdateFolderData) => {
      const { data: folder, error } = await supabase
        .from('funnel_folders')
        .update({ name: data.name })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return folder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel_folders'] });
      toast.success('Pasta renomeada com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao renomear pasta: ' + error.message);
    }
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnel_folders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnel_folders'] });
      // Invalidate funnels to refresh the list, in case funnels inside were moved to root
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Pasta excluída com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir pasta: ' + error.message);
    }
  });

  return {
    folders,
    isLoading,
    error,
    createFolder,
    updateFolder,
    deleteFolder
  };
}
