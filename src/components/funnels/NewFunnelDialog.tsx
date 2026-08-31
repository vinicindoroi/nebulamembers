import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { GitFork, Brain, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewFunnelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateFunnel: (data: { name: string; description?: string; funnel_type?: string }) => void;
  isLoading?: boolean;
}

export function NewFunnelDialog({
  open,
  onOpenChange,
  onCreateFunnel,
  isLoading,
}: NewFunnelDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [funnelType, setFunnelType] = useState('funnelytics');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateFunnel({ name: name.trim(), description: description.trim() || undefined, funnel_type: funnelType });
    setName('');
    setDescription('');
    setFunnelType('funnelytics');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Funil</DialogTitle>
          <DialogDescription>
            Crie um novo funil de vendas para mapear sua estratégia
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo de Funil</Label>
            <RadioGroup value={funnelType} onValueChange={setFunnelType} className="grid grid-cols-3 gap-3">
              <label
                htmlFor="type-funnelytics"
                className={cn(
                  "flex flex-col items-center justify-between gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center h-full",
                  funnelType === 'funnelytics'
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-white"
                )}
              >
                <RadioGroupItem value="funnelytics" id="type-funnelytics" className="sr-only" />
                <GitFork className="h-5 w-5" />
                <span className="text-xs font-semibold">Funnelytics</span>
                <span className="text-[10px] opacity-70 leading-tight">Mapeamento visual</span>
              </label>

              <label
                htmlFor="type-mind"
                className={cn(
                  "flex flex-col items-center justify-between gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center h-full",
                  funnelType === 'mind'
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-white"
                )}
              >
                <RadioGroupItem value="mind" id="type-mind" className="sr-only" />
                <Brain className="h-5 w-5" />
                <span className="text-xs font-semibold">Mind Map</span>
                <span className="text-[10px] opacity-70 leading-tight">Mapas mentais</span>
              </label>

              <label
                htmlFor="type-canvas"
                className={cn(
                  "flex flex-col items-center justify-between gap-2 rounded-lg border-2 p-3 cursor-pointer transition-colors text-center h-full",
                  funnelType === 'canvas'
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-muted-foreground/40 hover:text-white"
                )}
              >
                <RadioGroupItem value="canvas" id="type-canvas" className="sr-only" />
                <Pencil className="h-5 w-5" />
                <span className="text-xs font-semibold">Canvas</span>
                <span className="text-[10px] opacity-70 leading-tight">Quadro em branco</span>
              </label>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-name">Nome do Funil</Label>
            <Input
              id="funnel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Funil de Lançamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="funnel-description">Descrição (opcional)</Label>
            <Textarea
              id="funnel-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o objetivo deste funil..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || isLoading}>
              {isLoading ? 'Criando...' : 'Criar Funil'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}