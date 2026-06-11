import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, SaleFilters, PaymentMethod, PAYMENT_METHOD_LABELS, Sale, SaleItem } from '../api/sales';
import { useBusinessStore } from '../store/business.store';
import { formatCurrency, formatDate } from '../lib/format';

function printReceipt(sale: Sale, currency: string, businessName: string) {
  const subtotal = sale.items.reduce((s, i) => s + parseFloat(i.lineTotal), 0);
  const tax = parseFloat(sale.taxAmount);

  const rows = sale.items.map((item) => {
    const disc = parseFloat(item.discount);
    const detail = disc > 0
      ? `${item.quantity} × ${formatCurrency(parseFloat(item.unitPrice), currency)} − disc ${formatCurrency(disc, currency)}`
      : `${item.quantity} × ${formatCurrency(parseFloat(item.unitPrice), currency)}`;
    return `<tr>
      <td style="padding:3px 0;vertical-align:top">${item.productName}<br><span style="font-size:11px;color:#666">${detail}</span></td>
      <td style="padding:3px 0;text-align:right;vertical-align:top;white-space:nowrap">${formatCurrency(parseFloat(item.lineTotal), currency)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',monospace;font-size:12px;max-width:280px;margin:0 auto;padding:16px}
  table{width:100%;border-collapse:collapse}
  .center{text-align:center}.bold{font-weight:bold}.small{font-size:11px;color:#666}
  .dashed{border-top:1px dashed #555;margin:8px 0}
  .totrow td{padding:2px 0}.grand td{font-weight:bold;font-size:14px;border-top:1px solid #333;padding-top:4px}
</style></head><body>
  <div class="center bold" style="font-size:15px">${businessName}</div>
  <div class="center small">${new Date(sale.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</div>
  ${sale.customer ? `<div class="center small">Customer: ${sale.customer.name}</div>` : ''}
  <div class="dashed"></div>
  <table><tbody>${rows}</tbody></table>
  <div class="dashed"></div>
  <table>
    ${(sale.items.length > 1 || tax > 0) ? `<tr class="totrow"><td>Subtotal</td><td style="text-align:right">${formatCurrency(subtotal, currency)}</td></tr>` : ''}
    ${tax > 0 ? `<tr class="totrow"><td>Tax</td><td style="text-align:right">${formatCurrency(tax, currency)}</td></tr>` : ''}
    <tr class="grand"><td>TOTAL</td><td style="text-align:right">${formatCurrency(sale.totalAmount, currency)}</td></tr>
    <tr class="totrow"><td>Paid via</td><td style="text-align:right">${PAYMENT_METHOD_LABELS[sale.paymentMethod]}</td></tr>
    ${sale.paymentMethod === 'CREDIT' ? `<tr><td colspan="2" style="font-size:11px;color:#c2410c">CREDIT — payment pending</td></tr>` : ''}
  </table>
  ${sale.notes ? `<div class="dashed"></div><div class="small">Note: ${sale.notes}</div>` : ''}
  <div class="dashed"></div>
  <div class="center small">Thank you!</div>
</body></html>`;

  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: 'none' });
  document.body.appendChild(iframe);
  iframe.contentDocument!.write(html);
  iframe.contentDocument!.close();
  iframe.contentWindow!.focus();
  iframe.contentWindow!.print();
  setTimeout(() => document.body.removeChild(iframe), 1500);
}

function ItemsSummary({ items }: { items: SaleItem[] }) {
  if (items.length === 0) return <span className="text-gray-400">—</span>;
  const first = items[0].productName;
  if (items.length === 1) return <span className="font-medium text-gray-900 truncate max-w-[200px]">{first}</span>;
  return (
    <span className="font-medium text-gray-900">
      {first}
      <span className="ml-1.5 text-xs font-normal text-gray-400">+{items.length - 1} more</span>
    </span>
  );
}

function TotalUnits({ items }: { items: SaleItem[] }) {
  const total = items.reduce((s, i) => s + parseFloat(i.quantity), 0);
  return <>{total % 1 === 0 ? total.toLocaleString() : total.toFixed(2)}</>;
}

