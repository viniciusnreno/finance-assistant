import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { CATEGORIES } from '@/types/expense';

export const runtime = 'nodejs';

const FiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(500).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = FiltersSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  const { from, to, category, search, limit, offset } = parsed.data;

  let query = supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (from) query = query.gte('expense_date', from);
  if (to) query = query.lte('expense_date', to);
  if (category) query = query.eq('category', category);
  if (search) {
    query = query.or(
      `description.ilike.%${search}%,merchant.ilike.%${search}%,original_text.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) {
    console.error('[expenses GET]', error);
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 });
  }

  return NextResponse.json({ data, count });
}

const CreateExpenseSchema = z.object({
  expense_date: z.string(),
  value: z.number().positive(),
  currency: z.string().default('BRL'),
  category: z.enum(CATEGORIES),
  description: z.string().min(1),
  merchant: z.string().optional(),
  payment_method: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const parsed = CreateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed.data, source: 'dashboard' })
    .select()
    .single();

  if (error) {
    console.error('[expenses POST]', error);
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
