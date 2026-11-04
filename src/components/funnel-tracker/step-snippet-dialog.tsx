import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Check, Copy } from "lucide-react";

export const FUNNEL_PUBLIC_ORIGIN = "https://click-charm-73.lovable.app";

function Snippet({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 p-2">
      <code className="min-w-0 flex-1 whitespace-pre-wrap break-all text-xs">{value}</code>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}

function Where({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">Onde colar: </span>
      {children}
    </p>
  );
}

export function StepSnippetDialog({
  open,
  onOpenChange,
  workspaceId,
  funnelId,
  stepKey,
  stepLabel,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workspaceId: string;
  funnelId: string;
  stepKey: string;
  stepLabel: string;
}) {
  const origin = FUNNEL_PUBLIC_ORIGIN;
  const eventUrl = `${origin}/api/public/funnel-event/${workspaceId}`;
  const base = `<script src="${origin}/funnel-tracker.js?w=${workspaceId}&f=${funnelId}" data-auto="true" defer></script>`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rastrear etapa “{stepLabel}”</DialogTitle>
          <DialogDescription>
            Chave da etapa: <code className="text-foreground">{stepKey}</code>. Escolha o formato conforme onde a etapa
            acontece.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Pré-requisito: script base</p>
          <Snippet value={base} />
          <Where>
            dentro da tag <code>&lt;head&gt;</code> do site, uma única vez (todas as páginas do funil).
          </Where>
        </div>

        <Tabs defaultValue="botao" className="mt-2">
          <TabsList className="flex-wrap">
            <TabsTrigger value="botao">Botão</TabsTrigger>
            <TabsTrigger value="secao">Seção vista</TabsTrigger>
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="js">JavaScript</TabsTrigger>
            <TabsTrigger value="typebot">Typebot</TabsTrigger>
          </TabsList>

          <TabsContent value="botao" className="mt-3 space-y-2">
            <Snippet value={`<button data-funnel-step="${stepKey}">Seu botão</button>`} />
            <Where>
              no HTML do botão/link que representa esta etapa. Basta adicionar o atributo{" "}
              <code>data-funnel-step="{stepKey}"</code> no botão que você já tem.
            </Where>
          </TabsContent>

          <TabsContent value="secao" className="mt-3 space-y-2">
            <Snippet value={`<section data-funnel-view="${stepKey}"> ... </section>`} />
            <Where>
              na seção/bloco da página que, ao ficar visível na tela, significa que o visitante chegou nesta etapa (ex.:
              bloco da oferta).
            </Where>
          </TabsContent>

          <TabsContent value="form" className="mt-3 space-y-2">
            <Snippet value={`<form data-funnel-submit="${stepKey}"> ... </form>`} />
            <Where>na tag do formulário; a etapa é marcada quando o formulário é enviado.</Where>
          </TabsContent>

          <TabsContent value="js" className="mt-3 space-y-2">
            <Snippet value={`trkFunnel.step('${stepKey}');`} />
            <Where>
              em qualquer código JavaScript da página (onClick, callback, etc.), depois que o script base carregou.
            </Where>
          </TabsContent>

          <TabsContent value="typebot" className="mt-3 space-y-2">
            <Snippet
              value={`${eventUrl}?f=${funnelId}&step=${stepKey}&sessionId={{sessionId}}&utm_content={{utm_content}}&utm_campaign={{utm_campaign}}&utm_source={{utm_source}}`}
            />
            <Where>
              no Typebot, adicione um bloco <strong>HTTP Request</strong> (Integrations) no ponto do fluxo desta etapa,
              método <strong>GET</strong>, e cole essa URL no campo de URL.
            </Where>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
