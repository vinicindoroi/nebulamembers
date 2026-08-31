import { useState, useRef, useEffect, useCallback } from 'react';
import { useReactFlow, NodeResizer, Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { Bold, Italic, Underline, X, Type, AlignLeft, AlignCenter, AlignRight, Minus } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const textColorOptions = [
  { name: 'Branco', value: '#FFFFFF' },
  { name: 'Cinza', value: '#A1A1AA' },
  { name: 'Amarelo', value: '#FCD34D' },
  { name: 'Verde', value: '#4ADE80' },
  { name: 'Azul', value: '#60A5FA' },
  { name: 'Rosa', value: '#F472B6' },
  { name: 'Vermelho', value: '#F87171' },
  { name: 'Laranja', value: '#FB923C' },
];

const fontSizeOptions = [
  { name: 'Pequeno', value: 'sm', size: '14px' },
  { name: 'Médio', value: 'md', size: '16px' },
  { name: 'Grande', value: 'lg', size: '20px' },
  { name: 'Extra Grande', value: 'xl', size: '24px' },
  { name: 'Título', value: '2xl', size: '30px' },
];

interface FreeTextData {
  label?: string;
  type?: string;
  htmlContent?: string;
  content?: string;
  fontSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  textAlign?: 'left' | 'center' | 'right';
  lineHeight?: 'tight' | 'normal' | 'relaxed' | 'loose';
  width?: number;
  height?: number;
}

interface FreeTextNodeProps {
  data: Record<string, unknown>;
  selected?: boolean;
  id?: string;
}

export function FreeTextNode({ data, selected, id }: FreeTextNodeProps) {
  const nodeData = data as FreeTextData;
  const { setNodes, deleteElements } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initializedRef = useRef(false);
  const [formatState, setFormatState] = useState({ bold: false, italic: false, underline: false });

  const fontSize = nodeData.fontSize || 'sm';
  const textAlign = nodeData.textAlign || 'left';
  const lineHeight = nodeData.lineHeight || 'relaxed';

  const fontSizeMap: Record<string, string> = { 'sm': '14px', 'md': '16px', 'lg': '20px', 'xl': '24px', '2xl': '30px' };
  const lineHeightClass = lineHeight === 'tight' ? 'leading-tight' : lineHeight === 'normal' ? 'leading-normal' : lineHeight === 'loose' ? 'leading-loose' : 'leading-relaxed';
  const textAlignClass = textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : 'text-left';

  const nodeWidth = nodeData.width || 200;

  // Initialize editor content ONCE on mount
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      const html = nodeData.htmlContent || (nodeData.content || nodeData.label || 'Texto...').replace(/\n/g, '<br>');
      editorRef.current.innerHTML = html;
      initializedRef.current = true;
    }
  }, []);

  // Only enter edit mode on double-click, exit when deselected
  useEffect(() => {
    if (!selected && isEditing) {
      setIsEditing(false);
    }
  }, [selected]);

  // Listen for external edit trigger (from canvas double-click)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId === id) {
        setIsEditing(true);
        setTimeout(() => {
          editorRef.current?.focus();
          const sel = window.getSelection();
          if (sel && editorRef.current) {
            sel.selectAllChildren(editorRef.current);
          }
        }, 10);
      }
    };
    window.addEventListener('freetext-edit', handler);
    return () => window.removeEventListener('freetext-edit', handler);
  }, [id]);

  // Save HTML content with debounce — does NOT cause re-render
  const saveContent = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      const html = editorRef.current?.innerHTML || '';
      const text = editorRef.current?.textContent || '';
      setNodes((nodes) =>
        nodes.map((n) => {
          if (n.id === id) {
            return { ...n, data: { ...n.data, htmlContent: html, content: text } };
          }
          return n;
        })
      );
    }, 300);
  }, [id, setNodes]);

  // Update format state based on current selection
  const updateFormatState = useCallback(() => {
    setFormatState({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
    });
  }, []);

  // Apply formatting command — preserves selection
  const applyFormat = useCallback((command: string, value?: string) => {
    // Restore focus without losing selection
    const sel = window.getSelection();
    const range = sel?.rangeCount ? sel.getRangeAt(0) : null;

    if (!editorRef.current?.contains(sel?.anchorNode || null)) {
      editorRef.current?.focus();
    }

    if (range && editorRef.current?.contains(range.startContainer)) {
      document.execCommand(command, false, value);
    } else {
      // No selection in editor — select all and apply
      editorRef.current?.focus();
      document.execCommand('selectAll');
      document.execCommand(command, false, value);
    }

    saveContent();
    updateFormatState();
  }, [saveContent, updateFormatState]);

  // Apply color to selection or all text if nothing selected
  const applyColor = useCallback((color: string) => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed && editorRef.current?.contains(sel.anchorNode)) {
      document.execCommand('foreColor', false, color);
    } else {
      editorRef.current?.focus();
      document.execCommand('selectAll');
      document.execCommand('foreColor', false, color);
      sel?.collapseToEnd();
    }
    saveContent();
  }, [saveContent]);

  const updateStyle = useCallback((key: string, value: string) => {
    setNodes((nodes) =>
      nodes.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, [key]: value } };
        }
        return n;
      })
    );
  }, [id, setNodes]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsEditing(false);
      return;
    }
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('bold');
    }
    if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('italic');
    }
    if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      applyFormat('underline');
    }
    e.stopPropagation();
  }, [applyFormat]);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  // Cycle line height
  const cycleLineHeight = useCallback(() => {
    const order: Array<'tight' | 'normal' | 'relaxed' | 'loose'> = ['tight', 'normal', 'relaxed', 'loose'];
    const idx = order.indexOf(lineHeight as any);
    const next = order[(idx + 1) % order.length];
    updateStyle('lineHeight', next);
  }, [lineHeight, updateStyle]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const currentFontSize = fontSizeOptions.find(f => f.value === fontSize) || fontSizeOptions[0];

  return (
    <>
      {/* Node Resizer */}
      <NodeResizer
        minWidth={80}
        minHeight={30}
        isVisible={selected}
        lineClassName="!border-primary/40"
        handleClassName="!w-2 !h-2 !bg-primary !border-none !rounded-full"
        onResize={(_, params) => {
          setNodes((nodes) =>
            nodes.map((n) => {
              if (n.id === id) {
                return { ...n, data: { ...n.data, width: params.width, height: params.height } };
              }
              return n;
            })
          );
        }}
      />

      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} id="top-target" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5" />

      {/* Floating toolbar - appears only in edit mode (double-click) */}
      {isEditing && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 z-20 flex items-center gap-0.5 px-2 py-1.5 rounded-xl bg-[#111115]/95 backdrop-blur-md border border-[#2a2a35] shadow-2xl shadow-black/50 nodrag nopan"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Text formatting */}
          <Toggle
            pressed={formatState.bold}
            onPressedChange={() => applyFormat('bold')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
          >
            <Bold className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            pressed={formatState.italic}
            onPressedChange={() => applyFormat('italic')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
          >
            <Italic className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            pressed={formatState.underline}
            onPressedChange={() => applyFormat('underline')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground rounded-md"
          >
            <Underline className="w-3.5 h-3.5" />
          </Toggle>

          <div className="w-px h-5 bg-[#333] mx-0.5" />

          {/* Alignment */}
          <Toggle
            pressed={textAlign === 'left'}
            onPressedChange={() => updateStyle('textAlign', 'left')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary/30 data-[state=on]:text-primary rounded-md"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            pressed={textAlign === 'center'}
            onPressedChange={() => updateStyle('textAlign', 'center')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary/30 data-[state=on]:text-primary rounded-md"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </Toggle>
          <Toggle
            pressed={textAlign === 'right'}
            onPressedChange={() => updateStyle('textAlign', 'right')}
            size="sm"
            className="w-7 h-7 p-0 data-[state=on]:bg-primary/30 data-[state=on]:text-primary rounded-md"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </Toggle>

          <div className="w-px h-5 bg-[#333] mx-0.5" />

          {/* Font size dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-xs gap-1 hover:bg-[#2a2a30] rounded-md"
              >
                <Type className="w-3.5 h-3.5" />
                {currentFontSize.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-[#111115] border-[#2a2a35] backdrop-blur-md">
              {fontSizeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => updateStyle('fontSize', option.value)}
                  className={cn('cursor-pointer', fontSize === option.value && 'bg-primary/20')}
                >
                  <span style={{ fontSize: option.size }}>{option.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Line height button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-[#2a2a30] rounded-md"
            onClick={cycleLineHeight}
            title={`Espaçamento: ${lineHeight}`}
          >
            <div className="flex flex-col items-center gap-[2px]">
              <Minus className="w-3 h-3" />
              <Minus className="w-3 h-3" />
            </div>
          </Button>

          <div className="w-px h-5 bg-[#333] mx-0.5" />

          {/* Color picker */}
          <div className="flex items-center gap-0.5">
            {textColorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => applyColor(color.value)}
                className="rounded-full transition-all border border-[#3a3a40] hover:scale-110"
                style={{ backgroundColor: color.value, width: 18, height: 18 }}
                title={color.name}
              />
            ))}
          </div>

          <div className="w-px h-5 bg-[#333] mx-0.5" />

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-500/20 text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Rich text editor — contentEditable div, never re-rendered by React */}
      <div
        ref={editorRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          'relative transition-all duration-150 rounded-md p-1 whitespace-pre-wrap break-words outline-none',
          isEditing && 'nodrag nopan nowheel',
          lineHeightClass,
          textAlignClass,
          selected && 'outline outline-2 outline-primary/40 outline-offset-4',
          !selected && 'hover:outline hover:outline-1 hover:outline-muted-foreground/20 hover:outline-offset-2',
          !isEditing && 'cursor-grab active:cursor-grabbing'
        )}
        style={{
          width: nodeWidth,
          minHeight: 24,
          fontSize: fontSizeMap[fontSize] || '14px',
          color: '#FFFFFF',
          caretColor: '#FFFFFF',
        }}
        onInput={saveContent}
        onKeyDown={handleKeyDown}
        onMouseUp={updateFormatState}
        onKeyUp={updateFormatState}
        onMouseDown={(e) => { if (isEditing) e.stopPropagation(); }}
        onPointerDown={(e) => { if (isEditing) e.stopPropagation(); }}
      />
    </>
  );
}
