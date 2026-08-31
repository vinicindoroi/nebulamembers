import { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileText, Image, FileJson, Upload } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface Props {
  onExportMarkdown: () => void;
  onExportJSON: () => void;
  onImportJSON: () => void;
  canvasRef: RefObject<HTMLDivElement | null>;
}

export function MindMapExportMenu({ onExportMarkdown, onExportJSON, onImportJSON, canvasRef }: Props) {
  const exportPng = async () => {
    if (!canvasRef.current) return;
    try {
      const viewport = canvasRef.current.querySelector('.react-flow__viewport') as HTMLElement;
      if (!viewport) return;
      const dataUrl = await toPng(viewport, {
        backgroundColor: '#0f0f11',
        width: viewport.scrollWidth,
        height: viewport.scrollHeight,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'mindmap.png';
      a.click();
      toast.success('Imagem exportada!');
    } catch (err) {
      toast.error('Erro ao exportar imagem');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow" title="Exportar / Importar">
          <Download className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-1.5" side="top">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-muted-foreground px-2 pt-1 font-medium">Exportar</p>
          <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={onExportMarkdown}>
            <FileText className="h-3.5 w-3.5" />
            Markdown (.md)
          </Button>
          <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={exportPng}>
            <Image className="h-3.5 w-3.5" />
            Imagem (PNG)
          </Button>
          <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={onExportJSON}>
            <FileJson className="h-3.5 w-3.5" />
            JSON (.json)
          </Button>
          <div className="h-px bg-border my-1" />
          <p className="text-[10px] text-muted-foreground px-2 font-medium">Importar</p>
          <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={onImportJSON}>
            <Upload className="h-3.5 w-3.5" />
            Importar JSON
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
