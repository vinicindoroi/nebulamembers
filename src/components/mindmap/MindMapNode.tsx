import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeProps, Node, Handle, Position, useReactFlow } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { formatArrows } from '@/lib/formatArrows';
import { ChevronRight, ChevronDown, StickyNote, Link, Plus } from 'lucide-react';
import { MindMapTheme } from './mindMapThemes';

export interface MindMapNodeData {
  label: string;
  color?: string;
  textColor?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right';
  emoji?: string;
  note?: string;
  links?: string[];
  attachments?: string[];
  depth?: number;
  shape?: 'rounded' | 'rectangle' | 'ellipse' | 'cloud';
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  _theme?: MindMapTheme;
  _collapsed?: boolean;
  _hasChildren?: boolean;
  _isDropTarget?: boolean;
  _autoEdit?: boolean;
  _initialChar?: string;
  _onToggleCollapse?: () => void;
  _onOpenDetail?: () => void;
  _onAddChild?: () => void;
  _onAddSibling?: () => void;
  _onTextSelection?: (hasSelection: boolean, format?: { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean }) => void;
  [key: string]: unknown;
}

const shapeClasses: Record<string, string> = {
  rounded: 'rounded-xl',
  rectangle: 'rounded-md',
  ellipse: 'rounded-full px-6',
  cloud: 'rounded-[2rem]',
};

// Check if a label contains HTML tags
function isHtml(str: string): boolean {
  return /<[a-z][\s\S]*>/i.test(str);
}

