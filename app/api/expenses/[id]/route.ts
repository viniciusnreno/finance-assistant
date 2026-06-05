import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { CATEGORIES } from '@/types/expense';

export const runtime = 'nodejs';

const UpdateExpenseSchema = z.object({
  expense_date: z.string().optional(),
  value: z.number().positive().optional(),
  currency: z.string().optional(),
  category: z.enum(CATEGORIES).optional(),
  description: z.string().min(1).optional(),
  merchant: z.string().nullable().optional(),
  payment_method: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 });

  const parsed = UpdateExpenseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('expenses')
    .update(parsed.data)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) {
    console.error('[expenses PATCH]', error);
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null);

  if (error) {
    console.error('[expenses DELETE]', error);
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
