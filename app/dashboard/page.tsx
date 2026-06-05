import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS, type Category } from '@/types/expense';
import { CategoryPieChart, DailyBarChart } from '@/components/charts';
import { DashboardFilters } from '@/components/dashboard-filters';
import Link from 'next/link';
import { format, subDays, startOfMonth, startOfYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';

const timezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

function nowInTimezone() {
  return toZonedTime(new Date(), timezone);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function getDateRange(filter: string): { from: string; to: string } {
  const now = nowInTimezone();
  const today = format(now, 'yyyy-MM-dd');

  switch (filter) {
    case 'today':
      return { from: today, to: today };
    case '7d':
      return { from: format(subDays(now, 6), 'yyyy-MM-dd'), to: today };
    case 'month':
      return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: today };
    case 'year':
      return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: today };
    default:
      return { from: format(subDays(now, 29), 'yyyy-MM-dd'), to: today };
  }
}

async function getStats(from: string, to: string) {
  const now = nowInTimezone();
  const today = format(now, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

  const [todayRes, monthRes, periodRes, recentRes] = await Promise.all([
    supabase
      .from('expenses')
      .select('value')
      .is('deleted_at', null)
      .eq('expense_date', today),
    supabase
      .from('expenses')
      .select('value, expense_date, category')
      .is('deleted_at', null)
      .gte('expense_date', monthStart)
      .lte('expense_date', today),
    supabase
      .from('expenses')
      .select('value, category, expense_date')
      .is('deleted_at', null)
      .gte('expense_date', from)
      .lte('expense_date', to),
    supabase
      .from('expenses')
      .select('*')
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const todayTotal = (todayRes.data ?? []).reduce((sum, e) => sum + Number(e.value), 0);
  const monthExpenses = monthRes.data ?? [];
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.value), 0);

  const distinctDays = new Set(monthExpenses.map((e) => e.expense_date)).size;
  const dailyAvg = distinctDays > 0 ? monthTotal / distinctDays : 0;

  const periodExpenses = periodRes.data ?? [];

  // Categoria mais gastada no mês
  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach((e) => {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + Number(e.value);
  });
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  // Dados para gráfico de pizza (por categoria no período)
  const periodByCategory: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    periodByCategory[e.category] = (periodByCategory[e.category] ?? 0) + Number(e.value);
  });
  const categoryChartData = Object.entries(periodByCategory)
    .map(([category, total]) => ({
      category,
      label: CATEGORY_LABELS[category as Category] ?? category,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Dados para gráfico diário (últimos 30 dias ou período)
  const dailyTotals: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    dailyTotals[e.expense_date] = (dailyTotals[e.expense_date] ?? 0) + Number(e.value);
  });
  const dailyChartData = Object.entries(dailyTotals)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, total]) => ({
      date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
      total,
    }));

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
  const { filter = '30d' } = await searchParams;
  const { from, to } = getDateRange(filter);
  const stats = await getStats(from, to);

  const filterLabels: Record<string, string> = {
    today: 'Hoje',
    '7d': '7 dias',
    '30d': '30 dias',
    month: 'Mês atual',
    year: 'Ano atual',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Visão Geral</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {from === to ? `Data: ${format(parseISO(from), "dd 'de' MMMM", { locale: ptBR })}` : `${format(parseISO(from), 'dd/MM/yyyy')} — ${format(parseISO(to), 'dd/MM/yyyy')}`}
          </p>
        </div>
        <DashboardFilters current={filter} labels={filterLabels} />
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gasto Hoje"
          value={formatCurrency(stats.todayTotal)}
          icon="📅"
          highlight={stats.todayTotal > 0}
        />
        <StatCard
          title="Gasto no Mês"
          value={formatCurrency(stats.monthTotal)}
          icon="📆"
        />
        <StatCard
          title="Média Diária"
          value={formatCurrency(stats.dailyAvg)}
          icon="📊"
        />
        <StatCard
          title="Maior Categoria"
          value={
            stats.topCategory
              ? CATEGORY_LABELS[stats.topCategory.category]
              : '—'
          }
          sub={stats.topCategory ? formatCurrency(stats.topCategory.total) : undefined}
          icon="🏷️"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Por Categoria</h2>
          <CategoryPieChart data={stats.categoryChartData} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-gray-300 mb-4">Evolução Diária</h2>
          <DailyBarChart data={stats.dailyChartData} />
        </div>
      </div>

      {/* Últimos gastos */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl">
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-300">Últimos Gastos</h2>
          <Link
            href="/dashboard/transactions"
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Ver todos →
          </Link>
        </div>
        <div className="divide-y divide-gray-800">
          {stats.recentExpenses.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-500 text-sm">Nenhum gasto registrado ainda.</p>
          ) : (
            stats.recentExpenses.map((expense) => (
              <div key={expense.id} className="px-6 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{expense.description}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {CATEGORY_LABELS[expense.category as Category] ?? expense.category}
                    {expense.merchant && ` · ${expense.merchant}`}
                    {' · '}
                    {format(parseISO(expense.expense_date), "dd/MM/yy")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap">
                  {formatCurrency(Number(expense.value))}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
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
  icon: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-gray-900 border rounded-xl p-4 ${
        highlight ? 'border-emerald-800' : 'border-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-400">{title}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
