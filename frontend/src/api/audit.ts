import api from './client';

export type AuditEvent = {
  id: string;
  businessId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
};

export const auditApi = {
  list: (businessId: string, limit = 100) =>
    api.get<AuditEvent[]>(`/businesses/${businessId}/audit?limit=${limit}`).then((r) => r.data),
};
