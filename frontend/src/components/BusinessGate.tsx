import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { businessesApi } from '../api/businesses';
import { useBusinessStore } from '../store/business.store';
import { useAuthStore } from '../store/auth.store';
import { AppShell } from './AppShell';

export function BusinessGate() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { setActiveBusiness } = useBusinessStore();

  const { data: business, isLoading } = useQuery({
    queryKey: ['my-business'],
    queryFn: businessesApi.getMyBusiness,
    enabled: isAuthenticated,
    retry: false,
  });

  useEffect(() => {
    if (business) {
      const accent = business.accentColor ?? 'green';
      setActiveBusiness(
        business.id,
        business.name,
        business.currency,
        parseFloat(business.taxRate) || 0,
        business.organizationId,
        business.memberRole,
        accent,
      );
      document.documentElement.setAttribute('data-accent', accent);
    }
  }, [business, setActiveBusiness]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return <Navigate to="/business-setup" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
