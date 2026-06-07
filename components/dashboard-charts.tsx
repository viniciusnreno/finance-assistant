"use client";

import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

interface CategoryData {
  category: string;
  label: string;
  total: number;
}

interface PaymentMethodData {
  method: string;
  label: string;
  total: number;
}

interface DailyData {
  date: string;
  total: number;
  isToday?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: "#f97316",
  mercado: "#84cc16",
  transporte: "#3b82f6",
  combustivel: "#eab308",
  saude: "#ef4444",
  educacao: "#8b5cf6",
  roles: "#ec4899",
  consumiveis: "#a855f7",
  casa: "#14b8a6",
  assinaturas: "#6366f1",
  contas: "#f59e0b",
  viagem: "#06b6d4",
  presentes: "#f43f5e",
  tecnologia: "#0ea5e9",
  roupas: "#d946ef",
  outros: "#6b7280",
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  caju: "#22c55e",
  paicard: "#3b82f6",
  nubank_credito: "#a855f7",
  nubank_debito: "#8b5cf6",
  sem_metodo: "#6b7280",
};

const categoryChartConfig = {
  total: { label: "Total" },
} satisfies ChartConfig;

const paymentChartConfig = {
  total: { label: "Total" },
} satisfies ChartConfig;

const dailyChartConfig = {
  total: {
    label: "Total",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export function CategoryBarChart({ data }: { data: CategoryData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Nenhum dado no período
      </div>
    );
  }

  return (
    <ChartContainer config={categoryChartConfig} className="h-[220px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={88}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Bar dataKey="total" radius={4}>
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category] ?? "#6b7280"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function PaymentMethodDonutChart({ data }: { data: PaymentMethodData[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        Nenhum dado no período
      </div>
    );
  }

  return (
    <ChartContainer config={paymentChartConfig} className="h-[220px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 16, top: 4, bottom: 4 }}
      >
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={104}
          tick={{ fontSize: 11 }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <Bar dataKey="total" radius={4}>
          {data.map((entry) => (
            <Cell
              key={entry.method}
              fill={PAYMENT_METHOD_COLORS[entry.method] ?? "#6b7280"}
              fillOpacity={0.85}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function DailyAreaChart({ data }: { data: DailyData[] }) {
  const todayLabel = data.find((d) => d.isToday)?.date;

  return (
    <ChartContainer config={dailyChartConfig} className="h-[220px] w-full">
      <AreaChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-total)"
              stopOpacity={0.3}
            />
            <stop
              offset="95%"
              stopColor="var(--color-total)"
              stopOpacity={0.05}
            />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tick={({ x, y, payload }) => (
            <text
              x={x}
              y={Number(y) + 12}
              textAnchor="middle"
              fontSize={11}
              fontWeight={payload.value === todayLabel ? 700 : 400}
              fill={
                payload.value === todayLabel
                  ? "hsl(var(--foreground))"
                  : "hsl(var(--muted-foreground))"
              }
            >
              {payload.value}
            </text>
          )}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 11 }}
          width={72}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        {todayLabel && (
          <ReferenceLine
            x={todayLabel}
            stroke="hsl(var(--foreground))"
            strokeDasharray="3 3"
            strokeOpacity={0.3}
          />
        )}
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="var(--color-total)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
