import { useState } from 'react';
import { useBrandPalette } from '../hooks/useBrandPalette';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  dashboardApi, AnalyticsProduct, TopCustomer,
  CreditAgingBucket, ExpenseCategoryStat, CustomerInsight,
  BasketStats, AnalyticsHourStat, FullAnalytics,
} from '../api/dashboard';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { formatCurrency } from '../lib/format';

// ─── Helpers ──────────────────────────────────────────────────

const fmt = (d: Date) => d.toISOString().slice(0, 10);

type Preset = { label: string; days: number };
const PRESETS: Preset[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
];

function getPresetRange(days: number): [string, string] {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days + 1);
  return [fmt(from), fmt(to)];
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash', MPESA: 'M-Pesa', TIGOPESA: 'Tigo Pesa',
  AIRTELMONEY: 'Airtel Money', CARD: 'Card',
  BANK_TRANSFER: 'Bank', CREDIT: 'Credit', OTHER: 'Other',
};

// COLORS is computed dynamically inside components via useBrandPalette
const STATIC_ACCENT_COLORS = ['#0ea5e9', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const ttStyle = {
  border: 'none', borderRadius: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
  fontSize: 12, padding: '8px 12px',
};

function fmtTick(v: number) {
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M`
       : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K`
       : String(v);
}

// ─── Insight panel ────────────────────────────────────────────

function generateInsights(data: FullAnalytics, currency: string): string[] {
  const { summary, dayOfWeek, hourOfDay, products, customerInsight, creditAging, basketStats, paymentBreakdown } = data;
  const out: string[] = [];

  if (summary.revenuePct !== null) {
    if (summary.revenuePct > 20)
      out.push(`Revenue is up ${summary.revenuePct}% from the prior period — strong momentum.`);
    else if (summary.revenuePct < -20)
      out.push(`Revenue is down ${Math.abs(summary.revenuePct)}% from the prior period. Check which days or products underperformed.`);
  }

  if (summary.totalRevenue > 0) {
    if (summary.totalExpenses === 0) {
      out.push(`No expenses recorded this period — log your expenses to see your real profit margin.`);
    } else if (summary.profitMargin < 0) {
      out.push(`Expenses exceed revenue — you're at a loss of ${formatCurrency(Math.abs(summary.netProfit), currency)} this period. Review your largest cost categories below.`);
    } else if (summary.profitMargin < 10) {
      out.push(`Profit margin is ${summary.profitMargin}% — thin. Only ${summary.profitMargin} shillings remain from every 100 earned after expenses.`);
    } else if (summary.profitMargin >= 30) {
      out.push(`${summary.profitMargin}% profit margin — healthy. You're keeping ${summary.profitMargin} shillings from every 100 earned.`);
    }
  }

  const peakDow = [...dayOfWeek].sort((a, b) => b.salesCount - a.salesCount)[0];
  if (peakDow && peakDow.salesCount > 0) {
    const totalDowSales = dayOfWeek.reduce((s, d) => s + d.salesCount, 0);
    const peakPct = totalDowSales > 0 ? Math.round((peakDow.salesCount / totalDowSales) * 100) : 0;
    if (peakPct >= 20)
      out.push(`${peakDow.dayName} is your strongest day at ${peakPct}% of weekly sales. Make sure you're fully stocked before then.`);
  }

  const peakHr = [...hourOfDay].sort((a, b) => b.salesCount - a.salesCount)[0];
  if (peakHr && peakHr.salesCount > 0) {
    const fmtH = (h: number) => h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    out.push(`Most sales happen between ${fmtH(peakHr.hour)} and ${fmtH(peakHr.hour + 1)}. Staff up and restock before that window.`);
  }

  if (products.length > 0 && summary.totalRevenue > 0) {
    const top1Pct = Math.round((products[0].revenue / summary.totalRevenue) * 100);
    const top3Rev = products.slice(0, 3).reduce((s, p) => s + p.revenue, 0);
    const top3Pct = Math.round((top3Rev / summary.totalRevenue) * 100);
    if (top1Pct > 60)
      out.push(`"${products[0].name}" drives ${top1Pct}% of revenue — high concentration on one product. Diversifying reduces risk if demand shifts.`);
    else if (top3Pct >= 80 && products.length > 3)
      out.push(`Your top 3 products generate ${top3Pct}% of revenue. Keeping them in stock is non-negotiable.`);
  }

  const overdue = creditAging.filter(b => b.bucket === '31–90 days' || b.bucket === '90+ days');
  const overdueAmt = overdue.reduce((s, b) => s + b.amount, 0);
  const overdueCount = overdue.reduce((s, b) => s + b.count, 0);
  if (overdueAmt > 0)
    out.push(`${overdueCount} credit sale${overdueCount !== 1 ? 's' : ''} worth ${formatCurrency(overdueAmt, currency)} are 30+ days overdue. A follow-up call now recovers more than waiting.`);

  if (summary.totalSales >= 10 && basketStats.multiItemPct < 25) {
    const singlePct = 100 - basketStats.multiItemPct;
    out.push(`${singlePct}% of sales are single-item. Suggesting a complementary product at checkout could meaningfully lift your average order value.`);
  }

  const totalTracked = customerInsight.newCount + customerInsight.returningCount;
  if (totalTracked >= 5) {
    const retPct = Math.round((customerInsight.returningCount / totalTracked) * 100);
    if (retPct >= 60)
      out.push(`${retPct}% of tracked customers are returning — strong loyalty. Keeping existing customers happy is cheaper than acquiring new ones.`);
    else if (retPct < 25)
      out.push(`Only ${retPct}% of tracked customers come back. A small loyalty gesture — a discount or a thank-you — can move that number.`);
  }

  const creditPay = paymentBreakdown.find(p => p.method === 'CREDIT');
  if (creditPay && summary.totalRevenue > 0) {
    const pct = Math.round((creditPay.revenue / summary.totalRevenue) * 100);
    if (pct > 25)
      out.push(`${pct}% of revenue (${formatCurrency(creditPay.revenue, currency)}) is on credit. Collect promptly — credit that ages past 30 days is hard to recover.`);
  }

  return out.slice(0, 6);
}

function InsightPanel({ insights }: { insights: string[] }) {
  if (insights.length === 0) return null;
  return (
    <div className="rounded-2xl bg-brand-50 ring-1 ring-brand-100 p-5">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-4 w-4 text-brand-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.77 3.77 0 01-1.035.847l-.741.371v.75a1 1 0 01-1 1H9a1 1 0 01-1-1v-.75l-.741-.371a3.77 3.77 0 01-1.035-.847l-.347-.347z" />
        </svg>
        <h2 className="text-sm font-semibold text-brand-900">What your data is telling you</h2>
      </div>
      <ul className="space-y-2.5">
        {insights.map((text, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-brand-800 leading-snug">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand-400 shrink-0" />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────

function Stat({
  label, value, sub, pct, highlight,
}: {
  label: string; value: string; sub?: string; pct?: number | null; highlight?: 'profit' | 'loss';
}) {
  const pos = pct != null && pct >= 0;
  const valueColor = highlight === 'profit' ? 'text-emerald-700'
    : highlight === 'loss' ? 'text-red-600'
    : 'text-gray-900';
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 ring-1 ring-gray-100 shadow-sm min-w-0">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{label}</p>
      <p className={`mt-1.5 text-xl sm:text-2xl font-bold tracking-tight truncate ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      {pct != null && (
        <p className={`mt-2 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
          {pos ? '▲' : '▼'} {Math.abs(pct)}% vs prior period
        </p>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-900">{children}</h2>;
}

// ─── Product performance ──────────────────────────────────────

type SortKey = 'revenue' | 'units' | 'transactions';

function ProductTable({ products, currency }: { products: AnalyticsProduct[]; currency: string }) {
  const bp = useBrandPalette();
  const COLORS = [bp.b600, bp.b500, bp.b400, bp.b300, bp.b200, ...STATIC_ACCENT_COLORS];
  const [sort, setSort] = useState<SortKey>('revenue');
  const sorted = [...products].sort((a, b) => b[sort] - a[sort]);
  const max = sorted[0]?.[sort] ?? 1;
  const tabs: { key: SortKey; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'units', label: 'Units' },
    { key: 'transactions', label: 'Txns' },
  ];
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <SectionTitle>Product performance</SectionTitle>
        <div className="flex rounded-lg overflow-hidden ring-1 ring-gray-200 text-xs font-medium shrink-0">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setSort(t.key)}
              className={`px-2.5 py-1.5 transition ${sort === t.key ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        {sorted.map((p, i) => {
          const val = p[sort];
          const pct = max > 0 ? (val / max) * 100 : 0;
          const displayVal = sort === 'revenue'
            ? formatCurrency(val, currency)
            : val.toLocaleString() + (sort === 'units' ? ' units' : ' txns');
          return (
            <div key={p.name} className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-800 truncate min-w-0">{p.name}</span>
                  <span className="text-sm font-semibold text-gray-900 shrink-0 tabular-nums">{displayVal}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
              {sort === 'revenue' && (
                <span className="hidden sm:block text-xs text-gray-400 shrink-0 w-16 text-right tabular-nums">
                  {p.units.toLocaleString()} units
                </span>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">No product data for this period</p>
        )}
      </div>
    </div>
  );
}

// ─── Hour of day ──────────────────────────────────────────────

function HourChart({ data, currency }: { data: AnalyticsHourStat[]; currency: string }) {
  const bp = useBrandPalette();
  const peakHour = [...data].sort((a, b) => b.salesCount - a.salesCount)[0];
  const fmtHour = (h: number) => {
    if (h === 0) return '12am';
    if (h < 12) return `${h}am`;
    if (h === 12) return '12pm';
    return `${h - 12}pm`;
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Sales by hour of day</SectionTitle>
      {peakHour && peakHour.salesCount > 0 && (
        <p className="text-xs text-gray-400 mb-4 mt-0.5">
          Busiest: <span className="font-semibold text-brand-700">{fmtHour(peakHour.hour)}</span>
          {' '}({peakHour.salesCount.toLocaleString()} sales)
        </p>
      )}
      <ResponsiveContainer width="100%" height={170}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="hour"
            tickFormatter={(h) => h % 6 === 0 ? fmtHour(h) : ''}
            tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtTick}
            tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            formatter={(v, name) => [
              name === 'revenue' ? formatCurrency(Number(v), currency) : Number(v).toLocaleString(),
              name === 'revenue' ? 'Revenue' : 'Sales',
            ]}
            labelFormatter={(h) => `${fmtHour(Number(h))} – ${fmtHour(Number(h) + 1)}`}
            contentStyle={ttStyle} />
          <Bar dataKey="salesCount" name="sales" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.hour === peakHour?.hour ? bp.b600 : bp.b100} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Customer insight ─────────────────────────────────────────

function CustomerInsightCard({ insight, currency }: { insight: CustomerInsight; currency: string }) {
  const total = insight.newCount + insight.returningCount;
  const returningPct = total > 0 ? Math.round((insight.returningCount / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Customer breakdown</SectionTitle>
      <p className="text-xs text-gray-400 mb-4 mt-0.5">New vs returning in this period</p>

      {total === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No customer data — link customers to sales to see this</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-50 p-3 min-w-0">
              <p className="text-xs text-brand-600 font-medium">New customers</p>
              <p className="text-xl sm:text-2xl font-bold text-brand-700 mt-0.5">{insight.newCount}</p>
              <p className="text-xs text-brand-500 mt-0.5 truncate">{formatCurrency(insight.newRevenue, currency)}</p>
            </div>
            <div className="rounded-xl bg-purple-50 p-3 min-w-0">
              <p className="text-xs text-purple-600 font-medium">Returning</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-700 mt-0.5">{insight.returningCount}</p>
              <p className="text-xs text-purple-500 mt-0.5 truncate">{formatCurrency(insight.returningRevenue, currency)}</p>
            </div>
          </div>
          {returningPct > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Return rate</span>
                <span className="text-xs font-semibold text-gray-700">{returningPct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-purple-400" style={{ width: `${returningPct}%` }} />
              </div>
            </div>
          )}
          {insight.uncategorizedRevenue > 0 && (
            <p className="text-xs text-gray-400 break-words">
              {formatCurrency(insight.uncategorizedRevenue, currency)} from sales without a linked customer
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Top customers ────────────────────────────────────────────

function TopCustomerTable({ customers, currency }: { customers: TopCustomer[]; currency: string }) {
  const bp = useBrandPalette();
  const COLORS = [bp.b600, bp.b500, bp.b400, bp.b300, bp.b200, ...STATIC_ACCENT_COLORS];
  const maxRev = customers[0]?.revenue ?? 1;
  if (customers.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
        <SectionTitle>Top customers</SectionTitle>
        <p className="text-sm text-gray-400 mt-4 text-center py-4">
          Link customers to sales to see who your best customers are
        </p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Top customers by revenue</SectionTitle>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">Top {customers.length} in this period</p>
      <div className="space-y-3">
        {customers.map((c, i) => {
          const pct = maxRev > 0 ? (c.revenue / maxRev) * 100 : 0;
          const avgOrder = c.salesCount > 0 ? c.revenue / c.salesCount : 0;
          return (
            <div key={c.id} className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-gray-800 block truncate">{c.name}</span>
                    {c.phone && <span className="text-xs text-gray-400 block">{c.phone}</span>}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-semibold text-gray-900 block tabular-nums">
                      {formatCurrency(c.revenue, currency)}
                    </span>
                    <span className="text-xs text-gray-400 block whitespace-nowrap">
                      {c.salesCount} sale{c.salesCount !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400 block tabular-nums">
                      avg {formatCurrency(avgOrder, currency)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Credit aging ─────────────────────────────────────────────

const AGING_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  '0–7 days':   { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: '#16a34a' },
  '8–30 days':  { bg: 'bg-amber-50',   text: 'text-amber-700',   bar: '#f59e0b' },
  '31–90 days': { bg: 'bg-orange-50',  text: 'text-orange-700',  bar: '#f97316' },
  '90+ days':   { bg: 'bg-red-50',     text: 'text-red-700',     bar: '#ef4444' },
};

function CreditAgingCard({ buckets, currency }: { buckets: CreditAgingBucket[]; currency: string }) {
  const total = buckets.reduce((s, b) => s + b.amount, 0);
  const totalCount = buckets.reduce((s, b) => s + b.count, 0);

  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Credit aging</SectionTitle>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">
        {totalCount > 0
          ? `${totalCount} unpaid sale${totalCount !== 1 ? 's' : ''} · ${formatCurrency(total, currency)} outstanding`
          : 'No outstanding credit'}
      </p>
      <div className="space-y-3">
        {buckets.map((b) => {
          const colors = AGING_COLORS[b.bucket] ?? { bg: 'bg-gray-50', text: 'text-gray-700', bar: '#9ca3af' };
          const pct = total > 0 ? (b.amount / total) * 100 : 0;
          return (
            <div key={b.bucket}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${colors.bg} ${colors.text}`}>
                  {b.bucket}
                </span>
                <span className="text-xs text-gray-600 font-medium text-right tabular-nums truncate">
                  {b.count > 0 ? `${b.count} sale${b.count !== 1 ? 's' : ''} · ${formatCurrency(b.amount, currency)}` : '—'}
                </span>
              </div>
              {b.count > 0 && (
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: colors.bar }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expense by category ──────────────────────────────────────

function ExpenseCategoryCard({ data, total, currency }: { data: ExpenseCategoryStat[]; total: number; currency: string }) {
  const bp = useBrandPalette();
  const COLORS = [bp.b600, bp.b500, bp.b400, bp.b300, bp.b200, ...STATIC_ACCENT_COLORS];
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Expenses by category</SectionTitle>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">
        {total > 0 ? `${formatCurrency(total, currency)} total` : 'No expenses recorded'}
      </p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Add expense categories to see the breakdown</p>
      ) : (
        <div className="space-y-3">
          {data.map((e, i) => {
            const pct = total > 0 ? (e.amount / total) * 100 : 0;
            return (
              <div key={e.category}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm text-gray-700 font-medium truncate min-w-0">{e.category}</span>
                  <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                    {formatCurrency(e.amount, currency)} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full"
                    style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Basket distribution ──────────────────────────────────────

function BasketStatsCard({ stats }: { stats: BasketStats }) {
  const maxCount = Math.max(...stats.distribution.map(d => d.count), 1);
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
      <SectionTitle>Basket size distribution</SectionTitle>
      <p className="text-xs text-gray-400 mt-0.5 mb-4">Items per transaction</p>
      <div className="space-y-2.5">
        {stats.distribution.map((d) => {
          const pct = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
          return (
            <div key={d.items} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-14 shrink-0 font-medium">
                {d.items === '1' ? '1 item' : `${d.items} items`}
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-500 w-10 text-right shrink-0 tabular-nums">
                {d.count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export function AnalyticsPage() {
  const { businessId, currency } = useBusinessStore();
  const { canViewAnalytics } = useRole();
  const bp = useBrandPalette();
  const COLORS = [bp.b600, bp.b500, bp.b400, bp.b300, bp.b200, ...STATIC_ACCENT_COLORS];

  if (!canViewAnalytics) return <Navigate to="/sales" replace />;

  const [activePreset, setActivePreset] = useState(2);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [dateFrom, dateTo] = useCustom && customFrom && customTo
    ? [customFrom, customTo]
    : getPresetRange(PRESETS[activePreset].days);

  const { data, isLoading } = useQuery({
    queryKey: ['full-analytics', businessId, dateFrom, dateTo],
    queryFn: () => dashboardApi.getFullAnalytics(businessId!, dateFrom, dateTo),
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000,
  });

  const dayCount = Math.round((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / 86400000) + 1;
  const aggregateByWeek = dayCount > 60;

  const trendData = (() => {
    if (!data) return [];
    if (!aggregateByWeek) return data.revenueByDay;
    const weeks: Record<string, { date: string; revenue: number; salesCount: number }> = {};
    for (const d of data.revenueByDay) {
      const dt = new Date(d.date);
      const ws = new Date(dt);
      ws.setDate(dt.getDate() - dt.getDay());
      const key = fmt(ws);
      if (!weeks[key]) weeks[key] = { date: key, revenue: 0, salesCount: 0 };
      weeks[key].revenue += d.revenue;
      weeks[key].salesCount += d.salesCount;
    }
    return Object.values(weeks).sort((a, b) => a.date.localeCompare(b.date));
  })();

  const fmtDate = (s: string) =>
    new Date(s).toLocaleDateString('en', { day: 'numeric', month: 'short' });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 animate-pulse max-w-5xl">
        <div className="h-10 w-80 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3,4,5,6,7].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl" />
        {[0,1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-100 rounded-2xl" />)}
      </div>
    );
  }

  const { summary, dayOfWeek, hourOfDay, paymentBreakdown, revenueByMonth, basketStats, topCustomers, creditAging, expenseByCategory, customerInsight } = data;
  const insights = generateInsights(data, currency);
  const dowData = [...dayOfWeek].sort((a, b) => a.day - b.day);
  const peakDow = [...dayOfWeek].sort((a, b) => b.salesCount - a.salesCount)[0];

  return (
    <div className="space-y-5 max-w-5xl overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Deep insights for your business</p>
      </div>

      {/* Date range picker */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
        {/* Preset buttons */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button key={p.label} onClick={() => { setActivePreset(i); setUseCustom(false); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                !useCustom && activePreset === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs — own row, full-width on mobile */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Custom:</span>
          <input type="date" value={customFrom} max={customTo || fmt(new Date())}
            onChange={(e) => { setCustomFrom(e.target.value); setUseCustom(true); }}
            className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200" />
          <span className="text-xs text-gray-400">→</span>
          <input type="date" value={customTo} min={customFrom} max={fmt(new Date())}
            onChange={(e) => { setCustomTo(e.target.value); setUseCustom(true); }}
            className="flex-1 min-w-0 text-xs border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200" />
        </div>

        <p className="mt-2 text-xs text-gray-400">
          {new Date(dateFrom).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' — '}
          {new Date(dateTo).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
          {' · '}{dayCount} days
        </p>
      </div>

      {/* Summary row 1: core numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat label="Total revenue" value={formatCurrency(summary.totalRevenue, currency)} pct={summary.revenuePct} />
        <Stat label="Total sales" value={summary.totalSales.toLocaleString()} pct={summary.salesPct} />
        <Stat label="Avg order" value={formatCurrency(summary.avgOrderValue, currency)} />
        <Stat label="Units sold" value={summary.totalUnits.toLocaleString()}
          sub={`${(summary.totalUnits / (summary.totalSales || 1)).toFixed(1)} per txn`} />
      </div>

      {/* Summary row 2: profit + basket */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Stat
          label="Net profit"
          value={formatCurrency(summary.netProfit, currency)}
          sub={`Exp: ${formatCurrency(summary.totalExpenses, currency)}`}
          highlight={summary.netProfit >= 0 ? 'profit' : 'loss'}
        />
        <Stat
          label="Profit margin"
          value={`${summary.profitMargin}%`}
          highlight={summary.profitMargin >= 0 ? 'profit' : 'loss'}
        />
        <Stat
          label="Avg items / sale"
          value={String(basketStats.avgItemsPerSale)}
          sub="basket size"
        />
        <Stat
          label="Multi-item sales"
          value={`${basketStats.multiItemPct}%`}
          sub="2+ items"
        />
      </div>

      {/* Insights */}
      <InsightPanel insights={insights} />

      {/* Revenue trend */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <SectionTitle>Revenue trend {aggregateByWeek ? '(weekly)' : '(daily)'}</SectionTitle>
          <span className="text-xs text-gray-400 shrink-0 tabular-nums">
            {formatCurrency(summary.totalRevenue, currency)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="rev-grad-full" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={bp.b600} stopOpacity={0.15} />
                <stop offset="95%" stopColor={bp.b600} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDate}
              tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
              interval="preserveStartEnd" />
            <YAxis tickFormatter={fmtTick}
              tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              formatter={(v) => [formatCurrency(Number(v), currency), 'Revenue']}
              labelFormatter={(l) => new Date(l).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })}
              contentStyle={ttStyle} />
            <Area type="monotone" dataKey="revenue" stroke={bp.b600} strokeWidth={2}
              fill="url(#rev-grad-full)" dot={false} activeDot={{ r: 4, fill: bp.b600, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Day of week + Hour of day */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
          <SectionTitle>Sales by day of week</SectionTitle>
          {peakDow && (
            <p className="text-xs text-gray-400 mb-4 mt-0.5">
              Peak: <span className="font-semibold text-brand-700">{peakDow.dayName}</span>
              {' '}({peakDow.salesCount.toLocaleString()} sales)
            </p>
          )}
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={dowData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="dayName" tickFormatter={(v: string) => v.slice(0, 3)}
                tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtTick}
                tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip
                formatter={(v, name) => [
                  name === 'revenue' ? formatCurrency(Number(v), currency) : Number(v).toLocaleString(),
                  name === 'revenue' ? 'Revenue' : 'Sales',
                ]}
                contentStyle={ttStyle} />
              <Bar dataKey="salesCount" name="sales" radius={[4, 4, 0, 0]}>
                {dowData.map((d, i) => (
                  <Cell key={i} fill={d.day === peakDow?.day ? bp.b600 : bp.b100} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <HourChart data={hourOfDay} currency={currency} />
      </div>

      {/* Payment methods + Customer breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
          <SectionTitle>Payment methods</SectionTitle>
          <p className="text-xs text-gray-400 mb-4 mt-0.5">By revenue share</p>
          <div className="space-y-3">
            {paymentBreakdown.map((p, i) => {
              const pct = summary.totalRevenue > 0 ? (p.revenue / summary.totalRevenue) * 100 : 0;
              return (
                <div key={p.method}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm text-gray-700 font-medium truncate">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                    <span className="text-xs text-gray-500 shrink-0 tabular-nums">
                      {formatCurrency(p.revenue, currency)} · {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <CustomerInsightCard insight={customerInsight} currency={currency} />
      </div>

      {/* Product performance */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
        <ProductTable products={data.products} currency={currency} />
      </div>

      {/* Basket distribution */}
      <BasketStatsCard stats={basketStats} />

      {/* Top customers */}
      <TopCustomerTable customers={topCustomers} currency={currency} />

      {/* Credit aging + Expense by category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CreditAgingCard buckets={creditAging} currency={currency} />
        <ExpenseCategoryCard data={expenseByCategory} total={summary.totalExpenses} currency={currency} />
      </div>

      {/* Month-over-month table */}
      {revenueByMonth.length > 1 && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-5 sm:p-6">
          <SectionTitle>Month-over-month breakdown</SectionTitle>
          <div className="mt-4 overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
            <table className="w-full text-sm min-w-[540px]">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left pb-2.5 font-medium whitespace-nowrap pr-4">Month</th>
                  <th className="text-right pb-2.5 font-medium whitespace-nowrap px-3">Revenue</th>
                  <th className="text-right pb-2.5 font-medium whitespace-nowrap px-3">Expenses</th>
                  <th className="text-right pb-2.5 font-medium whitespace-nowrap px-3">Net profit</th>
                  <th className="text-right pb-2.5 font-medium whitespace-nowrap px-3">Sales</th>
                  <th className="text-right pb-2.5 font-medium whitespace-nowrap pl-3">vs prior</th>
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map((m, i) => {
                  const prior = revenueByMonth[i - 1];
                  const pct = prior && prior.revenue > 0
                    ? Math.round(((m.revenue - prior.revenue) / prior.revenue) * 100)
                    : null;
                  const isPos = pct !== null && pct >= 0;
                  const profitPos = m.netProfit >= 0;
                  return (
                    <tr key={m.month} className="border-b border-gray-50 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800 whitespace-nowrap pr-4">
                        {new Date(m.month + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap px-3">
                        {formatCurrency(m.revenue, currency)}
                      </td>
                      <td className="py-2.5 text-right text-gray-400 tabular-nums whitespace-nowrap px-3">
                        {m.expenses > 0 ? formatCurrency(m.expenses, currency) : '—'}
                      </td>
                      <td className={`py-2.5 text-right font-semibold text-xs tabular-nums whitespace-nowrap px-3 ${profitPos ? 'text-emerald-600' : 'text-red-500'}`}>
                        {m.expenses > 0 ? formatCurrency(m.netProfit, currency) : '—'}
                      </td>
                      <td className="py-2.5 text-right text-gray-500 tabular-nums whitespace-nowrap px-3">
                        {m.salesCount.toLocaleString()}
                      </td>
                      <td className={`py-2.5 text-right text-xs font-semibold whitespace-nowrap pl-3 ${
                        pct === null ? 'text-gray-300' : isPos ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {pct === null ? '—' : `${isPos ? '▲' : '▼'} ${Math.abs(pct)}%`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
