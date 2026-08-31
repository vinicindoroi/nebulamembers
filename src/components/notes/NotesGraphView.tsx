import { useMemo, useCallback } from 'react';
import {
  ReactFlow, Controls, Background, BackgroundVariant,
  Node, Edge, ReactFlowProvider, Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UserNote } from '@/hooks/useNotes';

interface NotesGraphViewProps {
  notes: UserNote[];
  onNoteClick: (note: UserNote) => void;
}

const COLOR_PALETTE = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

const courseColorCache: Record<string, string> = {};
function getCourseColor(courseTitle: string | undefined): string {
  if (!courseTitle) return '#6b7280';
  if (!courseColorCache[courseTitle]) {
    const idx = Object.keys(courseColorCache).length % COLOR_PALETTE.length;
    courseColorCache[courseTitle] = COLOR_PALETTE[idx];
  }
  return courseColorCache[courseTitle];
}

// Custom node for notes
function NoteNode({ data }: { data: any }) {
  const color = data.color || '#6b7280';
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className="rounded-2xl px-4 py-3 min-w-[140px] max-w-[200px] cursor-pointer transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
        style={{
          background: `${color}15`,
          border: `1.5px solid ${color}40`,
          boxShadow: `0 4px 20px ${color}15`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs font-semibold text-foreground truncate">{data.label || 'Sem título'}</span>
        </div>
        {data.preview && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 ml-4.5">{data.preview}</p>
        )}
        {data.tags && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-4.5">
            {data.tags.slice(0, 2).map((tag: string) => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground/80">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  );
}

// Custom node for lessons (smaller, acts as hub)
function LessonNode({ data }: { data: any }) {
  const color = data.color || '#6b7280';
  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <div
        className="rounded-xl px-3 py-2 flex items-center gap-2 cursor-default"
        style={{
          background: `${color}10`,
          border: `1px solid ${color}30`,
        }}
      >
        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: `${color}80` }} />
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{data.label}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  );
}

const nodeTypes = {
  note: NoteNode,
  lesson: LessonNode,
};

function GraphContent({ notes, onNoteClick }: NotesGraphViewProps) {
  const { nodes, edges } = useMemo(() => {
    const graphNodes: Node[] = [];
    const graphEdges: Edge[] = [];
    const lessonMap = new Map<string, { title: string; color: string; noteCount: number }>();

    // Count notes per lesson
    notes.forEach((note) => {
      if (note.lesson_id && note.lesson_title) {
        const existing = lessonMap.get(note.lesson_id);
        if (existing) {
          existing.noteCount++;
        } else {
          lessonMap.set(note.lesson_id, {
            title: note.lesson_title,
            color: getCourseColor(note.course_title),
            noteCount: 1,
          });
        }
      }
    });

    // Position lessons in a circle
    const lessonArray = Array.from(lessonMap.entries());
    const lessonRadius = Math.max(250, lessonArray.length * 60);
    const centerX = 0, centerY = 0;

    lessonArray.forEach(([lessonId, lesson], i) => {
      const angle = (2 * Math.PI * i) / Math.max(lessonArray.length, 1) - Math.PI / 2;
      graphNodes.push({
        id: `lesson-${lessonId}`,
        type: 'lesson',
        position: {
          x: centerX + Math.cos(angle) * lessonRadius,
          y: centerY + Math.sin(angle) * lessonRadius,
        },
        data: { label: lesson.title, color: lesson.color },
      });
    });

    // Position notes around their lessons, or in center if orphan
    const lessonNoteIdx = new Map<string, number>();
    const orphanNotes: UserNote[] = [];

    notes.forEach((note) => {
      if (note.lesson_id && lessonMap.has(note.lesson_id)) {
        const idx = lessonNoteIdx.get(note.lesson_id) || 0;
        lessonNoteIdx.set(note.lesson_id, idx + 1);

        const lessonNode = graphNodes.find((n) => n.id === `lesson-${note.lesson_id}`);
        const totalForLesson = lessonMap.get(note.lesson_id)!.noteCount;
        const noteAngle = (2 * Math.PI * idx) / Math.max(totalForLesson, 1);
        const noteRadius = 100 + Math.floor(idx / 6) * 60;

        const x = (lessonNode?.position.x || 0) + Math.cos(noteAngle) * noteRadius;
        const y = (lessonNode?.position.y || 0) + Math.sin(noteAngle) * noteRadius;
        const color = getCourseColor(note.course_title);

        graphNodes.push({
          id: `note-${note.id}`,
          type: 'note',
          position: { x, y },
          data: {
            label: note.title || 'Sem título',
            preview: note.content?.slice(0, 60),
            tags: note.tags,
            color: note.color !== 'default' && note.color.startsWith('#') ? note.color : color,
            noteId: note.id,
          },
        });

        // Edge from note to lesson
        graphEdges.push({
          id: `e-${note.id}-lesson`,
          source: `note-${note.id}`,
          target: `lesson-${note.lesson_id}`,
          style: { stroke: `${color}25`, strokeWidth: 1.5 },
          type: 'default',
        });
      } else {
        orphanNotes.push(note);
      }
    });

    // Position orphan notes in center
    orphanNotes.forEach((note, i) => {
      const angle = (2 * Math.PI * i) / Math.max(orphanNotes.length, 1);
      const radius = 80;
      graphNodes.push({
        id: `note-${note.id}`,
        type: 'note',
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        },
        data: {
          label: note.title || 'Sem título',
          preview: note.content?.slice(0, 60),
          tags: note.tags,
          color: note.color !== 'default' && note.color.startsWith('#') ? note.color : '#6b7280',
          noteId: note.id,
        },
      });
    });

    // Connect notes with shared tags (dashed lines)
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].tags.length === 0) continue;
      for (let j = i + 1; j < notes.length; j++) {
        const shared = notes[i].tags.filter((t) => notes[j].tags.includes(t));
        if (shared.length > 0) {
          graphEdges.push({
            id: `e-tag-${notes[i].id}-${notes[j].id}`,
            source: `note-${notes[i].id}`,
            target: `note-${notes[j].id}`,
            style: { stroke: '#8b5cf630', strokeWidth: 1, strokeDasharray: '5 5' },
            type: 'default',
            animated: true,
          });
        }
      }
    }

    return { nodes: graphNodes, edges: graphEdges };
  }, [notes]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id.startsWith('note-')) {
      const noteId = node.data.noteId as string;
      const note = notes.find((n) => n.id === noteId);
      if (note) onNoteClick(note);
    }
  }, [notes, onNoteClick]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={handleNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      panOnDrag
      zoomOnScroll
      minZoom={0.2}
      maxZoom={2.5}
      className="bg-[#0a0a0c]"
      proOptions={{ hideAttribution: true }}
      nodesDraggable={false}
      nodesConnectable={false}
    >
      <Controls className="!hidden" showInteractive={false} />
      <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.03)" />
    </ReactFlow>
  );
}

export function NotesGraphView({ notes, onNoteClick }: NotesGraphViewProps) {
  if (notes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Crie notas para visualizar o grafo</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <GraphContent notes={notes} onNoteClick={onNoteClick} />
    </ReactFlowProvider>
  );
}
