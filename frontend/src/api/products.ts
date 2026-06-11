import api from './client';

export type StockAdjustmentType = 'RESTOCK' | 'ADJUSTMENT' | 'DAMAGE' | 'RETURN';

export type StockAdjustment = {
  id: string;
  productId: string;
  businessId: string;
  type: StockAdjustmentType;
  quantity: string;
  note: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
};

export type CreateStockAdjustmentInput = {
  type: StockAdjustmentType;
  quantity: number;
  note?: string;
};

export type ProductCategory = {
  id: string;
  businessId: string;
  name: string;
  color: string | null;
  createdAt: string;
};

export type Product = {
  id: string;
  businessId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: string;
  unit: string | null;
  stockQuantity: string | null;
  lowStockThreshold: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: Pick<ProductCategory, 'id' | 'name' | 'color'> | null;
};

export type CreateProductInput = {
  name: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  unitPrice: number;
  unit?: string;
  stockQuantity?: number;
  lowStockThreshold?: number;
};

export type CreateCategoryInput = { name: string; color?: string };

export const productsApi = {
  listCategories: (businessId: string) =>
    api.get<ProductCategory[]>(`/businesses/${businessId}/categories`).then((r) => r.data),
  createCategory: (businessId: string, data: CreateCategoryInput) =>
    api.post<ProductCategory>(`/businesses/${businessId}/categories`, data).then((r) => r.data),
  updateCategory: (businessId: string, categoryId: string, data: CreateCategoryInput) =>
    api.patch<ProductCategory>(`/businesses/${businessId}/categories/${categoryId}`, data).then((r) => r.data),
  deleteCategory: (businessId: string, categoryId: string) =>
    api.delete(`/businesses/${businessId}/categories/${categoryId}`),

  list: (businessId: string) =>
    api.get<{ data: Product[]; total: number }>(`/businesses/${businessId}/products`).then((r) => r.data.data),
  create: (businessId: string, data: CreateProductInput) =>
    api.post<Product>(`/businesses/${businessId}/products`, data).then((r) => r.data),
  update: (businessId: string, productId: string, data: Partial<CreateProductInput & { isActive: boolean }>) =>
    api.patch<Product>(`/businesses/${businessId}/products/${productId}`, data).then((r) => r.data),
  remove: (businessId: string, productId: string) =>
    api.delete(`/businesses/${businessId}/products/${productId}`),

  listStockAdjustments: (businessId: string, productId: string) =>
    api.get<StockAdjustment[]>(`/businesses/${businessId}/products/${productId}/stock-adjustments`).then((r) => r.data),
  addStockAdjustment: (businessId: string, productId: string, data: CreateStockAdjustmentInput) =>
    api.post<StockAdjustment>(`/businesses/${businessId}/products/${productId}/stock-adjustments`, data).then((r) => r.data),
};
