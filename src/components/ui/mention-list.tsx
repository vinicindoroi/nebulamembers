import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface MentionItem {
  id: string;
  full_name: string;
  avatar_url?: string;
  email?: string;
}

interface MentionListProps {
  items: MentionItem[];
  command: (item: { id: string; label: string }) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.full_name || item.email?.split('@')[0] || "Usuário" });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (!props.items.length) {
    return (
      <div className="bg-background border border-border shadow-md rounded-md p-2 text-xs text-muted-foreground w-48 text-center">
        Nenhum membro encontrado.
      </div>
    );
  }

  return (
    <div className="bg-background border border-border shadow-md rounded-md overflow-hidden w-56 flex flex-col py-1">
      {props.items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={`flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors w-full ${
            index === selectedIndex ? 'bg-primary/20 text-primary-foreground' : 'text-foreground hover:bg-white/5'
          }`}
          onClick={() => selectItem(index)}
        >
          <Avatar className="w-5 h-5">
            <AvatarImage src={item.avatar_url || ''} />
            <AvatarFallback className="text-[10px]">
              {(item.full_name || item.email || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{item.full_name || item.email?.split('@')[0] || "Usuário"}</span>
        </button>
      ))}
    </div>
  );
});

MentionList.displayName = 'MentionList';
