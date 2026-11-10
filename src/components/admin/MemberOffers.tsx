import { useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  Upload,
  X,
  Link as LinkIcon,
  MessageSquareText,
} from "lucide-react";
import {
  cleanOfferLinks,
  cleanOfferPrompts,
  readOfferLinks,
  readOfferPrompts,
  MAX_OFFER_LABEL,
  type OfferLink,
  type OfferPrompt,
} from "@/lib/offer-link";

function offerSummary(offer: MemberOffer) {
  const links = readOfferLinks(offer.links, offer.link_url).length;
  const prompts = readOfferPrompts(offer.prompts).length;
  const parts = [
    links ? `${links} link(s)` : `${offer.member_offer_files.length} arquivo(s)`,
  ];
  if (prompts) parts.push(`${prompts} prompt(s)`);
  return parts.join(" · ");
}
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePlans } from "@/hooks/use-plans";
import {
  useMemberOffers,
  OFFER_BUCKET,
  MAX_OFFER_FILE_SIZE,
  formatFileSize,
  type MemberOffer,
} from "@/hooks/use-member-offers";
import { Modal } from "./Modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function MemberOffers() {
  const { data: offers = [], isPending, error, refetch } = useMemberOffers(true);
  const cache = useQueryClient();
  const [editing, setEditing] = useState<MemberOffer | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const refresh = () => cache.invalidateQueries({ queryKey: ["member-offers"] });
  async function remove(offer: MemberOffer) {
    if (!confirm(`Excluir a oferta “${offer.title}” e seus arquivos?`)) return;
    setDeleting(offer.id);
    try {
      const { error } = await supabase.from("member_offers").delete().eq("id", offer.id);
      if (error) throw error;
      if (offer.member_offer_files.length) {
        const result = await supabase.storage
          .from(OFFER_BUCKET)
          .remove(offer.member_offer_files.map((f) => f.storage_path));
        if (result.error)
          toast.warning(
            "Oferta excluída. Alguns arquivos precisam ser removidos do armazenamento pelo administrador.",
          );
      }
      toast.success("Oferta excluída");
      await refresh();
    } catch {
      toast.error("Não foi possível excluir a oferta.");
    } finally {
      setDeleting(null);
    }
  }
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Ofertas para alunos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Disponibilize arquivos prontos e escolha os planos que podem acessá-los.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" />
          Nova oferta
        </Button>
      </header>
      {isPending ? (
        <p role="status">Carregando ofertas...</p>
      ) : error ? (
        <div role="alert">
          <p>Não foi possível carregar as ofertas. Tente novamente em instantes.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Package className="mx-auto mb-3 h-10 w-10 text-primary/50" />
          <h2 className="font-medium">Sua primeira oferta começa aqui</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adicione uma oferta com materiais para seus alunos baixarem.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((offer) => (
            <article
              key={offer.id}
              className="space-y-3 rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center justify-between">
                <Package className="h-6 w-6 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {offer.active ? "Publicada" : "Rascunho"}
                </span>
              </div>
              <h2 className="text-lg font-semibold">{offer.title}</h2>
              <p className="line-clamp-2 text-sm text-muted-foreground">{offer.description}</p>
              <p className="text-xs text-muted-foreground">
                {offerSummary(offer)} ·{" "}
                {offer.access_levels.join(", ") || "Nenhum plano"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(offer)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={deleting !== null}
                  onClick={() => remove(offer)}
                  aria-label={`Excluir ${offer.title}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
      {editing && (
        <OfferEditor
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function OfferEditor({
  initial,
  onClose,
  onSaved,
}: {
  initial: MemberOffer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { plans, loading } = usePlans();
  const cache = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [selected, setSelected] = useState<string[]>(initial?.access_levels ?? []);
  const [active, setActive] = useState(initial?.active ?? true);
  const [existing, setExisting] = useState(initial?.member_offer_files ?? []);
  const [files, setFiles] = useState<File[]>([]);
  const initialLinks = initial ? readOfferLinks(initial.links, initial.link_url) : [];
  const [mode, setMode] = useState<"files" | "link">(initialLinks.length ? "link" : "files");
  const [links, setLinks] = useState<OfferLink[]>(
    initialLinks.length ? initialLinks : [{ label: "", url: "" }],
  );
  const [prompts, setPrompts] = useState<OfferPrompt[]>(
    initial ? readOfferPrompts(initial.prompts) : [],
  );
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  function addFiles(list: FileList | null) {
    if (!list) return;
    const valid = Array.from(list).filter((file) => {
      if (file.size === 0 || file.size > MAX_OFFER_FILE_SIZE) {
        toast.error(`${file.name}: use um arquivo entre 1 byte e 50 MB.`);
        return false;
      }
      return true;
    });
    setFiles((prev) => [...prev, ...valid]);
  }
  async function save() {
    if (!title.trim()) return toast.error("Informe o título da oferta.");
    if (!selected.length) return toast.error("Selecione pelo menos um plano de acesso.");
    let cleanLinks: OfferLink[] = [];
    if (mode === "link") {
      const res = cleanOfferLinks(links);
      if (!res.ok)
        return toast.error(`Link ${res.row} inválido. Use um endereço começando com https://`);
      cleanLinks = res.links;
    }
    const cleanPrompts = cleanOfferPrompts(prompts);
    const hasMain = mode === "link" ? cleanLinks.length > 0 : files.length + existing.length > 0;
    if (active && !hasMain && !cleanPrompts.length)
      return toast.error(
        mode === "link"
          ? "Adicione pelo menos um link ou prompt para publicar."
          : "Adicione pelo menos um arquivo ou prompt para publicar.",
      );
    if (
      mode === "link" &&
      existing.length &&
      !confirm(`Usar link vai remover ${existing.length} arquivo(s) desta oferta. Continuar?`)
    )
      return;
    setBusy(true);
    const id = initial?.id ?? crypto.randomUUID();
    const uploaded: string[] = [];
    let created = false;
    let committed = false;
    try {
      if (!initial) {
        const result = await supabase
          .from("member_offers")
          .insert({ id, title: title.trim(), active: false, access_levels: selected });
        if (result.error) throw result.error;
        created = true;
      }
      const records = [];
      const toUpload = mode === "files" ? files : [];
      for (const [index, file] of toUpload.entries()) {
        setProgress(`Enviando arquivo ${index + 1} de ${toUpload.length}...`);
        const safeName =
          file.name
            .normalize("NFKD")
            .replace(/[^a-zA-Z0-9._-]/g, "-")
            .slice(-120) || "arquivo";
        const path = `${id}/${crypto.randomUUID()}-${safeName}`;
        const result = await supabase.storage
          .from(OFFER_BUCKET)
          .upload(path, file, { upsert: false });
        if (result.error) throw result.error;
        uploaded.push(path);
        records.push({ offer_id: id, name: file.name, storage_path: path, size: file.size });
      }
      if (records.length) {
        const result = await supabase.from("member_offer_files").insert(records);
        if (result.error) throw result.error;
      }
      const result = await supabase
        .from("member_offers")
        .update({
          title: title.trim(),
          description: description.trim(),
          active,
          access_levels: selected,
          link_url: null,
          links: cleanLinks,
          prompts: cleanPrompts,
        })
        .eq("id", id);
      if (result.error) throw result.error;
      committed = true;
      if (mode === "link" && existing.length) {
        const paths = existing.map((f) => f.storage_path);
        const del = await supabase.from("member_offer_files").delete().eq("offer_id", id);
        if (!del.error) {
          const cleanup = await supabase.storage.from(OFFER_BUCKET).remove(paths);
          if (cleanup.error)
            toast.warning("Arquivos desvinculados. Alguns precisam ser limpos no armazenamento.");
        }
      }
      toast.success("Oferta salva");
      onSaved();
    } catch (error) {
      if (!committed) {
        if (uploaded.length) {
          await supabase.from("member_offer_files").delete().in("storage_path", uploaded);
          const cleanup = await supabase.storage.from(OFFER_BUCKET).remove(uploaded);
          if (cleanup.error)
            toast.warning("Alguns envios incompletos precisam ser limpos no armazenamento.");
        }
        if (created) await supabase.from("member_offers").delete().eq("id", id);
      }
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a oferta. Tente novamente.",
      );
    } finally {
      setBusy(false);
      setProgress("");
    }
  }
  async function removeFile(fileId: string) {
    const file = existing.find((f) => f.id === fileId);
    if (!file || !confirm(`Remover o arquivo “${file.name}” agora?`)) return;
    if (initial?.active && existing.length === 1)
      return toast.error("Despublique a oferta antes de remover o último arquivo.");
    setBusy(true);
    try {
      const result = await supabase.from("member_offer_files").delete().eq("id", file.id);
      if (result.error) throw result.error;
      setExisting((prev) => prev.filter((f) => f.id !== file.id));
      const cleanup = await supabase.storage.from(OFFER_BUCKET).remove([file.storage_path]);
      if (cleanup.error)
        toast.warning("Arquivo desvinculado. Remova o objeto do armazenamento pelo painel.");
      await cache.invalidateQueries({ queryKey: ["member-offers"] });
      toast.success("Arquivo removido");
    } catch {
      toast.error("Não foi possível remover o arquivo.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title={initial ? "Editar oferta" : "Nova oferta"}
      description="Arquivos ou link, liberados apenas para os planos selecionados."
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={busy || loading} onClick={save}>
            {busy ? progress || "Salvando..." : "Salvar oferta"}
          </Button>
        </>
      }
    >
      <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
        <div className="space-y-2">
          <label htmlFor="offer-title" className="text-sm">
            Título *
          </label>
          <Input
            id="offer-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            placeholder="Ex: Oferta pronta — Kit de criativos"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="offer-description" className="text-sm">
            Descrição
          </label>
          <Textarea
            id="offer-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Explique o que está incluído e como usar."
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Planos com acesso *</legend>
          {loading ? (
            <p className="text-sm">Carregando planos...</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {[...plans]
                .sort((a, b) => (a.level ?? 0) - (b.level ?? 0))
                .map((plan) => (
                  <label
                    key={plan.id}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="accent-primary"
                      checked={selected.includes(plan.slug)}
                      onChange={(e) =>
                        setSelected((prev) =>
                          e.target.checked
                            ? [...prev, plan.slug]
                            : prev.filter((s) => s !== plan.slug),
                        )
                      }
                    />
                    {plan.name}
                  </label>
                ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Marque todos os planos que podem ver e baixar esta oferta, como na seleção de acesso dos
            cursos.
          </p>
        </fieldset>
        <div className="space-y-2">
          <p className="text-sm font-medium">Conteúdo da oferta</p>
          <div
            role="radiogroup"
            aria-label="Tipo de conteúdo"
            className="inline-flex rounded-xl border border-border bg-muted/30 p-1"
          >
            {(
              [
                { key: "files", label: "Arquivos", Icon: Upload },
                { key: "link", label: "Link", Icon: LinkIcon },
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={mode === key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm transition-colors ${
                  mode === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
        {mode === "link" ? (
          <div className="space-y-2">
            {links.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Tag do link ${i + 1}`}
                  value={row.label}
                  maxLength={MAX_OFFER_LABEL}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)),
                    )
                  }
                  placeholder="Tag (ex: Drive)"
                  className="w-36 shrink-0"
                  autoComplete="off"
                />
                <Input
                  aria-label={`Endereço do link ${i + 1}`}
                  type="url"
                  inputMode="url"
                  value={row.url}
                  onChange={(e) =>
                    setLinks((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)),
                    )
                  }
                  placeholder="https://..."
                  autoComplete="off"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover link ${i + 1}`}
                  onClick={() =>
                    setLinks((prev) =>
                      prev.length === 1 ? [{ label: "", url: "" }] : prev.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLinks((prev) => [...prev, { label: "", url: "" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar link
            </Button>
            <p className="text-xs text-muted-foreground">
              A tag mostra ao aluno do que se trata cada link (Drive, Página de vendas, Canva…).
              {existing.length > 0 &&
                ` Ao salvar, os ${existing.length} arquivo(s) atuais serão removidos.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <label
              htmlFor="offer-files"
              className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm"
            >
              <Upload className="h-4 w-4" />
              Adicionar arquivos (até 50 MB por arquivo)
            </label>
            <input
              id="offer-files"
              type="file"
              multiple
              className="sr-only"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {existing.map((file) => (
              <div key={file.id} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {file.name} · {formatFileSize(file.size)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover ${file.name}`}
                  onClick={() => removeFile(file.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {file.name} · {formatFileSize(file.size)} · Novo
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Cancelar envio de ${file.name}`}
                  onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Prompts para copiar</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPrompts((prev) => [...prev, { title: "", text: "" }])}
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar prompt
            </Button>
          </div>
          {prompts.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Opcional. O aluno verá cada prompt com um botão “Copiar”.
            </p>
          )}
          {prompts.map((row, i) => (
            <div key={i} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 shrink-0 text-primary/70" />
                <Input
                  aria-label={`Título do prompt ${i + 1}`}
                  value={row.title}
                  maxLength={120}
                  onChange={(e) =>
                    setPrompts((prev) =>
                      prev.map((r, j) => (j === i ? { ...r, title: e.target.value } : r)),
                    )
                  }
                  placeholder="Título (ex: Copy do anúncio)"
                  autoComplete="off"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Remover prompt ${i + 1}`}
                  onClick={() => setPrompts((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                aria-label={`Texto do prompt ${i + 1}`}
                value={row.text}
                rows={4}
                onChange={(e) =>
                  setPrompts((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, text: e.target.value } : r)),
                  )
                }
                placeholder="Cole aqui o prompt que o aluno vai copiar."
                className="font-mono text-xs"
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={active}
            className="accent-primary"
            onChange={(e) => setActive(e.target.checked)}
          />
          Publicar para os alunos dos planos selecionados
        </label>
      </fieldset>
    </Modal>
  );
}
