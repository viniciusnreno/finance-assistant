import { supabase } from '@/lib/supabase';
import { CATEGORIES } from '@/types/expense';
import { TransactionsClient } from '@/components/transactions-client';
import { format, subDays, startOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const timezone = process.env.APP_TIMEZONE ?? 'America/Sao_Paulo';

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    category?: string;
    search?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 25;

export default async function TransactionsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const now = toZonedTime(new Date(), timezone);
  const today = format(now, 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const thirtyDaysAgo = format(subDays(now, 29), 'yyyy-MM-dd');

  const from = params.from ?? thirtyDaysAgo;
  const to = params.to ?? today;
  const category = params.category ?? '';
  const search = params.search ?? '';
  const page = Math.max(1, Number(params.page ?? 1));
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .gte('expense_date', from)
    .lte('expense_date', to)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (category && CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    query = query.eq('category', category);
  }
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,merchant.ilike.%${search}%,original_text.ilike.%${search}%`
    );
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[transactions page]', error);
  }

  const filters = { from, to, category, search };
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const exportUrl = `/api/export?from=${from}&to=${to}${category ? `&category=${category}` : ''}`;

  return (
    <TransactionsClient
      initialExpenses={data ?? []}
      totalCount={count ?? 0}
      totalPages={totalPages}
      currentPage={page}
      filters={filters}
      exportUrl={exportUrl}
      today={today}
      monthStart={monthStart}
    />
  );
}
