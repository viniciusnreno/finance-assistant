import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CATEGORY_LABELS } from '@/types/expense';
import type { Category } from '@/types/expense';

export const runtime = 'nodejs';

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const from = params.get('from');
  const to = params.get('to');
  const category = params.get('category');

  let query = supabase
    .from('expenses')
    .select('*')
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Erro ao exportar' }, { status: 500 });
  }

  const headers = [
    'Data',
    'Valor',
    'Categoria',
    'Descrição',
    'Estabelecimento',
    'Forma de Pagamento',
    'Moeda',
    'Fonte',
  ];

  const rows = (data ?? []).map((e) => [
    escapeCSV(e.expense_date),
    escapeCSV(e.value),
    escapeCSV(CATEGORY_LABELS[e.category as Category] ?? e.category),
    escapeCSV(e.description),
    escapeCSV(e.merchant),
    escapeCSV(e.payment_method),
    escapeCSV(e.currency),
    escapeCSV(e.source),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gastos_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
