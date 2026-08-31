import { useState, useEffect, useRef } from 'react';
import { Node } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  X, Plus, Link2, Trash2, Paperclip, ExternalLink, CheckCircle2,
  MessageSquare, Image as ImageIcon, GitFork, StickyNote, Upload, Loader2,
} from 'lucide-react';
import { MindMapNodeData } from './MindMapNode';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Props {
  node: Node;
  onClose: () => void;
  onUpdateData: (updates: Partial<MindMapNodeData>) => void;
  initialTab?: string;
}

export function MindMapDetailPanel({ node, onClose, onUpdateData, initialTab }: Props) {
  const data = node.data as MindMapNodeData;
  const [note, setNote] = useState(data.note || '');
  const [newLink, setNewLink] = useState('');
  const [newAttachment, setNewAttachment] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newTask, setNewTask] = useState('');
  const [newConnection, setNewConnection] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNote(data.note || '');
  }, [node.id, data.note]);

  const saveNote = () => onUpdateData({ note });

  // Generic list helpers
  const addToList = (key: string, value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    const current = (data[key] as string[]) || [];
    onUpdateData({ [key]: [...current, value.trim()] } as any);
    setter('');
  };

  const removeFromList = (key: string, idx: number) => {
    const current = [...((data[key] as string[]) || [])];
    current.splice(idx, 1);
    onUpdateData({ [key]: current } as any);
  };

  // Tasks with completion toggle
  const addTask = () => {
    if (!newTask.trim()) return;
    const tasks = (data.tasks as any[]) || [];
    onUpdateData({ tasks: [...tasks, { text: newTask.trim(), done: false, createdAt: new Date().toISOString() }] } as any);
    setNewTask('');
  };

  const toggleTask = (idx: number) => {
    const tasks = [...((data.tasks as any[]) || [])];
    tasks[idx] = { ...tasks[idx], done: !tasks[idx].done };
    onUpdateData({ tasks } as any);
  };

  const removeTask = (idx: number) => {
    const tasks = [...((data.tasks as any[]) || [])];
    tasks.splice(idx, 1);
    onUpdateData({ tasks } as any);
  };

  // Comments
  const addComment = () => {
    if (!newComment.trim()) return;
    const comments = (data.comments as any[]) || [];
    onUpdateData({ comments: [...comments, { text: newComment.trim(), createdAt: new Date().toISOString() }] } as any);
    setNewComment('');
  };

  const removeComment = (idx: number) => {
    const comments = [...((data.comments as any[]) || [])];
    comments.splice(idx, 1);
    onUpdateData({ comments } as any);
  };

  // Media upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const currentMedia = ((data.media as string[]) || []);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${node.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('mindmap-media')
          .upload(filePath, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('mindmap-media')
          .getPublicUrl(filePath);

        newUrls.push(urlData.publicUrl);
      }

      onUpdateData({ media: [...currentMedia, ...newUrls] } as any);
      toast.success(`${newUrls.length} arquivo(s) enviado(s)`);
    } catch (err: any) {
      toast.error('Erro ao enviar arquivo: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeMedia = (idx: number) => {
    const current = [...((data.media as string[]) || [])];
    // Try to delete from storage
    const url = current[idx];
    const match = url.match(/mindmap-media\/(.+)$/);
    if (match) {
      supabase.storage.from('mindmap-media').remove([match[1]]).catch(() => {});
    }
    current.splice(idx, 1);
    onUpdateData({ media: current } as any);
  };

  const isImageUrl = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url);

  const activeTab = initialTab || 'notes';

  return (
    <>
      <div
        className="absolute right-0 top-0 h-full w-[340px] bg-card border-l border-border shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-200"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {data.emoji && <span>{data.emoji}</span>}
            <h3 className="font-semibold text-sm truncate max-w-[220px]">{data.label}</h3>
          </div>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Tabs defaultValue={activeTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 mt-2 h-8 w-auto inline-flex">
            <TabsTrigger value="notes" className="text-[11px] gap-1 px-2">
              <StickyNote className="w-3 h-3" /> Nota
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-[11px] gap-1 px-2">
              <CheckCircle2 className="w-3 h-3" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="media" className="text-[11px] gap-1 px-2">
              <ImageIcon className="w-3 h-3" /> Mídia
            </TabsTrigger>
            <TabsTrigger value="comments" className="text-[11px] gap-1 px-2">
              <MessageSquare className="w-3 h-3" /> Comentários
            </TabsTrigger>
            <TabsTrigger value="links" className="text-[11px] gap-1 px-2">
              <Link2 className="w-3 h-3" /> Links
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Notes Tab */}
            <TabsContent value="notes" className="p-4 space-y-4 mt-0">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Nota / Descrição</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={saveNote}
                  placeholder="Adicione uma descrição detalhada..."
                  rows={6}
                  className="text-sm resize-none"
                />
              </div>
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="p-4 space-y-3 mt-0">
              <Label className="text-xs text-muted-foreground">Tarefas do nó</Label>
              <div className="space-y-1.5">
                {((data.tasks as any[]) || []).map((task, idx) => (
                  <div key={idx} className="flex items-start gap-2 group py-1">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={() => toggleTask(idx)}
                      className="mt-0.5"
                    />
                    <span className={`text-sm flex-1 ${task.done ? 'line-through text-muted-foreground' : ''}`}>
                      {task.text}
                    </span>
                    <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={() => removeTask(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Nova tarefa..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && addTask()}
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={addTask}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </TabsContent>

            {/* Media Tab */}
            <TabsContent value="media" className="p-4 space-y-3 mt-0">
              <Label className="text-xs text-muted-foreground">Imagens e Mídia</Label>

              {/* Upload area */}
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                    <span className="text-xs text-muted-foreground">Enviando...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Clique para enviar imagens</span>
                    <span className="text-[10px] text-muted-foreground/60">JPG, PNG, GIF, WebP</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Media grid */}
              {((data.media as string[]) || []).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {((data.media as string[]) || []).map((url, idx) => (
                    <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-muted/30">
                      {isImageUrl(url) ? (
                        <img
                          src={url}
                          alt={`Mídia ${idx + 1}`}
                          className="w-full h-24 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setPreviewUrl(url)}
                        />
                      ) : (
                        <a href={url} target="_blank" rel="noopener" className="flex items-center justify-center h-24 text-xs text-primary hover:underline p-2 text-center">
                          <ExternalLink className="w-4 h-4 mr-1 shrink-0" />
                          Abrir
                        </a>
                      )}
                      <Button
                        size="icon"
                        variant="destructive"
                        className="h-5 w-5 absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeMedia(idx)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {((data.media as string[]) || []).length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-2">
                  Nenhuma mídia adicionada
                </p>
              )}
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="p-4 space-y-3 mt-0">
              <Label className="text-xs text-muted-foreground">Comentários</Label>
              <div className="space-y-2">
                {((data.comments as any[]) || []).map((comment, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-lg p-2.5 group relative">
                    <p className="text-sm">{comment.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {format(new Date(comment.createdAt), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <Button size="icon" variant="ghost"
                      className="h-5 w-5 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100"
                      onClick={() => removeComment(idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && addComment()}
                />
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={addComment}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </TabsContent>

            {/* Links Tab */}
            <TabsContent value="links" className="p-4 space-y-5 mt-0">
              {/* Links */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> Links
                </Label>
                {(data.links || []).map((link, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 group">
                    <a href={link} target="_blank" rel="noopener" className="text-xs text-primary truncate flex-1 hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      {link}
                    </a>
                    <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeFromList('links', idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input value={newLink} onChange={(e) => setNewLink(e.target.value)}
                    placeholder="https://..." className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addToList('links', newLink, setNewLink)} />
                  <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => addToList('links', newLink, setNewLink)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> Anexos
                </Label>
                {(data.attachments || []).map((att, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 group text-xs text-muted-foreground">
                    <Paperclip className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{att}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeFromList('attachments', idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input value={newAttachment} onChange={(e) => setNewAttachment(e.target.value)}
                    placeholder="Nome do arquivo ou URL..." className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addToList('attachments', newAttachment, setNewAttachment)} />
                  <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => addToList('attachments', newAttachment, setNewAttachment)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Connections */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> Conexões
                </Label>
                {((data.connections as string[]) || []).map((conn, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 group text-xs text-muted-foreground">
                    <GitFork className="w-3 h-3 shrink-0" />
                    <span className="truncate flex-1">{conn}</span>
                    <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => removeFromList('connections', idx)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-1.5">
                  <Input value={newConnection} onChange={(e) => setNewConnection(e.target.value)}
                    placeholder="Descrição da conexão..." className="h-7 text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && addToList('connections', newConnection, setNewConnection)} />
                  <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => addToList('connections', newConnection, setNewConnection)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur-sm">
          {previewUrl && (
            <img src={previewUrl} alt="Preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
