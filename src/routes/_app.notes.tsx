import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useDeferredValue } from 'react';
import { Search, Plus, Pin, Pencil, Trash2, StickyNote, LayoutGrid, List, GitBranch, GraduationCap, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useNotes, UserNote } from '@/hooks/useNotes';
import { NoteEditorDialog } from '@/components/notes/NoteEditorDialog';
import { NotesGraphView } from '@/components/notes/NotesGraphView';

export const Route = createFileRoute("/_app/notes")({
  component: NotesPage,
  head: () => ({ meta: [{ title: "Notas — Membros" }] }),
});

type ViewMode = 'grid' | 'list' | 'graph';

function NotesPage() {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => (localStorage.getItem('notes-view') as ViewMode) || 'grid');

  const handleSetViewMode = (m: ViewMode) => {
    setViewMode(m);
    localStorage.setItem('notes-view', m);
  };
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);

  const { notes, isLoading, allTags, createNote, updateNote, deleteNote, togglePin } = useNotes({
    search: deferredSearch,
    tag: selectedTag || undefined,
  });

  const handleSave = (data: { title: string; content: string; tags: string[]; color: string; pinned: boolean; lesson_id?: string | null }) => {
    if (editingNote) {
      updateNote.mutate({ id: editingNote.id, ...data });
    } else {
      createNote.mutate(data);
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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Minhas Notas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {notes.length} {notes.length === 1 ? 'nota' : 'notas'}
          </p>
        </div>
        <Button onClick={handleNew} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Nota
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.03] border-white/10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center bg-white/[0.03] border border-white/10 rounded-lg p-0.5">
            <button
              onClick={() => handleSetViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSetViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleSetViewMode('graph')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'graph' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
              title="Grafo"
            >
              <GitBranch className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          <button
            onClick={() => setSelectedTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              !selectedTag ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground hover:text-foreground'
            }`}
          >
            Todas
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                selectedTag === tag ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Tag className="h-3 w-3" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : viewMode === 'graph' ? (
        <div className="h-[calc(100vh-20rem)] min-h-[400px] rounded-xl border border-white/5 overflow-hidden">
          <NotesGraphView notes={notes} onNoteClick={handleEdit} />
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-2xl">
          <StickyNote className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-medium mb-1">Nenhuma nota encontrada</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || selectedTag ? 'Tente ajustar os filtros' : 'Comece criando sua primeira nota'}
          </p>
          {!search && !selectedTag && (
            <Button onClick={handleNew} size="sm" variant="outline" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar nota
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleEdit(note)}
              className={`group relative rounded-xl border p-4 cursor-pointer transition-all hover:border-white/15 hover:shadow-lg ${getNoteColorClass(note.color)}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {note.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <h4 className="text-sm font-medium truncate">{note.title || 'Sem título'}</h4>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: note.id, pinned: !note.pinned }); }}
                    className={`p-1 rounded hover:bg-white/10 ${note.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                    className="p-1 rounded text-muted-foreground hover:bg-white/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {note.content && (
                <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{note.content}</p>
              )}

              <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/5 text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground/60">{formatDate(note.updated_at)}</span>
              </div>

              {note.lesson_title && (
                <div className="flex items-center gap-1 mt-2 pt-2 border-t border-white/5">
                  <GraduationCap className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-[10px] text-muted-foreground/60 truncate">{note.lesson_title}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* List view */
        <div className="space-y-2">
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => handleEdit(note)}
              className={`group relative rounded-xl border p-3 cursor-pointer transition-all hover:border-white/15 flex items-center gap-4 ${getNoteColorClass(note.color)}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {note.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                  <h4 className="text-sm font-medium truncate">{note.title || 'Sem título'}</h4>
                  {note.lesson_title && (
                    <span className="text-[10px] text-muted-foreground/60 truncate hidden sm:inline">
                      • {note.lesson_title}
                    </span>
                  )}
                </div>
                {note.content && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{note.content}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {note.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 bg-white/5 text-muted-foreground hidden sm:inline-flex">
                    {tag}
                  </Badge>
                ))}
                <span className="text-[10px] text-muted-foreground/60 w-16 text-right">{formatDate(note.updated_at)}</span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); togglePin.mutate({ id: note.id, pinned: !note.pinned }); }}
                    className={`p-1 rounded hover:bg-white/10 ${note.pinned ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    <Pin className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote.mutate(note.id); }}
                    className="p-1 rounded text-muted-foreground hover:bg-white/10 hover:text-destructive"
                  >
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
        onSave={handleSave}
        isLoading={createNote.isPending || updateNote.isPending}
      />
    </div>
  );
}
