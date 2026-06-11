import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardAnalytics, dashboardApi } from '../api/dashboard';
import { useAuthStore } from '../store/auth.store';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { useBrandPalette } from '../hooks/useBrandPalette';
import { formatCurrency, formatPct } from '../lib/format';

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  TIGOPESA: 'Tigo Pesa',
  AIRTELMONEY: 'Airtel Money',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank',
  CREDIT: 'Credit',
  OTHER: 'Other',
};

function timeGreeting(firstName: string) {
  const h = new Date().getHours();
  const time = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${firstName}`;
}

function StatCard({
  label,
  value,
  sub,
  pct,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  pct: number | null;
  icon: React.ReactNode;
}) {
  const isPos = pct !== null && pct >= 0;
  return (
    <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
          <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
        </div>
        <div className="ml-4 h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
          {icon}
        </div>
      </div>
      {pct !== null && (
        <div className={`mt-4 flex items-center gap-1.5 text-xs font-medium ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
          <span>{isPos ? '▲' : '▼'}</span>
          <span>{formatPct(pct)} vs last month (same period)</span>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { businessId, currency } = useBusinessStore();
  const { canViewAnalytics } = useRole();
  const bp = useBrandPalette();
  const { t } = useTranslation();

  if (!canViewAnalytics) return <Navigate to="/sales" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary', businessId],
    queryFn: () => dashboardApi.getSummary(businessId!),
    enabled: !!businessId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['dashboard-analytics', businessId],
    queryFn: () => dashboardApi.getAnalytics(businessId!),
    enabled: !!businessId,
  });

  const now = new Date();
  const monthLabel = now.toLocaleString('en', { month: 'long', year: 'numeric' });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-52 bg-gray-100 rounded-xl" />
            <div className="h-4 w-32 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-10 w-28 bg-gray-100 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 space-y-3">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-gray-100 rounded" />
                  <div className="h-7 w-36 bg-gray-100 rounded-lg" />
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                </div>
                <div className="h-10 w-10 bg-gray-100 rounded-xl shrink-0" />
              </div>
              <div className="h-3 w-40 bg-gray-50 rounded mt-2" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 space-y-4">
          <div className="flex justify-between">
            <div className="h-4 w-40 bg-gray-100 rounded" />
            <div className="h-4 w-20 bg-gray-100 rounded" />
          </div>
          <div className="h-48 bg-gray-50 rounded-xl" />
        </div>
      </div>
    );
  }

  const { thisMonth, lastMonth, revenuePctChange, salesCountPctChange, dailyRevenue, creditOwed, lowStockProducts } = data;
  const hasRevenue = dailyRevenue.some((d) => d.revenue > 0);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {user ? timeGreeting(user.firstName) : 'Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('dashboard.monthOverview', { month: monthLabel })}</p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 active:scale-95 transition shadow-sm shadow-brand-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('nav.newSale')}
        </Link>
      </div>

      {/* Low-stock alert */}
      {lowStockProducts.length > 0 && (
        <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200 px-5 py-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {t('dashboard.lowStockAlert', { count: lowStockProducts.length })}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {lowStockProducts.map((p) => (
                  <li key={p.id} className="text-xs text-amber-700">
                    {p.name} — {p.stockQuantity} {p.unit ?? 'units'} left (threshold: {p.lowStockThreshold})
                  </li>
                ))}
              </ul>
              <Link to="/products" className="mt-2 inline-block text-xs font-semibold text-amber-700 hover:underline">
                {t('dashboard.manageProducts')} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Credit owed alert */}
      {creditOwed.count > 0 && (
        <div className="rounded-2xl bg-blue-50 ring-1 ring-blue-200 px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">{t('dashboard.owedToYou')}</p>
              <p className="text-xs text-blue-600">
                {t('dashboard.creditUnpaid', { count: creditOwed.count })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-bold text-blue-800">{formatCurrency(creditOwed.amount, currency)}</p>
            <Link to="/sales" className="text-xs text-blue-600 hover:underline font-medium">
              {t('common.view')} →
            </Link>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label={t('dashboard.revenueThisMonth')}
          value={formatCurrency(thisMonth.revenue, currency)}
          sub={t('dashboard.lmtd', { value: formatCurrency(lastMonth.revenue, currency) })}
          pct={revenuePctChange}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t('dashboard.salesThisMonth')}
          value={thisMonth.salesCount.toLocaleString()}
          sub={t('dashboard.lmtd', { value: lastMonth.salesCount.toLocaleString() })}
          pct={salesCountPctChange}
          icon={
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

      {/* Getting started — shown only to brand-new users with no revenue */}
      {!hasRevenue && (
        <div className="rounded-2xl bg-brand-50 ring-1 ring-brand-100 p-5">
          <p className="text-sm font-semibold text-brand-800">{t('dashboard.gettingStarted')}</p>
          <p className="text-xs text-brand-600 mt-0.5 mb-4">{t('dashboard.gettingStartedSub')}</p>
          <div className="space-y-3">
            {[
              { step: 1, label: t('dashboard.step1'), sub: t('dashboard.step1Sub'), to: '/products' },
              { step: 2, label: t('dashboard.step2'), sub: t('dashboard.step2Sub'), to: '/sales/new' },
              { step: 3, label: t('dashboard.step3'), sub: t('dashboard.step3Sub'), to: '/expenses' },
            ].map(({ step, label, sub, to }) => (
              <Link key={step} to={to}
                className="flex items-start gap-3 rounded-xl bg-white px-4 py-3 hover:bg-brand-50 transition group ring-1 ring-brand-100">
                <div className="h-6 w-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-brand-700 transition">{label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
                </div>
                <svg className="h-4 w-4 text-gray-300 group-hover:text-brand-500 transition ml-auto shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold text-gray-900">{t('dashboard.revenueLast30')}</h2>
          <Link to="/sales" className="text-xs text-brand-600 font-medium hover:underline">
            {t('dashboard.viewAllSales')} →
          </Link>
        </div>

        {!hasRevenue ? (
          <div className="h-48 flex flex-col items-center justify-center text-center gap-3">
            <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center">
              <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{t('sales.noSales')}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t('dashboard.chartEmpty')}</p>
            </div>
            <Link
              to="/sales/new"
              className="mt-1 text-sm font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              {t('dashboard.recordFirstSale')} →
            </Link>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={bp.b600} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={bp.b600} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={(v) =>
                  new Date(v).toLocaleDateString('en', { day: 'numeric', month: 'short' })
                }
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => {
                  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
                  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
                  return String(v);
                }}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={48}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(Number(v ?? 0), currency), 'Revenue']}
                labelFormatter={(l) =>
                  new Date(l).toLocaleDateString('en', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })
                }
                contentStyle={{
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                  fontSize: 12,
                  padding: '8px 12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke={bp.b600}
                strokeWidth={2}
                fill="url(#rev-grad)"
                dot={false}
                activeDot={{ r: 4, fill: bp.b600, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Analytics row — profit, top products, payment breakdown */}
      {analytics && <AnalyticsSection analytics={analytics} currency={currency} />}

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          {
            to: '/sales/new',
            label: t('dashboard.recordSale'),
            cls: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-200',
          },
          {
            to: '/sales',
            label: t('dashboard.viewAllSales'),
            cls: 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200',
          },
          {
            to: '/expenses',
            label: t('nav.expenses'),
            cls: 'bg-white text-gray-700 hover:bg-gray-50 ring-1 ring-gray-200',
          },
        ].map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className={`flex items-center justify-center text-sm font-semibold px-4 py-3 rounded-xl transition active:scale-95 ${a.cls}`}
          >
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function AnalyticsSection({
  analytics,
  currency,
}: {
  analytics: DashboardAnalytics;
  currency: string;
}) {
  const bp = useBrandPalette();
  const { t } = useTranslation();
  const CHART_COLORS = [bp.b600, bp.b500, bp.b400, bp.b300, bp.b200];

  const { topProducts, paymentBreakdown, netProfit, totalExpenses, totalRevenue } = analytics;
  const isProfit = netProfit >= 0;

  const paymentData = paymentBreakdown.map((p) => ({
    ...p,
    label: PAYMENT_LABELS[p.method] ?? p.method,
  }));

  return (
    <div className="space-y-4">
      {/* Net profit card */}
      <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm">
        <p className="text-sm text-gray-500 font-medium">{t('dashboard.netProfitThisMonth')}</p>
        <p className={`mt-1.5 text-2xl font-bold tracking-tight ${isProfit ? 'text-gray-900' : 'text-red-600'}`}>
          {formatCurrency(netProfit, currency)}
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-400">
          <span>{t('dashboard.revenue')}: <span className="text-gray-700 font-medium">{formatCurrency(totalRevenue, currency)}</span></span>
          <span>{t('dashboard.expenses')}: <span className="text-red-500 font-medium">{formatCurrency(totalExpenses, currency)}</span></span>
          {totalExpenses > 0 && totalRevenue > 0 && (
            <span>{t('dashboard.margin')}: <span className={`font-medium ${isProfit ? 'text-emerald-600' : 'text-red-500'}`}>
              {Math.round(((netProfit) / totalRevenue) * 100)}%
            </span></span>
          )}
        </div>
        {totalExpenses === 0 && (
          <Link to="/expenses" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            {t('dashboard.addExpensesPrompt')} →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top products */}
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('dashboard.topProductsThisMonth')}</h2>
          {topProducts.length === 0 ? (
            <p className="text-xs text-gray-400">{t('dashboard.noSalesThisMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={topProducts}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                  }
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={90}
                  tick={{ fontSize: 11, fill: '#374151' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: string) =>
                    v.length > 12 ? v.slice(0, 12) + '…' : v
                  }
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v), currency), 'Revenue']}
                  contentStyle={{
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                    fontSize: 12,
                    padding: '8px 12px',
                  }}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                  {topProducts.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">{t('dashboard.paymentMethodsThisMonth')}</h2>
          {paymentData.length === 0 ? (
            <p className="text-xs text-gray-400">{t('dashboard.noSalesThisMonth')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={paymentData}
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) =>
                    v >= 1_000_000
                      ? `${(v / 1_000_000).toFixed(1)}M`
                      : v >= 1_000
                      ? `${(v / 1_000).toFixed(0)}K`
                      : String(v)
                  }
                />
                <Tooltip
                  formatter={(v) => [formatCurrency(Number(v), currency), 'Revenue']}
                  contentStyle={{
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
                    fontSize: 12,
                    padding: '8px 12px',
                  }}
                />
                <Bar dataKey="revenue" fill={bp.b600} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
