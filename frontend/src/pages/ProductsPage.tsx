import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi, Product, ProductCategory, CreateProductInput, CreateCategoryInput, StockAdjustmentType } from '../api/products';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../lib/format';

// ─── Category pill ────────────────────────────────────────────

function CategoryBadge({ category }: { category: Pick<ProductCategory, 'name' | 'color'> | null }) {
  if (!category) return null;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: category.color ?? '#6b7280' }}
    >
      {category.name}
    </span>
  );
}

// ─── Product form ─────────────────────────────────────────────

type ProductFormProps = {
  businessId: string;
  categories: ProductCategory[];
  currency: string;
  initial?: Partial<Product>;
  onSuccess: () => void;
  onCancel: () => void;
};

function ProductForm({ businessId, categories, currency, initial, onSuccess, onCancel }: ProductFormProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    categoryId: initial?.categoryId ?? '',
    unitPrice: initial?.unitPrice ? String(parseFloat(initial.unitPrice)) : '',
    sku: initial?.sku ?? '',
    unit: initial?.unit ?? '',
    stockQuantity: initial?.stockQuantity ? String(parseFloat(initial.stockQuantity)) : '',
  });
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const data: CreateProductInput = {
        name: form.name.trim(),
        categoryId: form.categoryId || undefined,
        unitPrice: parseFloat(form.unitPrice),
        sku: form.sku.trim() || undefined,
        unit: form.unit.trim() || undefined,
        stockQuantity: form.stockQuantity ? parseFloat(form.stockQuantity) : undefined,
      };
      return initial?.id
        ? productsApi.update(businessId, initial.id, data)
        : productsApi.create(businessId, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', businessId] });
      onSuccess();
    },
    onError: () => setError('Failed to save product.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.unitPrice || isNaN(parseFloat(form.unitPrice))) return setError('Enter a valid price.');
    save.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Product name *"
        placeholder="e.g. Kitenge Fabric (1m)"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label={`Unit price (${currency}) *`}
          type="number"
          min="0"
          step="any"
          placeholder="0"
          value={form.unitPrice}
          onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
        />
        <Input
          label="Unit"
          placeholder="pcs, kg, m…"
          value={form.unit}
          onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
        />
      </div>
      <Select
        label="Category"
        value={form.categoryId}
        onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
      >
        <option value="">No category</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="SKU (optional)"
          placeholder="e.g. SKU-001"
          value={form.sku}
          onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
        />
        <Input
          label="Stock quantity"
          type="number"
          min="0"
          step="any"
          placeholder="Leave blank if not tracked"
          value={form.stockQuantity}
          onChange={(e) => setForm((f) => ({ ...f, stockQuantity: e.target.value }))}
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending} className="flex-1">
          {initial?.id ? 'Save changes' : 'Add product'}
        </Button>
      </div>
    </form>
  );
}

// ─── Category management modal ────────────────────────────────

function CategoriesModal({
  open,
  onClose,
  businessId,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  businessId: string;
  categories: ProductCategory[];
}) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#16a34a');
  const [adding, setAdding] = useState(false);

  const create = useMutation({
    mutationFn: (data: CreateCategoryInput) => productsApi.createCategory(businessId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories', businessId] });
      setNewName('');
      setAdding(false);
    },
  });

  const del = useMutation({
    mutationFn: (id: string) => productsApi.deleteCategory(businessId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', businessId] }),
  });

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" size="sm">
      <div className="space-y-3">
        {categories.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">No categories yet.</p>
        )}
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 py-1">
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: cat.color ?? '#6b7280' }}
            />
            <span className="text-sm text-gray-700 flex-1">{cat.name}</span>
            <button
              onClick={() => del.mutate(cat.id)}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              Remove
            </button>
          </div>
        ))}

        {adding ? (
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 shrink-0">Color</label>
              <input
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-gray-200"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="flex-1 text-xs py-2"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 text-xs py-2"
                loading={create.isPending}
                onClick={() => newName.trim() && create.mutate({ name: newName.trim(), color: newColor })}
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="mt-2 w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition"
          >
            + Add category
          </button>
        )}
      </div>
    </Modal>
  );
}

// ─── Stock adjustment modal ───────────────────────────────────

const ADJ_TYPE_LABELS: Record<StockAdjustmentType, string> = {
  RESTOCK: 'Restock (add)',
  RETURN: 'Customer return (add)',
  DAMAGE: 'Damaged / lost (remove)',
  ADJUSTMENT: 'Manual adjustment (remove)',
};

