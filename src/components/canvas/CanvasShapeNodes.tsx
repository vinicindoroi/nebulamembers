import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { ImageIcon, Type, Sparkles, X, Plus } from 'lucide-react';

interface ShapeNodeData {
  width?: number;
  height?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  label?: string;
  content?: string;
  textColor?: string;
  fontSize?: number;
  textAlign?: 'left' | 'center' | 'right';
  textBold?: boolean;
  textItalic?: boolean;
  imageUrl?: string;
  opacity?: number;
  [key: string]: any;
}

// Common Handle components for nodes
const NodeHandles = () => (
  <>
    <Handle
      type="source"
      position={Position.Top}
      id="t"
      className="!w-2.5 !h-2.5 !bg-primary/90 !border-2 !border-[#0f0f12] opacity-0 group-hover:opacity-100 transition-opacity !-top-1.5"
    />
    <Handle
      type="source"
      position={Position.Right}
      id="r"
      className="!w-2.5 !h-2.5 !bg-primary/90 !border-2 !border-[#0f0f12] opacity-0 group-hover:opacity-100 transition-opacity !-right-1.5"
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="b"
      className="!w-2.5 !h-2.5 !bg-primary/90 !border-2 !border-[#0f0f12] opacity-0 group-hover:opacity-100 transition-opacity !-bottom-1.5"
    />
    <Handle
      type="source"
      position={Position.Left}
      id="l"
      className="!w-2.5 !h-2.5 !bg-primary/90 !border-2 !border-[#0f0f12] opacity-0 group-hover:opacity-100 transition-opacity !-left-1.5"
    />
  </>
);

// Resizable Handle config
const getResizerProps = (selected: boolean, setNodes: any, id: string) => ({
  minWidth: 40,
  minHeight: 40,
  isVisible: selected,
  lineClassName: "!border-primary/50",
  handleClassName: "!w-2 !h-2 !bg-primary !border-none !rounded-full",
  onResize: (_: any, params: any) => {
    setNodes((nodes: any) =>
      nodes.map((n: any) => {
        if (n.id === id) {
          return {
            ...n,
            data: {
              ...n.data,
              width: params.width,
              height: params.height,
            },
          };
        }
        return n;
      })
    );
  },
});

// Auto-scaling font size utility based on width & height
const getAutoFontSize = (width: number, height: number, customSize?: number, scaleFactor: number = 7) => {
  if (customSize && customSize > 0) return customSize;
  return Math.max(12, Math.min(width / scaleFactor, height / 3.5));
};

// 1. RECTANGLE NODE
export const RectangleNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 120;
  const height = shapeData.height || 80;
  const fill = shapeData.backgroundColor || 'rgba(139, 92, 246, 0.15)';
  const stroke = shapeData.borderColor || '#8B5CF6';
  const strokeWidth = shapeData.borderWidth ?? 2;
  const borderStyle = shapeData.borderStyle || 'solid';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 7.5);

  useEffect(() => {
    setText(shapeData.label || '');
  }, [shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: text } } : n))
    );
  };

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />
      
      <div
        className="w-full h-full flex items-center justify-center relative p-3 rounded-lg overflow-hidden transition-all duration-200"
        style={{
          backgroundColor: fill,
          borderColor: stroke,
          borderWidth: strokeWidth,
          borderStyle: borderStyle,
          color: shapeData.textColor || '#ffffff',
          fontWeight: shapeData.textBold ? 'bold' : 'normal',
          fontStyle: shapeData.textItalic ? 'italic' : 'normal',
          fontSize: `${fontSize}px`,
        }}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                inputRef.current?.blur();
              }
              e.stopPropagation();
            }}
            className="w-full h-full bg-transparent text-center border-none outline-none resize-none overflow-hidden flex items-center justify-center text-white text-xs nodrag nopan"
            style={{
              fontSize: `${fontSize}px`,
              color: shapeData.textColor || '#ffffff',
            }}
          />
        ) : (
          <span className={cn(
            "text-center select-none overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-tight",
            shapeData.textAlign === 'left' ? 'text-left w-full' : shapeData.textAlign === 'right' ? 'text-right w-full' : 'text-center'
          )}>
            {text || ''}
          </span>
        )}
      </div>
    </div>
  );
});

