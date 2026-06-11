import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { businessesApi, BusinessType } from '../api/businesses';
import { useBusinessStore } from '../store/business.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'RETAIL', label: 'Retail Shop' },
  { value: 'FOOD_AND_BEVERAGE', label: 'Food & Beverage' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'MANUFACTURING', label: 'Manufacturing' },
  { value: 'AGRICULTURE', label: 'Agriculture' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'OTHER', label: 'Other' },
];

export function BusinessSetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setActiveBusiness = useBusinessStore((s) => s.setActiveBusiness);

  const [form, setForm] = useState({
    name: '',
    type: '' as BusinessType | '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      businessesApi.create({
        name: form.name.trim(),
        type: form.type || undefined,
        phone: form.phone.trim() || undefined,
        address: form.address.trim() || undefined,
        currency: 'TZS',
      }),
    onSuccess: (biz) => {
      setActiveBusiness(biz.id, biz.name, biz.currency, parseFloat(biz.taxRate) || 0, biz.organizationId, biz.memberRole);
      queryClient.setQueryData(['my-business'], biz);
      navigate('/dashboard', { replace: true });
    },
    onError: () => setError('Something went wrong. Please try again.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('Business name is required.');
      return;
    }
    mutate();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo mark */}
        <div className="flex justify-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-200">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-gray-100 ring-1 ring-gray-100 p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Set up your business</h1>
            <p className="mt-1.5 text-sm text-gray-500">
              Tell us a bit about your business to get started.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Business name *"
              placeholder="e.g. Mama Pima Boutique"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoFocus
            />

            <Select
              label="Business type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as BusinessType }))}
            >
              <option value="">Select type (optional)</option>
              {BUSINESS_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>

            <Input
              label="Phone number"
              placeholder="+255 7XX XXX XXX"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />

            <Input
              label="Address"
              placeholder="e.g. Kariakoo, Dar es Salaam"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            />

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" loading={isPending} className="w-full mt-2">
              Get started →
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-400">
          You can update these details anytime from settings.
        </p>
      </div>
    </div>
  );
}
