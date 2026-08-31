import { useState, useCallback, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MindMapNodeData } from './MindMapNode';
import { MindMapTheme } from './mindMapThemes';

interface Props {
  nodes: Node[];
  edges: Edge[];
  theme: MindMapTheme;
  onExit: () => void;
}

export function MindMapPresentationMode({ nodes, edges, theme, onExit }: Props) {
  // Build ordered list: BFS from root
  const orderedIds = (() => {
    const result: string[] = [];
    const queue = ['root'];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (nodes.find((n) => n.id === id)) {
        result.push(id);
        edges.filter((e) => e.source === id).forEach((e) => queue.push(e.target));
      }
    }
    return result;
  })();

  const [currentIdx, setCurrentIdx] = useState(0);
  const currentNode = nodes.find((n) => n.id === orderedIds[currentIdx]);
  const data = currentNode?.data as MindMapNodeData | undefined;

  const next = useCallback(() => setCurrentIdx((i) => Math.min(i + 1, orderedIds.length - 1)), [orderedIds.length]);
  const prev = useCallback(() => setCurrentIdx((i) => Math.max(i - 1, 0)), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') next();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, onExit]);

  const depth = data?.depth ?? 0;
  const bgColor = data?.color || theme.depthColors[depth] || theme.depthColors[0];

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: theme.background }}>
      {/* Close */}
      <Button size="icon" variant="ghost" className="absolute top-4 right-4 text-white/60 hover:text-white" onClick={onExit}>
        <X className="h-5 w-5" />
      </Button>

      {/* Progress */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1">
        {orderedIds.map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full transition-colors" style={{ backgroundColor: i === currentIdx ? bgColor : 'rgba(255,255,255,0.15)' }} />
        ))}
      </div>

      {/* Content */}
        <div
          key={currentIdx}
          className="text-center max-w-2xl px-8 animate-in fade-in zoom-in-95 duration-250"
        >
          <div className="inline-block px-8 py-5 rounded-2xl shadow-2xl mb-6" style={{ backgroundColor: bgColor }}>
            <p className="text-3xl font-bold" style={{ color: data?.textColor || '#fff' }}>
              {data?.emoji && <span className="mr-2">{data.emoji}</span>}
              {data?.label || ''}
            </p>
          </div>
          {data?.note && (
            <p className="text-lg text-white/60 mt-4 leading-relaxed">{data.note}</p>
          )}
          {data?.links && data.links.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {data.links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noopener" className="text-sm text-primary/80 hover:text-primary underline">{l}</a>
              ))}
            </div>
          )}
        </div>

      {/* Navigation */}
      <div className="absolute bottom-8 flex items-center gap-4">
        <Button size="icon" variant="ghost" className="text-white/40 hover:text-white" onClick={prev} disabled={currentIdx === 0}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <span className="text-white/40 text-sm">{currentIdx + 1} / {orderedIds.length}</span>
        <Button size="icon" variant="ghost" className="text-white/40 hover:text-white" onClick={next} disabled={currentIdx === orderedIds.length - 1}>
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
