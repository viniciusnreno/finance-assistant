'use client';

import { useState, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABELS, type Category, type Expense } from '@/types/expense';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

interface Filters {
  from: string;
  to: string;
  category: string;
  search: string;
}

interface TransactionsClientProps {
  initialExpenses: Expense[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  filters: Filters;
  exportUrl: string;
  today: string;
  monthStart: string;
}

interface EditState {
  id: string;
  description: string;
  value: string;
  category: Category;
  merchant: string;
  payment_method: string;
  expense_date: string;
}

export function TransactionsClient({
  initialExpenses,
  totalCount,
  totalPages,
  currentPage,
  filters,
  exportUrl,
  today,
  monthStart,
}: TransactionsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [localFilters, setLocalFilters] = useState(filters);

  const applyFilters = useCallback(
    (newFilters: Partial<Filters>) => {
      const merged = { ...localFilters, ...newFilters };
      setLocalFilters(merged);
      const params = new URLSearchParams();
      if (merged.from) params.set('from', merged.from);
      if (merged.to) params.set('to', merged.to);
      if (merged.category) params.set('category', merged.category);
      if (merged.search) params.set('search', merged.search);
      startTransition(() => {
        router.push(`/dashboard/transactions?${params.toString()}`);
      });
    },
    [localFilters, router]
  );

  function setQuickRange(range: 'today' | '7d' | '30d' | 'month') {
    const ranges: Record<string, { from: string; to: string }> = {
      today: { from: today, to: today },
      '7d': { from: format(new Date(new Date(today).getTime() - 6 * 86400000), 'yyyy-MM-dd'), to: today },
      '30d': { from: format(new Date(new Date(today).getTime() - 29 * 86400000), 'yyyy-MM-dd'), to: today },
      month: { from: monthStart, to: today },
    };
    applyFilters(ranges[range]);
  }

  function startEdit(expense: Expense) {
    setEditState({
      id: expense.id,
      description: expense.description,
      value: String(expense.value),
      category: expense.category,
      merchant: expense.merchant ?? '',
      payment_method: expense.payment_method ?? '',
      expense_date: expense.expense_date,
    });
    setError('');
  }

  function cancelEdit() {
    setEditState(null);
    setError('');
  }

  async function saveEdit() {
    if (!editState) return;
    setSavingId(editState.id);
    setError('');

    try {
      const res = await fetch(`/api/expenses/${editState.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editState.description,
          value: Number(editState.value),
          category: editState.category,
          merchant: editState.merchant || null,
          payment_method: editState.payment_method || null,
          expense_date: editState.expense_date,
        }),
      });

      if (!res.ok) {
        setError('Erro ao salvar. Tente novamente.');
        return;
      }

      const { data } = await res.json();
      setExpenses((prev) => prev.map((e) => (e.id === data.id ? data : e)));
      setEditState(null);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Confirma a exclusão deste gasto?')) return;
    setDeletingId(id);
    setError('');

    try {
      const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Erro ao excluir.');
        return;
      }
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError('Erro de conexão.');
    } finally {
      setDeletingId(null);
    }
  }

  const isEditing = (id: string) => editState?.id === id;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {totalCount} {totalCount === 1 ? 'gasto' : 'gastos'} encontrados
          </p>
        </div>
        <a
          href={exportUrl}
          download
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-white transition-colors"
        >
          <span>⬇️</span> Exportar CSV
        </a>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['today', '7d', '30d', 'month'] as const).map((r) => {
            const labels = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias', month: 'Mês' };
            return (
              <button
                key={r}
                onClick={() => setQuickRange(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
              >
                {labels[r]}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">De</label>
            <input
              type="date"
              value={localFilters.from}
              onChange={(e) => setLocalFilters((f) => ({ ...f, from: e.target.value }))}
              onBlur={() => applyFilters({ from: localFilters.from })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Até</label>
            <input
              type="date"
              value={localFilters.to}
              onChange={(e) => setLocalFilters((f) => ({ ...f, to: e.target.value }))}
              onBlur={() => applyFilters({ to: localFilters.to })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Categoria</label>
            <select
              value={localFilters.category}
              onChange={(e) => applyFilters({ category: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Descrição, local..."
              value={localFilters.search}
              onChange={(e) => setLocalFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: localFilters.search })}
              onBlur={() => applyFilters({ search: localFilters.search })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Tabela */}
      <div className={`bg-gray-900 border border-gray-800 rounded-xl overflow-hidden ${isPending ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-400">Data</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">Descrição</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">Categoria</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400">Estabelecimento</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 text-right">Valor</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-400 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                    Nenhum gasto encontrado para os filtros selecionados.
                  </td>
                </tr>
              )}
              {expenses.map((expense) =>
                isEditing(expense.id) && editState ? (
                  <tr key={expense.id} className="bg-gray-800/50">
                    <td className="px-4 py-2">
                      <input
                        type="date"
                        value={editState.expense_date}
                        onChange={(e) => setEditState((s) => s && { ...s, expense_date: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editState.description}
                        onChange={(e) => setEditState((s) => s && { ...s, description: e.target.value })}
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <select
                        value={editState.category}
                        onChange={(e) =>
                          setEditState((s) => s && { ...s, category: e.target.value as Category })
                        }
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {CATEGORY_LABELS[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="text"
                        value={editState.merchant}
                        onChange={(e) => setEditState((s) => s && { ...s, merchant: e.target.value })}
                        placeholder="Opcional"
                        className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-gray-500"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={editState.value}
                        onChange={(e) => setEditState((s) => s && { ...s, value: e.target.value })}
                        className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs text-right focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={saveEdit}
                          disabled={!!savingId}
                          className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50"
                        >
                          {savingId === editState.id ? '...' : 'Salvar'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={expense.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {format(parseISO(expense.expense_date), 'dd/MM/yy', { locale: ptBR })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium truncate max-w-48">{expense.description}</p>
                      {expense.payment_method && (
                        <p className="text-xs text-gray-500">{expense.payment_method}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-300">
                        {CATEGORY_LABELS[expense.category as Category] ?? expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-36">
                      {expense.merchant ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400 whitespace-nowrap">
                      {formatCurrency(Number(expense.value))}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(expense)}
                          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          disabled={deletingId === expense.id}
                          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === expense.id ? '...' : '🗑️'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-800 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              {currentPage > 1 && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('from', localFilters.from);
                    params.set('to', localFilters.to);
                    if (localFilters.category) params.set('category', localFilters.category);
                    if (localFilters.search) params.set('search', localFilters.search);
                    params.set('page', String(currentPage - 1));
                    startTransition(() => router.push(`/dashboard/transactions?${params.toString()}`));
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  ← Anterior
                </button>
              )}
              {currentPage < totalPages && (
                <button
                  onClick={() => {
                    const params = new URLSearchParams();
                    params.set('from', localFilters.from);
                    params.set('to', localFilters.to);
                    if (localFilters.category) params.set('category', localFilters.category);
                    if (localFilters.search) params.set('search', localFilters.search);
                    params.set('page', String(currentPage + 1));
                    startTransition(() => router.push(`/dashboard/transactions?${params.toString()}`));
                  }}
                  className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Próxima →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
