import { useState } from "react";
import { ArrowUpRight, CheckCheck, Code2, Github, Layers3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PromptCard } from "@/components/members/OfferPromptCard";
import { readOfferLinks, offerLinkLabel } from "@/lib/offer-link";
import type { MemberOffer } from "@/hooks/use-member-offers";

export function OfferCloneGuide({ offers }: { offers: MemberOffer[] }) {
  const [selected, setSelected] = useState("");
  const [github, setGithub] = useState("");
  const links = offers.flatMap((offer) => readOfferLinks(offer.links, offer.link_url).map((link, index) => ({
    id: `${offer.id}:${index}`,
    url: link.url,
    label: `${offer.title} · ${link.label || offerLinkLabel(link.url)}`,
  })));
  const chosen = links.find((link) => link.id === selected);
  const reference = chosen ? `${chosen.label}\nURL: ${chosen.url}` : "Vou enviar o link da página de referência ou capturas de tela na próxima mensagem.";
  const prompt = `Quero recriar uma página de referência como um projeto meu, pronto para publicar no meu GitHub.

REFERÊNCIA
${reference}
Conta GitHub: ${github.trim() || "pergunte meu usuário antes de configurar a publicação"}.

1. Analise a página: seções, hierarquia, tipografia, cores, espaçamentos, imagens e comportamento em celular e desktop. Se não conseguir acessar o link, peça capturas de tela e os arquivos necessários; não invente o conteúdo nem tente contornar login ou bloqueios.
2. Recrie a estrutura visual com código original. Use apenas textos, marcas e imagens que eu tenha autorização para reutilizar; peça meus materiais e substitua o restante. Não copie scripts privados, pixels, rastreadores, chaves ou dados de terceiros.
3. Prefira HTML, CSS e JavaScript para uma página estática. Se o projeto já usar um framework, preserve-o e gere uma versão estática compatível com GitHub Pages. Não use servidor, banco ou segredos no código publicado.
4. Peça meus textos, identidade visual, links de destino e checkout. Faça os botões funcionarem, mantenha parâmetros UTM necessários e não deixe links de compra apontando para a referência. Formulários devem usar um serviço externo que eu escolher; não simule um envio bem-sucedido.
5. Entregue todos os arquivos organizados e um README com instruções. Confira celular e desktop, acessibilidade, imagens, carregamento e todos os links. Use caminhos compatíveis com o subdiretório do repositório.
6. Oriente a criação de um repositório na MINHA conta. No GitHub Free, explique que GitHub Pages exige um repositório público e que o site ficará público. Nunca peça que eu cole senha ou token no chat. Se você tiver uma integração autorizada com meu GitHub, peça minha confirmação antes de criar o repositório ou publicar; caso contrário, entregue os arquivos e o passo a passo manual, sem afirmar que publicou.
7. Para arquivos estáticos na raiz: Settings → Pages → Deploy from a branch → main → /(root). Para projeto que precisa compilar: prepare um workflow GitHub Actions para Pages e explique Settings → Pages → GitHub Actions. Mostre a URL esperada https://USUARIO.github.io/REPOSITORIO/ e confirme a URL real somente após a publicação.

Comece analisando a referência e perguntando apenas o que faltar para criar minha versão.`;

  return (
    <section className="space-y-6 border-t border-border pt-7" aria-labelledby="clone-guide-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-glass-border bg-glass text-primary"><Sparkles className="h-5 w-5" /></span>
        <div>
          <p className="text-xs font-medium text-primary">DO MATERIAL À SUA PÁGINA</p>
          <h2 id="clone-guide-title" className="mt-1 text-xl font-semibold">Sua próxima página começa aqui</h2>
          <p className="mt-2 text-sm text-muted-foreground">Use uma referência, adapte para sua oferta e publique na sua conta.</p>
        </div>
      </div>

      <ol className="grid gap-5 border-y border-border py-5 md:grid-cols-3">
        {[
          { icon: Layers3, title: "01 · Escolha a referência", text: "Abra um material acima e confira a página no computador e no celular. Separe capturas das seções que quer recriar." },
          { icon: Code2, title: "02 · Crie com IA", text: "Selecione o link abaixo e copie o prompt para sua IA. Envie suas imagens, textos e checkout para criar uma versão sua." },
          { icon: Github, title: "03 · Publique no GitHub", text: "Salve os arquivos no seu repositório e ative GitHub Pages. A IA prepara os arquivos; a publicação exige acesso à sua conta." },
        ].map((step) => (
          <li key={step.title} className="space-y-2">
            <step.icon className="h-5 w-5 text-primary" />
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.text}</p>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="font-semibold">Prompt de recriação + publicação</h3>
            <p className="mt-1 text-sm text-muted-foreground">O link escolhido entra no prompt automaticamente.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label id="clone-reference-label" className="text-xs font-medium text-muted-foreground">Página de referência</label>
              <Select value={selected || "manual"} onValueChange={(value) => setSelected(value === "manual" ? "" : value)}>
                <SelectTrigger aria-labelledby="clone-reference-label"><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  <SelectItem value="manual" className="focus:bg-accent">Enviar link ou capturas à IA</SelectItem>
                  {links.map((link) => <SelectItem key={link.id} value={link.id} className="focus:bg-accent">{link.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="clone-github" className="text-xs font-medium text-muted-foreground">Seu usuário no GitHub · opcional</label>
              <Input id="clone-github" value={github} onChange={(event) => setGithub(event.target.value)} placeholder="Seu usuário, não sua senha" maxLength={39} autoComplete="off" />
            </div>
          </div>
          {chosen && <p className="break-all text-xs text-muted-foreground">{chosen.url}</p>}
          <PromptCard title="Recriar página e publicar no meu GitHub" text={prompt} index={0} />
        </div>
        <aside className="space-y-4 border-l-2 border-primary/30 pl-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><CheckCheck className="h-4 w-4 text-primary" />Antes de colocar no ar</h3>
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li>Troque a marca, a copy e as imagens pelas suas.</li>
            <li>Confira checkout, botões e versão mobile.</li>
            <li>Não publique senhas, chaves ou dados de clientes.</li>
            <li>GitHub Pages hospeda páginas estáticas; não processa pagamentos ou formulários sozinho.</li>
          </ul>
          <Button variant="link" className="h-auto justify-start whitespace-normal p-0 text-left" asChild>
            <a href="https://docs.github.com/pt/pages/getting-started-with-github-pages/creating-a-github-pages-site" target="_blank" rel="noopener noreferrer">Guia do GitHub Pages<ArrowUpRight className="h-4 w-4" /></a>
          </Button>
        </aside>
      </div>
    </section>
  );
}