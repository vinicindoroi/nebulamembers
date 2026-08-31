import { memo } from 'react';
import { Handle, Position, NodeProps, useReactFlow, NodeResizer } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { X, MessageSquare } from 'lucide-react';

interface MessageNodeData {
  label?: string;
  type?: string;
  content?: string;
  width?: number;
  height?: number;
}

function MessageNodeComponent({ data, selected, id }: NodeProps) {
  const nodeData = data as MessageNodeData;
  const { deleteElements, setNodes } = useReactFlow();
  
  const width = nodeData.width || 180;
  const height = nodeData.height || 80;
  const content = nodeData.content || nodeData.label || 'Mensagem...';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div className="relative group">
      {/* Node Resizer */}
      <NodeResizer
        minWidth={120}
        minHeight={60}
        maxWidth={400}
        maxHeight={300}
        isVisible={selected}
        lineClassName="!border-primary/50"
        handleClassName="!w-2 !h-2 !bg-primary !border-none !rounded-sm"
        onResize={(_, params) => {
          setNodes((nodes) =>
            nodes.map((n) => {
              if (n.id === id) {
                return {
                  ...n,
                  data: { ...n.data, width: params.width, height: params.height },
                };
              }
              return n;
            })
          );
        }}
      />

      {/* Delete button - appears when selected */}
      {selected && (
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-colors"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-top-1.5"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5"
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-left-1.5"
      />
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-bottom-1.5"
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className="!w-3 !h-3 !bg-primary/80 !border-2 !border-background !opacity-0 group-hover:!opacity-100 transition-opacity !-right-1.5"
      />

      {/* Message Balloon */}
      <div
        className={cn(
          'relative rounded-2xl rounded-bl-sm p-4 transition-all duration-200',
          'bg-gradient-to-br from-[#3B82F6] to-[#2563EB]',
          'shadow-[0_8px_32px_rgba(59,130,246,0.3)]',
          selected && 'ring-2 ring-white ring-offset-2 ring-offset-[#0f0f12]'
        )}
        style={{ width, minHeight: height }}
      >
        {/* Message icon badge */}
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-white shadow-lg flex items-center justify-center">
          <MessageSquare className="w-3.5 h-3.5 text-[#3B82F6]" />
        </div>

        {/* Balloon tail */}
        <div 
          className="absolute -bottom-2 left-2 w-4 h-4 bg-[#2563EB] transform rotate-45 rounded-sm"
          style={{ zIndex: -1 }}
        />

        {/* Message content */}
        <p className="text-sm text-white font-medium leading-relaxed">
          {content}
        </p>
      </div>

      {/* Label below */}
      <span className="block text-center text-xs font-medium text-muted-foreground mt-3 max-w-[120px] truncate mx-auto">
        {nodeData.label || 'Mensagem'}
      </span>
    </div>
  );
}

export const MessageNode = memo(MessageNodeComponent);
