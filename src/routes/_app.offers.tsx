import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  FileText,
  Package,
  Search,
  Loader2,
  ExternalLink,
  Link as LinkIcon,
} from "lucide-react";
import { offerLinkLabel, readOfferLinks, readOfferPrompts } from "@/lib/offer-link";
import { PromptCard } from "@/components/members/OfferPromptCard";
import { toast } from "sonner";
import {
  useMemberOffers,
  downloadOfferFile,
  formatFileSize,
  type OfferFile,
} from "@/hooks/use-member-offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({ meta: [{ title: "Ofertas — Nebula Members" }] }),
  component: OffersPage,
});

function OffersPage() {
  const { data: offers = [], isPending, error, refetch } = useMemberOffers();
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const filtered = offers.filter((o) =>
    `${o.title} ${o.description}`
      .toLocaleLowerCase("pt-BR")
      .includes(search.toLocaleLowerCase("pt-BR")),
  );
  async function download(file: OfferFile) {
    setDownloading(file.id);
    try {
      await downloadOfferFile(file);
    } catch {
      toast.error("Não foi possível baixar o arquivo. Verifique seu acesso e tente novamente.");
    } finally {
      setDownloading(null);
    }
  }
  return (
    <div className="mx-auto max-w-6xl space-y-7 animate-fade-up">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Ofertas</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ofertas e materiais prontos do seu mentor, disponíveis para o seu plano.
        </p>
      </header>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          aria-label="Buscar ofertas"
          placeholder="Buscar ofertas e materiais..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      {isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Carregando ofertas...
        </p>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-border p-6">
          <p>Não foi possível carregar as ofertas.</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Package className="mx-auto mb-4 h-10 w-10 text-primary/50" />
          <h2 className="font-semibold">
            {search ? "Nenhuma oferta encontrada" : "Nenhuma oferta disponível ainda"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {search
              ? "Tente outro termo de busca."
              : "As ofertas liberadas para o seu plano aparecerão aqui."}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map((offer) => {
            const links = readOfferLinks(offer.links, offer.link_url);
            const prompts = readOfferPrompts(offer.prompts);
            const summary = [
              links.length
                ? `${links.length} link(s)`
                : offer.member_offer_files.length
                  ? `${offer.member_offer_files.length} arquivo(s)`
                  : "",
              prompts.length ? `${prompts.length} prompt(s)` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <article
                key={offer.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex items-center gap-3 border-b border-border bg-primary/5 px-6 py-4">
                  <Package className="h-6 w-6 text-primary" />
                  <span className="text-xs font-medium text-primary">MATERIAL DO MENTOR</span>
                  <span className="ml-auto text-xs text-muted-foreground">{summary}</span>
                </div>
                <div className="space-y-4 p-6">
                  <h2 className="text-xl font-semibold">{offer.title}</h2>
                  {offer.description && (
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {offer.description}
                    </p>
                  )}
                  {links.length ? (
                    <ul className="space-y-2">
                      {links.map((link, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-border p-3"
                        >
                          <LinkIcon className="h-5 w-5 shrink-0 text-primary/70" />
                          <div className="min-w-0 flex-1">
                            {link.label && (
                              <span className="mb-1 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                {link.label}
                              </span>
                            )}
                            <p className="truncate text-sm text-muted-foreground" title={link.url}>
                              {offerLinkLabel(link.url)}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Abrir ${link.label || offerLinkLabel(link.url)}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                              Abrir
                            </a>
                          </Button>
                        </li>
                      ))}
                    </ul>
                  ) : !offer.member_offer_files.length && prompts.length ? null : (
                    <>
                      <ul className="space-y-2">
                        {offer.member_offer_files.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center gap-3 rounded-xl border border-border p-3"
                          >
                            <FileText className="h-5 w-5 shrink-0 text-primary/70" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm" title={file.name}>
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloading !== null}
                              onClick={() => download(file)}
                              aria-label={`Baixar ${file.name}`}
                            >
                              {downloading === file.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                              Baixar
                            </Button>
                          </li>
                        ))}
                      </ul>
                      {!offer.member_offer_files.length && (
                        <p className="text-sm text-muted-foreground">
                          O mentor está preparando os arquivos desta oferta.
                        </p>
                      )}
                    </>
                  )}
                  {prompts.length > 0 && (
                    <div className="space-y-2">
                      {prompts.map((p, i) => (
                        <PromptCard key={i} title={p.title} text={p.text} index={i} />
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
