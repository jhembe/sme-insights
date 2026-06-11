import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { customersApi, Customer, CreateCustomerInput } from '../api/customers';
import { useBusinessStore } from '../store/business.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';

function CustomerForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial?: Customer;
  onSave: (data: CreateCustomerInput) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const [form, setForm] = useState<CreateCustomerInput>({
    name: initial?.name ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    notes: initial?.notes ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      phone: form.phone?.trim() || undefined,
      email: form.email?.trim() || undefined,
      notes: form.notes?.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Full name *"
        placeholder="e.g. Amina Hassan"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        autoFocus
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Phone"
          type="tel"
          placeholder="+255 7XX XXX XXX"
          value={form.phone ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        <Input
          label="Email"
          type="email"
          placeholder="customer@email.com"
          value={form.email ?? ''}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
      </div>
      <Input
        label="Notes"
        placeholder="Any notes about this customer…"
        value={form.notes ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
      />
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} className="flex-1">
          {initial ? 'Save changes' : 'Add customer'}
        </Button>
      </div>
    </form>
  );
}

export function CustomersPage() {
  const { businessId } = useBusinessStore();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [modal, setModal] = useState<'new' | Customer | null>(null);
  const [formError, setFormError] = useState('');
  const [search, setSearch] = useState('');

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => customersApi.list(businessId!),
    enabled: !!businessId,
  });

  const create = useMutation({
    mutationFn: (data: CreateCustomerInput) => customersApi.create(businessId!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers', businessId] }); setModal(null); },
    onError: () => setFormError('Failed to add customer.'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateCustomerInput }) =>
      customersApi.update(businessId!, id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers', businessId] }); setModal(null); },
    onError: () => setFormError('Failed to update customer.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => customersApi.remove(businessId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers', businessId] }),
  });

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  );

  const handleSave = (data: CreateCustomerInput) => {
    setFormError('');
    if (modal === 'new') create.mutate(data);
    else if (modal) update.mutate({ id: (modal as Customer).id, data });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('customers.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {customers.length} customer{customers.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={() => { setFormError(''); setModal('new'); }}>+ {t('customers.addCustomer')}</Button>
      </div>

      {customers.length > 5 && (
        <input
          type="search"
          placeholder="Search by name or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse">
          {[0,1,2].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('customers.noCustomers')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('customers.noCustomersSub')}</p>
          </div>
          <Button onClick={() => { setFormError(''); setModal('new'); }}>+ Add first customer</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{c.name}</p>
                  {c.phone && <p className="text-xs text-gray-500 mt-0.5">{c.phone}</p>}
                  {c.email && <p className="text-xs text-gray-400 truncate">{c.email}</p>}
                </div>
                {c._count && c._count.sales > 0 && (
                  <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    {c._count.sales} sale{c._count.sales !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {c.notes && <p className="text-xs text-gray-400 italic line-clamp-2">{c.notes}</p>}
              <div className="flex gap-2 pt-1 border-t border-gray-50">
                <button
                  onClick={() => { setFormError(''); setModal(c); }}
                  className="flex-1 text-xs font-medium text-brand-600 hover:text-brand-700 py-1"
                >
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm(`Remove "${c.name}"?`)) remove.mutate(c.id); }}
                  className="flex-1 text-xs font-medium text-gray-400 hover:text-red-500 py-1"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'new' ? 'Add customer' : 'Edit customer'}
        size="md"
      >
        {modal !== null && (
          <CustomerForm
            initial={modal !== 'new' ? (modal as Customer) : undefined}
            onSave={handleSave}
            onCancel={() => setModal(null)}
            saving={create.isPending || update.isPending}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
