import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface HourlyAccessPoint {
  hour: string;
  human: number;
  bot: number;
}

const chartConfig = {
  human: { label: "Humanos", color: "hsl(var(--chart-1))" },
  bot: { label: "Robôs", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

function hourLabel(value: string, includeDate: boolean) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    ...(includeDate ? { day: "2-digit", month: "2-digit" } : {}),
    hour: "2-digit",
    hour12: false,
  }).format(date);
}

export function HourlyAccessChart({ points }: { points: HourlyAccessPoint[] }) {
  if (!points.length) {
    return <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">Sem acessos no período.</p>;
  }

  const firstDay = new Date(points[0]?.hour ?? 0).toDateString();
  const lastDay = new Date(points.at(-1)?.hour ?? 0).toDateString();
  const includeDate = firstDay !== lastDay;
  const data = points.map((point) => ({ ...point, label: hourLabel(point.hour, includeDate) }));

  return (
    <ChartContainer config={chartConfig} className="h-64 w-full min-w-[540px] aspect-auto">
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="hourly-human" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-human)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-human)" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="hourly-bot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-bot)" stopOpacity={0.32} />
            <stop offset="95%" stopColor="var(--color-bot)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={42} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="line"
              labelFormatter={(_, payload) => {
                const hour = payload[0]?.payload?.hour;
                return typeof hour === "string"
                  ? new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(hour))
                  : "";
              }}
            />
          }
        />
        <Area
          dataKey="human"
          type="monotone"
          fill="url(#hourly-human)"
          stroke="var(--color-human)"
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
        <Area
          dataKey="bot"
          type="monotone"
          fill="url(#hourly-bot)"
          stroke="var(--color-bot)"
          strokeWidth={2}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}