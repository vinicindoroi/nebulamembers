import { SupportedCountry, SupportedCurrency } from "./types";

export interface CountryMeta {
  code: SupportedCountry;
  name: string;
  defaultCurrency: SupportedCurrency;
  aliases: string[];
}

export const COUNTRIES_CATALOG: CountryMeta[] = [
  {
    code: "BR",
    name: "Brasil",
    defaultCurrency: "BRL",
    aliases: ["brasil", "brazil", "br", "bra", "brs", "brazilian", "brasileiro"],
  },
  {
    code: "US",
    name: "Estados Unidos",
    defaultCurrency: "USD",
    aliases: [
      "estados unidos",
      "eua",
      "usa",
      "us",
      "united states",
      "america",
      "estadosunidos",
      "american",
      "estados unids",
      "estadus unidos",
    ],
  },
  {
    code: "PT",
    name: "Portugal",
    defaultCurrency: "EUR",
    aliases: ["portugal", "pt", "prt", "portugues", "portuga", "portugual"],
  },
  {
    code: "ES",
    name: "Espanha",
    defaultCurrency: "EUR",
    aliases: ["espanha", "spain", "es", "esp", "espana", "hespanha", "espanhol"],
  },
  {
    code: "GB",
    name: "Reino Unido",
    defaultCurrency: "GBP",
    aliases: [
      "reino unido",
      "uk",
      "gb",
      "gbr",
      "inglaterra",
      "england",
      "great britain",
      "gra bretanha",
      "united kingdom",
      "reinounido",
    ],
  },
  {
    code: "FR",
    name: "França",
    defaultCurrency: "EUR",
    aliases: ["franca", "france", "fr", "fra", "frances"],
  },
  {
    code: "MX",
    name: "México",
    defaultCurrency: "MXN",
    aliases: ["mexico", "mx", "mex", "mejico", "mexicano"],
  },
  {
    code: "IT",
    name: "Itália",
    defaultCurrency: "EUR",
    aliases: ["italia", "italy", "it", "ita", "italiano"],
  },
  {
    code: "DE",
    name: "Alemanha",
    defaultCurrency: "EUR",
    aliases: ["alemanha", "germany", "de", "deu", "deutschland", "alemao", "ger"],
  },
  {
    code: "CA",
    name: "Canadá",
    defaultCurrency: "CAD",
    aliases: ["canada", "ca", "can", "canadense"],
  },
  {
    code: "AU",
    name: "Austrália",
    defaultCurrency: "AUD",
    aliases: ["australia", "au", "aus", "australiano"],
  },
  {
    code: "AR",
    name: "Argentina",
    defaultCurrency: "ARS",
    aliases: ["argentina", "ar", "arg", "argentino"],
  },
  {
    code: "CL",
    name: "Chile",
    defaultCurrency: "CLP",
    aliases: ["chile", "cl", "chl", "chileno"],
  },
  {
    code: "CO",
    name: "Colômbia",
    defaultCurrency: "COP",
    aliases: ["colombia", "co", "col", "colombiano"],
  },
];

// Clean accents and symbols for comparison
export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Levenshtein distance for typo tolerance
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) matrix[0][j] = j;

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1), // insertion / deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Finds the best matching country from an arbitrary string query (with typos allowed).
 */
export function matchCountry(term: string): CountryMeta | null {
  const clean = cleanString(term);
  if (!clean || clean.length < 2) return null;

  // 1. Exact match on code or name
  for (const c of COUNTRIES_CATALOG) {
    if (c.code.toLowerCase() === clean) return c;
    if (cleanString(c.name) === clean) return c;
  }

  // 2. Exact match on any alias
  for (const c of COUNTRIES_CATALOG) {
    for (const alias of c.aliases) {
      if (cleanString(alias) === clean) return c;
    }
  }

  // 3. Substring match (if term is at least 3 chars)
  if (clean.length >= 3) {
    for (const c of COUNTRIES_CATALOG) {
      if (cleanString(c.name).includes(clean) || clean.includes(cleanString(c.name))) {
        return c;
      }
      for (const alias of c.aliases) {
        if (cleanString(alias).includes(clean) || (clean.length >= 4 && clean.includes(cleanString(alias)))) {
          return c;
        }
      }
    }
  }

  // 4. Fuzzy Levenshtein match (typo tolerance)
  let bestMatch: CountryMeta | null = null;
  let minDistance = 999;

  for (const c of COUNTRIES_CATALOG) {
    const targets = [c.name, ...c.aliases];
    for (const t of targets) {
      const cleanT = cleanString(t);
      const dist = levenshtein(clean, cleanT);
      // Tolerance threshold: distance <= 2 for words >= 4 chars, distance <= 1 for 3 chars
      const maxAllowed = clean.length <= 3 ? 1 : clean.length <= 6 ? 2 : 3;
      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestMatch = c;
      }
    }
  }

  return bestMatch;
}

/**
 * Parses a comma-separated or space-separated list of countries (e.g. "brasil, eua, portuga, espanha")
 * Returns an array of unique matched SupportedCountry codes.
 */
export function parseCountriesQuery(query: string): SupportedCountry[] {
  if (!query || !query.trim()) return [];

  // Split by commas, semicolons, pipes, or newlines
  const parts = query.split(/[,;\n|]+/);
  const matchedCodes = new Set<SupportedCountry>();

  for (const rawPart of parts) {
    const trimmed = rawPart.trim();
    if (!trimmed) continue;

    const matched = matchCountry(trimmed);
    if (matched) {
      matchedCodes.add(matched.code);
    }
  }

  return Array.from(matchedCodes);
}
