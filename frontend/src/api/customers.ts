import api from './client';

export type Customer = {
  id: string;
  businessId: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
  _count?: { sales: number };
};

export type CreateCustomerInput = {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
};

export const customersApi = {
  list: (businessId: string) =>
    api.get<{ data: Customer[]; total: number }>(`/businesses/${businessId}/customers`).then((r) => r.data.data),
  create: (businessId: string, data: CreateCustomerInput) =>
    api.post<Customer>(`/businesses/${businessId}/customers`, data).then((r) => r.data),
  update: (businessId: string, id: string, data: CreateCustomerInput) =>
    api.patch<Customer>(`/businesses/${businessId}/customers/${id}`, data).then((r) => r.data),
  remove: (businessId: string, id: string) =>
    api.delete(`/businesses/${businessId}/customers/${id}`).then((r) => r.data),
};
