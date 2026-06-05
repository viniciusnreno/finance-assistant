'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const CATEGORY_COLORS: Record<string, string> = {
  alimentacao: '#f97316',
  mercado: '#84cc16',
  transporte: '#3b82f6',
  combustivel: '#eab308',
  saude: '#ef4444',
  educacao: '#8b5cf6',
  lazer: '#ec4899',
  casa: '#14b8a6',
  assinaturas: '#6366f1',
  contas: '#f59e0b',
  familia: '#10b981',
  viagem: '#06b6d4',
  outros: '#6b7280',
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

interface CategoryData {
  category: string;
  label: string;
  total: number;
}

interface DailyData {
  date: string;
  total: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
      {label && <p className="text-gray-400 text-xs mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-white text-sm font-semibold">
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export function CategoryPieChart({ data }: { data: CategoryData[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Nenhum gasto no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={90}
          innerRadius={50}
          paddingAngle={2}
        >
          {data.map((entry) => (
            <Cell
              key={entry.category}
              fill={CATEGORY_COLORS[entry.category] ?? '#6b7280'}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), '']}
          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
          labelStyle={{ color: '#9ca3af' }}
          itemStyle={{ color: '#fff' }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#d1d5db', fontSize: '12px' }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function DailyBarChart({ data }: { data: DailyData[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Nenhum gasto no período
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
          tick={{ fill: '#9ca3af', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
