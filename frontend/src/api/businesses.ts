import api from './client';
import { MemberRole } from '../store/business.store';

export type BusinessType =
  | 'RETAIL' | 'FOOD_AND_BEVERAGE' | 'SERVICES' | 'WHOLESALE'
  | 'MANUFACTURING' | 'AGRICULTURE' | 'TRANSPORT' | 'OTHER';

export type Business = {
  id: string;
  organizationId: string;
  name: string;
  type: BusinessType | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  taxRate: string;
  accentColor: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  memberRole: MemberRole;
};

export type CreateBusinessInput = {
  name: string;
  type?: BusinessType;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
  currency?: string;
  taxRate?: number;
  accentColor?: string;
};

export const businessesApi = {
  getMyBusiness: () => api.get<Business | null>('/businesses/me').then((r) => r.data),
  create: (data: CreateBusinessInput) => api.post<Business>('/businesses', data).then((r) => r.data),
  update: (id: string, data: Partial<CreateBusinessInput>) =>
    api.patch<Business>(`/businesses/${id}`, data).then((r) => r.data),
};
