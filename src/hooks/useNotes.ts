import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';

export interface UserNote {
  id: string;
  user_id: string;
  lesson_id: string | null;
  title: string;
  content: string;
  tags: string[];
  color: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  lesson_title?: string;
  module_title?: string;
  course_title?: string;
}

interface CreateNoteData {
  lesson_id?: string | null;
  title: string;
  content: string;
  tags?: string[];
  color?: string;
}

interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  color?: string;
  pinned?: boolean;
  lesson_id?: string | null;
}

export function useNotes(options?: { lessonId?: string; search?: string; tag?: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['user_notes', user?.id, options?.lessonId, options?.search, options?.tag],
    queryFn: async () => {
      if (!user) throw new Error('Não autenticado');

      let query = supabase
        .from('user_notes')
        .select('*, lessons(title, module_id, modules(title, course_id, courses(title, status)))')
        .eq('user_id', user.id)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (options?.lessonId) {
        query = query.eq('lesson_id', options.lessonId);
      }

      if (options?.tag) {
        query = query.contains('tags', [options.tag]);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = (data || [])
        .filter((note: any) => !note.lessons?.modules?.courses || note.lessons.modules.courses.status === 'published')
        .map((note: any) => ({
          id: note.id,
          user_id: note.user_id,
          lesson_id: note.lesson_id,
          title: note.title,
          content: note.content,
          tags: note.tags || [],
          color: note.color || 'default',
          pinned: note.pinned,
          created_at: note.created_at,
          updated_at: note.updated_at,
          lesson_title: note.lessons?.title || null,
          module_title: note.lessons?.modules?.title || null,
          course_title: note.lessons?.modules?.courses?.title || null,
        })) as UserNote[];

      // Client-side search filter
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        result = result.filter(
          (n) =>
            n.title.toLowerCase().includes(searchLower) ||
            n.content.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
    enabled: !!user,
  });

  const createNote = useMutation({
    mutationFn: async (data: CreateNoteData) => {
      if (!user) throw new Error('Não autenticado');

      const { data: note, error } = await supabase
        .from('user_notes')
        .insert({
          user_id: user.id,
          lesson_id: data.lesson_id || null,
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          color: data.color || 'default',
        })
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_notes'] });
      toast.success('Nota criada!');
    },
    onError: (error) => {
      toast.error('Erro ao criar nota: ' + error.message);
    },
  });

  const updateNote = useMutation({
    mutationFn: async (data: UpdateNoteData) => {
      const { id, ...updateData } = data;
      const { data: note, error } = await supabase
        .from('user_notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_notes'] });
    },
    onError: (error) => {
      toast.error('Erro ao atualizar nota: ' + error.message);
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_notes'] });
      toast.success('Nota excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir nota: ' + error.message);
    },
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase.from('user_notes').update({ pinned }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_notes'] });
    },
  });

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    notes.forEach((n) => n.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [notes]);

  return {
    notes,
    isLoading,
    allTags,
    createNote,
    updateNote,
    deleteNote,
    togglePin,
  };
}
