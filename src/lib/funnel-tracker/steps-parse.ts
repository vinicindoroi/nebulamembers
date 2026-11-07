export type ParsedStep = { key: string; label: string; manualKey?: boolean };

export const stepSlug = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);

const norm = (v: string) => stepSlug(v);

/**
 * Converte "Etapa A, Etapa B, Etapa C" (vírgula, ponto e vírgula ou quebra de linha)
 * em etapas ordenadas. Aceita "Rótulo = chave" para fixar a chave.
 * Reaproveita a chave de etapas existentes com o mesmo nome (ou mesma chave) para
 * não quebrar o rastreio já instalado, e evita chaves duplicadas.
 */
export function parseStepList(text: string, existing: ParsedStep[] = []): ParsedStep[] {
  const parts = text
    .split(/[,;\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const byLabel = new Map<string, string>();
  for (const e of existing) {
    if (e.key && e.label) byLabel.set(norm(e.label), e.key);
  }

  const used = new Set<string>();
  const out: ParsedStep[] = [];
  for (const part of parts) {
    const [rawLabel, rawKey] = part.split("=").map((s) => s.trim());
    const label = rawLabel ?? "";
    if (!label) continue;
    let key = rawKey ? stepSlug(rawKey) : "";
    if (!key) key = byLabel.get(norm(label)) ?? stepSlug(label);
    if (!key) continue;
    let unique = key;
    let n = 2;
    while (used.has(unique)) unique = `${key}_${n++}`.slice(0, 60);
    used.add(unique);
    out.push({ label, key: unique, manualKey: true });
  }
  return out;
}
