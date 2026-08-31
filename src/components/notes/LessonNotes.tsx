import { useState } from 'react';
import { Plus, Pin, Pencil, Trash2, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotes, UserNote } from '@/hooks/useNotes';
import { NoteEditorDialog } from './NoteEditorDialog';

interface LessonNotesProps {
  lessonId: string;
  lessonTitle: string;
}

export function LessonNotes({ lessonId, lessonTitle }: LessonNotesProps) {
  const { notes, createNote, updateNote, deleteNote, togglePin } = useNotes({ lessonId });
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  const handleSave = (data: { title: string; content: string; tags: string[]; color: string; pinned: boolean }) => {
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...data });
    } else {
      createNote.mutate({ ...data, lesson_id: lessonId });
    }
    setEditingNote(null);
  };

  const handleEdit = (note: UserNote) => {
    setEditingNote(note);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditingNote(null);
    setEditorOpen(true);
  };

  const getNoteColorClass = (color: string) => {
    const colors: Record<string, string> = {
      default: 'border-white/5 bg-white/[0.02]',
      purple: 'border-purple-500/20 bg-purple-500/5',
      blue: 'border-blue-500/20 bg-blue-500/5',
      green: 'border-green-500/20 bg-green-500/5',
      yellow: 'border-yellow-500/20 bg-yellow-500/5',
      pink: 'border-pink-500/20 bg-pink-500/5',
      orange: 'border-orange-500/20 bg-orange-500/5',
    };
    return colors[color] || colors.default;
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Minhas Notas</h3>
          {notes.length > 0 && (
            <span className="text-xs text-muted-foreground">({notes.length})</span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={handleNew} className="h-7 text-xs gap-1 hover:bg-primary/10 hover:text-primary">
          <Plus className="h-3.5 w-3.5" />
          Nova nota
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-white/10 rounded-xl">
          <StickyNote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Nenhuma nota nesta aula</p>
          <Button size="sm" variant="ghost" onClick={handleNew} className="mt-2 text-xs text-primary hover:bg-primary/10">
            Criar primeira nota
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`group relative rounded-xl border p-3 transition-all hover:border-white/10 ${getNoteColorClass(note.color)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {note.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                    <h4 className="text-sm font-medium truncate">{note.title || 'Sem título'}</h4>
                  </div>
                  {note.content && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                  )}
                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {note.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/5 text-muted-foreground">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => togglePin.mutate({ id: note.id, pinned: !note.pinned })}
                    className={`p-1 rounded hover:bg-white/5 ${note.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button onClick={() => handleEdit(note)} className="p-1 rounded text-muted-foreground hover:bg-white/5 hover:text-foreground">
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button onClick={() => deleteNote.mutate(note.id)} className="p-1 rounded text-muted-foreground hover:bg-white/5 hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NoteEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        note={editingNote}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        onSave={handleSave}
        isLoading={createNote.isPending || updateNote.isPending}
      />
    </div>
  );
}
