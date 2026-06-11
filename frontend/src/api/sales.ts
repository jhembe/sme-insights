import api from './client';

export type PaymentMethod =
  | 'CASH' | 'MPESA' | 'TIGOPESA' | 'AIRTELMONEY'
  | 'CARD' | 'BANK_TRANSFER' | 'CREDIT' | 'OTHER';

export type SaleStatus = 'COMPLETED' | 'PENDING' | 'CANCELLED' | 'REFUNDED';

export type SaleItem = {
  id: string;
  saleId: string;
  productId: string | null;
  productName: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  lineTotal: string;
  createdAt: string;
  product: { id: string; name: string } | null;
};

export type Sale = {
  id: string;
  businessId: string;
  customerId: string | null;
  createdById: string;
  date: string;
  taxAmount: string;
  totalAmount: string;
  paymentMethod: PaymentMethod;
  status: SaleStatus;
  notes: string | null;
  createdAt: string;
  items: SaleItem[];
  customer: { id: string; name: string; phone?: string | null } | null;
};

export type SaleListResponse = {
  data: Sale[];
  total: number;
  page: number;
  limit: number;
};

export type SaleFilters = {
  dateFrom?: string;
  dateTo?: string;
  productId?: string;
  paymentMethod?: PaymentMethod;
  status?: SaleStatus;
  page?: number;
  limit?: number;
};

export type CreateSaleItemInput = {
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
};

export type CreateSaleInput = {
  items: CreateSaleItemInput[];
  paymentMethod: PaymentMethod;
  date: string;
  notes?: string;
  customerId?: string;
  taxAmount?: number;
};

export const salesApi = {
  list: (businessId: string, filters?: SaleFilters) =>
    api.get<SaleListResponse>(`/businesses/${businessId}/sales`, { params: filters }).then((r) => r.data),
  findOne: (businessId: string, saleId: string) =>
    api.get<Sale>(`/businesses/${businessId}/sales/${saleId}`).then((r) => r.data),
  create: (businessId: string, data: CreateSaleInput) =>
    api.post<Sale>(`/businesses/${businessId}/sales`, data).then((r) => r.data),
  markAsPaid: (businessId: string, saleId: string, paymentMethod: PaymentMethod) =>
    api.patch<Sale>(`/businesses/${businessId}/sales/${saleId}/mark-paid`, { paymentMethod }).then((r) => r.data),
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  MPESA: 'M-Pesa',
  TIGOPESA: 'Tigo Pesa',
  AIRTELMONEY: 'Airtel Money',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank Transfer',
  CREDIT: 'Credit',
  OTHER: 'Other',
};
