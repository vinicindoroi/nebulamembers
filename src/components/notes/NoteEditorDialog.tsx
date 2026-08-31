import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Pin, Palette } from 'lucide-react';
import { UserNote } from '@/hooks/useNotes';
import { ColorPicker } from '@/components/ui/color-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const PRESET_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#eab308',
  '#f43f5e', '#ec4899', '#f97316', '#ffffff', '#6b7280',
];

interface NoteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: UserNote | null;
  lessonId?: string | null;
  lessonTitle?: string;
  onSave: (data: { title: string; content: string; tags: string[]; color: string; pinned: boolean; lesson_id?: string | null }) => void;
  isLoading?: boolean;
}

export function NoteEditorDialog({ open, onOpenChange, note, lessonId, lessonTitle, onSave, isLoading }: NoteEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setTags(note.tags);
      setColor(note.color === 'default' ? '#8b5cf6' : note.color);
      setPinned(note.pinned);
    } else {
      setTitle('');
      setContent('');
      setTags([]);
      setColor('#8b5cf6');
      setPinned(false);
    }
  }, [note, open]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    onSave({
      title: title.trim() || 'Sem título',
      content: content.trim(),
      tags,
      color,
      pinned,
      lesson_id: lessonId ?? note?.lesson_id ?? null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg border-0 shadow-2xl"
        style={{
          background: 'rgba(20, 20, 28, 0.7)',
          backdropFilter: 'blur(40px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
          borderRadius: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 32px 64px -12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground text-lg font-semibold">
            {note ? 'Editar Nota' : 'Nova Nota'}
          </DialogTitle>
          {lessonTitle && (
            <p className="text-xs text-muted-foreground mt-1">Aula: {lessonTitle}</p>
          )}
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Input
            placeholder="Título da nota..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-white/[0.04] border-white/10 focus:border-primary/60 rounded-xl h-11 transition-colors"
            style={{ borderColor: color ? `${color}40` : undefined }}
          />

          <Textarea
            placeholder="Escreva sua nota aqui..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            className="bg-white/[0.04] border-white/10 focus:border-primary/60 rounded-xl resize-none transition-colors"
          />

          {/* Tags */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Tags</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-white/[0.06] text-foreground/80 border-white/10 gap-1 rounded-lg">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                placeholder="Adicionar tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="bg-white/[0.04] border-white/10 text-sm h-9 rounded-xl"
              />
              <Button size="sm" variant="ghost" onClick={handleAddTag} className="h-9 w-9 p-0 hover:bg-white/5 rounded-xl">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block font-medium">Cor</label>
            <div className="flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                    color === c ? 'border-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.2)]' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              {/* Custom color picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 flex items-center justify-center ${
                      !PRESET_COLORS.includes(color) ? 'border-white scale-110' : 'border-white/20'
                    }`}
                    style={{
                      backgroundColor: !PRESET_COLORS.includes(color) ? color : undefined,
                      background: PRESET_COLORS.includes(color) ? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' : undefined,
                    }}
                  >
                    {PRESET_COLORS.includes(color) && <Palette className="h-3 w-3 text-white" />}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="!w-auto !p-0 !border-0 !bg-transparent !shadow-none" align="start" sideOffset={8}>
                  <ColorPicker color={color} onChange={setColor} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <button
              onClick={() => setPinned(!pinned)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl transition-all duration-200 ${
                pinned
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              <Pin className={`h-3.5 w-3.5 ${pinned ? 'fill-primary' : ''}`} />
              {pinned ? 'Fixada' : 'Fixar'}
            </button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                size="sm"
                className="rounded-xl hover:bg-white/5"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
                className="rounded-xl px-5"
                style={{ backgroundColor: color, color: isLightColor(color) ? '#000' : '#fff' }}
              >
                Salvar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}
