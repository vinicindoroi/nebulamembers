import { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  reconnectEdge,
  Connection,
  Node,
  Edge,
  Viewport,
  ReactFlowInstance,
  ConnectionMode,
  SelectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { toPng, toSvg } from 'html-to-image';
import { toast } from 'sonner';
import { canvasNodeTypes } from './CanvasShapeNodes';
import { CanvasToolbar, CanvasTool } from './CanvasToolbar';
import { Funnel } from '@/hooks/useFunnels';

interface CanvasWhiteboardProps {
  funnel: Funnel;
  onSave: (funnelId: string, nodes: Node[], edges: Edge[], viewport: Viewport) => void;
  isSaving?: boolean;
  onRegisterFlush?: (flush: () => void) => void;
}

interface HistoryEntry {
  nodes: Node[];
  edges: Edge[];
}

export function CanvasWhiteboard({
  funnel,
  onSave,
  isSaving,
  onRegisterFlush,
}: CanvasWhiteboardProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance<Node, Edge> | null>(null);
  
  // Toolbar configs
  const [activeTool, setActiveTool] = useState<CanvasTool>('select');
  const [color, setColor] = useState('#8B5CF6'); // Purple default
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [fillShape, setFillShape] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [stickyColor, setStickyColor] = useState('#FEF9C3'); // default yellow post-it

  // Direct color update handler for sticky notes (prevents infinite loop crash)
  const handleStickyColorChange = useCallback((newColor: string) => {
    setStickyColor(newColor);
    setNodes((nds) =>
      nds.map((n) => {
        if (n.selected && n.type === 'sticky') {
          const isDarkBg = ['#1E293B', '#0F172A'].includes(newColor);
          return {
            ...n,
            data: {
              ...n.data,
              backgroundColor: newColor,
              textColor: isDarkBg ? '#ffffff' : '#78350F',
            },
          };
        }
        return n;
      })
    );
  }, [setNodes]);

  // Synchronize menu selection state when selecting a different note on the canvas
  useEffect(() => {
    const selectedSticky = nodes.find(n => n.selected && n.type === 'sticky');
    if (selectedSticky && selectedSticky.data?.backgroundColor && selectedSticky.data.backgroundColor !== stickyColor) {
      setStickyColor(selectedSticky.data.backgroundColor);
    }
  }, [nodes, stickyColor]);

  // Zoom tracker
  const [zoomPercent, setZoomPercent] = useState(100);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });

  // Freehand drawing states
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // History tracking (Undo/Redo)
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Autosave tracking
  const currentFunnelIdRef = useRef<string | null>(null);
  const didApplyInitialViewportRef = useRef(false);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedSnapshotRef = useRef<string>('');

  // Space-bar panning tracking
  const previousToolRef = useRef<CanvasTool>('select');

  // Convert client coordinates to canvas flow coordinates
  const getFlowCoords = (e: React.MouseEvent | React.PointerEvent) => {
    if (!reactFlowInstance || !reactFlowWrapper.current) return null;
    const rect = reactFlowWrapper.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - viewport.x) / viewport.zoom;
    const y = (e.clientY - rect.top - viewport.y) / viewport.zoom;
    return { x, y };
  };

  // Handle pointer down for drawing & shape placing
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Prevent interaction if clicking on UI controls
    if (
      target.closest('.react-flow__controls') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('.nodrag')
    ) {
      return;
    }

    // Panning with right-click or middle-click: do nothing on pointer down
    if (e.button === 1 || e.button === 2) {
      return;
    }

    // Placing shape nodes on click
    const isPlacingTool = [
      'rectangle',
      'ellipse',
      'diamond',
      'triangle',
      'text',
      'sticky',
    ].includes(activeTool);

    if (isPlacingTool) {
      if (e.button !== 0) return; // Left click only
      const coords = getFlowCoords(e);
      if (!coords) return;

      spawnNodeAt(activeTool, coords);
      setActiveTool('select');
      return;
    }

    // Freehand drawing
    if (activeTool === 'draw') {
      if (e.button !== 0) return;
      e.preventDefault();
      const coords = getFlowCoords(e);
      if (!coords) return;

      setCurrentPath([coords]);
      setIsDrawing(true);
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawing) return;
    const coords = getFlowCoords(e);
    if (!coords) return;

    if (activeTool === 'draw') {
      setCurrentPath((prev) => [...prev, coords]);
    }
  };

  const onPointerUp = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (activeTool === 'draw' && currentPath.length > 1) {
      const points = currentPath;
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));

      const w = Math.max(10, maxX - minX);
      const h = Math.max(10, maxY - minY);

      // Normalize points relative to bounding box top-left
      const relPoints = points.map((p) => ({
        x: p.x - minX,
        y: p.y - minY,
      }));

      const newDrawingNode: Node = {
        id: `canvas-drawing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: 'drawing',
        position: { x: minX, y: minY },
        data: {
          points: relPoints,
          color,
          strokeWidth,
          width: w,
          height: h,
        },
      };

      setNodes((nds) => nds.concat(newDrawingNode));
    }
    setCurrentPath([]);
  };

  // Spawn node logic
  const spawnNodeAt = (type: string, position: { x: number; y: number }) => {
    let label = 'Texto';
    let width = 120;
    let height = 80;
    let backgroundColor = 'rgba(139, 92, 246, 0.15)'; // default transparent purple
    let borderColor = '#8B5CF6';

    if (type === 'sticky') {
      label = 'Nota...';
      width = 120;
      height = 120;
      backgroundColor = stickyColor;
      borderColor = 'transparent';
    } else if (type === 'ellipse') {
      label = 'Elipse';
      width = 100;
      height = 100;
      backgroundColor = 'rgba(16, 185, 129, 0.15)';
      borderColor = '#10B981';
    } else if (type === 'diamond') {
      label = 'Losango';
      width = 100;
      height = 100;
      backgroundColor = 'rgba(245, 158, 11, 0.15)';
      borderColor = '#F59E0B';
    } else if (type === 'triangle') {
      label = 'Triângulo';
      width = 100;
      height = 100;
      backgroundColor = 'rgba(239, 68, 68, 0.15)';
      borderColor = '#EF4444';
    } else if (type === 'text') {
      label = 'Texto';
      width = 150;
      height = 40;
      backgroundColor = 'transparent';
      borderColor = 'transparent';
    }

    // Apply color options if customized in toolbar
    if (type !== 'sticky' && type !== 'text') {
      borderColor = color;
      backgroundColor = fillShape
        ? color
        : `${color}${color === '#FFFFFF' ? '20' : '26'}`; // 15% opacity hex variant
    }

    const newNode: Node = {
      id: `canvas-${type}-${Date.now()}`,
      type: type,
      position,
      data: {
        label,
        content: label,
        width,
        height,
        backgroundColor,
        borderColor,
        borderWidth: type === 'text' || type === 'sticky' ? 0 : strokeWidth,
        borderStyle: 'solid',
        textColor: type === 'sticky' ? (['#1E293B', '#0F172A'].includes(backgroundColor) ? '#ffffff' : '#78350F') : '#ffffff',
        fontSize: type === 'text' ? 16 : 14,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success('Elemento adicionado ao canvas!');
  };

  const handleAddImageUrl = (url: string) => {
    if (!reactFlowInstance) return;
    const center = reactFlowInstance.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const newNode: Node = {
      id: `canvas-image-${Date.now()}`,
      type: 'image',
      position: center,
      data: {
        imageUrl: url,
        width: 250,
        height: 180,
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success('Imagem inserida com sucesso!');
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (activeTool === 'eraser') {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
      toast.success('Elemento apagado');
    }
  }, [activeTool, setNodes, setEdges]);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    if (activeTool === 'eraser') {
      setNodes((nds) => nds.filter((n) => n.id !== node.id));
      setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
      toast.success('Elemento apagado');
    }
  }, [activeTool, setNodes, setEdges]);

  // Reconnection and edge management
  const [edgeReconnectSuccessful] = useState({ current: true });

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'straight', // simple straight connections for whiteboards
            animated: false,
            style: { stroke: color, strokeWidth: 2 },
          },
          eds
        )
      );
    },
    [setEdges, color]
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, [edgeReconnectSuccessful]);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds));
    },
    [setEdges, edgeReconnectSuccessful]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    [setEdges, edgeReconnectSuccessful]
  );

  // SVG drawing render
  const getPathD = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      d += ` Q ${points[i].x} ${points[i].y}, ${xc} ${yc}`;
    }
    d += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
    return d;
  };

  // Keyboard Shortcuts (Delete, Undo/Redo, Space bar, Tools)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.hasAttribute('contenteditable');

      if (isTyping) return;

      // Space to Pan
      if (e.code === 'Space' && activeTool !== 'pan') {
        e.preventDefault();
        previousToolRef.current = activeTool;
        setActiveTool('pan');
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Delete elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const selectedNodes = nodes.filter((n) => n.selected);
        const selectedEdges = edges.filter((e) => e.selected);
        if (selectedNodes.length > 0 || selectedEdges.length > 0) {
          setNodes((nds) => nds.filter((n) => !n.selected));
          setEdges((eds) => eds.filter((e) => !e.selected));
          toast.success('Elementos selecionados removidos!');
        }
      }

      // Tool mappings
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'h':
          setActiveTool('pan');
          break;
        case 'd':
          setActiveTool('draw');
          break;
        case 'r':
          setActiveTool('rectangle');
          break;
        case 'o':
          setActiveTool('ellipse');
          break;
        case 'l':
          setActiveTool('diamond');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 's':
          setActiveTool('sticky');
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && activeTool === 'pan') {
        e.preventDefault();
        setActiveTool(previousToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [nodes, edges, activeTool]);

  // Sync ReactFlow viewports and load initial database state
  useEffect(() => {
    if (currentFunnelIdRef.current !== funnel.id) {
      currentFunnelIdRef.current = funnel.id;
      didApplyInitialViewportRef.current = false;

      const nextNodes = funnel.nodes || [];
      const nextEdges = funnel.edges || [];
      const nextViewport = funnel.viewport || { x: 0, y: 0, zoom: 1 };

      setNodes(nextNodes);
      setEdges(nextEdges);
      setViewport(nextViewport as unknown as Viewport);

      lastSavedSnapshotRef.current = JSON.stringify({ nodes: nextNodes, edges: nextEdges, viewport: nextViewport });

      historyRef.current = [];
      historyIndexRef.current = -1;
    }
  }, [funnel.id, setNodes, setEdges]);

  // Set initial viewport once instance is ready
  useEffect(() => {
    if (!reactFlowInstance) return;
    if (currentFunnelIdRef.current !== funnel.id) return;
    if (didApplyInitialViewportRef.current) return;

    didApplyInitialViewportRef.current = true;
    const vp = funnel.viewport || { x: 0, y: 0, zoom: 1 };
    reactFlowInstance.setViewport(vp);
  }, [reactFlowInstance, funnel.id, funnel.viewport]);

  // Viewport tracking & zoom levels
  const onViewportMove = useCallback((viewportData: Viewport) => {
    setViewport(viewportData);
    setZoomPercent(Math.round(viewportData.zoom * 100));
  }, []);

  const handleZoomIn = () => reactFlowInstance?.zoomIn();
  const handleZoomOut = () => reactFlowInstance?.zoomOut();
  const handleFitView = () => reactFlowInstance?.fitView({ padding: 0.1 });

  // Autosave
  const latestStateRef = useRef({ nodes, edges, reactFlowInstance, onSave, funnelId: funnel.id });
  latestStateRef.current = { nodes, edges, reactFlowInstance, onSave, funnelId: funnel.id };

  const flushSave = useCallback(() => {
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const { nodes: curNodes, edges: curEdges, reactFlowInstance: rfi, onSave: curOnSave, funnelId: curFunnelId } = latestStateRef.current;
    if (!rfi) return;
    const vp = rfi.getViewport();
    const snapshot = JSON.stringify({ nodes: curNodes, edges: curEdges, viewport: vp });
    if (snapshot === lastSavedSnapshotRef.current) return;
    lastSavedSnapshotRef.current = snapshot;
    curOnSave(curFunnelId, curNodes, curEdges, vp);
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (!reactFlowInstance) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }
    autosaveTimeoutRef.current = setTimeout(flushSave, 700);
  }, [reactFlowInstance, flushSave]);

  useEffect(() => {
    scheduleAutosave();
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [nodes, edges, scheduleAutosave]);

  useEffect(() => {
    return () => { flushSave(); };
  }, []);

  useEffect(() => {
    onRegisterFlush?.(flushSave);
    return () => onRegisterFlush?.(undefined as unknown as () => void);
  }, [onRegisterFlush, flushSave]);

  // Undo/Redo history serializations
  const serializeState = useCallback((nList: Node[], eList: Edge[]) => {
    return {
      nodes: JSON.parse(JSON.stringify(nList)),
      edges: JSON.parse(JSON.stringify(eList)),
    };
  }, []);

  const saveToHistory = useCallback(() => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    const newEntry = serializeState(nodes, edges);

    if (historyRef.current.length > 0 && historyIndexRef.current >= 0) {
      const lastEntry = historyRef.current[historyIndexRef.current];
      if (
        JSON.stringify(lastEntry.nodes) === JSON.stringify(newEntry.nodes) &&
        JSON.stringify(lastEntry.edges) === JSON.stringify(newEntry.edges)
      ) {
        return;
      }
    }

    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(newEntry);
    historyIndexRef.current = historyRef.current.length - 1;

    if (historyRef.current.length > 40) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [nodes, edges, serializeState]);

  useEffect(() => {
    const timeout = setTimeout(saveToHistory, 500);
    return () => clearTimeout(timeout);
  }, [nodes, edges, saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const entry = historyRef.current[historyIndexRef.current];

      setNodes(JSON.parse(JSON.stringify(entry.nodes)));
      setEdges(JSON.parse(JSON.stringify(entry.edges)));

      toast.success("Desfeito!");
    } else {
      toast.error("Nada para desfazer");
    }
  }, [setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const entry = historyRef.current[historyIndexRef.current];

      setNodes(JSON.parse(JSON.stringify(entry.nodes)));
      setEdges(JSON.parse(JSON.stringify(entry.edges)));

      toast.success("Refeito!");
    } else {
      toast.error("Nada para refazer");
    }
  }, [setNodes, setEdges]);

  const handleClear = () => {
    setNodes([]);
    setEdges([]);
    toast.success("Canvas limpo!");
  };

  const handleExport = async (format: 'png' | 'svg' | 'json') => {
    if (format === 'json') {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify({ nodes, edges, viewport })
      );
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${funnel.name || 'canvas'}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("JSON exportado!");
      return;
    }

    if (!reactFlowWrapper.current) return;

    try {
      const dataUrl =
        format === 'png'
          ? await toPng(reactFlowWrapper.current, {
              backgroundColor: '#0c0c0f',
              quality: 1,
            })
          : await toSvg(reactFlowWrapper.current, {
              backgroundColor: '#0c0c0f',
            });

      const link = document.createElement('a');
      link.download = `${funnel.name || 'canvas'}.${format}`;
      link.href = dataUrl;
      link.click();
      toast.success(`Quadro exportado como ${format.toUpperCase()}!`);
    } catch (error) {
      toast.error('Erro ao exportar quadro');
    }
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  // React Flow configuration options based on tool
  const panOnDrag = activeTool === 'pan' ? true : [1, 2]; // 1: middle-click wheel, 2: right-click
  const selectionMode = activeTool === 'select' ? SelectionMode.Partial : SelectionMode.Full;
  const isRestrictedMode = activeTool !== 'select' && activeTool !== 'pan';

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#0c0c0f] flex flex-col">
      
      {/* Floating horizontal tool controller */}
      <CanvasToolbar
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        color={color}
        setColor={setColor}
        strokeWidth={strokeWidth}
        setStrokeWidth={setStrokeWidth}
        fillShape={fillShape}
        setFillShape={setFillShape}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        zoomPercent={zoomPercent}
        onExport={handleExport}
        onClear={handleClear}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onAddImageUrl={handleAddImageUrl}
        stickyColor={stickyColor}
        setStickyColor={handleStickyColorChange}
        hasSelectedSticky={nodes.some(n => n.selected && n.type === 'sticky')}
      />

      {/* Main interactive whiteboard workspace */}
      <div
        ref={reactFlowWrapper}
        className={cn(
          "flex-1 w-full h-full relative outline-none",
          activeTool === 'pan' && "cursor-grab active:cursor-grabbing",
          activeTool === 'draw' && "cursor-crosshair",
          activeTool === 'eraser' && "cursor-cell",
          (activeTool === 'rectangle' || activeTool === 'ellipse' || activeTool === 'diamond') && "cursor-copy"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          onInit={(instance) => setReactFlowInstance(instance as ReactFlowInstance<Node, Edge>)}
          nodeTypes={canvasNodeTypes}
          onMove={(event, viewportData) => onViewportMove(viewportData)}
          onNodeClick={onNodeClick}
          onNodeMouseEnter={onNodeMouseEnter}
          snapToGrid={snapToGrid}
          snapGrid={[15, 15]}
          connectionMode={ConnectionMode.Loose}
          panOnDrag={panOnDrag}
          panOnScroll={false}
          zoomOnScroll={true}
          selectionMode={selectionMode}
          selectNodesOnDrag={activeTool === 'select'}
          selectionOnDrag={activeTool === 'select'}
          nodesDraggable={activeTool === 'select'}
          elementsSelectable={activeTool === 'select'}
          zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }}
        >
          {/* Infinite dotted background pattern for Miro style */}
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff12" />
          
          <Controls showInteractive={false} className="!bg-[#0f0f13] !border-white/10 !text-white [&>button]:!border-white/5 [&>button]:hover:!bg-white/5" />
          
          {/* Drawing SVG Overlay (Renders ONLY the currently active path) */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transformOrigin: '0 0',
              zIndex: 3,
            }}
          >
            {currentPath.length > 0 && (
              <path
                d={getPathD(currentPath)}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </ReactFlow>
      </div>

    </div>
  );
}
