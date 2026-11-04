/**
 * Detecção de acessos automatizados (crawlers/pré-carregadores das plataformas de anúncio).
 * Meta, Google, TikTok e afins abrem a URL do anúncio para gerar preview/checar a página —
 * esses acessos não são humanos e poluem o funil.
 */
const BOT_UA = new RegExp(
  [
    // Meta / Facebook / Instagram / WhatsApp
    "facebookexternalhit",
    "facebookcatalog",
    "facebookbot",
    "meta-externalagent",
    "meta-externalfetcher",
    "whatsapp",
    "instagram .*(bot|crawler)",
    // Google / Google Ads
    "googlebot",
    "google-adwords",
    "adsbot-google",
    "google-read-aloud",
    "google favicon",
    "feedfetcher-google",
    "apis-google",
    "mediapartners-google",
    "google-safety",
    "google-inspectiontool",
    // TikTok / Bytedance
    "bytespider",
    "bytedance",
    "tiktokspider",
    "tiktok",
    // Outros crawlers comuns
    "bingbot",
    "adidxbot",
    "slurp",
    "duckduckbot",
    "baiduspider",
    "yandex(bot|images)",
    "twitterbot",
    "linkedinbot",
    "pinterest",
    "slackbot",
    "telegrambot",
    "discordbot",
    "applebot",
    "petalbot",
    "semrushbot",
    "ahrefsbot",
    "mj12bot",
    "dotbot",
    "screaming frog",
    "chrome-lighthouse",
    "gtmetrix",
    "pingdom",
    "uptimerobot",
    "headlesschrome",
    "phantomjs",
    "puppeteer",
    "playwright",
    "python-requests",
    "curl/",
    "wget",
    "axios/",
    "node-fetch",
    "go-http-client",
    "java/",
    "okhttp",
    "libwww-perl",
    "\\bbot\\b",
    "crawler",
    "spider",
    "scraper",
    "preview",
    "monitor",
  ].join("|"),
  "i",
);

export function isBotUserAgent(ua: string | null | undefined): boolean {
  if (!ua || !ua.trim()) return true; // sem user-agent = automatizado
  return BOT_UA.test(ua);
}
