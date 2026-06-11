import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { businessesApi, BusinessType } from '../api/businesses';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
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

const CURRENCIES = [
  { value: 'TZS', label: 'TZS — Tanzanian Shilling' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'KES', label: 'KES — Kenyan Shilling' },
  { value: 'EUR', label: 'EUR — Euro' },
];

type AccentOption = {
  value: string;
  label: string;
  swatch600: string;
  swatch100: string;
};

const ACCENT_COLORS: AccentOption[] = [
  { value: 'green',  label: 'Green',  swatch600: '#16a34a', swatch100: '#dcfce7' },
  { value: 'blue',   label: 'Blue',   swatch600: '#2563eb', swatch100: '#dbeafe' },
  { value: 'violet', label: 'Violet', swatch600: '#7c3aed', swatch100: '#ede9fe' },
  { value: 'orange', label: 'Orange', swatch600: '#ea580c', swatch100: '#ffedd5' },
  { value: 'rose',   label: 'Rose',   swatch600: '#e11d48', swatch100: '#ffe4e6' },
  { value: 'cyan',   label: 'Cyan',   swatch600: '#0891b2', swatch100: '#cffafe' },
];

function SkeletonField() {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
      <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
    </div>
  );
}

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}

export function BusinessSettingsPage() {
  const queryClient = useQueryClient();
  const { businessId, organizationId, role, setActiveBusiness } = useBusinessStore();
  const { canEditBusiness } = useRole();

  const [profile, setProfile] = useState({
    name: '',
    type: '' as BusinessType | '',
    description: '',
    phone: '',
    email: '',
    address: '',
  });

  const [financial, setFinancial] = useState({
    currency: 'TZS',
    taxRate: '',
    accentColor: 'green',
  });

  const [toast, setToast] = useState<{ visible: boolean; message: string; isError: boolean }>({
    visible: false,
    message: '',
    isError: false,
  });

  const [copiedOrg, setCopiedOrg] = useState(false);
  const [profileError, setProfileError] = useState('');

  const showToast = useCallback((message: string, isError = false) => {
    setToast({ visible: true, message, isError });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const { data: business, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-business'],
    queryFn: businessesApi.getMyBusiness,
  });

  useEffect(() => {
    if (!business) return;
    setProfile({
      name: business.name ?? '',
      type: (business.type as BusinessType) ?? '',
      description: business.description ?? '',
      phone: business.phone ?? '',
      email: business.email ?? '',
      address: business.address ?? '',
    });
    setFinancial({
      currency: business.currency ?? 'TZS',
      // DB stores decimal (0.18 = 18%); display as percentage for the user
      taxRate: business.taxRate ? String(Math.round(parseFloat(business.taxRate) * 100 * 100) / 100) : '0',
      accentColor: business.accentColor ?? 'green',
    });
  }, [business]);

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: () =>
      businessesApi.update(businessId!, {
        name: profile.name.trim(),
        type: profile.type || undefined,
        description: profile.description.trim() || undefined,
        phone: profile.phone.trim() || undefined,
        email: profile.email.trim() || undefined,
        address: profile.address.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setActiveBusiness(
        updated.id,
        updated.name,
        updated.currency,
        parseFloat(updated.taxRate) || 0,
        updated.organizationId,
        updated.memberRole,
        updated.accentColor ?? 'green',
      );
      queryClient.setQueryData(['my-business'], updated);
      showToast('Business profile saved');
    },
    onError: () => showToast('Failed to save. Please try again.', true),
  });

  const { mutate: saveFinancial, isPending: savingFinancial } = useMutation({
    mutationFn: () =>
      businessesApi.update(businessId!, {
        currency: financial.currency,
        // UI shows percentage (e.g. 18); backend stores decimal (e.g. 0.18)
        taxRate: (parseFloat(financial.taxRate) || 0) / 100,
        accentColor: financial.accentColor,
      }),
    onSuccess: (updated) => {
      const accent = updated.accentColor ?? 'green';
      setActiveBusiness(
        updated.id,
        updated.name,
        updated.currency,
        parseFloat(updated.taxRate) || 0,
        updated.organizationId,
        updated.memberRole,
        accent,
      );
      document.documentElement.setAttribute('data-accent', accent);
      queryClient.setQueryData(['my-business'], updated);
      showToast('Financial settings saved');
    },
    onError: () => showToast('Failed to save. Please try again.', true),
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    if (!profile.name.trim()) {
      setProfileError('Business name is required.');
      return;
    }
    saveProfile();
  };

  const handleFinancialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveFinancial();
  };

  const copyOrgId = async () => {
    if (!organizationId) return;
    await navigator.clipboard.writeText(organizationId);
    setCopiedOrg(true);
    setTimeout(() => setCopiedOrg(false), 2000);
  };

  return (
    <div className="relative min-h-full bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      {/* Toast */}
      <div
        className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg shadow-black/10 ring-1 text-sm font-medium transition-all duration-300 ${
          toast.visible ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0 pointer-events-none'
        } ${
          toast.isError
            ? 'bg-red-50 text-red-700 ring-red-200'
            : 'bg-white text-gray-800 ring-gray-200'
        }`}
      >
        {toast.isError ? (
          <span className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <svg className="h-2.5 w-2.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <span className="h-4 w-4 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
            <svg className="h-2.5 w-2.5 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {toast.message}
      </div>

      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <div className="mb-7">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-9 w-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-200 shrink-0">
              <svg className="h-[18px] w-[18px] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">Business Settings</h1>
          </div>
          <p className="text-sm text-gray-500 ml-12">Manage your business profile and financial configuration.</p>
        </div>

        {/* Permission notice */}
        {!canEditBusiness && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <svg className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm text-amber-800">
              Only Admins and Owners can edit business settings. You're viewing in read-only mode.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div className="h-4 w-36 rounded bg-gray-100 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => <SkeletonField key={i} />)}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
              <div className="h-4 w-36 rounded bg-gray-100 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SkeletonField />
                <SkeletonField />
              </div>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && !isLoading && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 mb-1">Failed to load settings</p>
            <p className="text-xs text-gray-400 mb-5">Check your connection and try again.</p>
            <Button variant="ghost" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        )}

        {/* Loaded content */}
        {!isLoading && !isError && business && (
          <div className="space-y-5">
            {/* Business Profile */}
            <SectionCard
              title="Business Profile"
              description="Basic information visible to your team."
            >
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Business name *"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. Mama Pima Boutique"
                      disabled={!canEditBusiness}
                      error={profileError}
                    />
                  </div>

                  <Select
                    label="Business type"
                    value={profile.type}
                    onChange={(e) => setProfile((p) => ({ ...p, type: e.target.value as BusinessType }))}
                    disabled={!canEditBusiness}
                  >
                    <option value="">Select type</option>
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </Select>

                  <Input
                    label="Phone"
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+255 7XX XXX XXX"
                    disabled={!canEditBusiness}
                  />

                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    placeholder="hello@yourbusiness.co.tz"
                    disabled={!canEditBusiness}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      label="Address"
                      value={profile.address}
                      onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                      placeholder="e.g. Kariakoo, Dar es Salaam"
                      disabled={!canEditBusiness}
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      rows={3}
                      value={profile.description}
                      onChange={(e) => setProfile((p) => ({ ...p, description: e.target.value }))}
                      placeholder="A short description of what your business does..."
                      disabled={!canEditBusiness}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition resize-none
                        focus:border-brand-500 focus:ring-2 focus:ring-brand-100
                        disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {canEditBusiness && (
                  <div className="flex justify-end pt-1">
                    <Button type="submit" loading={savingProfile}>
                      Save profile
                    </Button>
                  </div>
                )}
              </form>
            </SectionCard>

            {/* Financial Settings */}
            <SectionCard
              title="Financial Settings"
              description="Currency, tax rate, and brand colour for your dashboard."
            >
              <form onSubmit={handleFinancialSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Currency"
                    value={financial.currency}
                    onChange={(e) => setFinancial((f) => ({ ...f, currency: e.target.value }))}
                    disabled={!canEditBusiness}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </Select>

                  {/* Tax rate with inline % suffix */}
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Tax rate</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={financial.taxRate}
                        onChange={(e) => setFinancial((f) => ({ ...f, taxRate: e.target.value }))}
                        placeholder="0"
                        disabled={!canEditBusiness}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-9 text-sm outline-none transition
                          focus:border-brand-500 focus:ring-2 focus:ring-brand-100
                          disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Tanzania VAT is 18%. Set to 0 if your products are exempt.
                    </p>
                  </div>
                </div>

                {/* Accent colour picker */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Accent colour</p>
                  <div className="flex flex-wrap gap-2">
                    {ACCENT_COLORS.map((opt) => {
                      const isSelected = financial.accentColor === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={!canEditBusiness}
                          onClick={() => setFinancial((f) => ({ ...f, accentColor: opt.value }))}
                          title={opt.label}
                          className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all
                            disabled:cursor-not-allowed disabled:opacity-60
                            ${isSelected
                              ? 'border-transparent ring-2 shadow-sm'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                          style={isSelected ? {
                            backgroundColor: opt.swatch100,
                            color: opt.swatch600,
                            boxShadow: `0 0 0 2px ${opt.swatch600}`,
                          } : {}}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: opt.swatch600 }}
                          />
                          {opt.label}
                          {isSelected && (
                            <svg className="h-3 w-3 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Changes the colour theme across your entire dashboard.
                  </p>
                </div>

                {canEditBusiness && (
                  <div className="flex justify-end pt-1 border-t border-gray-100">
                    <Button type="submit" loading={savingFinancial}>
                      Save financial settings
                    </Button>
                  </div>
                )}
              </form>
            </SectionCard>

            {/* Account info */}
            <SectionCard title="Account Information">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1.5">Organization ID</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-600 truncate">
                      {organizationId ?? '—'}
                    </code>
                    <button
                      type="button"
                      onClick={copyOrgId}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition flex items-center gap-1.5"
                    >
                      {copiedOrg ? (
                        <>
                          <svg className="h-3.5 w-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Share this with support when reporting an issue.
                  </p>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-2 pt-3 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Business ID</p>
                    <p className="text-xs font-mono text-gray-500">{businessId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Your role</p>
                    <span className="inline-block rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 capitalize">
                      {role?.toLowerCase() ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
