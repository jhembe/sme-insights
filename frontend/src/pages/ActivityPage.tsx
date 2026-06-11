import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';
import { auditApi, AuditEvent } from '../api/audit';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';
import { formatDate } from '../lib/format';

const ACTION_COLORS: Record<string, string> = {
  SALE_CREATED: 'bg-green-50 text-green-700',
  SALE_VOIDED: 'bg-red-50 text-red-700',
  EXPENSE_CREATED: 'bg-orange-50 text-orange-700',
  EXPENSE_UPDATED: 'bg-yellow-50 text-yellow-700',
  EXPENSE_DELETED: 'bg-red-50 text-red-600',
  STOCK_ADJUSTED: 'bg-blue-50 text-blue-700',
  PRODUCT_CREATED: 'bg-brand-50 text-brand-700',
  PRODUCT_UPDATED: 'bg-brand-50 text-brand-600',
  PRODUCT_DELETED: 'bg-red-50 text-red-600',
  MEMBER_ADDED: 'bg-purple-50 text-purple-700',
  MEMBER_REMOVED: 'bg-red-50 text-red-600',
};

function MetaChips({ meta }: { meta: Record<string, unknown> | null }) {
  if (!meta) return null;
  const entries = Object.entries(meta).filter(([k]) => k !== 'note' || meta[k]);
  if (entries.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1 mt-1">
      {entries.map(([k, v]) => (
        <span key={k} className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          <span className="text-gray-400">{k}</span>
          <span className="font-medium">{String(v)}</span>
        </span>
      ))}
    </span>
  );
}

export function ActivityPage() {
  const { t } = useTranslation();
  const { businessId } = useBusinessStore();
  const { canManageTeam } = useRole();

  if (!canManageTeam) return <Navigate to="/dashboard" replace />;

  const { data, isLoading } = useQuery({
    queryKey: ['audit', businessId],
    queryFn: () => auditApi.list(businessId!, 200),
    enabled: !!businessId,
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{t('activity.title')}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t('activity.noActivity', 'A tamper-proof record of every action taken in your business.')}
        </p>
      </div>

      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 px-6 py-4 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-48" />
                  <div className="h-3 bg-gray-100 rounded w-32" />
                </div>
                <div className="h-3 bg-gray-100 rounded w-24" />
              </div>
            ))}
          </div>
        ) : !data?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="h-12 w-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
              <svg className="h-6 w-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">{t('activity.noActivity')}</p>
            <p className="text-xs text-gray-400 mt-1">Actions recorded from now on will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {(data as AuditEvent[]).map((event) => (
              <div key={event.id} className="flex items-start gap-4 px-6 py-4 hover:bg-gray-50/50 transition">
                <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0 text-xs font-semibold text-brand-700 uppercase">
                  {event.user.firstName[0]}{event.user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {event.user.firstName} {event.user.lastName}
                    </span>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[event.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t(`activity.actions.${event.action}`, event.action)}
                    </span>
                  </div>
                  <MetaChips meta={event.meta} />
                </div>
                <time className="text-xs text-gray-400 shrink-0 tabular-nums pt-0.5">
                  {formatDate(event.createdAt)}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
