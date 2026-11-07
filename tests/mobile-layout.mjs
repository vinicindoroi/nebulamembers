// Run against a local dev server. Mocked accounts never send real events or modify user data.
import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  serviceWorkers: "block",
  acceptDownloads: true,
  viewport: {
    width: Number(process.env.MOBILE_WIDTH || 360),
    height: Number(process.env.MOBILE_HEIGHT || 800),
  },
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const user = {
  id: "00000000-0000-0000-0000-000000000003",
  email: "teste@example.invalid",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Aluno de teste" },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 3600;
const jwt = [{ alg: "HS256", typ: "JWT" }, { sub: user.id, exp, aud: "authenticated" }, "test"]
  .map((x) => (typeof x === "string" ? x : Buffer.from(JSON.stringify(x)).toString("base64url")))
  .join(".");
const session = {
  access_token: jwt,
  refresh_token: "mock",
  expires_in: 3600,
  expires_at: exp,
  token_type: "bearer",
  user,
};
await context.addInitScript((session) => {
  if (location.pathname === "/login") {
    localStorage.removeItem("sb-yyrbxyinbxweshosrnnd-auth-token");
    return;
  }
  localStorage.setItem("sb-yyrbxyinbxweshosrnnd-auth-token", JSON.stringify(session));
  localStorage.setItem("nebula_tutorial_seen", "true");
  localStorage.setItem("whatsapp_prompt_dismissed", "true");
}, session);
let offers = [],
  admin = true,
  plan = "Premium";
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await context.route("https://yyrbxyinbxweshosrnnd.supabase.co/**", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const path = url.pathname;
  const headers = req.headers();
  const json = (body) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  const single = (data) =>
    json(headers.accept?.includes("application/vnd.pgrst.object+json") ? data : data ? [data] : []);
  if (path.startsWith("/auth/")) return json(user);
  if (path.includes("/storage/v1/object/authenticated/"))
    return route.fulfill({ status: 200, contentType: "application/zip", body: "arquivo de teste" });
  if (path.includes("/storage/")) return json({ Key: path, Id: crypto.randomUUID() });
  const table = path.split("/").at(-1);
  if (table === "admin_list_profiles")
    return json([
      {
        id: user.id,
        full_name: "Aluno com nome longo para validar a tabela",
        email: user.email,
        plan: "Premium",
        status: "active",
        created_at: new Date().toISOString(),
      },
    ]);
  if (table === "mentor_schedule_settings")
    return single({
      id: 1,
      enabled: true,
      slot_minutes: 30,
      min_notice_hours: 1,
      max_days_ahead: 14,
      timezone: "America/Sao_Paulo",
      allowed_plans: ["premium"],
      blocked_dates: [],
      instructions: "Escolha um horário",
      meeting_link: null,
    });
  if (table === "courses")
    return single({
      id: "course-1",
      title: "Curso de tráfego e conversão para empreendedores",
      description: "Conteúdo de exemplo para teste de layout",
      status: "published",
      tag: "Tráfego pago",
      cover_url: null,
      access_level: "free",
      access_levels: ["premium"],
      created_at: new Date().toISOString(),
      title_visible: true,
    });
  if (table === "modules")
    return single({
      id: "module-1",
      course_id: "course-1",
      title: "Módulo inicial",
      position: 0,
      access_level: "free",
    });
  if (table === "lessons_public" || table === "lessons")
    return single({
      id: "lesson-1",
      course_id: "course-1",
      module_id: "module-1",
      title: "Primeira aula com título longo",
      position: 0,
      access_level: "free",
      is_free: true,
      duration_min: 12,
    });
  if (table === "member_offers" && method === "GET")
    return json([
      {
        id: "offer-1",
        title: "Oferta com título longo para os membros da mentoria",
        description: "Descrição e material de exemplo",
        active: true,
        access_levels: ["premium"],
        created_at: new Date().toISOString(),
        member_offer_files: [
          {
            id: "file-1",
            offer_id: "offer-1",
            name: "material-com-nome-longo-para-verificar-responsividade.zip",
            storage_path: "offer-1/file.zip",
            size: 12345,
          },
        ],
      },
    ]);
  if (table === "profiles")
    return method === "GET"
      ? single({
          ...user,
          full_name: "Aluno de teste com nome longo para validar mobile",
          plan,
          status: "active",
          xp: 120,
          phone: "11999999999",
        })
      : json(null);
  if (table === "user_roles")
    return method === "GET"
      ? single(admin ? { role: "admin", user_id: user.id } : null)
      : json(null);
  if (table === "app_settings")
    return single({
      value:
        url.searchParams.get("key") === "eq.plans_config"
          ? [
              { id: "free", slug: "free", name: "Free", level: 0 },
              { id: "pro", slug: "pro", name: "Pro", level: 1 },
              { id: "premium", slug: "premium", name: "Premium", level: 2 },
            ]
          : {},
    });
  if (table === "member_offers") {
    if (method === "POST") {
      const body = req.postDataJSON();
      offers.push({
        ...body,
        description: "",
        created_at: new Date().toISOString(),
        member_offer_files: [],
      });
      return json(null);
    }
    if (method === "PATCH") {
      const id = url.searchParams.get("id")?.slice(3);
      const body = req.postDataJSON();
      offers = offers.map((o) => (o.id === id ? { ...o, ...body } : o));
      return json(null);
    }
    return json(
      admin
        ? offers
        : offers.filter((o) => o.active && o.access_levels.includes(plan.toLowerCase())),
    );
  }
  if (table === "member_offer_files" && method === "POST") {
    for (const f of req.postDataJSON()) {
      offers
        .find((o) => o.id === f.offer_id)
        .member_offer_files.push({ ...f, id: crypto.randomUUID() });
    }
    return json(null);
  }
  return json([]);
});