export function MindMapNode({ id, data, selected }: NodeProps<Node<MindMapNodeData>>) {
  const [editing, setEditing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(editing);
  const inputSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTextSelectionRef = useRef(data._onTextSelection);
  const { setNodes } = useReactFlow();

  // Keep ref in sync
  onTextSelectionRef.current = data._onTextSelection;

  const isRoot = data.depth === 0;
  const theme = data._theme;
  const isFloating = data._isFloating === true;
  const isDropTarget = data._isDropTarget === true;
  const bgColor = isFloating ? 'transparent' : (data.color || data.backgroundColor || (theme?.depthColors[data.depth ?? 1]) || '#2d2f3d');
  const fontSize = data.fontSize || (isRoot ? 18 : 14);
  const shape = isFloating ? 'rounded' : (data.shape || 'rounded');
  const borderStyle = data.borderStyle || 'solid';
  const textColor = isFloating
    ? (data.textColor || (theme?.nodeTextDark ? '#1a1a1a' : '#ffffff'))
    : (data.textColor || (theme?.nodeTextDark && data.depth !== 0 ? '#1a1a1a' : '#ffffff'));
  const hasIndicators = data.note || (data.links && data.links.length > 0);

  // Sync label into contentEditable when NOT editing and NOT selected
  // (skip when selected to avoid destroying the active text selection after execCommand/formatting)
  useEffect(() => {
    if (!editing && !selected && contentRef.current) {
      const label = data.label || 'Sem título';
      if (isHtml(label)) {
        contentRef.current.innerHTML = label;
      } else {
        contentRef.current.innerHTML = formatArrows(label);
      }
    }
  }, [data.label, editing, selected]);

  // Auto-enter edit mode when _autoEdit flag is set
  useEffect(() => {
    if (data._autoEdit && !editing) {
      setEditing(true);
      
      if (data._initialChar && contentRef.current) {
        contentRef.current.textContent = data._initialChar;
      }
      
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, _autoEdit: false, _initialChar: undefined } } : n));
    }
  }, [data._autoEdit, id, setNodes, data._initialChar, editing]);

  // Focus and select all when entering edit mode
  useEffect(() => {
    if (editing && contentRef.current) {
      const focusAndSelect = () => {
        if (!contentRef.current) return;
        contentRef.current.focus();
        
        const range = document.createRange();
        const sel = window.getSelection();
        
        // If there's an initial char, we just put cursor at the end instead of selecting all
        if (data._initialChar) {
          range.selectNodeContents(contentRef.current);
          range.collapse(false); // collapse to end
        } else {
          // Select all text
          range.selectNodeContents(contentRef.current);
        }
        
        sel?.removeAllRanges();
        sel?.addRange(range);
      };

      focusAndSelect();
      // Try again slightly later in case React Flow steals focus after mount
      setTimeout(focusAndSelect, 10);
      setTimeout(focusAndSelect, 50);
      setTimeout(focusAndSelect, 100);
    }
  }, [editing, data._initialChar]);

  useEffect(() => { editingRef.current = editing; }, [editing]);

  const commitEdit = useCallback(() => {
    setEditing(false);
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      // If content is plain text (no HTML tags), store as plain text
      const plainText = contentRef.current.textContent || '';
      const hasFormatting = isHtml(html) && html !== plainText;
      const finalLabel = hasFormatting ? html : (plainText || 'Sem título');
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: finalLabel } } : n));
    }
  }, [id, setNodes]);

  // Commit on unmount
  useEffect(() => {
    return () => {
      if (editingRef.current && contentRef.current) {
        const html = contentRef.current.innerHTML;
        const plainText = contentRef.current.textContent || '';
        const hasFormatting = isHtml(html) && html !== plainText;
        const finalLabel = hasFormatting ? html : (plainText || 'Sem título');
        setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: finalLabel } } : n));
      }
    };
  }, [id, setNodes]);

  // Detect text selection and its formatting for toolbar — only on mouseup to avoid interrupting drag selection
  useEffect(() => {
    if (!selected) return;
    const reportSelection = (e: MouseEvent) => {
      const sel = window.getSelection();
      const hasSelection = !!(sel && sel.toString().length > 0 && contentRef.current?.contains(sel.anchorNode));
      if (hasSelection) {
        const format = {
          bold: document.queryCommandState('bold'),
          italic: document.queryCommandState('italic'),
          underline: document.queryCommandState('underline'),
          strikeThrough: document.queryCommandState('strikeThrough'),
        };
        onTextSelectionRef.current?.(true, format);
      } else {
        // Only clear selection state if the mouseup was inside this node's contentEditable area
        // (not on the toolbar buttons, which would falsely clear the selection)
        const target = e.target as HTMLElement;
        if (contentRef.current?.contains(target)) {
          onTextSelectionRef.current?.(false);
        }
      }
    };
    document.addEventListener('mouseup', reportSelection);
    return () => document.removeEventListener('mouseup', reportSelection);
  }, [selected]);

  // Global mouseup to end selecting state even if mouse leaves the node
  useEffect(() => {
    if (!isSelecting) return;
    const handleUp = () => setIsSelecting(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isSelecting]);

  return (
    <div
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      className={cn(
        'px-4 py-2.5 transition-all relative group',
        data.textAlign === 'left' ? 'text-left' : data.textAlign === 'right' ? 'text-right' : 'text-center',
        editing ? 'select-text cursor-text nopan nodrag' : 'select-none',
        isFloating ? 'bg-transparent border-0 shadow-none' : cn('shadow-lg border-2', shapeClasses[shape]),
        isDropTarget && !isFloating ? 'outline outline-3 outline-offset-4 outline-green-400 scale-105' : '',
        isDropTarget && isFloating ? 'outline outline-2 outline-offset-4 outline-green-400/60 rounded-lg scale-105' : '',
        selected && !isFloating && !isDropTarget ? 'outline outline-2 outline-offset-2 outline-primary' : '',
        selected && isFloating && !isDropTarget ? 'outline outline-1 outline-offset-1 outline-primary/30 rounded-lg' : '',
        isRoot && !data.fontWeight ? 'font-bold' : '',
        data.fontWeight === 'bold' ? 'font-bold' : '',
        data.fontStyle === 'italic' ? 'italic' : ''
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: isFloating ? 'transparent' : (selected ? 'oklch(0.65 0.22 290)' : borderStyle === 'none' ? 'transparent' : `${bgColor}88`),
        borderStyle: isFloating ? 'none' : (borderStyle === 'none' ? 'solid' : borderStyle),
        fontSize,
        color: textColor,
        width: 'fit-content',
        minWidth: 60,
        maxWidth: 260,
        wordBreak: 'break-word' as const,
        overflow: 'visible',
      }}
    >
      <Handle id="target-left" type="target" position={Position.Left} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="target-top" type="target" position={Position.Top} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="target-bottom" type="target" position={Position.Bottom} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="target-right" type="target" position={Position.Right} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />

      <div className={cn("flex items-center gap-1 whitespace-pre-wrap", data.textAlign === 'left' ? 'justify-start' : data.textAlign === 'right' ? 'justify-end' : 'justify-center')}>
        {data.emoji && <span className="text-base">{data.emoji}</span>}
        <div
          ref={contentRef}
          contentEditable={editing || selected}
          suppressContentEditableWarning
          onMouseDown={(e) => { if (selected) { e.stopPropagation(); setIsSelecting(true); onTextSelectionRef.current?.(false); } }}
          onMouseUp={() => setIsSelecting(false)}
          onBlur={() => { setIsSelecting(false); if (editing) commitEdit(); }}
          onInput={() => {
            // Save HTML after execCommand changes (partial formatting)
            // Use a debounce to avoid re-render killing the active selection
            if (contentRef.current && selected && !editing) {
              if (inputSaveTimerRef.current) clearTimeout(inputSaveTimerRef.current);
              inputSaveTimerRef.current = setTimeout(() => {
                if (!contentRef.current) return;
                const sel = window.getSelection();
                const savedRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;
                const html = contentRef.current.innerHTML;
                const plainText = contentRef.current.textContent || '';
                const hasFormatting = isHtml(html) && html !== plainText;
                const finalLabel = hasFormatting ? html : (plainText || 'Sem título');
                setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: finalLabel } } : n));
                // Restore selection after React re-render
                requestAnimationFrame(() => {
                  if (savedRange && contentRef.current?.contains(savedRange.startContainer)) {
                    const s = window.getSelection();
                    s?.removeAllRanges();
                    s?.addRange(savedRange);
                  }
                });
              }, 150);
            }
          }}
          onKeyDown={(e) => {
            if (editing) {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') {
                if (contentRef.current) {
                  const label = data.label || 'Sem título';
                  contentRef.current.innerHTML = isHtml(label) ? label : formatArrows(label);
                }
                setEditing(false);
              }
              e.stopPropagation();
            }
          }}
          className={cn(
            "leading-tight whitespace-pre-wrap outline-none",
            selected && !editing ? 'select-text cursor-text nopan nodrag' : '',
            data.textAlign === 'left' ? 'text-left' : data.textAlign === 'right' ? 'text-right' : 'text-center'
          )}
          style={{
            textDecoration: data.textDecoration || 'none',
            minWidth: 30,
            minHeight: '1.2em',
          }}
        />
      </div>

      {/* Indicators */}
      {hasIndicators && !editing && (
        <div className="flex items-center justify-center gap-1.5 mt-1 opacity-50">
          {data.note && <StickyNote className="w-3 h-3" />}
          {data.links && data.links.length > 0 && <Link className="w-3 h-3" />}
        </div>
      )}

      {/* Collapse/Expand button */}
      {data._hasChildren && !isSelecting && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); data._onToggleCollapse?.(); }}
          className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-600/60 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 hover:border-primary/40 hover:scale-110 transition-all shadow-md z-30 cursor-pointer"
          title={data._collapsed ? 'Expandir' : 'Colapsar'}
        >
          {data._collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Add child button (right side) */}
      {selected && !isSelecting && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); data._onAddChild?.(); }}
          className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-125 hover:shadow-primary/50 transition-all z-30 cursor-pointer ring-2 ring-background"
          style={{ right: data._hasChildren ? '-3rem' : '-1.75rem' }}
          title="Adicionar filho (Tab)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Add sibling button (bottom) */}
      {selected && !isRoot && !isSelecting && (
        <button
          onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); data._onAddSibling?.(); }}
          className="absolute left-1/2 -translate-x-1/2 -bottom-8 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 hover:scale-125 hover:shadow-primary/50 transition-all z-30 cursor-pointer ring-2 ring-background"
          title="Adicionar irmão (Enter)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      <Handle id="source-left" type="source" position={Position.Left} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="source-top" type="source" position={Position.Top} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="source-bottom" type="source" position={Position.Bottom} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
      <Handle id="source-right" type="source" position={Position.Right} className="!bg-transparent !w-1 !h-1 !border-0 !min-w-0 !min-h-0" />
    </div>
  );
}