const METHOD_COLORS: Record<PaymentMethod, string> = {
  CASH: 'bg-amber-50 text-amber-700',
  MPESA: 'bg-emerald-50 text-emerald-700',
  TIGOPESA: 'bg-blue-50 text-blue-700',
  AIRTELMONEY: 'bg-red-50 text-red-700',
  CARD: 'bg-purple-50 text-purple-700',
  BANK_TRANSFER: 'bg-gray-100 text-gray-700',
  CREDIT: 'bg-orange-50 text-orange-700',
  OTHER: 'bg-gray-100 text-gray-600',
};

type Tab = 'all' | 'credit';

function MarkPaidModal({
  sale,
  onClose,
  businessId,
}: {
  sale: Sale;
  onClose: () => void;
  businessId: string;
}) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const { currency } = useBusinessStore();

  const markPaid = useMutation({
    mutationFn: () => salesApi.markAsPaid(businessId, sale.id, method),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales', businessId] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary', businessId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900">Mark as paid</h2>
        <div>
          <p className="text-sm text-gray-600">
            {sale.items.length > 0 && (
              <span className="font-medium">{sale.items[0].productName}{sale.items.length > 1 ? ` +${sale.items.length - 1} more` : ''}</span>
            )}
            {' — '}{formatCurrency(sale.totalAmount, currency)}
          </p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(sale.date)}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Payment received via</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
              .filter((m) => m !== 'CREDIT')
              .map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>)}
          </select>
        </div>
        {markPaid.isError && (
          <p className="text-sm text-red-600 rounded-lg bg-red-50 px-3 py-2">Failed to update sale.</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => markPaid.mutate()}
            disabled={markPaid.isPending}
            className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition"
          >
            {markPaid.isPending ? 'Saving…' : 'Confirm payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SalesPage() {
  const { businessId, currency, businessName } = useBusinessStore();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('all');
  const [markPaidSale, setMarkPaidSale] = useState<Sale | null>(null);

  const [filters, setFilters] = useState<SaleFilters>({ page: 1, limit: 50 });

  const activeFilters: SaleFilters = tab === 'credit'
    ? { paymentMethod: 'CREDIT', status: 'PENDING', page: filters.page, limit: filters.limit }
    : filters;

  const { data, isLoading } = useQuery({
    queryKey: ['sales', businessId, activeFilters],
    queryFn: () => salesApi.list(businessId!, activeFilters),
    enabled: !!businessId,
  });

  const sales = data?.data ?? [];
  const total = data?.total ?? 0;

  const clearFilters = () => setFilters({ page: 1, limit: 50 });
  const hasFilters = !!(filters.dateFrom || filters.dateTo || filters.paymentMethod);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('sales.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total.toLocaleString()} transaction{total !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/sales/new"
          className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition shadow-sm shadow-brand-200"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('sales.newSale')}
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['all', 'credit'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setFilters({ page: 1, limit: 50 }); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'all' ? 'All sales' : 'Credit / Unpaid'}
          </button>
        ))}
      </div>

      {/* Filters (only on all tab) */}
      {tab === 'all' && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">From</label>
              <input type="date" value={filters.dateFrom ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined, page: 1 }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">To</label>
              <input type="date" value={filters.dateTo ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined, page: 1 }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Payment</label>
              <select value={filters.paymentMethod ?? ''}
                onChange={(e) => setFilters((f) => ({ ...f, paymentMethod: (e.target.value as PaymentMethod) || undefined, page: 1 }))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition">
                <option value="">All methods</option>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
                ))}
              </select>
            </div>
            {hasFilters && (
              <button onClick={clearFilters} className="text-sm text-gray-400 hover:text-gray-600 py-2 transition">
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Credit tab banner */}
      {tab === 'credit' && total > 0 && (
        <div className="rounded-2xl bg-orange-50 ring-1 ring-orange-200 px-5 py-3 text-sm text-orange-800 font-medium">
          {total} unpaid credit sale{total !== 1 ? 's' : ''} — click "Mark as paid" when payment is received.
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
          <div className="hidden sm:block">
            <div className="border-b border-gray-100 px-5 py-3.5 flex gap-4">
              {[48, 96, 32, 52, 40].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-100 rounded animate-pulse`} style={{ width: `${w}px` }} />
              ))}
            </div>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="border-b border-gray-50 last:border-0 px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="h-3 w-16 bg-gray-100 rounded shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-40 bg-gray-100 rounded" />
                  <div className="h-2.5 w-24 bg-gray-50 rounded" />
                </div>
                <div className="h-3 w-8 bg-gray-100 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
                <div className="h-5 w-14 bg-gray-100 rounded-full" />
              </div>
            ))}
          </div>
          <div className="sm:hidden">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-b border-gray-50 last:border-0 px-4 py-3.5 flex items-center justify-between gap-3 animate-pulse">
                <div className="space-y-1.5">
                  <div className="h-3 w-32 bg-gray-100 rounded" />
                  <div className="h-2.5 w-20 bg-gray-50 rounded" />
                </div>
                <div className="space-y-1.5 text-right">
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-5 w-14 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center">
            {tab === 'credit' ? (
              <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-semibold text-gray-700">
              {tab === 'credit' ? t('sales.noCredit') : hasFilters ? t('sales.noSales') : t('sales.noSales')}
            </p>
            {tab === 'credit' && (
              <p className="text-sm text-gray-400 mt-1">{t('sales.noCredit')}</p>
            )}
            {!tab && hasFilters && (
              <p className="text-sm text-gray-400 mt-1">{t('sales.noSalesSub')}</p>
            )}
            {tab === 'all' && !hasFilters && (
              <p className="text-sm text-gray-400 mt-1">{t('sales.noSalesSub')}</p>
            )}
          </div>
          {tab !== 'credit' && !hasFilters && (
            <Link to="/sales/new"
              className="inline-flex items-center gap-2 bg-brand-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-brand-700 transition active:scale-95">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Record first sale
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Qty</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Total</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">{formatDate(s.date)}</td>
                    <td className="px-5 py-3.5">
                      <ItemsSummary items={s.items} />
                      {s.customer && <p className="text-xs text-gray-400">{s.customer.name}</p>}
                      {s.notes && <p className="text-xs text-gray-400 truncate max-w-[200px]">{s.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5 text-gray-700 text-right whitespace-nowrap">
                      <TotalUnits items={s.items} />
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900 text-right whitespace-nowrap">
                      {formatCurrency(s.totalAmount, currency)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${METHOD_COLORS[s.paymentMethod]}`}>
                        {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {tab === 'credit' && (
                          <button
                            onClick={() => setMarkPaidSale(s)}
                            className="text-xs font-semibold text-brand-600 hover:text-brand-700 whitespace-nowrap"
                          >
                            Mark as paid
                          </button>
                        )}
                        <button
                          onClick={() => printReceipt(s, currency, businessName ?? 'Business')}
                          title="Print receipt"
                          className="text-gray-400 hover:text-gray-600 transition"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="sm:hidden divide-y divide-gray-50">
            {sales.map((s) => (
              <div key={s.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate"><ItemsSummary items={s.items} /></div>
                  <p className="text-xs text-gray-400 mt-0.5">{formatDate(s.date)}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="font-semibold text-gray-900">{formatCurrency(s.totalAmount, currency)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${METHOD_COLORS[s.paymentMethod]}`}>
                    {PAYMENT_METHOD_LABELS[s.paymentMethod]}
                  </span>
                  {tab === 'credit' && (
                    <button onClick={() => setMarkPaidSale(s)}
                      className="block text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Mark as paid
                    </button>
                  )}
                  <button
                    onClick={() => printReceipt(s, currency, businessName ?? 'Business')}
                    className="text-gray-400 hover:text-gray-600 transition mt-1"
                    title="Print receipt"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > (filters.limit ?? 50) && (
            <div className="border-t border-gray-100 px-5 py-3.5 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {Math.min((filters.page ?? 1) * (filters.limit ?? 50), total)} of {total}
              </p>
              <div className="flex gap-2">
                <button disabled={(filters.page ?? 1) <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  Prev
                </button>
                <button disabled={(filters.page ?? 1) * (filters.limit ?? 50) >= total}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {markPaidSale && businessId && (
        <MarkPaidModal
          sale={markPaidSale}
          businessId={businessId}
          onClose={() => setMarkPaidSale(null)}
        />
      )}
    </div>
  );
}
