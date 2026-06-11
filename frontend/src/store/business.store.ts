import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type MemberRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'STAFF';

type BusinessState = {
  businessId: string | null;
  businessName: string | null;
  currency: string;
  taxRate: number;
  accentColor: string;
  organizationId: string | null;
  role: MemberRole | null;
  setActiveBusiness: (id: string, name: string, currency: string, taxRate: number, organizationId: string, role: MemberRole, accentColor?: string) => void;
  clearBusiness: () => void;
};

export const useBusinessStore = create<BusinessState>()(
  persist(
    (set) => ({
      businessId: null,
      businessName: null,
      currency: 'TZS',
      taxRate: 0,
      accentColor: 'green',
      organizationId: null,
      role: null,
      setActiveBusiness: (id, name, currency, taxRate, organizationId, role, accentColor = 'green') =>
        set({ businessId: id, businessName: name, currency, taxRate, accentColor, organizationId, role }),
      clearBusiness: () =>
        set({ businessId: null, businessName: null, currency: 'TZS', taxRate: 0, accentColor: 'green', organizationId: null, role: null }),
    }),
    {
      name: 'sme-business',
      partialize: (s) => ({
        businessId: s.businessId,
        businessName: s.businessName,
        currency: s.currency,
        taxRate: s.taxRate,
        accentColor: s.accentColor,
        organizationId: s.organizationId,
        role: s.role,
      }),
    },
  ),
);
