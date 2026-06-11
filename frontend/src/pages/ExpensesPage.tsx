import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CreateExpensePayload,
  Expense,
  expensesApi,
} from '../api/expenses';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Select } from '../components/ui/Select';
import { formatCurrency, formatDate } from '../lib/format';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { Navigate } from 'react-router-dom';

const TODAY = new Date().toISOString().slice(0, 10);

function AddExpenseModal({
  open,
  onClose,
  businessId,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
}) {
  const qc = useQueryClient();
  const { currency } = useBusinessStore();
  const { t } = useTranslation();

  const [form, setForm] = useState<CreateExpensePayload>({
    description: '',
    amount: 0,
    date: TODAY,
    categoryId: '',
  });
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', businessId],
    queryFn: () => expensesApi.listCategories(businessId),
    enabled: open,
  });

  const createCatMutation = useMutation({
    mutationFn: (name: string) =>
      expensesApi.createCategory(businessId, { name }),
    onSuccess: (cat) => {
      qc.invalidateQueries({ queryKey: ['expense-categories', businessId] });
      setForm((f) => ({ ...f, categoryId: cat.id }));
      setNewCatName('');
      setShowNewCat(false);
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateExpensePayload) =>
      expensesApi.create(businessId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', businessId] });
      qc.invalidateQueries({ queryKey: ['dashboard-analytics', businessId] });
      setForm({ description: '', amount: 0, date: TODAY, categoryId: '' });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.amount || !form.date) return;
    createMutation.mutate({
      ...form,
      categoryId: form.categoryId || undefined,
    });
  };

  const field = (key: keyof CreateExpensePayload, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open={open} onClose={onClose} title="Add expense" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Description"
          placeholder="e.g. Rent, Electricity bill"
          value={form.description}
          onChange={(e) => field('description', e.target.value)}
          required
        />

        <Input
          label={`Amount (${currency})`}
          type="number"
          min={1}
          step="any"
          placeholder="0"
          value={form.amount || ''}
          onChange={(e) => field('amount', parseFloat(e.target.value) || 0)}
          required
        />

        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => field('date', e.target.value)}
          required
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <div className="flex gap-2">
            <Select
              value={form.categoryId ?? ''}
              onChange={(e) => field('categoryId', e.target.value)}
              className="flex-1"
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setShowNewCat((v) => !v)}
              className="px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-500 hover:bg-gray-50 transition"
              title="New category"
            >
              +
            </button>
          </div>
        </div>

        {showNewCat && (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              placeholder="Category name"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
            <button
              type="button"
              disabled={!newCatName.trim() || createCatMutation.isPending}
              onClick={() => createCatMutation.mutate(newCatName.trim())}
              className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold disabled:opacity-50 transition hover:bg-brand-700"
            >
              Save
            </button>
          </div>
        )}

        {createMutation.isError && (
          <p className="text-xs text-red-500">Failed to add expense. Try again.</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button
            type="submit"
            loading={createMutation.isPending}
            className="flex-1"
          >
            {t('expenses.addExpense')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditExpenseModal({
  expense,
  businessId,
  onClose,
}: {
  expense: Expense;
  businessId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { currency } = useBusinessStore();
  const [form, setForm] = useState<CreateExpensePayload>({
    description: expense.description,
    amount: Number(expense.amount),
    date: expense.date.slice(0, 10),
    categoryId: expense.categoryId ?? '',
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories', businessId],
    queryFn: () => expensesApi.listCategories(businessId),
  });

  const { mutate, isPending, isError } = useMutation({
    mutationFn: () =>
      expensesApi.update(businessId, expense.id, {
        ...form,
        categoryId: form.categoryId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', businessId] });
      qc.invalidateQueries({ queryKey: ['dashboard-analytics', businessId] });
      onClose();
    },
  });

  const field = (key: keyof CreateExpensePayload, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  return (
    <Modal open onClose={onClose} title="Edit expense" size="sm">
      <form onSubmit={(e) => { e.preventDefault(); mutate(); }} className="space-y-4">
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => field('description', e.target.value)}
          required
        />
        <Input
          label={`Amount (${currency})`}
          type="number"
          min={1}
          step="any"
          value={form.amount || ''}
          onChange={(e) => field('amount', parseFloat(e.target.value) || 0)}
          required
        />
        <Input
          label="Date"
          type="date"
          value={form.date}
          onChange={(e) => field('date', e.target.value)}
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Category</label>
          <Select
            value={form.categoryId ?? ''}
            onChange={(e) => field('categoryId', e.target.value)}
          >
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        {isError && <p className="text-xs text-red-500">Failed to update expense. Try again.</p>}
        <div className="flex gap-3 pt-1">
          <Button type="submit" loading={isPending} className="flex-1">Save changes</Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({
  description,
  onConfirm,
  onClose,
  isPending,
}: {
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Modal open onClose={onClose} title="Delete expense" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Delete <span className="font-medium text-gray-900">"{description}"</span>? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onConfirm}
            loading={isPending}
            className="flex-1 !bg-red-600 hover:!bg-red-700 !shadow-red-100"
          >
            Delete
          </Button>
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function ExpensesPage() {
  const { businessId, currency } = useBusinessStore();
  const { canManageExpenses } = useRole();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);

  if (!canManageExpenses) return <Navigate to="/sales" replace />;

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: () => expensesApi.list(businessId!),
    enabled: !!businessId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.remove(businessId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses', businessId] });
      qc.invalidateQueries({ queryKey: ['dashboard-analytics', businessId] });
      setPendingDelete(null);
    },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('expenses.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {expenses.length} record{expenses.length !== 1 ? 's' : ''} &middot;{' '}
            {formatCurrency(total, currency)} total
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition shadow-sm shadow-brand-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('expenses.addExpense')}
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-b border-gray-50 last:border-0 px-5 py-4 flex items-center gap-4 animate-pulse">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-40 bg-gray-100 rounded" />
                <div className="h-2.5 w-24 bg-gray-50 rounded" />
              </div>
              <div className="h-3 w-24 bg-gray-100 rounded shrink-0" />
              <div className="h-7 w-7 bg-gray-100 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 p-12 flex flex-col items-center text-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">{t('expenses.noExpenses')}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t('expenses.noExpensesSub')}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-1 text-sm font-semibold text-brand-600 hover:underline"
          >
            {t('expenses.addExpense')} →
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
          <ul className="divide-y divide-gray-50">
            {expenses.map((exp) => (
              <li key={exp.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{exp.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatDate(exp.date)}</span>
                    {exp.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-700">
                        {exp.category.name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 shrink-0">
                  {formatCurrency(Number(exp.amount), currency)}
                </span>
                <button
                  onClick={() => setEditingExpense(exp)}
                  className="rounded-lg p-1.5 text-gray-300 hover:text-brand-600 hover:bg-brand-50 transition shrink-0"
                  title="Edit"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => setPendingDelete(exp)}
                  disabled={deleteMutation.isPending}
                  className="rounded-lg p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 transition disabled:opacity-40 shrink-0"
                  title="Delete"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {businessId && (
        <AddExpenseModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          businessId={businessId}
        />
      )}

      {editingExpense && businessId && (
        <EditExpenseModal
          expense={editingExpense}
          businessId={businessId}
          onClose={() => setEditingExpense(null)}
        />
      )}

      {pendingDelete && (
        <DeleteConfirmModal
          description={pendingDelete.description}
          onConfirm={() => deleteMutation.mutate(pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
