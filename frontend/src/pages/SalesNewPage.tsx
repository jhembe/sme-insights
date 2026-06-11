import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, CreateSaleItemInput, PaymentMethod, PAYMENT_METHOD_LABELS } from '../api/sales';
import { productsApi, Product } from '../api/products';
import { customersApi, Customer } from '../api/customers';
import { useBusinessStore } from '../store/business.store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { formatCurrency } from '../lib/format';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { enqueue } from '../hooks/useOfflineQueue';

const today = () => new Date().toISOString().slice(0, 10);
const uid = () => crypto.randomUUID();

// ─── Types ────────────────────────────────────────────────────

type CartRow = {
  _key: string;
  product: Product | null;
  productName: string;
  unitPrice: string;
  quantity: string;
  discount: string;
};

function emptyRow(): CartRow {
  return { _key: uid(), product: null, productName: '', unitPrice: '', quantity: '1', discount: '' };
}

// ─── Product typeahead ────────────────────────────────────────

function ProductTypeahead({
  products,
  row,
  currency,
  onChange,
}: {
  products: Product[];
  row: CartRow;
  currency: string;
  onChange: (patch: Partial<CartRow>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const readOnly = !!row.product;

  const query = row.productName.trim().toLowerCase();
  const suggestions = !readOnly
    ? (query.length > 0 ? products.filter((p) => p.name.toLowerCase().includes(query)) : products)
    : [];

  useEffect(() => { setActiveIdx(-1); }, [row.productName]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const select = (p: Product) => {
    onChange({ product: p, productName: p.name, unitPrice: String(parseFloat(p.unitPrice)) });
    setOpen(false);
  };

  const clear = () => onChange({ product: null, productName: '', unitPrice: '' });

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]); }
    else if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          placeholder="Product name…"
          className={`w-full rounded-lg border px-3 py-2 text-sm outline-none transition pr-7
            ${readOnly ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-default' : 'border-gray-300 bg-white focus:border-brand-500 focus:ring-2 focus:ring-brand-100'}`}
          value={row.productName}
          readOnly={readOnly}
          autoComplete="off"
          onChange={(e) => { onChange({ product: null, productName: e.target.value, unitPrice: '' }); setOpen(true); }}
          onFocus={() => { if (!readOnly) setOpen(true); }}
          onKeyDown={handleKey}
        />
        {row.product && (
          <button type="button" onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-xl bg-white shadow-lg ring-1 ring-gray-100 py-1 max-h-52 overflow-auto">
          {suggestions.map((p, i) => {
            const stock = p.stockQuantity !== null ? parseFloat(p.stockQuantity) : null;
            const stockBadge = stock === null ? null
              : stock <= 0   ? <span className="text-xs font-medium text-red-500 shrink-0">Out</span>
              : stock <= 3   ? <span className="text-xs font-medium text-amber-500 shrink-0">{stock} left</span>
              :                <span className="text-xs text-gray-400 shrink-0">{stock} left</span>;
            return (
              <li key={p.id}>
                <button type="button" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => select(p)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition
                    ${i === activeIdx ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-800'}`}>
                  <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                  <span className="flex items-center gap-2 ml-2 shrink-0">
                    {stockBadge}
                    <span className="text-xs text-gray-400">{formatCurrency(p.unitPrice, currency)}{p.unit ? ` / ${p.unit}` : ''}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Customer typeahead ───────────────────────────────────────

function CustomerPicker({
  customers, selected, onSelect, onClear,
}: {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (c: Customer) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = query.trim()
    ? customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || (c.phone ?? '').includes(query)).slice(0, 6)
    : [];

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-3 py-2">
        <div>
          <p className="text-sm font-medium text-brand-800">{selected.name}</p>
          {selected.phone && <p className="text-xs text-brand-600">{selected.phone}</p>}
        </div>
        <button type="button" onClick={onClear} className="text-brand-400 hover:text-brand-700 ml-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <input type="text" placeholder="Search customer by name or phone…"
        value={query} onChange={(e) => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100" />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full rounded-xl bg-white shadow-lg ring-1 ring-gray-100 py-1 max-h-48 overflow-auto">
          {suggestions.map((c) => (
            <li key={c.id}>
              <button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onSelect(c); setQuery(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition">
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
                {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Cart row ─────────────────────────────────────────────────

function CartItemRow({
  row, products, currency, onChange, onRemove, canRemove,
}: {
  row: CartRow;
  products: Product[];
  currency: string;
  onChange: (patch: Partial<CartRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const catalogPrice = row.product ? parseFloat(row.product.unitPrice) : null;
  const qty = parseFloat(row.quantity) || 0;
  const price = parseFloat(row.unitPrice) || 0;
  const disc = parseFloat(row.discount) || 0;
  const lineTotal = qty * price - disc;

  const handlePrice = (val: string) => {
    if (catalogPrice !== null && parseFloat(val) > catalogPrice) return;
    onChange({ unitPrice: val });
  };

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <ProductTypeahead products={products} row={row} currency={currency} onChange={onChange} />
          {row.product && <p className="mt-0.5 text-xs text-brand-600">Catalog — name locked</p>}
        </div>
        {canRemove && (
          <button type="button" onClick={onRemove}
            className="mt-1 text-gray-300 hover:text-red-400 transition shrink-0">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Qty *</label>
          <input type="number" min="0.001" step="any" placeholder="1"
            value={row.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Unit price *</label>
          <input type="number" min="0" step="any" placeholder="0"
            value={row.unitPrice}
            onChange={(e) => handlePrice(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition" />
          {catalogPrice !== null && (
            <p className="mt-0.5 text-xs text-gray-400">Max {formatCurrency(catalogPrice, currency)}</p>
          )}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Discount</label>
          <input type="number" min="0" step="any" placeholder="0"
            value={row.discount}
            onChange={(e) => onChange({ discount: e.target.value })}
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition" />
        </div>
      </div>

      {qty > 0 && price > 0 && (
        <div className="flex items-center justify-between pt-1 border-t border-gray-200">
          <span className="text-xs text-gray-400">Line total</span>
          <span className="text-sm font-semibold text-gray-800">{formatCurrency(lineTotal, currency)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────

export function SalesNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { businessId, currency, taxRate } = useBusinessStore();
  const { t } = useTranslation();
  const online = useOnlineStatus();

  const { data: products = [] } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => productsApi.list(businessId!),
    enabled: !!businessId,
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: () => customersApi.list(businessId!),
    enabled: !!businessId,
  });

  const [cart, setCart] = useState<CartRow[]>([emptyRow()]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('');
  const [date, setDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const updateRow = (key: string, patch: Partial<CartRow>) =>
    setCart((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));

  const removeRow = (key: string) =>
    setCart((prev) => prev.filter((r) => r._key !== key));

  const addRow = () => setCart((prev) => [...prev, emptyRow()]);

  const subtotal = cart.reduce((s, r) => {
    const qty = parseFloat(r.quantity) || 0;
    const price = parseFloat(r.unitPrice) || 0;
    const disc = parseFloat(r.discount) || 0;
    return s + (qty * price - disc);
  }, 0);
  const taxAmount = taxRate > 0 ? subtotal * taxRate : 0;
  const total = subtotal + taxAmount;

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const items: CreateSaleItemInput[] = cart.map((r) => ({
        productId: r.product?.id,
        productName: r.productName.trim(),
        unitPrice: parseFloat(r.unitPrice),
        quantity: parseFloat(r.quantity),
        discount: parseFloat(r.discount) || undefined,
      }));
      return salesApi.create(businessId!, {
        items,
        paymentMethod: paymentMethod as PaymentMethod,
        date,
        notes: notes.trim() || undefined,
        customerId: selectedCustomer?.id,
        taxAmount: taxAmount || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sales', businessId] });
      qc.invalidateQueries({ queryKey: ['products', businessId] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary', businessId] });
      navigate('/sales');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to record sale. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    for (let i = 0; i < cart.length; i++) {
      const r = cart[i];
      const n = i + 1;
      if (!r.productName.trim()) return setError(`Item ${n}: product name is required.`);
      const price = parseFloat(r.unitPrice);
      if (!price || price <= 0) return setError(`Item ${n}: enter a valid unit price.`);
      if (r.product && price > parseFloat(r.product.unitPrice)) {
        return setError(`Item ${n}: price cannot exceed catalog price of ${formatCurrency(r.product.unitPrice, currency)}.`);
      }
      const qty = parseFloat(r.quantity);
      if (!qty || qty <= 0) return setError(`Item ${n}: enter a valid quantity.`);
    }
    if (!paymentMethod) return setError('Select a payment method.');
    if (!date) return setError('Select a sale date.');

    if (!online) {
      const items: CreateSaleItemInput[] = cart.map((r) => ({
        productId: r.product?.id,
        productName: r.productName.trim(),
        unitPrice: parseFloat(r.unitPrice),
        quantity: parseFloat(r.quantity),
        discount: parseFloat(r.discount) || undefined,
      }));
      enqueue({
        businessId: businessId!,
        payload: {
          items,
          paymentMethod: paymentMethod as PaymentMethod,
          date,
          notes: notes.trim() || undefined,
          customerId: selectedCustomer?.id,
          taxAmount: taxAmount || undefined,
        },
        queuedAt: new Date().toISOString(),
      });
      navigate('/sales');
      return;
    }

    mutate();
  };

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition mb-3">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-bold text-gray-900">Record a sale</h1>
        <p className="text-sm text-gray-500 mt-0.5">Add one or more items, then confirm payment details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Customer */}
        {customers.length > 0 && (
          <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Customer <span className="font-normal text-gray-400">(optional)</span></p>
            <CustomerPicker customers={customers} selected={selectedCustomer}
              onSelect={setSelectedCustomer} onClear={() => setSelectedCustomer(null)} />
          </div>
        )}

        {/* Cart */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Items</p>

          {cart.map((row) => (
            <CartItemRow
              key={row._key}
              row={row}
              products={products}
              currency={currency}
              onChange={(patch) => updateRow(row._key, patch)}
              onRemove={() => removeRow(row._key)}
              canRemove={cart.length > 1}
            />
          ))}

          <button type="button" onClick={addRow}
            className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-sm font-medium text-gray-400 hover:border-brand-300 hover:text-brand-600 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add another item
          </button>
        </div>

        {/* Order total */}
        {subtotal > 0 && (
          <div className="rounded-2xl bg-brand-50 ring-1 ring-brand-100 px-5 py-4 space-y-1.5">
            <div className="flex items-center justify-between text-sm text-brand-700">
              <span>Subtotal ({cart.length} item{cart.length !== 1 ? 's' : ''})</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            {taxRate > 0 && (
              <div className="flex items-center justify-between text-sm text-brand-600">
                <span>Tax ({(taxRate * 100).toFixed(0)}%)</span>
                <span>+{formatCurrency(taxAmount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-brand-200">
              <span className="text-base font-semibold text-brand-800">Total</span>
              <span className="text-xl font-bold text-brand-700">{formatCurrency(total, currency)}</span>
            </div>
          </div>
        )}

        {/* Payment details */}
        <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Payment details</p>

          <Select label="Payment method *" value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}>
            <option value="">Select payment method</option>
            {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </Select>

          <Input label="Date *" type="date" value={date} max={today()}
            onChange={(e) => setDate(e.target.value)} />

          <Input label="Notes (optional)" placeholder="Any extra details…"
            value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-3 pb-4">
          <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={isPending} className="flex-1">Record sale</Button>
        </div>
      </form>
    </div>
  );
}