// 2. ELLIPSE NODE
export const EllipseNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 100;
  const height = shapeData.height || 100;
  const fill = shapeData.backgroundColor || 'rgba(16, 185, 129, 0.15)';
  const stroke = shapeData.borderColor || '#10B981';
  const strokeWidth = shapeData.borderWidth ?? 2;
  const borderStyle = shapeData.borderStyle || 'solid';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 7.5);

  useEffect(() => {
    setText(shapeData.label || '');
  }, [shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: text } } : n))
    );
  };

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div className="w-full h-full relative flex items-center justify-center p-4">
        {/* SVG background shape */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <ellipse
            cx={width / 2}
            cy={height / 2}
            rx={Math.max(1, (width - strokeWidth) / 2)}
            ry={Math.max(1, (height - strokeWidth) / 2)}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={borderStyle === 'dashed' ? '5,5' : borderStyle === 'dotted' ? '2,2' : undefined}
          />
        </svg>

        {/* Text container */}
        <div
          className="z-10 w-full h-full flex items-center justify-center overflow-hidden"
          style={{
            color: shapeData.textColor || '#ffffff',
            fontWeight: shapeData.textBold ? 'bold' : 'normal',
            fontStyle: shapeData.textItalic ? 'italic' : 'normal',
            fontSize: `${fontSize}px`,
          }}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  inputRef.current?.blur();
                }
                e.stopPropagation();
              }}
              className="w-[80%] h-[80%] bg-transparent text-center border-none outline-none resize-none overflow-hidden flex items-center justify-center text-white text-xs nodrag nopan"
              style={{
                fontSize: `${fontSize}px`,
                color: shapeData.textColor || '#ffffff',
              }}
            />
          ) : (
            <span className={cn(
              "text-center select-none overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-tight px-1",
              shapeData.textAlign === 'left' ? 'text-left w-full' : shapeData.textAlign === 'right' ? 'text-right w-full' : 'text-center'
            )}>
              {text || ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// 3. DIAMOND NODE (RHOMBUS)
export const DiamondNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 100;
  const height = shapeData.height || 100;
  const fill = shapeData.backgroundColor || 'rgba(245, 158, 11, 0.15)';
  const stroke = shapeData.borderColor || '#F59E0B';
  const strokeWidth = shapeData.borderWidth ?? 2;
  const borderStyle = shapeData.borderStyle || 'solid';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 8.5);

  useEffect(() => {
    setText(shapeData.label || '');
  }, [shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: text } } : n))
    );
  };

  // Polygon points for diamond
  const points = `${width / 2},${strokeWidth / 2} ${width - strokeWidth / 2},${height / 2} ${width / 2},${height - strokeWidth / 2} ${strokeWidth / 2},${height / 2}`;

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div className="w-full h-full relative flex items-center justify-center p-6">
        {/* SVG background shape */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={borderStyle === 'dashed' ? '5,5' : borderStyle === 'dotted' ? '2,2' : undefined}
          />
        </svg>

        {/* Text container */}
        <div
          className="z-10 w-[70%] h-[70%] flex items-center justify-center overflow-hidden"
          style={{
            color: shapeData.textColor || '#ffffff',
            fontWeight: shapeData.textBold ? 'bold' : 'normal',
            fontStyle: shapeData.textItalic ? 'italic' : 'normal',
            fontSize: `${fontSize}px`,
          }}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  inputRef.current?.blur();
                }
                e.stopPropagation();
              }}
              className="w-full h-full bg-transparent text-center border-none outline-none resize-none overflow-hidden flex items-center justify-center text-white text-xs nodrag nopan"
              style={{
                fontSize: `${fontSize}px`,
                color: shapeData.textColor || '#ffffff',
              }}
            />
          ) : (
            <span className={cn(
              "text-center select-none overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-tight",
              shapeData.textAlign === 'left' ? 'text-left w-full' : shapeData.textAlign === 'right' ? 'text-right w-full' : 'text-center'
            )}>
              {text || ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// 3b. TRIANGLE NODE
export const TriangleNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 100;
  const height = shapeData.height || 100;
  const fill = shapeData.backgroundColor || 'rgba(239, 68, 68, 0.15)';
  const stroke = shapeData.borderColor || '#EF4444';
  const strokeWidth = shapeData.borderWidth ?? 2;
  const borderStyle = shapeData.borderStyle || 'solid';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 8.5);

  useEffect(() => {
    setText(shapeData.label || '');
  }, [shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: text } } : n))
    );
  };

  // Polygon points for triangle (pointing up)
  const points = `${width / 2},${strokeWidth / 2} ${width - strokeWidth / 2},${height - strokeWidth / 2} ${strokeWidth / 2},${height - strokeWidth / 2}`;

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div className="w-full h-full relative flex items-center justify-center p-6">
        {/* SVG background shape */}
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
          <polygon
            points={points}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={borderStyle === 'dashed' ? '5,5' : borderStyle === 'dotted' ? '2,2' : undefined}
          />
        </svg>

        {/* Text container */}
        <div
          className="z-10 w-[70%] h-[50%] mt-4 flex items-center justify-center overflow-hidden"
          style={{
            color: shapeData.textColor || '#ffffff',
            fontWeight: shapeData.textBold ? 'bold' : 'normal',
            fontStyle: shapeData.textItalic ? 'italic' : 'normal',
            fontSize: `${fontSize}px`,
          }}
        >
          {isEditing ? (
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  inputRef.current?.blur();
                }
                e.stopPropagation();
              }}
              className="w-full h-full bg-transparent text-center border-none outline-none resize-none overflow-hidden flex items-center justify-center text-white text-xs nodrag nopan"
              style={{
                fontSize: `${fontSize}px`,
                color: shapeData.textColor || '#ffffff',
              }}
            />
          ) : (
            <span className={cn(
              "text-center select-none overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-tight",
              shapeData.textAlign === 'left' ? 'text-left w-full' : shapeData.textAlign === 'right' ? 'text-right w-full' : 'text-center'
            )}>
              {text || ''}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// 4. STICKY NOTE NODE
export const StickyNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.content || shapeData.label || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 120;
  const height = shapeData.height || 120;
  const bg = shapeData.backgroundColor || '#FCD34D'; // Yellow post-it color default
  const textColor = shapeData.textColor || '#78350F';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 8);

  useEffect(() => {
    setText(shapeData.content || shapeData.label || '');
  }, [shapeData.content, shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, content: text, label: text } } : n
      )
    );
  };

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div
        className={cn(
          "w-full h-full flex flex-col p-3 shadow-lg shadow-black/30 rounded-md relative select-none overflow-hidden transition-all duration-200",
          selected ? "ring-2 ring-primary" : "hover:shadow-xl hover:shadow-black/40"
        )}
        style={{
          backgroundColor: bg,
          color: textColor,
          fontWeight: shapeData.textBold ? 'bold' : 'normal',
          fontStyle: shapeData.textItalic ? 'italic' : 'normal',
          fontSize: `${fontSize}px`,
        }}
      >
        {/* Shadow corner element for sticky notes */}
        <div 
          className="absolute bottom-0 right-0 w-4 h-4 bg-black/10 rounded-tl-lg"
          style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
        />

        {isEditing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                inputRef.current?.blur();
              }
              e.stopPropagation();
            }}
            className="w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden flex items-center justify-center nodrag nopan"
            style={{
              fontSize: `${fontSize}px`,
              color: textColor,
              lineHeight: '1.25',
            }}
          />
        ) : (
          <div className="w-full h-full overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-snug">
            {text || 'Clique duplo para editar...'}
          </div>
        )}
      </div>
    </div>
  );
});

