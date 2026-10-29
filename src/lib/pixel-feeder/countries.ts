export interface CountryMeta {
  code: string;
  name: string;
  defaultCurrency: string;
  aliases: string[];
}

export const COUNTRIES_CATALOG: CountryMeta[] = [
  // América do Sul
  { code: "BR", name: "Brasil", defaultCurrency: "BRL", aliases: ["brasil", "brazil", "br", "bra"] },
  { code: "AR", name: "Argentina", defaultCurrency: "ARS", aliases: ["argentina", "ar", "arg"] },
  { code: "CL", name: "Chile", defaultCurrency: "CLP", aliases: ["chile", "cl", "chl"] },
  { code: "CO", name: "Colômbia", defaultCurrency: "COP", aliases: ["colombia", "co", "col"] },
  { code: "PE", name: "Peru", defaultCurrency: "PEN", aliases: ["peru", "pe", "per"] },
  { code: "UY", name: "Uruguai", defaultCurrency: "UYU", aliases: ["uruguai", "uruguay", "uy"] },
  { code: "PY", name: "Paraguai", defaultCurrency: "PYG", aliases: ["paraguai", "paraguay", "py"] },
  { code: "BO", name: "Bolívia", defaultCurrency: "BOB", aliases: ["bolivia", "bo"] },
  { code: "EC", name: "Equador", defaultCurrency: "USD", aliases: ["equador", "ecuador", "ec"] },
  { code: "VE", name: "Venezuela", defaultCurrency: "USD", aliases: ["venezuela", "ve"] },

  // América do Norte & Central
  { code: "US", name: "Estados Unidos", defaultCurrency: "USD", aliases: ["estados unidos", "eua", "usa", "us", "america", "united states"] },
  { code: "CA", name: "Canadá", defaultCurrency: "CAD", aliases: ["canada", "ca", "can"] },
  { code: "MX", name: "México", defaultCurrency: "MXN", aliases: ["mexico", "mx", "mejico"] },
  { code: "PA", name: "Panamá", defaultCurrency: "USD", aliases: ["panama", "pa"] },
  { code: "CR", name: "Costa Rica", defaultCurrency: "CRC", aliases: ["costa rica", "cr"] },
  { code: "DO", name: "República Dominicana", defaultCurrency: "DOP", aliases: ["republica dominicana", "do", "dominicana"] },
  { code: "PR", name: "Porto Rico", defaultCurrency: "USD", aliases: ["porto rico", "puerto rico", "pr"] },
  { code: "GT", name: "Guatemala", defaultCurrency: "GTQ", aliases: ["guatemala", "gt"] },
  { code: "HN", name: "Honduras", defaultCurrency: "HNL", aliases: ["honduras", "hn"] },
  { code: "SV", name: "El Salvador", defaultCurrency: "USD", aliases: ["el salvador", "sv"] },

  // Europa
  { code: "PT", name: "Portugal", defaultCurrency: "EUR", aliases: ["portugal", "pt", "prt"] },
  { code: "ES", name: "Espanha", defaultCurrency: "EUR", aliases: ["espanha", "spain", "es", "espana"] },
  { code: "GB", name: "Reino Unido", defaultCurrency: "GBP", aliases: ["reino unido", "uk", "gb", "inglaterra", "england", "united kingdom"] },
  { code: "FR", name: "França", defaultCurrency: "EUR", aliases: ["franca", "france", "fr"] },
  { code: "IT", name: "Itália", defaultCurrency: "EUR", aliases: ["italia", "italy", "it"] },
  { code: "DE", name: "Alemanha", defaultCurrency: "EUR", aliases: ["alemanha", "germany", "de", "deutschland"] },
  { code: "IE", name: "Irlanda", defaultCurrency: "EUR", aliases: ["irlanda", "ireland", "ie"] },
  { code: "NL", name: "Holanda / Países Baixos", defaultCurrency: "EUR", aliases: ["holanda", "paises baixos", "netherlands", "nl"] },
  { code: "BE", name: "Bélgica", defaultCurrency: "EUR", aliases: ["belgica", "belgium", "be"] },
  { code: "CH", name: "Suíça", defaultCurrency: "CHF", aliases: ["suica", "switzerland", "ch"] },
  { code: "AT", name: "Áustria", defaultCurrency: "EUR", aliases: ["austria", "at"] },
  { code: "SE", name: "Suécia", defaultCurrency: "SEK", aliases: ["suecia", "sweden", "se"] },
  { code: "NO", name: "Noruega", defaultCurrency: "NOK", aliases: ["noruega", "norway", "no"] },
  { code: "DK", name: "Dinamarca", defaultCurrency: "DKK", aliases: ["dinamarca", "denmark", "dk"] },
  { code: "FI", name: "Finlândia", defaultCurrency: "EUR", aliases: ["finlandia", "finland", "fi"] },
  { code: "PL", name: "Polônia", defaultCurrency: "PLN", aliases: ["polonia", "poland", "pl"] },
  { code: "RO", name: "Romênia", defaultCurrency: "RON", aliases: ["romenia", "romania", "ro"] },
  { code: "GR", name: "Grécia", defaultCurrency: "EUR", aliases: ["grecia", "greece", "gr"] },
  { code: "CZ", name: "República Tcheca", defaultCurrency: "CZK", aliases: ["republica tcheca", "czechia", "cz"] },
  { code: "HU", name: "Hungria", defaultCurrency: "HUF", aliases: ["hungria", "hungary", "hu"] },
  { code: "HR", name: "Croácia", defaultCurrency: "EUR", aliases: ["croacia", "croatia", "hr"] },
  { code: "UA", name: "Ucrânia", defaultCurrency: "UAH", aliases: ["ucrania", "ukraine", "ua"] },
  { code: "LU", name: "Luxemburgo", defaultCurrency: "EUR", aliases: ["luxemburgo", "luxembourg", "lu"] },

  // Ásia & Oriente Médio
  { code: "JP", name: "Japão", defaultCurrency: "JPY", aliases: ["japao", "japan", "jp"] },
  { code: "KR", name: "Coreia do Sul", defaultCurrency: "KRW", aliases: ["coreia do sul", "korea", "kr", "south korea"] },
  { code: "CN", name: "China", defaultCurrency: "CNY", aliases: ["china", "cn"] },
  { code: "IN", name: "Índia", defaultCurrency: "INR", aliases: ["india", "in"] },
  { code: "IL", name: "Israel", defaultCurrency: "ILS", aliases: ["israel", "il"] },
  { code: "AE", name: "Emirados Árabes Unidos", defaultCurrency: "AED", aliases: ["emirados arabes", "dubai", "uae", "ae"] },
  { code: "SA", name: "Arábia Saudita", defaultCurrency: "SAR", aliases: ["arabia saudita", "saudi arabia", "sa"] },
  { code: "SG", name: "Singapura", defaultCurrency: "SGD", aliases: ["singapura", "singapore", "sg"] },
  { code: "ID", name: "Indonésia", defaultCurrency: "IDR", aliases: ["indonesia", "id"] },
  { code: "TH", name: "Tailândia", defaultCurrency: "THB", aliases: ["tailandia", "thailand", "th"] },
  { code: "MY", name: "Malásia", defaultCurrency: "MYR", aliases: ["malasia", "malaysia", "my"] },
  { code: "PH", name: "Filipinas", defaultCurrency: "PHP", aliases: ["filipinas", "philippines", "ph"] },
  { code: "VN", name: "Vietnã", defaultCurrency: "VND", aliases: ["vietna", "vietnam", "vn"] },
  { code: "TR", name: "Turquia", defaultCurrency: "TRY", aliases: ["turquia", "turkey", "tr"] },
  { code: "QA", name: "Catar", defaultCurrency: "QAR", aliases: ["catar", "qatar", "qa"] },
  { code: "KW", name: "Kuwait", defaultCurrency: "KWD", aliases: ["kuwait", "kw"] },

  // Oceania
  { code: "AU", name: "Austrália", defaultCurrency: "AUD", aliases: ["australia", "au", "aus"] },
  { code: "NZ", name: "Nova Zelândia", defaultCurrency: "NZD", aliases: ["nova zelandia", "new zealand", "nz"] },

  // África
  { code: "ZA", name: "África do Sul", defaultCurrency: "ZAR", aliases: ["africa do sul", "south africa", "za"] },
  { code: "AO", name: "Angola", defaultCurrency: "AOA", aliases: ["angola", "ao"] },
  { code: "MZ", name: "Moçambique", defaultCurrency: "MZN", aliases: ["mocambique", "mozambique", "mz"] },
  { code: "CV", name: "Cabo Verde", defaultCurrency: "CVE", aliases: ["cabo verde", "cv"] },
  { code: "NG", name: "Nigéria", defaultCurrency: "NGN", aliases: ["nigeria", "ng"] },
  { code: "EG", name: "Egito", defaultCurrency: "EGP", aliases: ["egito", "egypt", "eg"] },
  { code: "MA", name: "Marrocos", defaultCurrency: "MAD", aliases: ["marrocos", "morocco", "ma"] },
  { code: "KE", name: "Quênia", defaultCurrency: "KES", aliases: ["quenia", "kenya", "ke"] },
  { code: "GH", name: "Gana", defaultCurrency: "GHS", aliases: ["gana", "ghana", "gh"] },

  // Mais países globais
  { code: "RU", name: "Rússia", defaultCurrency: "RUB", aliases: ["russia", "ru"] },
  { code: "IS", name: "Islândia", defaultCurrency: "ISK", aliases: ["islandia", "iceland", "is"] },
  { code: "EE", name: "Estônia", defaultCurrency: "EUR", aliases: ["estonia", "ee"] },
  { code: "LV", name: "Letônia", defaultCurrency: "EUR", aliases: ["letonia", "lv"] },
  { code: "LT", name: "Lituânia", defaultCurrency: "EUR", aliases: ["lituania", "lt"] },
  { code: "SK", name: "Eslováquia", defaultCurrency: "EUR", aliases: ["eslovaquia", "sk"] },
  { code: "SI", name: "Eslovênia", defaultCurrency: "EUR", aliases: ["eslovenia", "si"] },
  { code: "BG", name: "Bulgária", defaultCurrency: "BGN", aliases: ["bulgaria", "bg"] },
  { code: "RS", name: "Sérvia", defaultCurrency: "RSD", aliases: ["servia", "rs"] },
  { code: "CY", name: "Chipre", defaultCurrency: "EUR", aliases: ["chipre", "cyprus", "cy"] },
  { code: "MT", name: "Malta", defaultCurrency: "EUR", aliases: ["malta", "mt"] },
  { code: "HK", name: "Hong Kong", defaultCurrency: "HKD", aliases: ["hong kong", "hk"] },
  { code: "TW", name: "Taiwan", defaultCurrency: "TWD", aliases: ["taiwan", "tw"] },
  { code: "TN", name: "Tunísia", defaultCurrency: "TND", aliases: ["tunisia", "tn"] },
  { code: "DZ", name: "Argélia", defaultCurrency: "DZD", aliases: ["argelia", "algeria", "dz"] },
  { code: "SN", name: "Senegal", defaultCurrency: "XOF", aliases: ["senegal", "sn"] },
  { code: "CI", name: "Costa do Marfim", defaultCurrency: "XOF", aliases: ["costa do marfim", "ivory coast", "ci"] },
  { code: "PK", name: "Paquistão", defaultCurrency: "PKR", aliases: ["paquistao", "pakistan", "pk"] },
  { code: "BD", name: "Bangladesh", defaultCurrency: "BDT", aliases: ["bangladesh", "bd"] },
  { code: "LK", name: "Sri Lanka", defaultCurrency: "LKR", aliases: ["sri lanka", "lk"] },
  { code: "NP", name: "Nepal", defaultCurrency: "NPR", aliases: ["nepal", "np"] },
  { code: "KZ", name: "Cazaquistão", defaultCurrency: "KZT", aliases: ["cazaquistao", "kazakhstan", "kz"] },
  { code: "UZ", name: "Uzbequistão", defaultCurrency: "UZS", aliases: ["uzbequistao", "uzbekistan", "uz"] },
  { code: "GE", name: "Geórgia", defaultCurrency: "GEL", aliases: ["georgia", "ge"] },
  { code: "AM", name: "Armênia", defaultCurrency: "AMD", aliases: ["armenia", "am"] },
  { code: "AZ", name: "Azerbaijão", defaultCurrency: "AZN", aliases: ["azerbaijao", "azerbaijan", "az"] },
  { code: "OM", name: "Omã", defaultCurrency: "OMR", aliases: ["oma", "oman", "om"] },
  { code: "BH", name: "Bahrein", defaultCurrency: "BHD", aliases: ["bahrein", "bahrain", "bh"] },
  { code: "JO", name: "Jordânia", defaultCurrency: "JOD", aliases: ["jordania", "jordan", "jo"] },
  { code: "LB", name: "Líbano", defaultCurrency: "USD", aliases: ["libano", "lebanon", "lb"] },
  { code: "JM", name: "Jamaica", defaultCurrency: "JMD", aliases: ["jamaica", "jm"] },
  { code: "TT", name: "Trinidad e Tobago", defaultCurrency: "TTD", aliases: ["trinidad", "tt"] },
  { code: "BS", name: "Bahamas", defaultCurrency: "USD", aliases: ["bahamas", "bs"] },
  { code: "BB", name: "Barbados", defaultCurrency: "BBD", aliases: ["barbados", "bb"] },
  { code: "CU", name: "Cuba", defaultCurrency: "USD", aliases: ["cuba", "cu"] },
  { code: "NI", name: "Nicarágua", defaultCurrency: "NIO", aliases: ["nicaragua", "ni"] },
  { code: "BO", name: "Bolívia", defaultCurrency: "BOB", aliases: ["bolivia", "bo"] },
  { code: "PY", name: "Paraguai", defaultCurrency: "PYG", aliases: ["paraguai", "py"] },
  { code: "GY", name: "Guiana", defaultCurrency: "GYD", aliases: ["guiana", "guyana", "gy"] },
  { code: "SR", name: "Suriname", defaultCurrency: "SRD", aliases: ["suriname", "sr"] },
];

