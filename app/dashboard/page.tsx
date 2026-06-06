import { supabase } from "@/lib/supabase";
import { CATEGORY_LABELS, type Category } from "@/types/expense";
import { DashboardFilters } from "@/components/dashboard-filters";
import { CategoryBarChart, DailyAreaChart } from "@/components/dashboard-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { format, subDays, startOfMonth, startOfYear, startOfWeek, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { TrendingUp, Calendar, BarChart3, Tag, ArrowRight } from "lucide-react";

const timezone = process.env.APP_TIMEZONE ?? "America/Sao_Paulo";

function nowInTimezone() {
  return toZonedTime(new Date(), timezone);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getDateRange(filter: string): { from: string; to: string } {
  const now = nowInTimezone();
  const today = format(now, "yyyy-MM-dd");

  switch (filter) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: format(subDays(now, 6), "yyyy-MM-dd"), to: today };
    case "month":
      return { from: format(startOfMonth(now), "yyyy-MM-dd"), to: today };
    case "year":
      return { from: format(startOfYear(now), "yyyy-MM-dd"), to: today };
    default:
      return { from: format(subDays(now, 29), "yyyy-MM-dd"), to: today };
  }
}

async function getStats(from: string, to: string) {
  const now = nowInTimezone();
  const today = format(now, "yyyy-MM-dd");
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfWeek(now, { weekStartsOn: 1 }), 6), "yyyy-MM-dd");

  const [todayRes, monthRes, periodRes, weekRes, recentRes] = await Promise.all([
    supabase
      .from("expenses")
      .select("value")
      .is("deleted_at", null)
      .eq("expense_date", today),
    supabase
      .from("expenses")
      .select("value, expense_date, category")
      .is("deleted_at", null)
      .gte("expense_date", monthStart)
      .lte("expense_date", today),
    supabase
      .from("expenses")
      .select("value, category, expense_date")
      .is("deleted_at", null)
      .gte("expense_date", from)
      .lte("expense_date", to),
    supabase
      .from("expenses")
      .select("value, expense_date")
      .is("deleted_at", null)
      .gte("expense_date", weekStart)
      .lte("expense_date", weekEnd),
    supabase
      .from("expenses")
      .select("*")
      .is("deleted_at", null)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const todayTotal = (todayRes.data ?? []).reduce(
    (sum, e) => sum + Number(e.value),
    0,
  );
  const monthExpenses = monthRes.data ?? [];
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.value), 0);

  const distinctDays = new Set(monthExpenses.map((e) => e.expense_date)).size;
  const dailyAvg = distinctDays > 0 ? monthTotal / distinctDays : 0;

  const periodExpenses = periodRes.data ?? [];

  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach((e) => {
    categoryTotals[e.category] =
      (categoryTotals[e.category] ?? 0) + Number(e.value);
  });
  const topCategory = Object.entries(categoryTotals).sort(
    (a, b) => b[1] - a[1],
  )[0];

  const periodByCategory: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    periodByCategory[e.category] =
      (periodByCategory[e.category] ?? 0) + Number(e.value);
  });
  const categoryChartData = Object.entries(periodByCategory)
    .map(([category, total]) => ({
      category,
      label: CATEGORY_LABELS[category as Category] ?? category,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  const weekExpenses = weekRes.data ?? [];
  const weeklyTotals: Record<string, number> = {};
  weekExpenses.forEach((e) => {
    weeklyTotals[e.expense_date] =
      (weeklyTotals[e.expense_date] ?? 0) + Number(e.value);
  });

  const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const weekMonday = startOfWeek(now, { weekStartsOn: 1 });
  const dailyChartData = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekMonday, i);
    const dateKey = format(day, "yyyy-MM-dd");
    return {
      date: DAY_LABELS[i],
      total: weeklyTotals[dateKey] ?? 0,
      isToday: dateKey === today,
    };
  });

  return {
    todayTotal,
    monthTotal,
    dailyAvg,
    topCategory: topCategory
      ? { category: topCategory[0] as Category, total: topCategory[1] }
      : null,
    categoryChartData,
    dailyChartData,
    recentExpenses: recentRes.data ?? [],
  };
}

interface PageProps {
  searchParams: Promise<{ filter?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { filter = "30d" } = await searchParams;
  const { from, to } = getDateRange(filter);
  const stats = await getStats(from, to);

  const filterLabels: Record<string, string> = {
    today: "Hoje",
    "7d": "7 dias",
    "30d": "30 dias",
    month: "Mês atual",
    year: "Ano atual",
  };

  const periodLabel =
    from === to
      ? format(parseISO(from), "dd 'de' MMMM", { locale: ptBR })
      : `${format(parseISO(from), "dd/MM/yyyy")} — ${format(parseISO(to), "dd/MM/yyyy")}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="text-muted-foreground text-sm mt-1">{periodLabel}</p>
        </div>
        <DashboardFilters current={filter} labels={filterLabels} />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gasto Hoje"
          value={formatCurrency(stats.todayTotal)}
          icon={<Calendar className="h-4 w-4" />}
          highlight={stats.todayTotal > 0}
        />
        <StatCard
          title="Gasto no Mês"
          value={formatCurrency(stats.monthTotal)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          title="Média Diária"
          value={formatCurrency(stats.dailyAvg)}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatCard
          title="Maior Categoria"
          value={
            stats.topCategory
              ? CATEGORY_LABELS[stats.topCategory.category]
              : "—"
          }
          sub={
            stats.topCategory
              ? formatCurrency(stats.topCategory.total)
              : undefined
          }
          icon={<Tag className="h-4 w-4" />}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <CategoryBarChart data={stats.categoryChartData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Evolução Diária
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DailyAreaChart data={stats.dailyChartData} />
          </CardContent>
        </Card>
      </div>

      {/* Últimos gastos */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimos Gastos
            </CardTitle>
            <Link
              href="/dashboard/transactions"
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Ver todos
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {stats.recentExpenses.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground text-sm">
              Nenhum gasto registrado ainda.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {expense.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="secondary"
                        className="text-xs h-5 px-1.5 font-normal"
                      >
                        {CATEGORY_LABELS[expense.category as Category] ??
                          expense.category}
                      </Badge>
                      {expense.merchant && (
                        <span className="text-xs text-muted-foreground truncate">
                          {expense.merchant}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(expense.expense_date), "dd/MM/yy")}
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary whitespace-nowrap">
                    {formatCurrency(Number(expense.value))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  icon,
  highlight,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <span
            className={`${highlight ? "text-primary" : "text-muted-foreground"}`}
          >
            {icon}
          </span>
        </div>
        <p className="text-xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