// 5. IMAGE NODE
export const ImageNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [imageUrl, setImageUrl] = useState(shapeData.imageUrl || '');

  const width = shapeData.width || 200;
  const height = shapeData.height || 150;

  useEffect(() => {
    setImageUrl(shapeData.imageUrl || '');
  }, [shapeData.imageUrl]);

  return (
    <div className="relative group" style={{ width, height }}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div
        className={cn(
          "w-full h-full rounded-lg overflow-hidden border border-white/10 shadow-xl bg-[#121216] flex flex-col items-center justify-center relative",
          selected ? "ring-2 ring-primary" : "hover:border-white/20"
        )}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Canvas asset"
            className="w-full h-full object-cover select-none nodrag"
            draggable="false"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 p-4 text-muted-foreground/60 select-none">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[11px] font-medium">Sem imagem</span>
          </div>
        )}
      </div>
    </div>
  );
});

// 6. CANVAS TEXT NODE (Sleek Auto-scaling Free Text Node)
export const CanvasTextNode = memo(({ id, data, selected }: NodeProps) => {
  const shapeData = data as ShapeNodeData;
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(shapeData.content || shapeData.label || 'Texto');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const width = shapeData.width || 150;
  const height = shapeData.height || 40;
  const textColor = shapeData.textColor || '#ffffff';

  const fontSize = getAutoFontSize(width, height, shapeData.fontSize, 8.5);

  useEffect(() => {
    setText(shapeData.content || shapeData.label || '');
  }, [shapeData.content, shapeData.label]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleBlur = () => {
    setIsEditing(false);
    setNodes((nodes) =>
      nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, content: text, label: text } } : n
      )
    );
  };

  return (
    <div className="relative group" style={{ width, height }} onDoubleClick={handleDoubleClick}>
      <NodeResizer {...getResizerProps(!!selected, setNodes, id)} />
      <NodeHandles />

      <div
        className={cn(
          "w-full h-full flex items-center justify-center p-1 relative rounded-md transition-all duration-150",
          selected && "outline outline-2 outline-primary/40 outline-offset-4",
          !selected && "hover:outline hover:outline-1 hover:outline-white/10 hover:outline-offset-2"
        )}
        style={{
          color: textColor,
          fontWeight: shapeData.textBold ? 'bold' : 'normal',
          fontStyle: shapeData.textItalic ? 'italic' : 'normal',
          fontSize: `${fontSize}px`,
        }}
      >
        {isEditing ? (
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                inputRef.current?.blur();
              }
              e.stopPropagation();
            }}
            className="w-full h-full bg-transparent text-center border-none outline-none resize-none overflow-hidden flex items-center justify-center text-white nodrag nopan"
            style={{
              fontSize: `${fontSize}px`,
              color: textColor,
            }}
          />
        ) : (
          <span className={cn(
            "text-center select-none overflow-hidden text-ellipsis whitespace-pre-wrap break-words leading-tight w-full px-1",
            shapeData.textAlign === 'left' ? 'text-left' : shapeData.textAlign === 'right' ? 'text-right' : 'text-center'
          )}>
            {text || 'Escreva algo...'}
          </span>
        )}
      </div>
    </div>
  );
});

