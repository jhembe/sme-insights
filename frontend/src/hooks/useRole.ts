import { useBusinessStore, MemberRole } from '../store/business.store';

const ROLE_RANK: Record<MemberRole, number> = {
  STAFF: 1,
  MANAGER: 2,
  ADMIN: 3,
  OWNER: 4,
};

function atLeast(role: MemberRole | null, min: MemberRole): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

export function useRole() {
  const role = useBusinessStore((s) => s.role);

  return {
    role,
    isOwner: role === 'OWNER',
    canManageTeam: atLeast(role, 'ADMIN'),
    canImportExport: atLeast(role, 'ADMIN'),
    canEditBusiness: atLeast(role, 'ADMIN'),
    canViewAnalytics: atLeast(role, 'MANAGER'),
    canManageProducts: atLeast(role, 'MANAGER'),
    canManageExpenses: atLeast(role, 'MANAGER'),
  };
}
