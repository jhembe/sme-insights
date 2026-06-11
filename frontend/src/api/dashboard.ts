import api from './client';

export type DailyStat = { date: string; revenue: number };

export type LowStockProduct = {
  id: string;
  name: string;
  stockQuantity: number;
  lowStockThreshold: number;
  unit: string | null;
};

export type DashboardSummary = {
  thisMonth: { revenue: number; salesCount: number };
  lastMonth: { revenue: number; salesCount: number };
  revenuePctChange: number | null;
  salesCountPctChange: number | null;
  dailyRevenue: DailyStat[];
  creditOwed: { amount: number; count: number };
  lowStockProducts: LowStockProduct[];
};

export type TopProduct = { name: string; revenue: number };
export type PaymentStat = { method: string; revenue: number };

export type DashboardAnalytics = {
  topProducts: TopProduct[];
  paymentBreakdown: PaymentStat[];
  totalExpenses: number;
  netProfit: number;
  totalRevenue: number;
};

export type FullAnalyticsSummary = {
  totalRevenue: number;
  totalSales: number;
  avgOrderValue: number;
  totalUnits: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenuePct: number | null;
  salesPct: number | null;
};

export type AnalyticsDayStat = { date: string; revenue: number; salesCount: number };
export type AnalyticsMonthStat = {
  month: string;
  revenue: number;
  salesCount: number;
  units: number;
  avgOrderValue: number;
  expenses: number;
  netProfit: number;
};
export type AnalyticsDowStat = { day: number; dayName: string; revenue: number; salesCount: number };
export type AnalyticsHourStat = { hour: number; salesCount: number; revenue: number };
export type AnalyticsProduct = {
  name: string;
  revenue: number;
  units: number;
  transactions: number;
  avgPrice: number;
};
export type AnalyticsPayment = { method: string; revenue: number; count: number };

export type BasketStats = {
  avgItemsPerSale: number;
  multiItemPct: number;
  distribution: { items: string; count: number }[];
};

export type TopCustomer = {
  id: string;
  name: string;
  phone: string | null;
  revenue: number;
  salesCount: number;
};

export type CreditAgingBucket = {
  bucket: string;
  count: number;
  amount: number;
};

export type ExpenseCategoryStat = {
  category: string;
  amount: number;
};

export type CustomerInsight = {
  newCount: number;
  returningCount: number;
  newRevenue: number;
  returningRevenue: number;
  uncategorizedRevenue: number;
};

export type FullAnalytics = {
  summary: FullAnalyticsSummary;
  revenueByDay: AnalyticsDayStat[];
  revenueByMonth: AnalyticsMonthStat[];
  dayOfWeek: AnalyticsDowStat[];
  hourOfDay: AnalyticsHourStat[];
  products: AnalyticsProduct[];
  paymentBreakdown: AnalyticsPayment[];
  basketStats: BasketStats;
  topCustomers: TopCustomer[];
  creditAging: CreditAgingBucket[];
  expenseByCategory: ExpenseCategoryStat[];
  customerInsight: CustomerInsight;
};

export const dashboardApi = {
  getSummary: (businessId: string) =>
    api.get<DashboardSummary>(`/businesses/${businessId}/dashboard/summary`).then((r) => r.data),

  getAnalytics: (businessId: string) =>
    api.get<DashboardAnalytics>(`/businesses/${businessId}/dashboard/analytics`).then((r) => r.data),

  getFullAnalytics: (businessId: string, dateFrom: string, dateTo: string) =>
    api
      .get<FullAnalytics>(`/businesses/${businessId}/dashboard/full-analytics`, { params: { dateFrom, dateTo } })
      .then((r) => r.data),
};