function StockAdjustModal({
  product,
  businessId,
  onClose,
}: {
  product: Product;
  businessId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<StockAdjustmentType>('RESTOCK');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Subscribe to the products cache so stock count updates live after an adjustment
  const { data: products = [] } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => productsApi.list(businessId),
  });
  const liveProduct = products.find((p) => p.id === product.id) ?? product;

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['stock-adjustments', businessId, product.id],
    queryFn: () => productsApi.listStockAdjustments(businessId, product.id),
  });

  const save = useMutation({
    mutationFn: () =>
      productsApi.addStockAdjustment(businessId, product.id, {
        type,
        quantity: parseFloat(quantity),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products', businessId] });
      qc.invalidateQueries({ queryKey: ['stock-adjustments', businessId, product.id] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary', businessId] });
      setQuantity('');
      setNote('');
      setError('');
    },
    onError: () => setError('Failed to save adjustment.'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) return setError('Enter a valid quantity.');
    save.mutate();
  };

  const currentStock = liveProduct.stockQuantity !== null ? parseFloat(liveProduct.stockQuantity) : null;

  return (
    <Modal open onClose={onClose} title={`Stock — ${product.name}`} size="md">
      <div className="space-y-5">
        {/* Current stock */}
        <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-600">Current stock</span>
          <span className="text-base font-bold text-gray-900">
            {currentStock !== null ? currentStock.toLocaleString() : '—'}
            {product.unit ? ` ${product.unit}` : ''}
          </span>
        </div>

        {/* Adjustment form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as StockAdjustmentType)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {(Object.entries(ADJ_TYPE_LABELS) as [StockAdjustmentType, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Input
            label="Quantity"
            type="number"
            min="0.001"
            step="any"
            placeholder="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
          <Input
            label="Note (optional)"
            placeholder="e.g. Supplier delivery, expired goods…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={save.isPending} className="w-full">
            Save adjustment
          </Button>
        </form>

        {/* History */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent history</p>
          {historyLoading ? (
            <div className="space-y-2 animate-pulse">
              {[0, 1].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-lg" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-gray-400">No adjustments recorded yet.</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
              {history.map((h) => {
                const isAddition = h.type === 'RESTOCK' || h.type === 'RETURN';
                return (
                  <div key={h.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">
                        <span className={`font-medium ${isAddition ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isAddition ? '+' : '-'}{parseFloat(h.quantity).toLocaleString()}
                        </span>
                        {' · '}{ADJ_TYPE_LABELS[h.type].split(' (')[0]}
                      </p>
                      {h.note && <p className="text-xs text-gray-400 truncate">{h.note}</p>}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">
                      {h.createdBy.firstName} {h.createdBy.lastName[0]}.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────

export function ProductsPage() {
  const { businessId, currency } = useBusinessStore();
  const { canManageProducts } = useRole();
  const { t } = useTranslation();
  const [productModal, setProductModal] = useState<'new' | Product | null>(null);
  const [catModal, setCatModal] = useState(false);
  const [stockModal, setStockModal] = useState<Product | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => productsApi.list(businessId!),
    enabled: !!businessId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', businessId],
    queryFn: () => productsApi.listCategories(businessId!),
    enabled: !!businessId,
  });

  const qc = useQueryClient();
  const archive = useMutation({
    mutationFn: (id: string) => productsApi.remove(businessId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products', businessId] }),
  });

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('products.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('products.inCatalog', { count: products.length })}
          </p>
        </div>
        {canManageProducts && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCatModal(true)}
              className="text-sm font-medium text-gray-600 bg-white ring-1 ring-gray-200 rounded-xl px-3 py-2.5 hover:bg-gray-50 transition"
            >
              {t('products.categories')}
            </button>
            <Button onClick={() => setProductModal('new')}>
              + {t('products.addProduct')}
            </Button>
          </div>
        )}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[0, 1, 2].map((i) => <div key={i} className="h-36 bg-gray-100 rounded-2xl" />)}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gray-50 flex items-center justify-center">
            <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-700">{t('products.noProducts')}</p>
            <p className="text-sm text-gray-400 mt-1">{t('products.noProductsSub')}</p>
          </div>
          {canManageProducts && (
            <Button onClick={() => setProductModal('new')}>{t('products.addFirstProduct')}</Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl p-5 ring-1 ring-gray-100 shadow-sm flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  {p.sku && <p className="text-xs text-gray-400 mt-0.5">{p.sku}</p>}
                </div>
                <CategoryBadge category={p.category} />
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-brand-700">
                    {formatCurrency(p.unitPrice, currency)}
                  </p>
                  {p.unit && <p className="text-xs text-gray-400">{t('products.perUnit', { unit: p.unit })}</p>}
                </div>
                {p.stockQuantity !== null && (() => {
                  const stock = parseFloat(p.stockQuantity!);
                  const threshold = p.lowStockThreshold !== null ? parseFloat(p.lowStockThreshold!) : null;
                  const isLow = threshold !== null && stock <= threshold;
                  return (
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isLow ? 'text-amber-600' : 'text-gray-700'}`}>
                        {stock.toLocaleString()}
                        {isLow && (
                          <span className="ml-1 text-xs">⚠</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">{t('products.inStock')}</p>
                    </div>
                  );
                })()}
              </div>

              {canManageProducts && (
                <div className="flex gap-2 pt-1 border-t border-gray-50">
                  <button
                    onClick={() => setProductModal(p)}
                    className="flex-1 text-xs font-medium text-brand-600 hover:text-brand-700 py-1"
                  >
                    {t('common.edit')}
                  </button>
                  {p.stockQuantity !== null && (
                    <button
                      onClick={() => setStockModal(p)}
                      className="flex-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 py-1"
                    >
                      {t('products.stock')}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(t('products.confirmArchive', { name: p.name }))) archive.mutate(p.id);
                    }}
                    className="flex-1 text-xs font-medium text-gray-400 hover:text-red-500 py-1"
                  >
                    {t('common.archive')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {canManageProducts && (
        <>
          <Modal
            open={productModal !== null}
            onClose={() => setProductModal(null)}
            title={productModal === 'new' ? t('products.addProduct') : t('products.editProduct')}
            size="md"
          >
            {productModal !== null && (
              <ProductForm
                businessId={businessId!}
                categories={categories}
                currency={currency}
                initial={productModal !== 'new' ? productModal : undefined}
                onSuccess={() => setProductModal(null)}
                onCancel={() => setProductModal(null)}
              />
            )}
          </Modal>
          <CategoriesModal
            open={catModal}
            onClose={() => setCatModal(false)}
            businessId={businessId!}
            categories={categories}
          />
        </>
      )}

      {stockModal && businessId && (
        <StockAdjustModal
          product={stockModal}
          businessId={businessId}
          onClose={() => setStockModal(null)}
        />
      )}
    </div>
  );
}