export function cleanString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

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
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }
  return matrix[bn][an];
}

export function matchCountry(term: string): CountryMeta | null {
  const clean = cleanString(term);
  if (!clean || clean.length < 2) return null;

  // 1. Exact match code or name
  for (const c of COUNTRIES_CATALOG) {
    if (c.code.toLowerCase() === clean) return c;
    if (cleanString(c.name) === clean) return c;
  }

  // 2. Exact match alias
  for (const c of COUNTRIES_CATALOG) {
    for (const alias of c.aliases) {
      if (cleanString(alias) === clean) return c;
    }
  }

  // 3. Substring match
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

  // 4. Fuzzy Levenshtein match
  let bestMatch: CountryMeta | null = null;
  let minDistance = 999;

  for (const c of COUNTRIES_CATALOG) {
    const targets = [c.name, ...c.aliases];
    for (const t of targets) {
      const cleanT = cleanString(t);
      const dist = levenshtein(clean, cleanT);
      const maxAllowed = clean.length <= 3 ? 1 : clean.length <= 6 ? 2 : 3;
      if (dist <= maxAllowed && dist < minDistance) {
        minDistance = dist;
        bestMatch = c;
      }
    }
  }

  return bestMatch;
}

export function parseCountriesQuery(query: string): string[] {
  if (!query || !query.trim()) return [];
  const parts = query.split(/[,;\n|]+/);
  const matchedCodes = new Set<string>();

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
