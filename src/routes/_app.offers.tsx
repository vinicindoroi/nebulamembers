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
  ChevronDown,
} from "lucide-react";
import { offerLinkLabel, readOfferLinks, readOfferPrompts, type OfferLink, type OfferPrompt } from "@/lib/offer-link";
import { PromptCard } from "@/components/members/OfferPromptCard";
import { toast } from "sonner";
import {
  useMemberOffers,
  downloadOfferFile,
  formatFileSize,
  type MemberOffer,
  type OfferFile,
} from "@/hooks/use-member-offers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_app/offers")({
  head: () => ({
    meta: [
      { title: "Ofertas — Nebula Members" },
      {
        name: "description",
        content: "Ofertas e materiais prontos do seu mentor, liberados para o seu plano.",
      },
      { property: "og:title", content: "Ofertas — Nebula Members" },
      {
        property: "og:description",
        content: "Ofertas e materiais prontos do seu mentor, liberados para o seu plano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OffersPage,
});

type Offer = MemberOffer;

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
        <div className="grid items-start gap-4 md:grid-cols-2">
          {filtered.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              downloading={downloading}
              onDownload={download}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OfferCard({
  offer,
  downloading,
  onDownload,
}: {
  offer: Offer;
  downloading: string | null;
  onDownload: (file: OfferFile) => void;
}) {
  const [open, setOpen] = useState(false);
  const links: OfferLink[] = readOfferLinks(offer.links, offer.link_url);
  const prompts: OfferPrompt[] = readOfferPrompts(offer.prompts);
  const files = offer.member_offer_files;
  const summary = [
    links.length ? `${links.length} link(s)` : files.length ? `${files.length} arquivo(s)` : "",
    prompts.length ? `${prompts.length} prompt(s)` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-primary/5 px-5 py-4 text-left transition-colors hover:bg-primary/10"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Package className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-primary">MATERIAL DO MENTOR</span>
            <span className="block truncate text-base font-semibold">{offer.title}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {summary && <span className="hidden text-xs text-muted-foreground sm:inline">{summary}</span>}
          <ChevronDown
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="space-y-4 p-5">
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
          ) : !files.length && prompts.length ? null : (
            <>
              <ul className="space-y-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-border p-3"
                  >
                    <FileText className="h-5 w-5 shrink-0 text-primary/70" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm" title={file.name}>
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={downloading !== null}
                      onClick={() => onDownload(file)}
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
              {!files.length && (
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
      )}
    </article>
  );
}
