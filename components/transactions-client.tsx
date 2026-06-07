'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type Category, type PaymentMethod, type Expense } from '@/types/expense';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Trash2, Download, Search, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  alimentacao: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  mercado: 'bg-lime-500/15 text-lime-400 border-lime-500/25',
  transporte: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  combustivel: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  saude: 'bg-red-500/15 text-red-400 border-red-500/25',
  educacao: 'bg-violet-500/15 text-violet-400 border-violet-500/25',
  roles: 'bg-pink-500/15 text-pink-400 border-pink-500/25',
  consumiveis: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  casa: 'bg-teal-500/15 text-teal-400 border-teal-500/25',
  assinaturas: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
  contas: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  viagem: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  presentes: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
  tecnologia: 'bg-sky-500/15 text-sky-400 border-sky-500/25',
  roupas: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/25',
  outros: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
};

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
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setExpenses(initialExpenses);
  }, [initialExpenses]);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

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
    setEditOpen(true);
  }

  function closeEdit() {
    setEditOpen(false);
    setTimeout(() => {
      setEditState(null);
      setError('');
    }, 200);
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
      closeEdit();
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSavingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget);
    setDeleteTarget(null);

    try {
      const res = await fetch(`/api/expenses/${deleteTarget}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Erro ao excluir.');
        return;
      }
      setExpenses((prev) => prev.filter((e) => e.id !== deleteTarget));
    } catch {
      setError('Erro de conexão.');
    } finally {
      setDeletingId(null);
    }
  }

  function buildPageUrl(page: number) {
    const params = new URLSearchParams();
    params.set('from', localFilters.from);
    params.set('to', localFilters.to);
    if (localFilters.category) params.set('category', localFilters.category);
    if (localFilters.search) params.set('search', localFilters.search);
    params.set('page', String(page));
    return `/dashboard/transactions?${params.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transações</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {totalCount} {totalCount === 1 ? 'gasto' : 'gastos'} encontrados
          </p>
        </div>
        <a
          href={exportUrl}
          download
          className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'gap-2 self-start' })}
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </a>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {(['today', '7d', '30d', 'month'] as const).map((r) => {
              const labels = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias', month: 'Mês' };
              return (
                <Button
                  key={r}
                  variant="secondary"
                  size="sm"
                  onClick={() => setQuickRange(r)}
                  className="h-7 text-xs"
                >
                  {labels[r]}
                </Button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Input
                type="date"
                value={localFilters.from}
                onChange={(e) => setLocalFilters((f) => ({ ...f, from: e.target.value }))}
                onBlur={() => applyFilters({ from: localFilters.from })}
                className="h-9 text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Input
                type="date"
                value={localFilters.to}
                onChange={(e) => setLocalFilters((f) => ({ ...f, to: e.target.value }))}
                onBlur={() => applyFilters({ to: localFilters.to })}
                className="h-9 text-sm w-full min-w-0 max-w-full"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Categoria</Label>
              <Select
                value={localFilters.category || 'all'}
                onValueChange={(v) => applyFilters({ category: !v || v === 'all' ? '' : v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Descrição, local..."
                  value={localFilters.search}
                  onChange={(e) => setLocalFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && applyFilters({ search: localFilters.search })}
                  onBlur={() => applyFilters({ search: localFilters.search })}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 px-4 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Tabela */}
      <Card className={isPending ? 'opacity-60 pointer-events-none' : ''}>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-xs text-muted-foreground w-24">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Data
                  </div>
                </TableHead>
                <TableHead className="text-xs text-muted-foreground sticky left-0 z-20 min-w-[140px] max-w-[180px] bg-card shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)]">
                  Descrição
                </TableHead>
                <TableHead className="text-xs text-muted-foreground">Categoria</TableHead>
                <TableHead className="text-xs text-muted-foreground hidden md:table-cell">
                  Estabelecimento
                </TableHead>
                <TableHead className="text-xs text-muted-foreground text-right">Valor</TableHead>
                <TableHead className="text-xs text-muted-foreground text-center w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-12 text-sm">
                    Nenhum gasto encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              )}
              {expenses.map((expense) => (
                <TableRow key={expense.id} className="border-border group">
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(parseISO(expense.expense_date), 'dd/MM/yy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="sticky left-0 z-10 min-w-[140px] max-w-[180px] bg-card group-hover:bg-muted/50 shadow-[2px_0_6px_-2px_rgba(0,0,0,0.12)] whitespace-normal">
                    <p className="text-sm font-medium truncate">{expense.description}</p>
                    {expense.payment_method && (
                      <p className="text-xs text-muted-foreground truncate">
                        {PAYMENT_METHOD_LABELS[expense.payment_method as PaymentMethod] ?? expense.payment_method}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                        CATEGORY_BADGE_COLORS[expense.category] ?? 'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {CATEGORY_LABELS[expense.category as Category] ?? expense.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm truncate max-w-36 hidden md:table-cell">
                    {expense.merchant ?? '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      {formatCurrency(Number(expense.value))}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={() => startEdit(expense)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={() => setDeleteTarget(expense.id)}
                        disabled={deletingId === expense.id}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() =>
                  startTransition(() => router.push(buildPageUrl(currentPage - 1)))
                }
                className="h-8 gap-1.5"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  startTransition(() => router.push(buildPageUrl(currentPage + 1)))
                }
                className="h-8 gap-1.5"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog de edição */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar gasto</DialogTitle>
          </DialogHeader>

          {editState && (
            <div className="space-y-4 py-2 min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="edit-description">Descrição</Label>
                <Input
                  id="edit-description"
                  value={editState.description}
                  onChange={(e) =>
                    setEditState((s) => s && { ...s, description: e.target.value })
                  }
                  placeholder="Ex: Almoço no restaurante"
                  className="w-full min-w-0"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="edit-value">Valor (R$)</Label>
                  <Input
                    id="edit-value"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editState.value}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, value: e.target.value })
                    }
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="edit-date">Data</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={editState.expense_date}
                    onChange={(e) =>
                      setEditState((s) => s && { ...s, expense_date: e.target.value })
                    }
                    className="w-full min-w-0 max-w-full"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select
                  value={editState.category}
                  onValueChange={(v) =>
                    setEditState((s) => s && { ...s, category: v as Category })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="edit-merchant">Estabelecimento</Label>
                <Input
                  id="edit-merchant"
                  value={editState.merchant}
                  onChange={(e) =>
                    setEditState((s) => s && { ...s, merchant: e.target.value })
                  }
                  placeholder="Opcional"
                  className="w-full min-w-0"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-payment">Forma de pagamento</Label>
                <Select
                  value={editState.payment_method || '__none__'}
                  onValueChange={(v) =>
                    setEditState((s) => s && { ...s, payment_method: !v || v === '__none__' ? '' : v })
                  }
                >
                  <SelectTrigger id="edit-payment">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {PAYMENT_METHODS.map((pm) => (
                      <SelectItem key={pm} value={pm}>
                        {PAYMENT_METHOD_LABELS[pm]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <DialogClose render={<Button variant="secondary" />} onClick={closeEdit}>
              Cancelar
            </DialogClose>
            <Button onClick={saveEdit} disabled={!!savingId}>
              {savingId ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gasto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
