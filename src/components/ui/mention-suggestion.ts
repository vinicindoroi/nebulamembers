import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList, MentionItem } from './mention-list';
import { supabase } from '@/integrations/supabase/client';

export const getMentionSuggestions = () => {
  return {
    items: async ({ query }: { query: string }): Promise<MentionItem[]> => {
      // Fetch users from profiles table matching the query
      let dbQuery = supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .limit(10);
      
      if (query) {
        dbQuery = dbQuery.ilike('full_name', `%${query}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Error fetching mention suggestions:', error);
        return [];
      }

      return (data || []) as MentionItem[];
    },
    render: () => {
      let reactRenderer: ReactRenderer;
      let popup: TippyInstance[];

      return {
        onStart: (props: any) => {
          if (!props.clientRect) return;

          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: reactRenderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate: (props: any) => {
          reactRenderer.updateProps(props);

          if (!props.clientRect) return;

          popup[0]?.setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown: (props: any) => {
          if (props.event.key === 'Escape') {
            popup[0]?.hide();
            return true;
          }

          // @ts-ignore
          return reactRenderer.ref?.onKeyDown(props);
        },

        onExit: () => {
          popup[0]?.destroy();
          reactRenderer.destroy();
        },
      };
    },
  };
};
