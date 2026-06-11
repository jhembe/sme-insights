import api from './client';

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string | null;
};

export type Expense = {
  id: string;
  businessId: string;
  description: string;
  amount: number;
  date: string;
  categoryId: string | null;
  category: ExpenseCategory | null;
  createdAt: string;
};

export type CreateExpensePayload = {
  description: string;
  amount: number;
  date: string;
  categoryId?: string;
};

export type UpdateExpensePayload = Partial<CreateExpensePayload>;

export type CreateCategoryPayload = {
  name: string;
  color?: string;
};

export const expensesApi = {
  listCategories: (businessId: string) =>
    api
      .get<ExpenseCategory[]>(`/businesses/${businessId}/expense-categories`)
      .then((r) => r.data),

  createCategory: (businessId: string, payload: CreateCategoryPayload) =>
    api
      .post<ExpenseCategory>(`/businesses/${businessId}/expense-categories`, payload)
      .then((r) => r.data),

  list: (businessId: string) =>
    api
      .get<Expense[]>(`/businesses/${businessId}/expenses`)
      .then((r) => r.data),

  create: (businessId: string, payload: CreateExpensePayload) =>
    api
      .post<Expense>(`/businesses/${businessId}/expenses`, payload)
      .then((r) => r.data),

  update: (businessId: string, expenseId: string, payload: UpdateExpensePayload) =>
    api
      .patch<Expense>(`/businesses/${businessId}/expenses/${expenseId}`, payload)
      .then((r) => r.data),

  remove: (businessId: string, expenseId: string) =>
    api.delete(`/businesses/${businessId}/expenses/${expenseId}`),
};
