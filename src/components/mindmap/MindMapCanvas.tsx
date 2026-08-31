import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  useReactFlow,
  BackgroundVariant,
  Panel,
  MarkerType,
  Viewport,
  OnMoveEnd,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid, ZoomIn, ZoomOut, Maximize, Presentation, Download,
  Palette, ChevronLeft, ChevronRight, Check, Loader2,
  ChevronsDownUp, ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Funnel } from '@/hooks/useFunnels';
import { MindMapNode, MindMapNodeData } from './MindMapNode';
import { MindMapFloatingToolbar } from './MindMapFloatingToolbar';
import { MindMapDetailPanel } from './MindMapDetailPanel';
import { MindMapThemeSelector } from './MindMapThemeSelector';
import { MindMapPresentationMode } from './MindMapPresentationMode';
import { MindMapExportMenu } from './MindMapExportMenu';
import { MIND_MAP_THEMES, MindMapTheme } from './mindMapThemes';
import { toast } from 'sonner';

const nodeTypes = { mindmap: MindMapNode } as const;

// Wrapper that positions toolbar above the selected node using screen coordinates
function MindMapToolbarPositioner(props: React.ComponentProps<typeof MindMapFloatingToolbar>) {
  const { flowToScreenPosition } = useReactFlow();
  const node = props.node;
  const screenPos = flowToScreenPosition({ x: node.position.x, y: node.position.y });

  return (
    <div
      className="fixed z-50 pointer-events-auto"
      style={{
        left: screenPos.x,
        top: screenPos.y - 52,
        transform: 'translateX(-30%)',
      }}
    >
      <MindMapFloatingToolbar {...props} />
    </div>
  );
}

function getDefaultEdgeOptions(theme: MindMapTheme) {
  return {
    type: 'smoothstep',
    style: { strokeWidth: 2, stroke: theme.edgeColor },
    markerEnd: { type: MarkerType.Arrow as const, width: 12, height: 12, color: theme.edgeColor },
  };
}

// ----- Helper: strip internal/runtime props from nodes before persisting -----
function stripInternalProps(nodes: Node[]): Node[] {
  return nodes.map((n) => {
    const {
      _theme, _collapsed, _hasChildren, _isFloating, _autoEdit,
      _onToggleCollapse, _onOpenDetail, _onAddChild, _onAddSibling, _onTextSelection,
      ...cleanData
    } = n.data as MindMapNodeData;
    return { ...n, data: cleanData };
  });
}

interface MindMapCanvasProps {
  funnel: Funnel;
  onSave: (funnelId: string, nodes: Node[], edges: Edge[], viewport: Viewport) => void;
  isSaving: boolean;
  onRegisterFlush?: (flush: () => void) => void;
}

