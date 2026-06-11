import { useQuery } from '@tanstack/react-query';
import { subscriptionApi, Plan } from '../api/subscription';
import { useBusinessStore } from '../store/business.store';
import { useRole } from '../hooks/useRole';

function UsageMeter({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const near = pct >= 80;
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm text-gray-600">{label}</span>
        <span className={`text-sm font-semibold ${near ? 'text-amber-600' : 'text-gray-900'}`}>
          {used} / {max}
        </span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${near ? 'bg-amber-400' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: Plan }) {
  const isFree = plan.priceMonthlyUsd === '0.00' || Number(plan.priceMonthlyUsd) === 0;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
      isFree ? 'bg-gray-100 text-gray-600' : 'bg-brand-100 text-brand-700'
    }`}>
      {plan.name}
    </span>
  );
}

export function BillingPage() {
  const { organizationId } = useBusinessStore();
  const { isOwner } = useRole();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', organizationId],
    queryFn: () => subscriptionApi.get(organizationId!),
    enabled: !!organizationId,
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4 animate-pulse max-w-xl">
        <div className="h-8 w-40 bg-gray-100 rounded-xl" />
        <div className="h-40 bg-gray-100 rounded-2xl" />
        <div className="h-32 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  const { plan, usage } = data;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your current plan and usage</p>
      </div>

      {/* Current plan card */}
      <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Current plan</p>
            <div className="flex items-center gap-2">
              {plan ? (
                <>
                  <p className="text-lg font-bold text-gray-900">{plan.name}</p>
                  <PlanBadge plan={plan} />
                </>
              ) : (
                <p className="text-lg font-bold text-gray-900">No plan assigned</p>
              )}
            </div>
            {plan && Number(plan.priceMonthlyUsd) === 0 && (
              <p className="text-sm text-gray-400 mt-0.5">Free forever</p>
            )}
          </div>
          <div className="h-10 w-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          </div>
        </div>

        {plan && (
          <div className="pt-3 border-t border-gray-50 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Max businesses</p>
              <p className="font-semibold text-gray-800 mt-0.5">{plan.maxBusinesses}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Max team members</p>
              <p className="font-semibold text-gray-800 mt-0.5">{plan.maxUsers}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Data history</p>
              <p className="font-semibold text-gray-800 mt-0.5">
                {plan.dataRetentionDays >= 36500 ? 'Unlimited' : `${plan.dataRetentionDays} days`}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Exports</p>
              <p className="font-semibold text-gray-800 mt-0.5">{plan.hasExports ? 'Included' : 'Not included'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Usage card */}
      {plan && (
        <div className="bg-white rounded-2xl p-6 ring-1 ring-gray-100 shadow-sm space-y-5">
          <p className="text-sm font-semibold text-gray-900">Usage</p>
          <UsageMeter label="Team members" used={usage.users} max={plan.maxUsers} />
          <UsageMeter label="Businesses" used={usage.businesses} max={plan.maxBusinesses} />
        </div>
      )}

      {/* Upgrade CTA — visible to owners only */}
      {isOwner && (
        <div className="bg-brand-50 rounded-2xl p-6 ring-1 ring-brand-100">
          <p className="text-sm font-semibold text-brand-900">Need more?</p>
          <p className="text-sm text-brand-700 mt-1">
            Paid plans with more team members, unlimited data history, and export access are coming soon.
          </p>
          <p className="text-xs text-brand-500 mt-3">
            Payments via M-Pesa and Tigo Pesa will be supported.
          </p>
        </div>
      )}
    </div>
  );
}
