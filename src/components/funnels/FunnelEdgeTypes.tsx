import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { 
  EdgeProps, 
  getBezierPath, 
  EdgeLabelRenderer,
  BaseEdge,
  useReactFlow,
  Position
} from '@xyflow/react';
import { Settings2, Trash2, GripHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FunnelNodeData } from './FunnelNodeTypes';

export interface FunnelEdgeData {
  label?: string;
  conversionRate?: number;
  style?: 'solid' | 'dashed' | 'success' | 'failure' | 'info' | 'warning';
  abTestPercentage?: number;
  curvature?: number;
  controlPointOffset?: { x: number; y: number };
  // Analytics data (injected by FunnelCanvas when liveMode is on)
  analyticsConversion?: number;
  analyticsEnabled?: boolean;
  [key: string]: unknown;
}

const edgeStyleMap: Record<string, { stroke: string; strokeDasharray: string }> = {
  solid: { stroke: 'rgba(255,255,255,0.35)', strokeDasharray: '0' },
  dashed: { stroke: 'rgba(255,255,255,0.22)', strokeDasharray: '6,4' },
  success: { stroke: '#22C55E', strokeDasharray: '0' },
  failure: { stroke: '#EF4444', strokeDasharray: '0' },
  info: { stroke: '#3B82F6', strokeDasharray: '0' },
  warning: { stroke: '#F59E0B', strokeDasharray: '0' },
};

function FunnelEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const edgeData = data as FunnelEdgeData | undefined;
  const [labelValue, setLabelValue] = useState(edgeData?.label || '');
  const [abPercentage, setAbPercentage] = useState(edgeData?.abTestPercentage?.toString() || '50');
  const { setEdges, getNodes, getEdges } = useReactFlow();

  // Check if source node is an A/B test
  const sourceNode = useMemo(() => {
    const nodes = getNodes();
    return nodes.find(n => n.id === source);
  }, [getNodes, source, sourceX, sourceY]);
  
  const targetNode = useMemo(() => {
    const nodes = getNodes();
    return nodes.find(n => n.id === target);
  }, [getNodes, target, targetX, targetY]);

  const isFromAbTest = (sourceNode?.data as FunnelNodeData)?.type === 'ab-test';

  const currentStyle = edgeData?.style || 'dashed';
  const styleConfig = edgeStyleMap[currentStyle] || edgeStyleMap.dashed;
  const currentCurvature = edgeData?.curvature ?? 0.25;
  const isSmartRouting = edgeData?.smartRouting ?? false;

  // Compute smart positions and coordinates
  const { sx, sy, tx, ty, sp, tp } = useMemo(() => {
    let sx = sourceX;
    let sy = sourceY;
    let sp = sourcePosition;
    let tx = targetX;
    let ty = targetY;
    let tp = targetPosition;

    try {
      if (isSmartRouting && sourceNode && targetNode && sourceNode.measured && targetNode.measured) {
        // Use internal absolute position if available, otherwise fallback to relative
        const sPos = sourceNode.internals?.positionAbsolute || sourceNode.position;
        const tPos = targetNode.internals?.positionAbsolute || targetNode.position;
        
        if (sPos && tPos) {
          const sWidth = sourceNode.measured.width || 100;
          const sHeight = sourceNode.measured.height || 100;
          const tWidth = targetNode.measured.width || 100;
          const tHeight = targetNode.measured.height || 100;

          const sCenter = { x: sPos.x + sWidth / 2, y: sPos.y + sHeight / 2 };
          const tCenter = { x: tPos.x + tWidth / 2, y: tPos.y + tHeight / 2 };

          const dx = tCenter.x - sCenter.x;
          const dy = tCenter.y - sCenter.y;

          if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal connection
            if (dx > 0) {
              sp = Position.Right;
              tp = Position.Left;
              sx = sPos.x + sWidth;
              sy = sCenter.y;
              tx = tPos.x;
              ty = tCenter.y;
            } else {
              sp = Position.Left;
              tp = Position.Right;
              sx = sPos.x;
              sy = sCenter.y;
              tx = tPos.x + tWidth;
              ty = tCenter.y;
            }
          } else {
            // Vertical connection
            if (dy > 0) {
              sp = Position.Bottom;
              tp = Position.Top;
              sx = sCenter.x;
              sy = sPos.y + sHeight;
              tx = tCenter.x;
              ty = tPos.y;
            } else {
              sp = Position.Top;
              tp = Position.Bottom;
              sx = sCenter.x;
              sy = sPos.y;
              tx = tCenter.x;
              ty = tPos.y + tHeight;
            }
          }
        }
      }
    } catch (err) {
      console.error("Error computing smart edge positions:", err);
      // Fallback to defaults
      sx = sourceX; sy = sourceY; sp = sourcePosition;
      tx = targetX; ty = targetY; tp = targetPosition;
    }
    
    return { sx, sy, tx, ty, sp, tp };
  }, [isSmartRouting, sourceNode, targetNode, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // Use getStraightPath for curvature 0, otherwise use getBezierPath
  const [edgePath, labelX, labelY] = useMemo(() => {
    try {
      if (currentCurvature === 0) {
        // Calculate straight path manually
        const path = `M ${sx},${sy} L ${tx},${ty}`;
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        return [path, midX, midY];
      }
      return getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sp || Position.Right,
        targetX: tx,
        targetY: ty,
        targetPosition: tp || Position.Left,
        curvature: currentCurvature,
      });
    } catch (err) {
      console.error("Error computing edge path:", err);
      return [`M ${sourceX},${sourceY} L ${targetX},${targetY}`, (sourceX + targetX) / 2, (sourceY + targetY) / 2];
    }
  }, [sx, sy, tx, ty, sp, tp, currentCurvature, sourceX, sourceY, targetX, targetY]);

  const handleLabelChange = (newLabel: string) => {
    setLabelValue(newLabel);
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, label: newLabel },
          };
        }
        return edge;
      })
    );
  };

  const handleAbPercentageChange = (newPercentage: string) => {
    setAbPercentage(newPercentage);
    const percentValue = parseInt(newPercentage) || 50;
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, abTestPercentage: percentValue },
          };
        }
        return edge;
      })
    );
  };

  const handleStyleChange = (newStyle: 'solid' | 'dashed' | 'success' | 'failure' | 'info' | 'warning') => {
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, style: newStyle },
          };
        }
        return edge;
      })
    );
  };

  const handleCurvatureChange = (newCurvature: number) => {
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, curvature: newCurvature },
          };
        }
        return edge;
      })
    );
  };

  const handleDelete = useCallback(() => {
    const nodes = getNodes();
    const currentEdges = getEdges();
    
    // Find the edge to delete
    const edgeToDelete = currentEdges.find(e => e.id === id);
    if (!edgeToDelete) return;
    
    // Check if source and target are line-anchor nodes
    const sourceNode = nodes.find(n => n.id === edgeToDelete.source);
    const targetNode = nodes.find(n => n.id === edgeToDelete.target);
    
    const isSourceLineAnchor = (sourceNode?.data as FunnelNodeData)?.type === 'line-anchor';
    const isTargetLineAnchor = (targetNode?.data as FunnelNodeData)?.type === 'line-anchor';
    
    // Delete the edge
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    
    // If both endpoints are line-anchors (standalone line), delete the anchor nodes too
    if (isSourceLineAnchor && isTargetLineAnchor) {
      const { setNodes } = useReactFlow();
      // Use the setNodes from useReactFlow context
      setTimeout(() => {
        // We need to access setNodes differently - let's use getNodes/setNodes pattern
      }, 0);
    }
  }, [id, setEdges, getNodes, getEdges]);
  
  // Delete handler that also removes line-anchor nodes for standalone lines
  const handleDeleteWithAnchors = useCallback(() => {
    const nodes = getNodes();
    const currentEdges = getEdges();
    
    // Find the edge to delete
    const edgeToDelete = currentEdges.find(e => e.id === id);
    if (!edgeToDelete) return;
    
    // Check if source and target are line-anchor nodes
    const sourceNode = nodes.find(n => n.id === edgeToDelete.source);
    const targetNode = nodes.find(n => n.id === edgeToDelete.target);
    
    const isSourceLineAnchor = (sourceNode?.data as FunnelNodeData)?.type === 'line-anchor';
    const isTargetLineAnchor = (targetNode?.data as FunnelNodeData)?.type === 'line-anchor';
    
    // Delete the edge first
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
    
    // If this is a standalone line (both endpoints are line-anchors), delete the nodes too
    if (isSourceLineAnchor && isTargetLineAnchor && sourceNode && targetNode) {
      // Dispatch custom event to notify canvas to delete these nodes
      window.dispatchEvent(new CustomEvent('delete-line-anchors', {
        detail: { nodeIds: [sourceNode.id, targetNode.id] }
      }));
    }
  }, [id, setEdges, getNodes, getEdges]);

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  const hasLabel = labelValue && labelValue.trim() !== '';
  const displayPercentage = edgeData?.abTestPercentage ?? 50;
  
  // Control point dragging for curve shaping
  const controlOffset = edgeData?.controlPointOffset || { x: 0, y: 0 };
  const [isDraggingControl, setIsDraggingControl] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  
  const handleControlPointMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingControl(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: controlOffset.x,
      offsetY: controlOffset.y,
    });
  }, [controlOffset]);
  
  const handleControlPointMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingControl || !dragStart) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const newOffset = {
      x: dragStart.offsetX + deltaX,
      y: dragStart.offsetY + deltaY,
    };
    
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === id) {
          return {
            ...edge,
            data: { ...edge.data, controlPointOffset: newOffset },
          };
        }
        return edge;
      })
    );
  }, [isDraggingControl, dragStart, id, setEdges]);
  
  const handleControlPointMouseUp = useCallback(() => {
    setIsDraggingControl(false);
    setDragStart(null);
  }, []);
  
  // Add/remove event listeners for control point dragging
  useEffect(() => {
    if (isDraggingControl) {
      window.addEventListener('mousemove', handleControlPointMouseMove);
      window.addEventListener('mouseup', handleControlPointMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleControlPointMouseMove);
        window.removeEventListener('mouseup', handleControlPointMouseUp);
      };
    }
  }, [isDraggingControl, handleControlPointMouseMove, handleControlPointMouseUp]);
  
  // Calculate custom bezier path with control point offset
  const customEdgePath = useMemo(() => {
    const midX = (sourceX + targetX) / 2 + controlOffset.x;
    const midY = (sourceY + targetY) / 2 + controlOffset.y;
    
    if (currentCurvature === 0 && controlOffset.x === 0 && controlOffset.y === 0) {
      // Straight line
      return `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
    }
    
    // Quadratic bezier curve through control point
    return `M ${sourceX},${sourceY} Q ${midX},${midY} ${targetX},${targetY}`;
  }, [sourceX, sourceY, targetX, targetY, controlOffset, currentCurvature]);
  
  // Control point position for dragging handle
  const controlPointX = (sourceX + targetX) / 2 + controlOffset.x;
  const controlPointY = (sourceY + targetY) / 2 + controlOffset.y;

  // Use custom path when control point is offset, otherwise use standard bezier
  const finalEdgePath = (controlOffset.x !== 0 || controlOffset.y !== 0) ? customEdgePath : edgePath;
  const finalLabelX = controlPointX;
  const finalLabelY = controlPointY;

  return (
    <>
      {/* Bezier line with configurable style */}
      <BaseEdge
        id={id}
        path={finalEdgePath}
        style={{
          stroke: selected ? 'oklch(0.65 0.22 290)' : styleConfig.stroke,
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: styleConfig.strokeDasharray,
          strokeLinecap: 'round',
          filter: selected ? 'drop-shadow(0 0 6px oklch(0.65 0.22 290 / 0.5))' : 'none',
          transition: 'stroke-width 150ms ease, filter 150ms ease',
        }}
      />

      {/* Animated flow indicator */}
      <circle
        r={selected ? '3.5' : '2.5'}
        fill={
          currentStyle === 'success' ? '#22C55E' :
          currentStyle === 'failure' ? '#EF4444' :
          currentStyle === 'info' ? '#3B82F6' :
          currentStyle === 'warning' ? '#F59E0B' :
          'oklch(0.65 0.22 290)'
        }
        opacity="0.9"
        style={{ filter: 'drop-shadow(0 0 4px currentColor)' }}
      >
        <animateMotion dur="2.5s" repeatCount="indefinite" path={finalEdgePath} />
      </circle>

      {/* Edge controls container - positioned on the edge */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${controlPointX}px,${controlPointY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan flex items-center gap-1.5"
        >
          {/* Draggable control point for curve shaping */}
          <div
            style={{
              cursor: isDraggingControl ? 'grabbing' : 'grab',
              zIndex: isDraggingControl ? 1000 : 1,
            }}
            className={cn(
              "w-6 h-6 rounded-full transition-all duration-150 backdrop-blur-sm",
              "flex items-center justify-center",
              selected || isDraggingControl
                ? "bg-[#1a1a1f]/95 border border-white/15 opacity-100 shadow-lg"
                : "bg-[#1a1a1f]/95 border border-white/10 opacity-0 hover:opacity-100",
              isDraggingControl && "ring-2 ring-primary ring-offset-1 ring-offset-[#0f0f12] scale-110"
            )}
            onMouseDown={handleControlPointMouseDown}
            title="Arraste para moldar a curva"
          >
            <GripHorizontal className="w-3 h-3 text-white/70" />
          </div>

          {/* Settings dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-6 h-6 rounded-full bg-[#1a1a1f]/95 border border-white/10 flex items-center justify-center backdrop-blur-sm',
                  'transition-all',
                  'hover:border-primary/50 hover:bg-[#1a1a1f]',
                  selected ? 'opacity-100 shadow-lg' : 'opacity-0 hover:opacity-100'
                )}
              >
                <Settings2 className="w-3 h-3 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="bg-[#1a1a1f] border-[#2a2a30] min-w-[180px]">
              <DropdownMenuItem onClick={() => setIsEditing(true)} className="text-xs">
                Adicionar Rótulo
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a30]" />
              <div className="px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground uppercase">Estilo da Linha</span>
              </div>
              <DropdownMenuItem onClick={() => handleStyleChange('solid')} className="text-xs">
                <div className="w-8 h-0.5 bg-white/30 mr-2" />
                Linha Contínua
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStyleChange('dashed')} className="text-xs">
                <div className="w-8 h-0.5 bg-white/20 mr-2" style={{ background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 4px, transparent 4px, transparent 8px)' }} />
                Linha Pontilhada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStyleChange('success')} className="text-xs">
                <div className="w-8 h-0.5 bg-green-500 mr-2" />
                Sucesso (Verde)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStyleChange('failure')} className="text-xs">
                <div className="w-8 h-0.5 bg-red-500 mr-2" />
                Falha (Vermelho)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStyleChange('info')} className="text-xs">
                <div className="w-8 h-0.5 bg-blue-500 mr-2" />
                Info (Azul)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStyleChange('warning')} className="text-xs">
                <div className="w-8 h-0.5 bg-amber-500 mr-2" />
                Atenção (Amarelo)
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a30]" />
              <div className="px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground uppercase">Curvatura</span>
              </div>
              <DropdownMenuItem onClick={() => handleCurvatureChange(0)} className="text-xs">
                <div className="w-6 h-3 mr-2 flex items-center">
                  <div className="w-full h-0.5 bg-white/30" />
                </div>
                Reta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCurvatureChange(0.25)} className="text-xs">
                <div className="w-6 h-3 mr-2 flex items-center">
                  <svg viewBox="0 0 24 12" className="w-full h-full">
                    <path d="M0,6 Q12,0 24,6" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  </svg>
                </div>
                Curva Suave
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCurvatureChange(0.5)} className="text-xs">
                <div className="w-6 h-3 mr-2 flex items-center">
                  <svg viewBox="0 0 24 12" className="w-full h-full">
                    <path d="M0,12 Q12,-6 24,12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  </svg>
                </div>
                Curva Média
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCurvatureChange(0.8)} className="text-xs">
                <div className="w-6 h-3 mr-2 flex items-center">
                  <svg viewBox="0 0 24 12" className="w-full h-full">
                    <path d="M0,12 Q12,-12 24,12" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2"/>
                  </svg>
                </div>
                Curva Forte
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a30]" />
              <DropdownMenuItem 
                onClick={() => {
                  setEdges((edges) =>
                    edges.map((edge) => {
                      if (edge.id === id) {
                        return {
                          ...edge,
                          data: { ...edge.data, smartRouting: !isSmartRouting },
                        };
                      }
                      return edge;
                    })
                  );
                }} 
                className="text-xs"
              >
                <div className="w-6 mr-2 flex justify-center">
                  <div className={cn(
                    "w-6 h-3.5 rounded-full relative transition-colors",
                    isSmartRouting ? "bg-primary" : "bg-white/10"
                  )}>
                    <div className={cn(
                      "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-transform",
                      isSmartRouting ? "left-[13px]" : "left-0.5"
                    )} />
                  </div>
                </div>
                Roteamento Automático
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a30]" />
              <DropdownMenuItem 
                onClick={() => {
                  handleCurvatureChange(0.25);
                  setEdges((edges) =>
                    edges.map((edge) => {
                      if (edge.id === id) {
                        return {
                          ...edge,
                          data: { ...edge.data, controlPointOffset: { x: 0, y: 0 } },
                        };
                      }
                      return edge;
                    })
                  );
                }} 
                className="text-xs"
              >
                <GripHorizontal className="w-3 h-3 mr-2" />
                Resetar Curva
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2a2a30]" />
              <DropdownMenuItem onClick={handleDeleteWithAnchors} className="text-xs text-red-400 focus:text-red-400">
                <Trash2 className="w-3 h-3 mr-2" />
                Remover Seta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </EdgeLabelRenderer>
      

      {/* Label renderer for A/B test percentages, custom labels and live conversion */}
      {(isFromAbTest || hasLabel || isEditing || (edgeData?.analyticsEnabled && edgeData?.analyticsConversion !== undefined)) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${finalLabelX}px,${finalLabelY - 30}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex items-center gap-1.5"
          >
            {isFromAbTest ? (
              // A/B Test percentage badge
              <div className="flex items-center gap-1">
                {isEditing ? (
                  <Input
                    value={abPercentage}
                    onChange={(e) => handleAbPercentageChange(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    type="number"
                    min="0"
                    max="100"
                    className="w-16 h-7 text-xs text-center bg-[#1a1a1f] border-primary/50 focus:border-primary"
                    placeholder="50"
                  />
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-bold shadow-lg transition-all duration-200',
                      'bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] text-white',
                      'hover:scale-105 hover:shadow-purple-500/30',
                      selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f12]'
                    )}
                  >
                    {displayPercentage}%
                  </button>
                )}
              </div>
            ) : isEditing ? (
              <Input
                value={labelValue}
                onChange={(e) => handleLabelChange(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-20 h-7 text-xs text-center bg-[#1a1a1f] border-primary/50 focus:border-primary"
                placeholder="20%"
              />
            ) : hasLabel ? (
              <button
                onClick={() => setIsEditing(true)}
                className={cn(
                  'px-2.5 py-1 rounded-full bg-[#1a1a1f]/95 backdrop-blur-sm border text-[11px] font-medium text-foreground hover:border-primary/50 shadow-lg transition-all duration-200',
                  selected ? 'border-primary' : 'border-white/10',
                  currentStyle === 'success' && 'border-green-500/40 text-green-300',
                  currentStyle === 'failure' && 'border-red-500/40 text-red-300'
                )}
              >
                {labelValue}
              </button>
            ) : null}

            {/* Live conversion rate badge (auto-calculated when liveMode is on) */}
            {edgeData?.analyticsEnabled && edgeData?.analyticsConversion !== undefined && !isEditing && (
              <div
                className={cn(
                  'px-2 py-0.5 rounded-full backdrop-blur-sm border text-[10px] font-bold shadow-lg flex items-center gap-1',
                  edgeData.analyticsConversion >= 50
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : edgeData.analyticsConversion >= 20
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-red-500/15 border-red-500/30 text-red-300'
                )}
                title="Taxa de conversão (Live)"
              >
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                {edgeData.analyticsConversion}%
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const edgeTypes = {
  funnel: memo(FunnelEdge),
};
