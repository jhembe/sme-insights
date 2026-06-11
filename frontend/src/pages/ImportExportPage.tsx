import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { importExportApi, ImportResult, RowError } from '../api/import-export';
import { subscriptionApi } from '../api/subscription';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { triggerDownload } from '../lib/download';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';

// ─── Subcomponents ───────────────────────────────────────────────────────────

function SectionCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-start gap-4">
        <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="px-6 py-5 space-y-6">{children}</div>
    </div>
  );
}

function FormatButtons({
  onCsv,
  onXlsx,
  isLoading,
  activeFormat,
}: {
  onCsv: () => void;
  onXlsx: () => void;
  isLoading: boolean;
  activeFormat: 'csv' | 'xlsx' | null;
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onCsv}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
      >
        {isLoading && activeFormat === 'csv' ? (
          <span className="h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="h-3.5 w-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        CSV
      </button>
      <button
        onClick={onXlsx}
        disabled={isLoading}
        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50"
      >
        {isLoading && activeFormat === 'xlsx' ? (
          <span className="h-3.5 w-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
        Excel
      </button>
    </div>
  );
}

function ImportResultDisplay({ result }: { result: ImportResult }) {
  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div
        className={`flex items-center gap-3 px-4 py-3 ${
          result.errors.length === 0
            ? 'bg-emerald-50 border-b border-emerald-100'
            : 'bg-amber-50 border-b border-amber-100'
        }`}
      >
        {result.errors.length === 0 ? (
          <svg className="h-4 w-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="h-4 w-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <p className="text-sm font-medium text-gray-800">
          {result.imported} row{result.imported !== 1 ? 's' : ''} imported
          {result.errors.length > 0 &&
            `, ${result.errors.length} skipped`}
        </p>
      </div>

      {result.errors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-medium text-gray-500 w-16">Row</th>
                <th className="px-4 py-2 font-medium text-gray-500 w-28">Field</th>
                <th className="px-4 py-2 font-medium text-gray-500 w-28">Value</th>
                <th className="px-4 py-2 font-medium text-gray-500">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result.errors.map((err: RowError, i: number) => (
                <tr key={i} className="hover:bg-red-50/30">
                  <td className="px-4 py-2 text-gray-600 font-mono">{err.row}</td>
                  <td className="px-4 py-2 text-gray-600">{err.field}</td>
                  <td className="px-4 py-2 font-mono text-red-600 truncate max-w-[6rem]" title={err.value}>
                    {err.value || '—'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{err.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FileUploadZone({
  onFile,
  isLoading,
  accept = '.csv,.xlsx',
}: {
  onFile: (file: File) => void;
  isLoading: boolean;
  accept?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 cursor-pointer transition
        ${dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'}
        ${isLoading ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {isLoading ? (
        <span className="h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )}
      <p className="text-sm text-gray-500 text-center">
        {isLoading ? 'Importing…' : (
          <>
            <span className="font-medium text-brand-600">Click to upload</span> or drag and drop
          </>
        )}
      </p>
      <p className="text-xs text-gray-400">CSV or Excel (.xlsx)</p>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function ExportLockedBanner() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 flex flex-col items-center justify-center text-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">Export is available on paid plans</p>
        <p className="text-xs text-gray-400 mt-0.5">Upgrade to download your data as CSV or Excel.</p>
      </div>
      <Link
        to="/billing"
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition"
      >
        View plans
      </Link>
    </div>
  );
}

export function ImportExportPage() {
  const { businessId, organizationId } = useBusinessStore();
  const { canImportExport } = useRole();
  const qc = useQueryClient();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => subscriptionApi.get(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
  const hasExports = subscription?.plan?.hasExports ?? false;

  if (!canImportExport) return <Navigate to="/dashboard" replace />;

  // Export date range (shared for sales & expenses)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Track which export format button triggered the mutation
  const [salesExportFmt, setSalesExportFmt] = useState<'csv' | 'xlsx' | null>(null);
  const [expensesExportFmt, setExpensesExportFmt] = useState<'csv' | 'xlsx' | null>(null);

  // Import results
  const [salesImportResult, setSalesImportResult] = useState<ImportResult | null>(null);
  const [productsImportResult, setProductsImportResult] = useState<ImportResult | null>(null);

  // ─ Export mutations ─
  const exportSalesMutation = useMutation({
    mutationFn: (fmt: 'csv' | 'xlsx') =>
      importExportApi.exportSales(businessId!, fmt, startDate || undefined, endDate || undefined),
    onSuccess: (blob, fmt) => {
      triggerDownload(blob, `sales.${fmt}`);
      setSalesExportFmt(null);
    },
    onError: () => setSalesExportFmt(null),
  });

  const exportExpensesMutation = useMutation({
    mutationFn: (fmt: 'csv' | 'xlsx') =>
      importExportApi.exportExpenses(businessId!, fmt, startDate || undefined, endDate || undefined),
    onSuccess: (blob, fmt) => {
      triggerDownload(blob, `expenses.${fmt}`);
      setExpensesExportFmt(null);
    },
    onError: () => setExpensesExportFmt(null),
  });

  // ─ Template mutations ─
  const salesTemplateMutation = useMutation({
    mutationFn: () => importExportApi.downloadTemplate(businessId!, 'sales'),
    onSuccess: (blob) => triggerDownload(blob, 'sales-template.xlsx'),
  });

  const productsTemplateMutation = useMutation({
    mutationFn: () => importExportApi.downloadTemplate(businessId!, 'products'),
    onSuccess: (blob) => triggerDownload(blob, 'products-template.xlsx'),
  });

  // ─ Import mutations ─
  const importSalesMutation = useMutation({
    mutationFn: (file: File) => importExportApi.importSales(businessId!, file),
    onSuccess: (result) => {
      setSalesImportResult(result);
      if (result.imported > 0) {
        qc.invalidateQueries({ queryKey: ['sales', businessId] });
        qc.invalidateQueries({ queryKey: ['dashboard-summary', businessId] });
        qc.invalidateQueries({ queryKey: ['dashboard-analytics', businessId] });
      }
    },
  });

  const importProductsMutation = useMutation({
    mutationFn: (file: File) => importExportApi.importProducts(businessId!, file),
    onSuccess: (result) => {
      setProductsImportResult(result);
      if (result.imported > 0) {
        qc.invalidateQueries({ queryKey: ['products', businessId] });
      }
    },
  });

  const handleSalesExport = (fmt: 'csv' | 'xlsx') => {
    setSalesExportFmt(fmt);
    exportSalesMutation.mutate(fmt);
  };

  const handleExpensesExport = (fmt: 'csv' | 'xlsx') => {
    setExpensesExportFmt(fmt);
    exportExpensesMutation.mutate(fmt);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Import &amp; Export</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Download your data as CSV or Excel, or upload historical records in bulk.
        </p>
      </div>

      {/* ─── Export ─── */}
      <SectionCard
        title="Export data"
        description="Download your sales or expenses as a spreadsheet"
        icon={
          <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        }
      >
        {!hasExports ? (
          <ExportLockedBanner />
        ) : (
          <>
            {/* Date range filter */}
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Date range (optional)</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input label="" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="text-sm" />
                </div>
                <span className="text-sm text-gray-400">to</span>
                <div className="flex items-center gap-2">
                  <Input label="" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="text-sm" />
                </div>
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-gray-400 hover:text-gray-600 transition">
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Sales */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Sales</span>
                </div>
                <FormatButtons onCsv={() => handleSalesExport('csv')} onXlsx={() => handleSalesExport('xlsx')} isLoading={exportSalesMutation.isPending} activeFormat={salesExportFmt} />
                {exportSalesMutation.isError && <p className="text-xs text-red-500">Export failed. Try again.</p>}
              </div>
              {/* Expenses */}
              <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Expenses</span>
                </div>
                <FormatButtons onCsv={() => handleExpensesExport('csv')} onXlsx={() => handleExpensesExport('xlsx')} isLoading={exportExpensesMutation.isPending} activeFormat={expensesExportFmt} />
                {exportExpensesMutation.isError && <p className="text-xs text-red-500">Export failed. Try again.</p>}
              </div>
            </div>
          </>
        )}
      </SectionCard>

      {/* ─── Import ─── */}
      <SectionCard
        title="Import data"
        description="Upload historical records from CSV or Excel"
        icon={
          <svg className="h-5 w-5 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Import Sales */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Sales</p>
              <Button
                variant="ghost"
                loading={salesTemplateMutation.isPending}
                onClick={() => salesTemplateMutation.mutate()}
                className="text-xs"
              >
                <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template
              </Button>
            </div>
            <FileUploadZone
              onFile={(file) => {
                setSalesImportResult(null);
                importSalesMutation.mutate(file);
              }}
              isLoading={importSalesMutation.isPending}
            />
            {importSalesMutation.isError && (
              <p className="text-xs text-red-500">Upload failed. Check the file and try again.</p>
            )}
            {salesImportResult && <ImportResultDisplay result={salesImportResult} />}
          </div>

          {/* Import Products */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Products</p>
              <Button
                variant="ghost"
                loading={productsTemplateMutation.isPending}
                onClick={() => productsTemplateMutation.mutate()}
                className="text-xs"
              >
                <svg className="h-3.5 w-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Template
              </Button>
            </div>
            <FileUploadZone
              onFile={(file) => {
                setProductsImportResult(null);
                importProductsMutation.mutate(file);
              }}
              isLoading={importProductsMutation.isPending}
            />
            {importProductsMutation.isError && (
              <p className="text-xs text-red-500">Upload failed. Check the file and try again.</p>
            )}
            {productsImportResult && <ImportResultDisplay result={productsImportResult} />}
          </div>
        </div>

        {/* Column reference */}
        <details className="group">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none list-none flex items-center gap-1">
            <svg className="h-3 w-3 transition group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Column reference
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Sales columns</p>
              <table className="w-full text-xs text-gray-500">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['date', 'YYYY-MM-DD', true],
                    ['productName', 'Text', true],
                    ['quantity', 'Number', true],
                    ['unitPrice', 'Number', true],
                    ['paymentMethod', 'CASH / MPESA / TIGOPESA / AIRTELMONEY / CARD / BANK_TRANSFER / CREDIT / OTHER', true],
                    ['discount', 'Number', false],
                    ['status', 'COMPLETED / PENDING / CANCELLED / REFUNDED', false],
                    ['notes', 'Text', false],
                  ].map(([col, hint, req]) => (
                    <tr key={String(col)}>
                      <td className="py-1 pr-2 font-mono font-medium text-gray-700">{String(col)}</td>
                      <td className="py-1 pr-2 text-gray-400">{String(hint)}</td>
                      <td className="py-1">{req ? <span className="text-red-400">required</span> : <span className="text-gray-300">optional</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">Products columns</p>
              <table className="w-full text-xs text-gray-500">
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['name', 'Text', true],
                    ['unitPrice', 'Number', true],
                    ['sku', 'Text', false],
                    ['description', 'Text', false],
                    ['unit', 'Text (e.g. kg, pcs)', false],
                    ['stockQuantity', 'Number', false],
                    ['categoryName', 'Text', false],
                  ].map(([col, hint, req]) => (
                    <tr key={String(col)}>
                      <td className="py-1 pr-2 font-mono font-medium text-gray-700">{String(col)}</td>
                      <td className="py-1 pr-2 text-gray-400">{String(hint)}</td>
                      <td className="py-1">{req ? <span className="text-red-400">required</span> : <span className="text-gray-300">optional</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </SectionCard>
    </div>
  );
}