export function MindMapCanvas({ funnel, onSave, isSaving, onRegisterFlush }: MindMapCanvasProps) {
  const [themeId, setThemeId] = useState<string>(() =>
    localStorage.getItem('mindmap-theme') || 'nebula'
  );
  const theme = MIND_MAP_THEMES.find((t) => t.id === themeId) || MIND_MAP_THEMES[0];

  const initialNodes = useMemo((): Node<MindMapNodeData>[] => {
    if (funnel.nodes && Array.isArray(funnel.nodes) && funnel.nodes.length > 0) {
      const depthColors = theme.depthColors as unknown as string[];
      // Ensure all nodes have type 'mindmap' and valid data structure
      return (funnel.nodes as Node<MindMapNodeData>[])
        .filter((n) => n && n.id && n.position)
        .map((n) => ({
          ...n,
          type: 'mindmap' as const,
          position: n.position || { x: 0, y: 0 },
          data: {
            ...n.data,
            label: n.data?.label || '',
            depth: n.data?.depth ?? 0,
            color: n.data?.color || depthColors[Math.min(n.data?.depth ?? 0, depthColors.length - 1)],
          },
        }));
    }
    return [{
      id: 'root',
      type: 'mindmap' as const,
      position: { x: 400, y: 300 },
      data: { label: funnel.name || 'Ideia Central', depth: 0, color: theme.depthColors[0] } as MindMapNodeData,
    }];
  }, [funnel.id]);

  const initialEdges = useMemo(() => {
    if (funnel.edges && Array.isArray(funnel.edges)) {
      return (funnel.edges as Edge[]).filter((e) => e && e.id && e.source && e.target);
    }
    return [] as Edge[];
  }, [funnel.id]);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const lastSavedSnapshotRef = useRef<string>('');

  const pendingRelayoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track previous measured sizes to detect actual size changes
  const prevMeasuredRef = useRef<Map<string, { width: number; height: number }>>(new Map());

  // Skip dimension-triggered relayout during initial load (nodes being measured for the first time)
  const initialMeasureDoneRef = useRef(false);
  const initialMeasureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap onNodesChange to detect dimension changes and re-run layout
  const onNodesChange = useCallback((changes: Parameters<typeof onNodesChangeBase>[0]) => {
    onNodesChangeBase(changes);
    // Check if any change is a dimension change (node got measured/resized)
    let hasRealSizeChange = false;
    for (const c of changes as any[]) {
      if (c.type === 'dimensions' && c.dimensions) {
        const prev = prevMeasuredRef.current.get(c.id);
        const newW = c.dimensions.width;
        const newH = c.dimensions.height;
        if (!prev) {
          // First measurement — record it but don't trigger relayout
          prevMeasuredRef.current.set(c.id, { width: newW, height: newH });
        } else if (Math.abs(prev.width - newW) > 1 || Math.abs(prev.height - newH) > 1) {
          // Actual size change after initial measurement
          hasRealSizeChange = true;
          prevMeasuredRef.current.set(c.id, { width: newW, height: newH });
        }
      }
    }

    // Mark initial measurement window as done after a delay
    if (!initialMeasureDoneRef.current) {
      if (initialMeasureTimerRef.current) clearTimeout(initialMeasureTimerRef.current);
      initialMeasureTimerRef.current = setTimeout(() => {
        initialMeasureDoneRef.current = true;
      }, 1500);
    }

    if (hasRealSizeChange && initialMeasureDoneRef.current) {
      // Run layout after React has applied the new measurements
      if (pendingRelayoutRef.current) clearTimeout(pendingRelayoutRef.current);
      pendingRelayoutRef.current = setTimeout(() => {
        pendingRelayoutRef.current = null;
        resolveOverlapsRef.current();
      }, 30);
    }
  }, [onNodesChangeBase]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [hasTextSelection, setHasTextSelection] = useState(false);
  const [selectionFormat, setSelectionFormat] = useState<{ bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean } | null>(null);

  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [detailInitialTab, setDetailInitialTab] = useState<string | undefined>(undefined);
  const [presentationMode, setPresentationMode] = useState(false);
  const [copiedStyle, setCopiedStyle] = useState<Partial<MindMapNodeData> | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(`mindmap-collapsed-${funnel.id}`);
      if (stored) return new Set(JSON.parse(stored) as string[]);
    } catch { /* ignore */ }
    return new Set();
  });
  const _expandPushMapRef = useRef<Map<string, Map<string, { x: number; y: number }>>>(new Map()); // deprecated, kept to avoid ref order change
  const collapsedNodesRef = useRef(collapsedNodes);

  // Auto-persist collapsed state whenever it changes
  useEffect(() => {
    collapsedNodesRef.current = collapsedNodes;
    try {
      localStorage.setItem(`mindmap-collapsed-${funnel.id}`, JSON.stringify([...collapsedNodes]));
    } catch { /* ignore */ }
  }, [collapsedNodes, funnel.id]);

  const resolveOverlapsRef = useRef<(triggerNodeId?: string) => void>(() => {});
  const [layoutDirection, setLayoutDirection] = useState<'H' | 'V'>(() =>
    (localStorage.getItem('mindmap-layout-dir') as 'H' | 'V') || 'H'
  );
  const [isFloating, setIsFloating] = useState<boolean>(() =>
    localStorage.getItem('mindmap-floating') === 'true'
  );
  const [interactionMode, setInteractionMode] = useState<'move' | 'select'>('move');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const dropTargetRef = useRef<string | null>(null);

  const { fitView, zoomIn, zoomOut, getViewport, setCenter } = useReactFlow();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // ======= BULLETPROOF SAVE SYSTEM =======
  // All mutable state stored in refs so save ALWAYS has latest data,
  // even during unmount when React state may be frozen.
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef<Viewport>(funnel.viewport || { x: 0, y: 0, zoom: 1 });
  const onSaveRef = useRef(onSave);
  const funnelIdRef = useRef(funnel.id);

  // Keep refs in sync — these run on every render
  nodesRef.current = nodes;
  edgesRef.current = edges;
  onSaveRef.current = onSave;
  funnelIdRef.current = funnel.id;
  collapsedNodesRef.current = collapsedNodes;

  // Track viewport via onMoveEnd so we always have a safe copy
  const onMoveEnd: OnMoveEnd = useCallback((_event, viewport) => {
    viewportRef.current = viewport;
  }, []);

  // Also try to sync viewport from getViewport when possible
  const safeGetViewport = useCallback((): Viewport => {
    try {
      const vp = getViewport();
      if (vp && typeof vp.x === 'number') {
        viewportRef.current = vp;
        return vp;
      }
    } catch {
      // getViewport can throw during unmount
    }
    return viewportRef.current;
  }, [getViewport]);

  // Core save function — ALWAYS reads from refs, never stale
  const doSave = useCallback(() => {
    const cleanNodes = stripInternalProps(nodesRef.current);
    const curEdges = edgesRef.current;
    const viewport = safeGetViewport();

    const snapshot = JSON.stringify({ nodes: cleanNodes, edges: curEdges });
    if (snapshot === lastSavedSnapshotRef.current) {
      return; // no changes
    }

    lastSavedSnapshotRef.current = snapshot;
    console.log('[MindMap] Saving', cleanNodes.length, 'nodes,', curEdges.length, 'edges');
    onSaveRef.current(funnelIdRef.current, cleanNodes, curEdges, viewport);
  }, [safeGetViewport]);

  // Debounced save — resets on every change
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      doSave();
    }, 700);
  }, [doSave]);

  // Flush = cancel timer + save immediately
  const flushSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    doSave();
  }, [doSave]);

  // Seed snapshot on mount to avoid saving unchanged data
  useEffect(() => {
    const cleanNodes = stripInternalProps(initialNodes);
    lastSavedSnapshotRef.current = JSON.stringify({ nodes: cleanNodes, edges: initialEdges });
  }, []);

  // Trigger debounced save whenever nodes or edges change
  useEffect(() => {
    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [nodes, edges, scheduleSave]);

  // Flush on unmount (runs exactly once)
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      // Force save with whatever data is in refs right now
      const cleanNodes = stripInternalProps(nodesRef.current);
      const curEdges = edgesRef.current;
      const snapshot = JSON.stringify({ nodes: cleanNodes, edges: curEdges });
      if (snapshot !== lastSavedSnapshotRef.current) {
        console.log('[MindMap] Flushing on unmount:', cleanNodes.length, 'nodes');
        lastSavedSnapshotRef.current = snapshot;
        onSaveRef.current(funnelIdRef.current, cleanNodes, curEdges, viewportRef.current);
      }
    };
  }, []);

  // Register flush with parent for cross-funnel switching
  useEffect(() => {
    onRegisterFlush?.(flushSave);
    return () => onRegisterFlush?.(undefined as unknown as () => void);
  }, [onRegisterFlush, flushSave]);

  // Save on tab hide (visibilitychange)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [flushSave]);

  // ======= END SAVE SYSTEM =======

  // Stable refs for callbacks used in node data injection (breaks render loop)
  const createChildNodeRef = useRef<(parentId: string) => void>(() => {});
  const createSiblingNodeRef = useRef<(nodeId: string) => void>(() => {});
  const toggleCollapseRef = useRef<(nodeId: string) => void>(() => {});
  const openDetailPanelRef = useRef<(nodeId: string) => void>(() => {});

  // Provide theme to nodes via data + ensure callbacks are injected
  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({
      ...n,
      data: {
        ...n.data,
        _theme: theme,
        _collapsed: collapsedNodes.has(n.id),
        _hasChildren: edges.some((e) => e.source === n.id),
        _isFloating: isFloating,
        _isDropTarget: dropTargetId === n.id,
        // Preserve _autoEdit flag so new nodes can auto-enter edit mode
        _autoEdit: n.data._autoEdit ?? false,
        _onToggleCollapse: () => toggleCollapseRef.current(n.id),
        _onOpenDetail: () => openDetailPanelRef.current(n.id),
        _onAddChild: () => createChildNodeRef.current(n.id),
        _onAddSibling: () => createSiblingNodeRef.current(n.id),
        _onTextSelection: (has: boolean, fmt?: { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean }) => { setHasTextSelection(has); setSelectionFormat(has ? fmt || null : null); },
      }
    })));
  }, [theme, collapsedNodes, edges.length, isFloating, dropTargetId]);

  // Hide collapsed children
  const visibleNodes = useMemo(() => {
    const hidden = new Set<string>();
    const visited = new Set<string>();
    const hideChildren = (parentId: string) => {
      if (visited.has(parentId)) return;
      visited.add(parentId);
      edges.filter((e) => e.source === parentId).forEach((e) => {
        hidden.add(e.target);
        hideChildren(e.target);
      });
    };
    collapsedNodes.forEach((id) => hideChildren(id));
    return nodes.map((n) => ({ ...n, hidden: hidden.has(n.id) }));
  }, [nodes, edges, collapsedNodes]);

  // Recalculate edge handles based on node positions (closest anchor)
  // Build a map: nodeId -> branch index (which root child it descends from)
  const branchColorMap = useMemo(() => {
    const parentMap = new Map<string, string>();
    edges.forEach((e) => parentMap.set(e.target, e.source));

    // Find root children (direct children of 'root' node)
    const rootChildren = edges.filter((e) => e.source === 'root').map((e) => e.target);

    // For any node, walk up to find which root child it descends from
    const cache = new Map<string, number>();
    const getBranchIndex = (nodeId: string, visited = new Set<string>()): number => {
      if (nodeId === 'root') return -1;
      if (cache.has(nodeId)) return cache.get(nodeId)!;
      if (visited.has(nodeId)) return 0; // cycle detected, break recursion
      visited.add(nodeId);
      const idx = rootChildren.indexOf(nodeId);
      if (idx !== -1) { cache.set(nodeId, idx); return idx; }
      const parent = parentMap.get(nodeId);
      const result = parent ? getBranchIndex(parent, visited) : 0;
      cache.set(nodeId, result);
      return result;
    };

    return getBranchIndex;
  }, [edges]);

  // Branch palette from theme — uses edgeDepthColors, falls back to hardcoded palette
  const BRANCH_PALETTE = Object.keys(theme.edgeDepthColors).length > 0
    ? Object.values(theme.edgeDepthColors)
    : ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6',
       '#a855f7', '#ef4444', '#14b8a6', '#f97316', '#8b5cf6',
       '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#d946ef'];

  const edgesWithHandles = useMemo(() => {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return edges.map((e) => {
      const sourceNode = nodeMap.get(e.source);
      const targetNode = nodeMap.get(e.target);
      if (!sourceNode || !targetNode) return e;

      const sw = (sourceNode.measured?.width ?? 100) / 2;
      const sh = (sourceNode.measured?.height ?? 40) / 2;
      const tw = (targetNode.measured?.width ?? 100) / 2;
      const th = (targetNode.measured?.height ?? 40) / 2;

      const sx = sourceNode.position.x + sw;
      const sy = sourceNode.position.y + sh;
      const tx = targetNode.position.x + tw;
      const ty = targetNode.position.y + th;

      const dx = tx - sx;
      const dy = ty - sy;

      let sourceHandle: string;
      let targetHandle: string;

      // In tree layout, force consistent handles so all sibling edges share the same trunk
      if (layoutDirection === 'H') {
        // Horizontal: parent is left, children are right
        if (dx >= 0) {
          sourceHandle = 'source-right';
          targetHandle = 'target-left';
        } else {
          sourceHandle = 'source-left';
          targetHandle = 'target-right';
        }
      } else if (layoutDirection === 'V') {
        // Vertical: parent is top, children are bottom
        if (dy >= 0) {
          sourceHandle = 'source-bottom';
          targetHandle = 'target-top';
        } else {
          sourceHandle = 'source-top';
          targetHandle = 'target-bottom';
        }
      } else {
        // Fallback: nearest anchor
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) { sourceHandle = 'source-right'; targetHandle = 'target-left'; }
          else { sourceHandle = 'source-left'; targetHandle = 'target-right'; }
        } else {
          if (dy > 0) { sourceHandle = 'source-bottom'; targetHandle = 'target-top'; }
          else { sourceHandle = 'source-top'; targetHandle = 'target-bottom'; }
        }
      }

      // Color by branch: each root child and all its descendants share one color
      const branchIdx = branchColorMap(e.target);
      const edgeColor = branchIdx >= 0
        ? BRANCH_PALETTE[branchIdx % BRANCH_PALETTE.length]
        : theme.edgeColor;

      return {
        ...e,
        sourceHandle,
        targetHandle,
        style: { strokeWidth: 3, stroke: edgeColor },
        markerEnd: isFloating ? undefined : { type: MarkerType.Arrow as const, width: 12, height: 12, color: edgeColor },
      };
    });
  }, [nodes, edges, theme, isFloating, branchColorMap, layoutDirection]);

  const visibleEdges = useMemo(() => {
    const hiddenIds = new Set(visibleNodes.filter((n) => n.hidden).map((n) => n.id));
    return edgesWithHandles.map((e) => ({ ...e, hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target) }));
  }, [edgesWithHandles, visibleNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, ...getDefaultEdgeOptions(theme) }, eds)),
    [setEdges, theme]
  );

  const getNodeDepth = useCallback((nodeId: string): number => {
    const find = (id: string, v: Set<string> = new Set()): number => {
      if (id === 'root') return 0;
      if (v.has(id)) return 1;
      v.add(id);
      const pe = edges.find((e) => e.target === id);
      return pe ? find(pe.source, v) + 1 : 1;
    };
    return find(nodeId);
  }, [edges]);

  const getParentId = useCallback((nodeId: string) => {
    return edges.find((e) => e.target === nodeId)?.source || null;
  }, [edges]);

  const getSiblings = useCallback((nodeId: string) => {
    const parentId = getParentId(nodeId);
    if (!parentId) return [];
    return edges.filter((e) => e.source === parentId).map((e) => e.target);
  }, [edges, getParentId]);

  const getChildren = useCallback((nodeId: string) => {
    return edges.filter((e) => e.source === nodeId).map((e) => e.target);
  }, [edges]);

  const createChildNode = useCallback((parentId: string) => {
    const childId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    
    // Build the new edge first so we can read the latest edges including this one
    const edgeOpts = isFloating
      ? { ...getDefaultEdgeOptions(theme), style: { strokeWidth: 3, stroke: theme.edgeColor }, markerEnd: undefined }
      : getDefaultEdgeOptions(theme);
    const newEdge = { id: `edge_${parentId}_${childId}`, source: parentId, target: childId, ...edgeOpts };

    // Update edges first so edgesRef is fresh for the setNodes call
    setEdges((currentEdges) => {
      const updatedEdges = [...currentEdges, newEdge];
      // Eagerly update ref so setNodes below can read it
      edgesRef.current = updatedEdges;
      return updatedEdges;
    });

    setNodes((currentNodes) => {
      const parentNode = currentNodes.find((n) => n.id === parentId);
      if (!parentNode) return currentNodes;
      
      // Use the ref which now includes the new edge
      const allEdges = edgesRef.current;

      const depth = (() => {
        const find = (id: string, v: Set<string> = new Set()): number => {
          if (id === 'root') return 0;
          if (v.has(id)) return 1;
          v.add(id);
          const pe = allEdges.find((e) => e.target === id);
          return pe ? find(pe.source, v) + 1 : 1;
        };
        return find(parentId) + 1;
      })();
      
      // Exclude the edge we just added (it points to childId which doesn't exist yet)
      const existingChildIds = allEdges
        .filter((ed) => ed.source === parentId && ed.target !== childId)
        .map((ed) => ed.target);
      const existingChildren = currentNodes.filter((n) => existingChildIds.includes(n.id));
      
      const GAP_CHILD = 60; // gap between parent's edge and child
      const crossKey: 'x' | 'y' = layoutDirection === 'H' ? 'y' : 'x';
      const mainKey: 'x' | 'y' = layoutDirection === 'H' ? 'x' : 'y';
      const sizeKey: 'width' | 'height' = layoutDirection === 'H' ? 'height' : 'width';
      const defaultSize = layoutDirection === 'H' ? 40 : 120;
      const parentWidth = parentNode.measured?.width ?? 120;
      const parentHeight = parentNode.measured?.height ?? 40;
      
      let newX: number, newY: number;
      
      if (existingChildren.length === 0) {
        // First child: position after parent's right/bottom edge + gap
        newX = layoutDirection === 'H' ? parentNode.position.x + parentWidth + GAP_CHILD : parentNode.position.x;
        newY = layoutDirection === 'H' ? parentNode.position.y : parentNode.position.y + parentHeight + GAP_CHILD;
      } else {
        // Place at same main-axis as siblings, after the last one on cross-axis
        const mainPos = existingChildren[0].position[mainKey];
        let maxEnd = -Infinity;
        existingChildren.forEach((c) => {
          const s = c.measured?.[sizeKey] ?? defaultSize;
          const end = c.position[crossKey] + s;
          if (end > maxEnd) maxEnd = end;
        });
        if (layoutDirection === 'H') {
          newX = mainPos;
          newY = maxEnd + GAP_CHILD;
        } else {
          newX = maxEnd + GAP_CHILD;
          newY = mainPos;
        }
      }
      
      const newNode: Node<MindMapNodeData> = {
        id: childId,
        type: 'mindmap',
        position: { x: newX, y: newY },
        data: {
          label: '',
          depth,
          color: isFloating ? undefined : (theme.depthColors[depth] || theme.depthColors[1]),
          _theme: theme,
          _collapsed: false,
          _hasChildren: false,
          _isFloating: isFloating,
          _autoEdit: true,
          _onToggleCollapse: () => toggleCollapseRef.current(childId),
          _onOpenDetail: () => openDetailPanelRef.current(childId),
          _onAddChild: () => createChildNodeRef.current(childId),
          _onAddSibling: () => createSiblingNodeRef.current(childId),
          _onTextSelection: (has: boolean, fmt?: { bold: boolean; italic: boolean; underline: boolean; strikeThrough: boolean }) => { setHasTextSelection(has); setSelectionFormat(has ? fmt || null : null); },
        },
      };
      
      // Don't manually re-center here — resolveOverlaps handles full subtree centering.
      // Just add the new node and let the layout engine sort it out.
      return [...currentNodes, newNode];
    });
    
    setCollapsedNodes((prev) => { const next = new Set(prev); next.delete(parentId); return next; });
    setSelectedNodeId(childId);
    // Programmatically select the new node in React Flow and re-trigger autoEdit after mount
    setTimeout(() => {
      setNodes((nds) => nds.map((n) => ({
        ...n,
        selected: n.id === childId,
        data: n.id === childId ? { ...n.data, _autoEdit: true } : n.data,
      })));
    }, 80);
    // Multiple passes to catch delayed node measurements
    setTimeout(() => resolveOverlapsRef.current(), 50);
    setTimeout(() => resolveOverlapsRef.current(), 150);
    setTimeout(() => resolveOverlapsRef.current(), 300);
    setTimeout(() => resolveOverlapsRef.current(), 600);
    setTimeout(() => resolveOverlapsRef.current(), 1000);
  }, [setNodes, setEdges, theme, isFloating, layoutDirection]);

  const createSiblingNode = useCallback((nodeId: string) => {
    const parentId = getParentId(nodeId);
    if (!parentId) return;
    createChildNode(parentId);
  }, [getParentId, createChildNode]);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === 'root') return;
    const toDelete = new Set<string>();
    const queue = [nodeId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      toDelete.add(cur);
      edges.filter((ed) => ed.source === cur).forEach((ed) => queue.push(ed.target));
    }
    setNodes((nds) => nds.filter((n) => !toDelete.has(n.id)));
    setEdges((eds) => {
      const updated = eds.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target));
      edgesRef.current = updated;
      return updated;
    });
    setSelectedNodeId(null);
    // Realign remaining siblings after deletion
    setTimeout(() => resolveOverlapsRef.current(), 50);
    setTimeout(() => resolveOverlapsRef.current(), 200);
    setTimeout(() => resolveOverlapsRef.current(), 500);
  }, [edges, setNodes, setEdges]);

  // ======= OVERLAP RESOLUTION =======
  const resolveOverlaps = useCallback((_triggerNodeId?: string, compact = false) => {
    setNodes((currentNodes) => {
      const collapsed = collapsedNodesRef.current;
      const allEdges = edgesRef.current;
      const dir = layoutDirection;
      const crossKey: 'x' | 'y' = dir === 'H' ? 'y' : 'x';
      const GAP = 30;

      const childrenMap = new Map<string, string[]>();
      allEdges.forEach((e) => {
        if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
        childrenMap.get(e.source)!.push(e.target);
      });

      const hiddenSet = new Set<string>();
      const visitedDesc = new Set<string>();
      const hideDesc = (pid: string) => {
        if (visitedDesc.has(pid)) return;
        visitedDesc.add(pid);
        (childrenMap.get(pid) || []).forEach((cid) => {
          hiddenSet.add(cid);
          hideDesc(cid);
        });
      };
      collapsed.forEach((id) => hideDesc(id));

      const newPositions = new Map(currentNodes.map((n) => [n.id, { ...n.position }]));
      const nodeMap = new Map(currentNodes.map((n) => [n.id, n]));

      const getNodeSize = (nid: string) => {
        const node = nodeMap.get(nid);
        return dir === 'H' ? (node?.measured?.height ?? 40) : (node?.measured?.width ?? 120);
      };

      const shiftSubtree = (nid: string, delta: number, _visited = new Set<string>()) => {
        if (hiddenSet.has(nid) || _visited.has(nid)) return;
        _visited.add(nid);
        const pos = newPositions.get(nid)!;
        if (dir === 'H') pos.y += delta; else pos.x += delta;
        (childrenMap.get(nid) || []).forEach((cid) => shiftSubtree(cid, delta, _visited));
      };

      // Phase 1 (bottom-up): calculate total cross-axis span needed for each subtree
      const subtreeSpanCache = new Map<string, number>();
      const getSubtreeSpan = (nid: string): number => {
        if (hiddenSet.has(nid)) return 0;
        if (subtreeSpanCache.has(nid)) return subtreeSpanCache.get(nid)!;
        const visChildren = (childrenMap.get(nid) || []).filter((id) => !hiddenSet.has(id));
        const nodeSize = getNodeSize(nid);
        if (visChildren.length === 0) {
          subtreeSpanCache.set(nid, nodeSize);
          return nodeSize;
        }
        const childrenTotalSpan = visChildren.reduce((sum, cid, i) => {
          return sum + getSubtreeSpan(cid) + (i > 0 ? GAP : 0);
        }, 0);
        const span = Math.max(nodeSize, childrenTotalSpan);
        subtreeSpanCache.set(nid, span);
        return span;
      };

      // Helper: get node size on the main axis
      const getNodeMainSize = (nid: string) => {
        const node = nodeMap.get(nid);
        return dir === 'H' ? (node?.measured?.width ?? 120) : (node?.measured?.height ?? 40);
      };

      const GAP_CHILD = 60; // gap between parent edge and children on main axis

      // Helper: shift entire subtree on main axis
      const shiftSubtreeMain = (nid: string, delta: number, _visited = new Set<string>()) => {
        if (hiddenSet.has(nid) || _visited.has(nid)) return;
        _visited.add(nid);
        const pos = newPositions.get(nid)!;
        if (dir === 'H') pos.x += delta; else pos.y += delta;
        (childrenMap.get(nid) || []).forEach((cid) => shiftSubtreeMain(cid, delta, _visited));
      };

      // Phase 2 (top-down): position children centered around parent + align main axis
      const layoutVisited = new Set<string>();
      const layoutNode = (nid: string) => {
        if (hiddenSet.has(nid) || layoutVisited.has(nid)) return;
        layoutVisited.add(nid);
        const visChildren = (childrenMap.get(nid) || []).filter((id) => !hiddenSet.has(id));
        if (visChildren.length === 0) return;

        const parentPos = newPositions.get(nid)!;
        const parentSize = getNodeSize(nid);
        const parentCenter = parentPos[crossKey] + parentSize / 2;

        // --- Main-axis alignment: keep children at parent edge + gap ---
        const parentMainSize = getNodeMainSize(nid);
        const mainKey: 'x' | 'y' = dir === 'H' ? 'x' : 'y';
        const expectedMainPos = parentPos[mainKey] + parentMainSize + GAP_CHILD;
        // Use the first child's main-axis position as reference for all siblings
        const firstChildPos = newPositions.get(visChildren[0])!;
        const mainDelta = expectedMainPos - firstChildPos[mainKey];
        if (Math.abs(mainDelta) > 0.5) {
          visChildren.forEach((cid) => shiftSubtreeMain(cid, mainDelta));
        }

        // --- Cross-axis centering ---
        // Calculate total span of children group
        const childSpans = visChildren.map((cid) => getSubtreeSpan(cid));
        const totalChildrenSpan = childSpans.reduce((sum, s, i) => sum + s + (i > 0 ? GAP : 0), 0);

        // Position children centered around parent
        let cursor = parentCenter - totalChildrenSpan / 2;
        visChildren.forEach((cid, i) => {
          const span = childSpans[i];
          const childSize = getNodeSize(cid);
          // Center the child node within its subtree span
          const childTargetPos = cursor + span / 2 - childSize / 2;
          const currentPos = newPositions.get(cid)![crossKey];
          const delta = childTargetPos - currentPos;
          if (Math.abs(delta) > 0.5) {
            shiftSubtree(cid, delta);
          }
          cursor += span + GAP;
        });

        // Recurse into children
        visChildren.forEach((cid) => layoutNode(cid));
      };

      // Start layout from root
      layoutNode('root');

      let changed = false;
      const result = currentNodes.map((n) => {
        const newPos = newPositions.get(n.id)!;
        if (Math.abs(newPos.x - n.position.x) > 0.5 || Math.abs(newPos.y - n.position.y) > 0.5) {
          changed = true;
          return { ...n, position: newPos };
        }
        return n;
      });

      return changed ? result : currentNodes;
    });
  }, [layoutDirection, setNodes]);

  resolveOverlapsRef.current = resolveOverlaps;

  // Run layout after initial mount to fix imported/loaded node positions
  useEffect(() => {
    const timers = [
      setTimeout(() => resolveOverlapsRef.current(), 300),
      setTimeout(() => resolveOverlapsRef.current(), 800),
      setTimeout(() => resolveOverlapsRef.current(), 1500),
    ];
    return () => timers.forEach(clearTimeout);
  }, [funnel.id]);

  const toggleCollapse = useCallback((nodeId: string) => {
    const wasCollapsed = collapsedNodes.has(nodeId);
    const newCollapsed = new Set(collapsedNodes);
    if (wasCollapsed) {
      newCollapsed.delete(nodeId);
    } else {
      newCollapsed.add(nodeId);
    }
    setCollapsedNodes(newCollapsed);
    // Run overlap resolution multiple times to catch delayed node measurements
    setTimeout(() => resolveOverlaps(undefined, true), 50);
    setTimeout(() => resolveOverlaps(undefined, true), 200);
    setTimeout(() => resolveOverlaps(undefined, true), 500);
  }, [collapsedNodes, resolveOverlaps, funnel.id]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return;

    // H / V interaction mode shortcuts
    if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setInteractionMode('move');
      return;
    }
    if (e.key.toLowerCase() === 'v' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setInteractionMode('select');
      return;
    }

    if (e.key === 'Tab' && selectedNodeId) {
      e.preventDefault();
      createChildNode(selectedNodeId);
    }

    if (e.key === 'Enter' && selectedNodeId && selectedNodeId !== 'root') {
      e.preventDefault();
      createSiblingNode(selectedNodeId);
    }

    if (e.key === 'Delete') {
      e.preventDefault();
      if (selectedNodeIds.size > 1) {
        // Multi-delete: delete all selected nodes (except root)
        const toDelete = new Set<string>();
        selectedNodeIds.forEach((nid) => {
          if (nid === 'root') return;
          const queue = [nid];
          while (queue.length > 0) {
            const cur = queue.shift()!;
            toDelete.add(cur);
            edges.filter((ed) => ed.source === cur).forEach((ed) => queue.push(ed.target));
          }
        });
        setNodes((nds) => nds.filter((n) => !toDelete.has(n.id)));
        setEdges((eds) => eds.filter((ed) => !toDelete.has(ed.source) && !toDelete.has(ed.target)));
        setSelectedNodeId(null);
        setSelectedNodeIds(new Set());
      } else if (selectedNodeId) {
        deleteNode(selectedNodeId);
      }
    }

    if (e.key === ' ' && selectedNodeId) {
      e.preventDefault();
      const node = nodes.find((n) => n.id === selectedNodeId);
      if (node) setCenter(node.position.x + 60, node.position.y + 20, { zoom: 1.2, duration: 300 });
    }

    if (e.key === 'ArrowRight' && selectedNodeId) {
      e.preventDefault();
      const children = getChildren(selectedNodeId);
      if (children.length > 0) setSelectedNodeId(children[0]);
    }
    if (e.key === 'ArrowLeft' && selectedNodeId) {
      e.preventDefault();
      const parent = getParentId(selectedNodeId);
      if (parent) setSelectedNodeId(parent);
    }
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && selectedNodeId) {
      e.preventDefault();
      const siblings = getSiblings(selectedNodeId);
      const idx = siblings.indexOf(selectedNodeId);
      const next = e.key === 'ArrowUp' ? idx - 1 : idx + 1;
      if (next >= 0 && next < siblings.length) setSelectedNodeId(siblings[next]);
    }

    // Start typing to edit
    if (
      selectedNodeId && 
      e.key.length === 1 && 
      !e.ctrlKey && 
      !e.metaKey && 
      !e.altKey &&
      selectedNodeIds.size <= 1
    ) {
      e.preventDefault();
      setNodes(nds => nds.map(n => {
        if (n.id === selectedNodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              _autoEdit: true,
              _initialChar: e.key
            }
          };
        }
        return n;
      }));
      return;
    }
  }, [selectedNodeId, selectedNodeIds, nodes, edges, createChildNode, createSiblingNode, deleteNode, setNodes, setEdges, setCenter, getChildren, getParentId, getSiblings]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ======= PARENT-CHILD PROPORTIONAL MOVEMENT =======
  const dragStartPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const snapPositionRef = useRef<{ x: number | null; y: number | null }>({ x: null, y: null });
  const SNAP_THRESHOLD = 15;

  // Get all descendants of a node
  const getAllDescendants = useCallback((nodeId: string): string[] => {
    const descendants: string[] = [];
    const queue = [nodeId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = edges.filter((e) => e.source === cur).map((e) => e.target);
      children.forEach((c) => {
        descendants.push(c);
        queue.push(c);
      });
    }
    return descendants;
  }, [edges]);

  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    // Store positions of all descendants at drag start
    const descendants = getAllDescendants(node.id);
    const posMap = new Map<string, { x: number; y: number }>();
    posMap.set(node.id, { ...node.position });
    nodes.forEach((n) => {
      if (descendants.includes(n.id)) {
        posMap.set(n.id, { ...n.position });
      }
    });
    dragStartPositionsRef.current = posMap;
  }, [nodes, getAllDescendants]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    const startPos = dragStartPositionsRef.current.get(draggedNode.id);
    if (!startPos) return;

    const descendants = getAllDescendants(draggedNode.id);

    // Magnetic snapping — prioritize parent alignment
    let snapX: number | null = null;
    let snapY: number | null = null;

    const draggedWidth = draggedNode.measured?.width ?? 100;
    const draggedHeight = draggedNode.measured?.height ?? 40;
    const draggedCenterX = draggedNode.position.x + draggedWidth / 2;
    const draggedCenterY = draggedNode.position.y + draggedHeight / 2;

    // Compute truly hidden nodes (descendants of collapsed) for drop target filtering
    const hiddenNodeIds = new Set<string>();
    const collapsed = collapsedNodesRef.current;
    const allEdges = edgesRef.current;
    const _visitedHide = new Set<string>();
    const hideDescendants = (pid: string) => {
      if (_visitedHide.has(pid)) return;
      _visitedHide.add(pid);
      allEdges.filter((e) => e.source === pid).forEach((e) => {
        hiddenNodeIds.add(e.target);
        hideDescendants(e.target);
      });
    };
    collapsed.forEach((id) => hideDescendants(id));

    // Drop target detection — find node being hovered over
    let currentDropTarget: string | null = null;
    const parentEdge = allEdges.find((e) => e.target === draggedNode.id);
    const currentParentId = parentEdge?.source || null;

    // Minimum drag distance to allow reparenting (prevents accidental reparent from small movements)
    const MIN_REPARENT_DISTANCE = 30;
    const dragDist = Math.sqrt(
      Math.pow(draggedNode.position.x - startPos.x, 2) +
      Math.pow(draggedNode.position.y - startPos.y, 2)
    );
    const allowReparent = dragDist >= MIN_REPARENT_DISTANCE;

    // First pass: find parent node for priority snapping
    let parentSnappedX = false;
    let parentSnappedY = false;
    if (currentParentId) {
      const parentNode = nodes.find((n) => n.id === currentParentId);
      if (parentNode) {
        const parentWidth = parentNode.measured?.width ?? 100;
        const parentHeight = parentNode.measured?.height ?? 40;
        const parentCenterX = parentNode.position.x + parentWidth / 2;
        const parentCenterY = parentNode.position.y + parentHeight / 2;

        if (Math.abs(draggedCenterX - parentCenterX) < SNAP_THRESHOLD) {
          snapX = parentCenterX - draggedWidth / 2;
          parentSnappedX = true;
        }
        if (Math.abs(draggedCenterY - parentCenterY) < SNAP_THRESHOLD) {
          snapY = parentCenterY - draggedHeight / 2;
          parentSnappedY = true;
        }
      }
    }

    // Second pass: snap to siblings/other nodes only if parent didn't snap that axis
    for (const node of nodes) {
      // Skip hidden nodes (collapsed descendants), self, and own descendants
      if (node.id === draggedNode.id || descendants.includes(node.id) || hiddenNodeIds.has(node.id)) continue;

      const nodeWidth = node.measured?.width ?? 100;
      const nodeHeight = node.measured?.height ?? 40;
      const nodeCenterX = node.position.x + nodeWidth / 2;
      const nodeCenterY = node.position.y + nodeHeight / 2;

      // Check overlap for drop target — use center-of-dragged-inside-target for easier reparenting
      // Only allow if dragged enough distance and target is not current parent
      if (allowReparent && node.id !== currentParentId) {
        const isCenterInside =
          draggedCenterX >= node.position.x &&
          draggedCenterX <= node.position.x + nodeWidth &&
          draggedCenterY >= node.position.y &&
          draggedCenterY <= node.position.y + nodeHeight;
        if (isCenterInside) {
          currentDropTarget = node.id;
        }
      }

      if (!parentSnappedX) {
        if (Math.abs(draggedCenterX - nodeCenterX) < SNAP_THRESHOLD) {
          snapX = nodeCenterX - draggedWidth / 2;
        } else if (Math.abs(draggedNode.position.x - node.position.x) < SNAP_THRESHOLD) {
          snapX = node.position.x;
        }
      }
      if (!parentSnappedY) {
        if (Math.abs(draggedCenterY - nodeCenterY) < SNAP_THRESHOLD) {
          snapY = nodeCenterY - draggedHeight / 2;
        } else if (Math.abs(draggedNode.position.y - node.position.y) < SNAP_THRESHOLD) {
          snapY = node.position.y;
        }
      }
    }

    dropTargetRef.current = currentDropTarget;
    setDropTargetId(currentDropTarget);
    snapPositionRef.current = { x: snapX, y: snapY };

    // Apply snap (individual) or just move descendants (group)
    const finalX = snapX !== null ? snapX : draggedNode.position.x;
    const finalY = snapY !== null ? snapY : draggedNode.position.y;
    const finalDeltaX = finalX - startPos.x;
    const finalDeltaY = finalY - startPos.y;

    if (descendants.length > 0 || snapX !== null || snapY !== null) {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === draggedNode.id && (snapX !== null || snapY !== null)) {
            return { ...n, position: { x: finalX, y: finalY } };
          }
          if (descendants.includes(n.id)) {
            const childStart = dragStartPositionsRef.current.get(n.id);
            if (childStart) {
              return { ...n, position: { x: childStart.x + finalDeltaX, y: childStart.y + finalDeltaY } };
            }
          }
          return n;
        })
      );
    }
  }, [nodes, getAllDescendants, setNodes]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, draggedNode: Node) => {
    // Reparent or snap cleanup

    // Reparent if dropped on a valid target
    const targetId = dropTargetRef.current;
    dropTargetRef.current = null;
    setDropTargetId(null);

    if (targetId && targetId !== draggedNode.id) {
      const descendants = getAllDescendants(draggedNode.id);
      // Can't reparent to own descendant
      if (!descendants.includes(targetId)) {
        // Compute new edges first so we can use them for positioning
        const currentEdges = edgesRef.current;
        console.log('[Reparent] draggedNode:', draggedNode.id, 'to target:', targetId);
        console.log('[Reparent] descendants:', descendants);
        console.log('[Reparent] currentEdges count:', currentEdges.length, currentEdges.map(e => `${e.source}->${e.target}`));
        const edgesWithoutOld = currentEdges.filter((e) => e.target !== draggedNode.id);
        console.log('[Reparent] edgesWithoutOld count:', edgesWithoutOld.length, edgesWithoutOld.map(e => `${e.source}->${e.target}`));
        const edgeOpts = isFloating
          ? { style: { strokeWidth: 3, stroke: theme.edgeColor }, markerEnd: undefined }
          : { style: { strokeWidth: 3, stroke: theme.edgeColor }, markerEnd: { type: MarkerType.Arrow as const, width: 12, height: 12, color: theme.edgeColor } };
        const newEdge: Edge = {
          id: `edge_${targetId}_${draggedNode.id}`,
          source: targetId,
          target: draggedNode.id,
          type: 'smoothstep',
          ...edgeOpts,
        };
        const updatedEdges = [...edgesWithoutOld, newEdge];
        console.log('[Reparent] updatedEdges count:', updatedEdges.length, updatedEdges.map(e => `${e.source}->${e.target}`));
        
        // Update edges ref eagerly so resolveOverlaps has correct data
        edgesRef.current = updatedEdges;
        setEdges(updatedEdges);

        // Find existing children of the new parent from the KNOWN edges (excluding the reparented node)
        const siblingIds = edgesWithoutOld
          .filter((e) => e.source === targetId)
          .map((e) => e.target);

        // Reposition the reparented node next to its new parent
        setNodes((nds) => {
          const targetNode = nds.find((n) => n.id === targetId);
          if (!targetNode) return nds;
          
          const existingSiblings = nds.filter((n) => siblingIds.includes(n.id));
          
          const targetWidth = targetNode.measured?.width ?? 120;
          const targetHeight = targetNode.measured?.height ?? 40;
          const GAP_CHILD = 60;
          const GAP_SIBLING = 30;
          let newX: number, newY: number;

          if (layoutDirection === 'H') {
            newX = targetNode.position.x + targetWidth + GAP_CHILD;
            if (existingSiblings.length === 0) {
              newY = targetNode.position.y;
            } else {
              let maxBottom = -Infinity;
              existingSiblings.forEach((c) => {
                const h = c.measured?.height ?? 40;
                if (c.position.y + h > maxBottom) maxBottom = c.position.y + h;
              });
              newY = maxBottom + GAP_SIBLING;
            }
          } else {
            newY = targetNode.position.y + targetHeight + GAP_CHILD;
            if (existingSiblings.length === 0) {
              newX = targetNode.position.x;
            } else {
              let maxRight = -Infinity;
              existingSiblings.forEach((c) => {
                const w = c.measured?.width ?? 120;
                if (c.position.x + w > maxRight) maxRight = c.position.x + w;
              });
              newX = maxRight + GAP_SIBLING;
            }
          }

          // Calculate delta to also move descendants
          const deltaX = newX - draggedNode.position.x;
          const deltaY = newY - draggedNode.position.y;

          return nds.map((n) => {
            if (n.id === draggedNode.id) {
              return { ...n, position: { x: newX, y: newY } };
            }
            if (descendants.includes(n.id)) {
              return { ...n, position: { x: n.position.x + deltaX, y: n.position.y + deltaY } };
            }
            return n;
          });
        });

        toast.success('Nó vinculado ao novo pai');
        snapPositionRef.current = { x: null, y: null };
        // Resolve overlaps after repositioning
        setTimeout(() => resolveOverlapsRef.current(), 50);
        setTimeout(() => resolveOverlapsRef.current(), 200);
        setTimeout(() => resolveOverlapsRef.current(), 500);
        return;
      }
    }
    
    // Re-apply snap position on stop to override snapToGrid rounding
    const { x: snapX, y: snapY } = snapPositionRef.current;
    if (snapX !== null || snapY !== null) {
      const startPos = dragStartPositionsRef.current.get(draggedNode.id);
      const finalX = snapX !== null ? snapX : draggedNode.position.x;
      const finalY = snapY !== null ? snapY : draggedNode.position.y;
      const descendants = getAllDescendants(draggedNode.id);
      
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === draggedNode.id) {
            return { ...n, position: { x: finalX, y: finalY } };
          }
          if (startPos && descendants.includes(n.id)) {
            const childStart = dragStartPositionsRef.current.get(n.id);
            if (childStart) {
              return {
                ...n,
                position: {
                  x: childStart.x + (finalX - startPos.x),
                  y: childStart.y + (finalY - startPos.y),
                },
              };
            }
          }
          return n;
        })
      );
    }
    
    snapPositionRef.current = { x: null, y: null };
  }, [getAllDescendants, setNodes, setEdges, isFloating, theme, layoutDirection]);

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedNodeId(sel.length === 1 ? sel[0].id : null);
    setSelectedNodeIds(new Set(sel.map((n) => n.id)));
    setHasTextSelection(false);
    setSelectionFormat(null);
  }, []);

  // Auto-layout with direction support
  const autoLayout = useCallback((dir?: 'H' | 'V') => {
    const direction = dir || layoutDirection;
    const GAP_MAIN = 260;
    const GAP_CROSS = 70;
    const pos = new Map<string, { x: number; y: number }>();
    let crossPos = 0;
    const layout = (id: string, depth: number): { min: number; max: number } => {
      const ch = edges.filter((e) => e.source === id).map((e) => e.target);
      if (ch.length === 0) {
        if (direction === 'H') {
          pos.set(id, { x: depth * GAP_MAIN, y: crossPos });
        } else {
          pos.set(id, { x: crossPos, y: depth * GAP_MAIN });
        }
        const r = { min: crossPos, max: crossPos };
        crossPos += GAP_CROSS;
        return r;
      }
      const bounds = ch.map((c) => layout(c, depth + 1));
      const center = (bounds[0].min + bounds[bounds.length - 1].max) / 2;
      if (direction === 'H') {
        pos.set(id, { x: depth * GAP_MAIN, y: center });
      } else {
        pos.set(id, { x: center, y: depth * GAP_MAIN });
      }
      return { min: bounds[0].min, max: bounds[bounds.length - 1].max };
    };
    crossPos = 0;
    layout('root', 0);
    setNodes((nds) => nds.map((n) => { const p = pos.get(n.id); return p ? { ...n, position: p } : n; }));
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [edges, setNodes, fitView, layoutDirection]);

  // Update node data
  const updateNodeData = useCallback((nodeId: string, updates: Partial<MindMapNodeData>) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [setNodes]);

  // Copy/paste style
  const copyStyle = useCallback(() => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return;
    const d = node.data as MindMapNodeData;
    setCopiedStyle({ color: d.color, textColor: d.textColor, fontSize: d.fontSize, shape: d.shape, borderStyle: d.borderStyle });
  }, [selectedNodeId, nodes]);

  const pasteStyle = useCallback(() => {
    if (!selectedNodeId || !copiedStyle) return;
    updateNodeData(selectedNodeId, copiedStyle);
  }, [selectedNodeId, copiedStyle, updateNodeData]);

  // Open detail panel
  const openDetailPanel = useCallback((nodeId: string, tab?: string) => {
    setDetailNodeId(nodeId);
    setDetailInitialTab(tab);
    setDetailPanelOpen(true);
  }, []);

  // Keep refs in sync with latest callback versions
  createChildNodeRef.current = createChildNode;
  createSiblingNodeRef.current = createSiblingNode;
  toggleCollapseRef.current = toggleCollapse;
  openDetailPanelRef.current = openDetailPanel;

  // Theme change
  const changeTheme = useCallback((id: string) => {
    setThemeId(id);
    localStorage.setItem('mindmap-theme', id);
    const newTheme = MIND_MAP_THEMES.find((t) => t.id === id) || MIND_MAP_THEMES[0];
    setNodes((nds) => nds.map((n) => {
      const d = n.data as MindMapNodeData;
      if (d.depth === 0) return { ...n, data: { ...d, color: newTheme.depthColors[0] } };
      return n;
    }));
    setEdges((eds) => eds.map((e) => {
      if (isFloating) {
        const targetNode = nodes.find((n) => n.id === e.target);
        const depth = (targetNode?.data as MindMapNodeData)?.depth ?? 1;
        return { ...e, ...getDefaultEdgeOptions(newTheme), style: { strokeWidth: 3, stroke: newTheme.depthColors[depth] || newTheme.edgeColor }, markerEnd: undefined };
      }
      return { ...e, ...getDefaultEdgeOptions(newTheme) };
    }));
  }, [setNodes, setEdges, nodes, isFloating]);

  // Export as markdown
  const exportMarkdown = useCallback(() => {
    const lines: string[] = [];
    const render = (id: string, depth: number) => {
      const node = nodes.find((n) => n.id === id);
      if (!node) return;
      const d = node.data as MindMapNodeData;
      const prefix = depth === 0 ? '# ' : '  '.repeat(depth - 1) + '- ';
      lines.push(prefix + (d.emoji ? d.emoji + ' ' : '') + d.label);
      if (d.note) lines.push('  '.repeat(depth) + '  > ' + d.note);
      if (d.links?.length) d.links.forEach((l) => lines.push('  '.repeat(depth) + '  🔗 ' + l));
      edges.filter((e) => e.source === id).forEach((e) => render(e.target, depth + 1));
    };
    render('root', 0);
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${funnel.name || 'mindmap'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, funnel.name]);

  // Export as JSON
  const exportJSON = useCallback(() => {
    const data = { name: funnel.name, nodes, edges, viewport: safeGetViewport(), funnel_type: 'mind' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${funnel.name || 'mindmap'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges, safeGetViewport, funnel.name]);

  // Import from JSON
  const importJSON = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.nodes && Array.isArray(data.nodes)) {
            setNodes(data.nodes);
            setEdges(data.edges || []);
            setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100);
            toast.success('Mapa importado com sucesso!');
          } else {
            toast.error('Formato JSON inválido');
          }
        } catch {
          toast.error('Erro ao ler o arquivo JSON');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setNodes, setEdges, fitView]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const detailNode = nodes.find((n) => n.id === detailNodeId);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {}, []);

  if (presentationMode) {
    return (
      <MindMapPresentationMode
        nodes={nodes}
        edges={edges}
        theme={theme}
        onExit={() => setPresentationMode(false)}
      />
    );
  }

  return (
    <div className="w-full h-full relative" ref={canvasRef}>
      <ReactFlow
        nodes={visibleNodes}
        edges={visibleEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodeClick={onNodeClick}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onMoveEnd={onMoveEnd}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={getDefaultEdgeOptions(theme)}
        defaultViewport={funnel.viewport || { x: 0, y: 0, zoom: 1 }}
        fitView={!funnel.viewport || funnel.nodes.length === 0}
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={null}
        panOnDrag={interactionMode === 'move'}
        selectionOnDrag={interactionMode === 'select'}
        multiSelectionKeyCode="Shift"
        snapToGrid={false}
        style={{ backgroundColor: theme.background }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.dotColor} />
        <MiniMap
          nodeColor={(n) => (n.data as MindMapNodeData)?.color || theme.depthColors[1]}
          maskColor="rgba(10, 10, 14, 0.7)"
        />

        {/* Bottom controls */}
        <Panel position="bottom-center" className="flex gap-1.5 mb-2">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]" onClick={() => zoomIn({ duration: 200 })} title="Zoom In">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]" onClick={() => zoomOut({ duration: 200 })} title="Zoom Out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]" onClick={() => fitView({ padding: 0.2, duration: 300 })} title="Ajustar">
            <Maximize className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30] gap-1.5" onClick={() => autoLayout()}>
            <LayoutGrid className="h-3.5 w-3.5" />
            Auto-layout
          </Button>
          <div className="flex items-center bg-[#1a1a1f]/90 border border-white/10 rounded-lg shadow-lg backdrop-blur-sm overflow-hidden h-8">
            <Button
              size="sm"
              variant={interactionMode === 'move' ? 'default' : 'ghost'}
              className="h-8 rounded-none px-2.5 text-xs font-bold"
              onClick={() => setInteractionMode('move')}
              title="Mover (H)"
            >
              H
            </Button>
            <Button
              size="sm"
              variant={interactionMode === 'select' ? 'default' : 'ghost'}
              className="h-8 rounded-none px-2.5 text-xs font-bold"
              onClick={() => setInteractionMode('select')}
              title="Selecionar (V)"
            >
              V
            </Button>
          </div>
          <div className="w-px h-6 bg-white/10 self-center" />
          <Button
            size="sm"
            variant={isFloating ? 'default' : 'ghost'}
            className={cn("h-8 rounded-lg shadow-lg gap-1.5 text-xs backdrop-blur-sm", !isFloating && "bg-[#1a1a1f]/90 border border-white/10 hover:bg-[#2a2a30]")}
            onClick={() => {
              const next = !isFloating;
              setIsFloating(next);
              localStorage.setItem('mindmap-floating', String(next));
            }}
            title="Modo flutuante (sem fundo nos blocos)"
          >
            Flutuante
          </Button>
          <div className="w-px h-6 bg-white/10 self-center" />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]"
            onClick={() => {
              // Collapse all nodes that have children — only keep root expanded
              const parentsWithChildren = new Set(edges.map((e) => e.source));
              const newCollapsed = new Set(parentsWithChildren);
              // Don't collapse root so its direct children remain visible
              newCollapsed.delete('root');
              setCollapsedNodes(newCollapsed);
              // Compact layout and fit view after hiding descendants
              setTimeout(() => resolveOverlaps(undefined, true), 50);
              setTimeout(() => resolveOverlaps(undefined, true), 200);
              setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 300);
            }}
            title="Contrair tudo"
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]"
            onClick={() => {
              const newCollapsed = new Set<string>();
              setCollapsedNodes(newCollapsed);
              // Run overlap resolution multiple times to catch delayed node measurements
              setTimeout(() => resolveOverlaps(undefined, true), 50);
              setTimeout(() => resolveOverlaps(undefined, true), 200);
              setTimeout(() => resolveOverlaps(undefined, true), 500);
              setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 600);
            }}
            title="Expandir tudo"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <MindMapThemeSelector currentTheme={themeId} onChangeTheme={changeTheme} />
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg bg-[#1a1a1f]/90 border border-white/10 shadow-lg backdrop-blur-sm hover:bg-[#2a2a30]" onClick={() => setPresentationMode(true)} title="Modo Apresentação">
            <Presentation className="h-4 w-4" />
          </Button>
          <MindMapExportMenu onExportMarkdown={exportMarkdown} onExportJSON={exportJSON} onImportJSON={importJSON} canvasRef={canvasRef} />
        </Panel>

        {/* Auto-save status indicator */}
        <Panel position="top-right" className="mr-2 mt-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-[#1a1a1f]/90 backdrop-blur border border-white/10 rounded-lg shadow-lg">
            {isSaving ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />
                <span className="text-zinc-400">Salvando...</span>
              </>
            ) : (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Salvo</span>
              </>
            )}
          </div>
        </Panel>

        {/* Hint */}
        <Panel position="top-left" className="ml-2 mt-2">
          <div className="text-[11px] text-zinc-400 bg-[#1a1a1f]/90 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 shadow-lg space-x-2">
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Tab</kbd> filho</span>
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Enter</kbd> irmão</span>
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">↑↓←→</kbd> navegar</span>
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Space</kbd> centralizar</span>
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Del</kbd> excluir</span>
            <span><kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">Shift+Click</kbd> multi-selecionar</span>
          </div>
        </Panel>
      </ReactFlow>

      {/* Floating toolbar when node selected */}
      {selectedNode && (
        <MindMapToolbarPositioner
          key="toolbar"
          node={selectedNode}
          theme={theme}
          copiedStyle={copiedStyle}
          onUpdateData={(updates) => updateNodeData(selectedNodeId!, updates)}
          onCopyStyle={copyStyle}
          onPasteStyle={pasteStyle}
          onOpenDetail={(tab?: string) => openDetailPanel(selectedNodeId!, tab)}
          onToggleCollapse={() => toggleCollapse(selectedNodeId!)}
          isCollapsed={collapsedNodes.has(selectedNodeId!)}
          hasChildren={edges.some((e) => e.source === selectedNodeId)}
          hasTextSelection={hasTextSelection}
          selectionFormat={selectionFormat}
          onReportSelection={(has, fmt) => { setHasTextSelection(has); setSelectionFormat(has ? fmt || null : null); }}
        />
      )}

      {/* Detail side panel */}
      {detailPanelOpen && detailNode && (
        <MindMapDetailPanel
          key="detail"
          node={detailNode}
          onClose={() => setDetailPanelOpen(false)}
          onUpdateData={(updates) => updateNodeData(detailNodeId!, updates)}
          initialTab={detailInitialTab}
        />
      )}
    </div>
  );
}
