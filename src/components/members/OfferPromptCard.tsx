import { useState } from "react";
import { Check, ChevronDown, Copy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PromptCard({ title, text, index }: { title: string; text: string; index: number }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const long = text.length > 220 || text.split("\n").length > 4;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Prompt copiado");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
    }
  }
  return (
    <div className="rounded-xl border border-border">
      <div className="flex items-center gap-3 border-b border-border px-3 py-2">
        <MessageSquareText className="h-4 w-4 shrink-0 text-primary/70" />
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {title || `Prompt ${index + 1}`}
        </p>
        <Button size="sm" onClick={copy} aria-label={`Copiar ${title || `prompt ${index + 1}`}`}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <pre
        className={`whitespace-pre-wrap break-words px-3 py-2.5 font-mono text-xs text-muted-foreground ${
          long && !open ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </pre>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-center gap-1 border-t border-border py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? "Mostrar menos" : "Ver prompt completo"}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