const allRoutes = [
  "/dashboard",
  "/organizer",
  "/courses",
  "/courses/course-1",
  "/offers",
  "/community",
  "/forum",
  "/saved",
  "/notes",
  "/schedule",
  "/funnels",
  "/funnel-tracker",
  "/pixel-feeder",
  "/transcript",
  "/uptime",
  "/profile",
  "/settings",
  ...[
    "dashboard",
    "courses",
    "modules",
    "categories",
    "members",
    "schedule",
    "community",
    "comments",
    "notifications",
    "offers",
    "plans",
    "coupons",
    "sales",
    "player",
    "forms",
    "funnels",
    "logs",
    "settings",
  ].map((p) => "/admin/" + p),
  "/login",
  "/landing",
  "/forms",
  "/respostas",
];
const routes = process.env.MOBILE_ROUTES
  ? allRoutes.filter((route) => process.env.MOBILE_ROUTES.split(",").includes(route))
  : allRoutes;
await import("node:fs").then((fs) => fs.mkdirSync("test-results", { recursive: true }));
const report = [];
try {
  for (const route of routes) {
    const start = errors.length;
    try {
      await page.goto((process.env.MOBILE_BASE_URL || "http://127.0.0.1:4173") + route, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
      await page
        .waitForFunction(
          () => {
            const m = document.querySelector("main");
            const el = m || document.body;
            return !!el.querySelector("h1, h2, input, [role=tablist], .react-flow");
          },
          { timeout: 20000 },
        )
        .catch(() => {});
      await page.waitForTimeout(500);
      const result = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        heading: document.querySelector("h1")?.textContent,
        body: document.body.innerText.slice(-350),
        overflow: [...document.querySelectorAll("main *")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.right > innerWidth + 2 &&
              getComputedStyle(el).position !== "fixed" &&
              !el.closest(".react-flow, [aria-hidden=true]")
            );
          })
          .slice(0, 5)
          .map((el) => ({
            tag: el.tagName,
            cls: el.className,
            text: el.textContent?.slice(0, 60),
          })),
      }));
      report.push({ route, ...result, errors: errors.slice(start) });
      await import("node:fs").then((fs) =>
        fs.writeFileSync(
          `test-results/mobile-${process.env.MOBILE_ROUTES ? "targeted" : "audit"}-${process.env.MOBILE_WIDTH || 360}.json`,
          JSON.stringify(report, null, 2),
        ),
      );
      console.log(
        JSON.stringify({
          route,
          width: result.scrollWidth,
          heading: result.heading,
          errors: errors.slice(start),
        }),
      );
    } catch (error) {
      report.push({ route, error: error.message });
      console.log(route, error.message.slice(0, 100));
    }
  }
  await import("node:fs").then((fs) =>
    fs.writeFileSync(
      `test-results/mobile-${process.env.MOBILE_ROUTES ? "targeted" : "audit"}-${process.env.MOBILE_WIDTH || 360}.json`,
      JSON.stringify(report, null, 2),
    ),
  );
  const failures = report.filter(
    (row) =>
      row.error ||
      row.scrollWidth > Number(process.env.MOBILE_WIDTH || 360) + 1 ||
      row.errors?.length ||
      row.heading === "This page didn't load",
  );
  assert.deepEqual(
    failures.map((row) => ({
      route: row.route,
      scrollWidth: row.scrollWidth,
      errors: row.errors,
      error: row.error,
    })),
    [],
  );
  console.log(
    `${report.length} telas sem overflow em ${process.env.MOBILE_WIDTH || 360}px (API simulada).`,
  );
} finally {
  await browser.close();
}
