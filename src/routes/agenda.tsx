import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { getPublicAgenda } from "@/lib/public-agenda.functions";
import { fmtTime } from "@/lib/mentor-schedule";

export const Route = createFileRoute("/agenda")({
  loader: () => getPublicAgenda(),
  head: () => ({
    meta: [
      { title: "Agenda disponível · Nebula" },
      { name: "description", content: "Veja os dias e horários livres para marcar uma conversa." },
      { property: "og:title", content: "Agenda disponível · Nebula" },
      { property: "og:description", content: "Veja os dias e horários livres para marcar uma conversa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicAgenda,
});

function dayLabel(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

function PublicAgenda() {
  const data = Route.useLoaderData();
  const [sel, setSel] = useState(data.days[0]?.ymd);
  const day = data.days.find((d) => d.ymd === sel);
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-3xl font-semibold">Minha disponibilidade</h1>
        <p className="mt-2 text-muted-foreground">
          Dias e horários livres (horário de {data.timezone.replace("_", " ")}) · calls de {data.slotMinutes} min.
        </p>
        {!data.enabled || data.days.length === 0 ? (
          <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum horário livre no momento.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]">
            <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto">
              {data.days.map((d) => (
                <button key={d.ymd} onClick={() => setSel(d.ymd)}
                  className={`rounded-lg border px-4 py-3 text-left capitalize transition ${sel === d.ymd ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-accent"}`}>
                  <div className="font-medium">{dayLabel(d.ymd)}</div>
                  <div className="text-xs text-muted-foreground">{d.slots.length} horários livres</div>
                </button>
              ))}
            </div>
            <div className="rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 font-medium capitalize">{sel && dayLabel(sel)}</h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {day?.slots.map((s) => (
                  <div key={s} className="rounded-md border border-border py-2 text-center text-sm">
                    {fmtTime(s, data.timezone)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
