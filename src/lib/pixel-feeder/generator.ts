import {
  GenderFilter,
  GeneratedCustomer,
  HashedUserData,
  MetaEventPayload,
  PixelEventName,
  SupportedCountry,
  SupportedCurrency,
} from "./types";
import {
  generateEventId,
  generateFbc,
  generateFbp,
  normalizeCity,
  normalizeCountry,
  normalizeEmail,
  normalizeName,
  normalizePhone,
  normalizeState,
  normalizeZip,
  sha256,
} from "./crypto";

interface CountryData {
  phonePrefix: string;
  phoneFormat: () => string;
  states: string[];
  cities: { city: string; state: string; zip: string }[];
  firstNamesFemale: string[];
  firstNamesMale: string[];
  lastNames: string[];
  ipRanges: string[];
  emailDomains: string[];
}

const COUNTRY_DATA: Record<SupportedCountry, CountryData> = {
  BR: {
    phonePrefix: "55",
    phoneFormat: () => {
      const ddds = ["11", "19", "21", "31", "41", "47", "51", "61", "71", "81", "85"];
      const ddd = ddds[Math.floor(Math.random() * ddds.length)];
      const num = Math.floor(900000000 + Math.random() * 99999999);
      return `55${ddd}${num}`;
    },
    states: ["sp", "rj", "mg", "pr", "sc", "rs", "ba", "df", "pe", "ce"],
    cities: [
      { city: "São Paulo", state: "sp", zip: "01310-100" },
      { city: "Campinas", state: "sp", zip: "13010-001" },
      { city: "Rio de Janeiro", state: "rj", zip: "20040-002" },
      { city: "Niterói", state: "rj", zip: "24020-005" },
      { city: "Belo Horizonte", state: "mg", zip: "30130-000" },
      { city: "Curitiba", state: "pr", zip: "80020-010" },
      { city: "Porto Alegre", state: "rs", zip: "90010-000" },
      { city: "Florianópolis", state: "sc", zip: "88010-000" },
      { city: "Salvador", state: "ba", zip: "40020-000" },
      { city: "Brasília", state: "df", zip: "70040-010" },
    ],
    firstNamesFemale: [
      "Ana", "Beatriz", "Camila", "Carolina", "Daniela", "Eduarda", "Fernanda", "Gabriela",
      "Isabela", "Juliana", "Larissa", "Mariana", "Natália", "Patricia", "Rafaela", "Vanessa",
    ],
    firstNamesMale: [
      "Alexandre", "Bruno", "Carlos", "Diego", "Eduardo", "Felipe", "Gabriel", "Guilherme",
      "Henrique", "Lucas", "Matheus", "Rodrigo", "Thiago", "Vinicius", "Vitor", "Leonardo",
    ],
    lastNames: [
      "Silva", "Santos", "Oliveira", "Souza", "Rodrigues", "Ferreira", "Alves", "Pereira",
      "Lima", "Gomes", "Costa", "Ribeiro", "Martins", "Carvalho", "Almeida", "Lopes",
    ],
    ipRanges: ["177.18.", "187.32.", "189.40.", "201.82.", "200.160.", "179.191."],
    emailDomains: ["gmail.com", "outlook.com", "hotmail.com", "uol.com.br", "yahoo.com.br"],
  },
  US: {
    phonePrefix: "1",
    phoneFormat: () => {
      const areaCodes = ["212", "310", "415", "305", "702", "512", "206", "312", "404", "617"];
      const area = areaCodes[Math.floor(Math.random() * areaCodes.length)];
      const num = Math.floor(2000000 + Math.random() * 7999999);
      return `1${area}${num}`;
    },
    states: ["ca", "ny", "tx", "fl", "il", "wa", "ma", "nv"],
    cities: [
      { city: "Los Angeles", state: "ca", zip: "90001" },
      { city: "San Francisco", state: "ca", zip: "94102" },
      { city: "New York", state: "ny", zip: "10001" },
      { city: "Austin", state: "tx", zip: "78701" },
      { city: "Miami", state: "fl", zip: "33101" },
      { city: "Chicago", state: "il", zip: "60601" },
      { city: "Seattle", state: "wa", zip: "98101" },
      { city: "Boston", state: "ma", zip: "02108" },
    ],
    firstNamesFemale: [
      "Emma", "Olivia", "Sophia", "Ava", "Isabella", "Mia", "Harper", "Evelyn",
      "Abigail", "Emily", "Ella", "Elizabeth", "Camila", "Luna", "Sofia", "Avery",
    ],
    firstNamesMale: [
      "Liam", "Noah", "Oliver", "James", "Elijah", "William", "Henry", "Lucas",
      "Benjamin", "Theodore", "Mateo", "Levi", "Sebastian", "Daniel", "Jack", "Alexander",
    ],
    lastNames: [
      "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
      "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
    ],
    ipRanges: ["67.180.", "72.14.", "98.139.", "108.162.", "174.129.", "198.51."],
    emailDomains: ["gmail.com", "yahoo.com", "icloud.com", "outlook.com", "comcast.net"],
  },
  PT: {
    phonePrefix: "351",
    phoneFormat: () => {
      const prefixes = ["91", "92", "93", "96"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(1000000 + Math.random() * 8999999);
      return `351${prefix}${num}`;
    },
    states: ["lisboa", "porto", "braga", "setubal", "faro", "aveiro"],
    cities: [
      { city: "Lisboa", state: "lisboa", zip: "1000-001" },
      { city: "Porto", state: "porto", zip: "4000-001" },
      { city: "Braga", state: "braga", zip: "4700-001" },
      { city: "Coimbra", state: "coimbra", zip: "3000-001" },
      { city: "Faro", state: "faro", zip: "8000-001" },
      { city: "Setúbal", state: "setubal", zip: "2900-001" },
    ],
    firstNamesFemale: [
      "Maria", "Leonor", "Matilde", "Beatriz", "Carolina", "Mariana", "Ana", "Inês",
      "Margarida", "Sofia", "Lara", "Laura", "Francisca", "Alice", "Camila", "Clara",
    ],
    firstNamesMale: [
      "Francisco", "Afonso", "João", "Tomas", "Duarte", "Lourenço", "Rodrigo", "Martim",
      "Santiago", "Guilherme", "Gabriel", "Lucas", "Tiago", "Pedro", "Manuel", "Miguel",
    ],
    lastNames: [
      "Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins",
      "Jesus", "Sousa", "Fernandes", "Gonçalves", "Gomes", "Lopes", "Marques", "Alves",
    ],
    ipRanges: ["85.240.", "89.152.", "94.60.", "188.82.", "213.13."],
    emailDomains: ["gmail.com", "sapo.pt", "hotmail.com", "outlook.pt", "icloud.com"],
  },
  ES: {
    phonePrefix: "34",
    phoneFormat: () => {
      const prefixes = ["6", "7"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(10000000 + Math.random() * 89999999);
      return `34${prefix}${num}`;
    },
    states: ["madrid", "cataluna", "andalucia", "valencia", "galicia"],
    cities: [
      { city: "Madrid", state: "madrid", zip: "28001" },
      { city: "Barcelona", state: "cataluna", zip: "08001" },
      { city: "Valencia", state: "valencia", zip: "46001" },
      { city: "Sevilla", state: "andalucia", zip: "41001" },
      { city: "Zaragoza", state: "aragon", zip: "50001" },
      { city: "Málaga", state: "andalucia", zip: "29001" },
    ],
    firstNamesFemale: [
      "Lucia", "Sofia", "Martina", "Maria", "Paula", "Julia", "Emma", "Valeria",
      "Daniela", "Alba", "Sara", "Carla", "Carmen", "Noa", "Claudia", "Elena",
    ],
    firstNamesMale: [
      "Hugo", "Mateo", "Martin", "Lucas", "Leo", "Daniel", "Alejandro", "Manuel",
      "Pablo", "Alvaro", "Adrian", "Enzo", "Mario", "Diego", "David", "Oliver",
    ],
    lastNames: [
      "Garcia", "Rodriguez", "Gonzalez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Perez",
      "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez", "Diaz", "Moreno", "Muñoz",
    ],
    ipRanges: ["80.24.", "83.32.", "88.0.", "95.16.", "212.145."],
    emailDomains: ["gmail.com", "hotmail.es", "yahoo.es", "outlook.es"],
  },
  GB: {
    phonePrefix: "44",
    phoneFormat: () => {
      const num = Math.floor(7000000000 + Math.random() * 999999999);
      return `44${num}`;
    },
    states: ["england", "scotland", "wales"],
    cities: [
      { city: "London", state: "england", zip: "SW1A 1AA" },
      { city: "Manchester", state: "england", zip: "M1 1AE" },
      { city: "Birmingham", state: "england", zip: "B1 1BB" },
      { city: "Leeds", state: "england", zip: "LS1 1BA" },
      { city: "Glasgow", state: "scotland", zip: "G1 1DA" },
      { city: "Liverpool", state: "england", zip: "L1 1DP" },
    ],
    firstNamesFemale: [
      "Olivia", "Amelia", "Isla", "Ava", "Mia", "Ivy", "Lily", "Freya",
      "Florence", "Rosie", "Sophia", "Grace", "Phoebe", "Sienna", "Poppy", "Emily",
    ],
    firstNamesMale: [
      "Noah", "Oliver", "George", "Arthur", "Muhammad", "Leo", "Harry", "Oscar",
      "Archie", "Henry", "Jack", "Charlie", "Freddie", "Alfie", "Jacob", "Thomas",
    ],
    lastNames: [
      "Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies",
      "Robinson", "Wright", "Thompson", "Evans", "Walker", "White", "Roberts", "Green",
    ],
    ipRanges: ["81.130.", "86.12.", "90.192.", "151.224.", "212.58."],
    emailDomains: ["gmail.com", "hotmail.co.uk", "yahoo.co.uk", "btinternet.com", "sky.com"],
  },
  FR: {
    phonePrefix: "33",
    phoneFormat: () => {
      const prefixes = ["6", "7"];
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(10000000 + Math.random() * 89999999);
      return `33${prefix}${num}`;
    },
    states: ["ile-de-france", "auvergne-rhone-alpes", "provence-alpes-cote-d-azur"],
    cities: [
      { city: "Paris", state: "ile-de-france", zip: "75001" },
      { city: "Lyon", state: "auvergne-rhone-alpes", zip: "69001" },
      { city: "Marseille", state: "provence-alpes-cote-d-azur", zip: "13001" },
      { city: "Toulouse", state: "occitanie", zip: "31000" },
      { city: "Nice", state: "provence-alpes-cote-d-azur", zip: "06000" },
      { city: "Nantes", state: "pays-de-la-loire", zip: "44000" },
    ],
    firstNamesFemale: [
      "Jade", "Louise", "Emma", "Ambre", "Alice", "Rose", "Anna", "Alba",
      "Romy", "Mia", "Lina", "Chloe", "Lou", "Julia", "Lea", "Agathe",
    ],
    firstNamesMale: [
      "Gabriel", "Leo", "Raphael", "Louis", "Arthur", "Jules", "Mael", "Noah",
      "Adam", "Lucas", "Hugo", "Gaspard", "Liam", "Sacha", "Paul", "Nathan",
    ],
    lastNames: [
      "Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois",
      "Moreau", "Laurent", "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David",
    ],
    ipRanges: ["82.224.", "88.160.", "90.84.", "92.103.", "194.2."],
    emailDomains: ["gmail.com", "orange.fr", "free.fr", "sfr.fr", "wanadoo.fr", "laposte.net"],
  },
  MX: {
    phonePrefix: "52",
    phoneFormat: () => {
      const num = Math.floor(5500000000 + Math.random() * 4499999999);
      return `52${num}`;
    },
    states: ["cdmx", "jalisco", "nuevo-leon", "puebla", "yucatan"],
    cities: [
      { city: "Ciudad de México", state: "cdmx", zip: "01000" },
      { city: "Guadalajara", state: "jalisco", zip: "44100" },
      { city: "Monterrey", state: "nuevo-leon", zip: "64000" },
      { city: "Puebla", state: "puebla", zip: "72000" },
      { city: "Mérida", state: "yucatan", zip: "97000" },
      { city: "Cancún", state: "quintana-roo", zip: "77500" },
    ],
    firstNamesFemale: [
      "Sofia", "Valentina", "Regina", "Maria Jose", "Ximena", "Camila", "Maria Fernanda",
      "Valeria", "Victoria", "Renata", "Natalia", "Daniela", "Romina", "Andrea",
    ],
    firstNamesMale: [
      "Santiago", "Mateo", "Sebastian", "Leonardo", "Matias", "Emiliano", "Diego",
      "Daniel", "Miguel Angel", "Alexander", "Alejandro", "Jesus", "Gael", "David",
    ],
    lastNames: [
      "Hernandez", "Garcia", "Martinez", "Lopez", "Gonzalez", "Perez", "Rodriguez", "Sanchez",
      "Ramirez", "Cruz", "Gomez", "Flores", "Morales", "Vazquez", "Reyes", "Jimenez",
    ],
    ipRanges: ["187.130.", "189.200.", "200.68.", "201.140."],
    emailDomains: ["gmail.com", "hotmail.com", "yahoo.com.mx", "outlook.com"],
  },
};

const USER_AGENTS = [
  // iPhone Safari
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
  // Android Chrome
  "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.113 Mobile Safari/537.36",
  "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36",
  // Windows Chrome
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
  // macOS Safari
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
];

const SAMPLE_PRODUCTS = [
  { id: "PROD-101", name: "Acesso Vitalício Black" },
  { id: "PROD-102", name: "Formação Especialista Pro" },
  { id: "PROD-103", name: "Mentoria Elite Alpha" },
  { id: "PROD-104", name: "Pack Templates Alta Conversão" },
  { id: "PROD-105", name: "Assinatura Anual VIP" },
];

export function generateCustomer(
  countryCode: SupportedCountry,
  genderFilter: GenderFilter = "all",
): GeneratedCustomer {
  const data = COUNTRY_DATA[countryCode] || COUNTRY_DATA.BR;

  // Decide gender
  let gender: "f" | "m" = "f";
  if (genderFilter === "female") {
    gender = "f";
  } else if (genderFilter === "male") {
    gender = "m";
  } else {
    gender = Math.random() > 0.5 ? "f" : "m";
  }

  const firstList = gender === "f" ? data.firstNamesFemale : data.firstNamesMale;
  const firstName = firstList[Math.floor(Math.random() * firstList.length)];
  const lastName = data.lastNames[Math.floor(Math.random() * data.lastNames.length)];

  // Email format
  const domain = data.emailDomains[Math.floor(Math.random() * data.emailDomains.length)];
  const randSuffix = Math.floor(10 + Math.random() * 899);
  const cleanFirst = normalizeName(firstName);
  const cleanLast = normalizeName(lastName);
  const email = `${cleanFirst}.${cleanLast}${randSuffix}@${domain}`;

  // Phone
  const phone = data.phoneFormat();

  // Location
  const loc = data.cities[Math.floor(Math.random() * data.cities.length)];

  // IP
  const ipPrefix = data.ipRanges[Math.floor(Math.random() * data.ipRanges.length)];
  const ip = `${ipPrefix}${Math.floor(1 + Math.random() * 250)}.${Math.floor(1 + Math.random() * 250)}`;

  // User Agent
  const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  return {
    firstName,
    lastName,
    email,
    phone,
    gender,
    city: loc.city,
    state: loc.state,
    zip: loc.zip,
    country: countryCode.toLowerCase(),
    ip,
    userAgent,
    fbp: generateFbp(),
    fbc: generateFbc(),
  };
}

export async function hashCustomerData(customer: GeneratedCustomer): Promise<HashedUserData> {
  const [emHash, phHash, fnHash, lnHash, geHash, ctHash, stHash, zpHash, countryHash] =
    await Promise.all([
      sha256(normalizeEmail(customer.email)),
      sha256(normalizePhone(customer.phone)),
      sha256(normalizeName(customer.firstName)),
      sha256(normalizeName(customer.lastName)),
      sha256(customer.gender),
      sha256(normalizeCity(customer.city)),
      sha256(normalizeState(customer.state)),
      sha256(normalizeZip(customer.zip)),
      sha256(normalizeCountry(customer.country)),
    ]);

  return {
    em: [emHash],
    ph: [phHash],
    fn: [fnHash],
    ln: [lnHash],
    ge: [geHash],
    ct: [ctHash],
    st: [stHash],
    zp: [zpHash],
    country: [countryHash],
    client_ip_address: customer.ip,
    client_user_agent: customer.userAgent,
    fbp: customer.fbp,
    fbc: customer.fbc,
  };
}

export function buildEventPayload(
  eventName: PixelEventName,
  hashedUser: HashedUserData,
  currency: SupportedCurrency,
  value: number,
  eventId: string = generateEventId(),
): MetaEventPayload {
  const product = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
  const now = Math.floor(Date.now() / 1000);

  const payload: MetaEventPayload = {
    event_name: eventName,
    event_time: now,
    event_id: eventId,
    event_source_url: window.location.origin + "/checkout",
    action_source: "website",
    user_data: hashedUser,
  };

  // Add custom data depending on event
  if (
    eventName === "Purchase" ||
    eventName === "InitiateCheckout" ||
    eventName === "AddToCart" ||
    eventName === "ViewContent"
  ) {
    payload.custom_data = {
      currency,
      value,
      content_name: product.name,
      content_type: "product",
      contents: [
        {
          id: product.id,
          quantity: 1,
          item_price: value,
        },
      ],
      num_items: 1,
    };
  } else if (eventName === "Lead" || eventName === "CompleteRegistration") {
    payload.custom_data = {
      currency,
      value: Math.round(value * 0.2 * 100) / 100,
      status: true,
    };
  }

  return payload;
}