// 7. DRAGGABLE, SELECTABLE SVG DRAWING NODE (Miro Style)
export const DrawingNode = memo(({ id, data, selected }: NodeProps) => {
  const drawingData = data as any;
  const points = drawingData.points || [];
  const strokeColor = drawingData.color || '#8B5CF6';
  const strokeWidth = drawingData.strokeWidth || 3;
  const width = drawingData.width || 100;
  const height = drawingData.height || 100;

  const getPathD = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x} ${pts[0].y}`;
    if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const xc = (pts[i].x + pts[i + 1].x) / 2;
      const yc = (pts[i].y + pts[i + 1].y) / 2;
      d += ` Q ${pts[i].x} ${pts[i].y}, ${xc} ${yc}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  };

  return (
    <div
      className={cn(
        "relative overflow-visible group select-none",
        selected && "outline outline-2 outline-primary/40 outline-offset-4 rounded-md"
      )}
      style={{ width, height }}
    >
      <svg className="overflow-visible w-full h-full pointer-events-none" style={{ pointerEvents: 'none' }}>
        <path
          d={getPathD(points)}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

// Exported nodeTypes object for @xyflow/react
export const canvasNodeTypes = {
  rectangle: RectangleNode,
  ellipse: EllipseNode,
  diamond: DiamondNode,
  triangle: TriangleNode,
  sticky: StickyNode,
  image: ImageNode,
  text: CanvasTextNode,
  drawing: DrawingNode,
};
