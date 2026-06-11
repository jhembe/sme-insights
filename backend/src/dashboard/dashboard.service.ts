import { Injectable } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private businesses: BusinessesService,
  ) {}

  async getSummary(userId: string, businessId: string) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    // LMTD: same day of month as today, capped at last day of prior month
    const today = now.getDate();
    const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(today, daysInLastMonth), 23, 59, 59, 999);

    const [thisPeriod, lastPeriod, recentDays, creditOwed, lowStockProducts] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { businessId, status: 'COMPLETED', date: { gte: thisMonthStart } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { businessId, status: 'COMPLETED', date: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.getDailyRevenue(businessId, 30),
      this.prisma.sale.aggregate({
        where: { businessId, paymentMethod: 'CREDIT', status: 'PENDING' },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.product.findMany({
        where: { businessId, isActive: true, stockQuantity: { not: null }, lowStockThreshold: { not: null } },
        select: { id: true, name: true, stockQuantity: true, lowStockThreshold: true, unit: true },
      }),
    ]);

    const thisRevenue = Number(thisPeriod._sum.totalAmount ?? 0);
    const lastRevenue = Number(lastPeriod._sum.totalAmount ?? 0);
    const revenuePct = lastRevenue === 0 ? null : Math.round(((thisRevenue - lastRevenue) / lastRevenue) * 100);
    const thisSales = thisPeriod._count.id;
    const lastSales = lastPeriod._count.id;
    const salesPct = lastSales === 0 ? null : Math.round(((thisSales - lastSales) / lastSales) * 100);

    const lowStock = lowStockProducts
      .filter((p) => p.stockQuantity !== null && p.lowStockThreshold !== null && p.stockQuantity <= p.lowStockThreshold)
      .map((p) => ({
        id: p.id, name: p.name,
        stockQuantity: Number(p.stockQuantity),
        lowStockThreshold: Number(p.lowStockThreshold),
        unit: p.unit,
      }));

    return {
      thisMonth: { revenue: thisRevenue, salesCount: thisSales },
      lastMonth: { revenue: lastRevenue, salesCount: lastSales },
      revenuePctChange: revenuePct,
      salesCountPctChange: salesPct,
      dailyRevenue: recentDays,
      creditOwed: { amount: Number(creditOwed._sum.totalAmount ?? 0), count: creditOwed._count.id },
      lowStockProducts: lowStock,
    };
  }

  private async getDailyRevenue(businessId: string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const sales = await this.prisma.sale.findMany({
      where: { businessId, status: 'COMPLETED', date: { gte: since } },
      select: { date: true, totalAmount: true },
      orderBy: { date: 'asc' },
    });

    const byDay: Record<string, number> = {};
    for (const s of sales) {
      const key = s.date.toISOString().slice(0, 10);
      byDay[key] = (byDay[key] ?? 0) + Number(s.totalAmount);
    }
    const result: { date: string; revenue: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, revenue: byDay[key] ?? 0 });
    }
    return result;
  }

  async getFullAnalytics(userId: string, businessId: string, dateFrom: Date, dateTo: Date) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');

    const endOfTo = dateTo; // already set to 23:59:59.999 by the controller
    const periodMs = endOfTo.getTime() - dateFrom.getTime();
    const prevTo = new Date(dateFrom.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - periodMs);
    const saleWhere = { businessId, status: 'COMPLETED' as const, date: { gte: dateFrom, lte: endOfTo } };
    const itemWhere = { sale: saleWhere };

    // ── Parallel data fetch — no items in the main sales query ────
    const [
      salesAgg,
      prevPeriod,
      salesLean,
      catalogGroupBy,
      adHocGroupBy,
      basketGroupBy,
      expenseRows,
      creditSales,
    ] = await Promise.all([
      this.prisma.sale.aggregate({
        where: saleWhere,
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.sale.aggregate({
        where: { businessId, status: 'COMPLETED', date: { gte: prevFrom, lte: prevTo } },
        _sum: { totalAmount: true }, _count: { id: true },
      }),
      // Lean sales rows — no items, only fields needed for time-series aggregation
      this.prisma.sale.findMany({
        where: saleWhere,
        select: { id: true, date: true, totalAmount: true, paymentMethod: true, customerId: true, createdAt: true },
      }),
      // Product breakdown: catalog items grouped by productId (stable across renames),
      // ad-hoc items (no productId) grouped by productName
      this.prisma.saleItem.groupBy({
        by: ['productId'],
        where: { ...itemWhere, productId: { not: null } },
        _sum: { lineTotal: true, quantity: true },
        _count: { id: true },
      }),
      this.prisma.saleItem.groupBy({
        by: ['productName'],
        where: { ...itemWhere, productId: null },
        _sum: { lineTotal: true, quantity: true },
        _count: { id: true },
      }),
      // Item count per sale for basket stats — aggregated in DB
      this.prisma.saleItem.groupBy({
        by: ['saleId'],
        where: itemWhere,
        _count: { id: true },
      }),
      this.prisma.expense.findMany({
        where: { businessId, date: { gte: dateFrom, lte: endOfTo } },
        select: { date: true, amount: true, category: { select: { name: true } } },
      }),
      this.prisma.sale.findMany({
        where: { businessId, paymentMethod: 'CREDIT', status: 'PENDING' },
        select: { date: true, totalAmount: true },
      }),
    ]);

    // ── Core totals ───────────────────────────────────────────────
    const totalRevenue = Number(salesAgg._sum.totalAmount ?? 0);
    const totalSales = salesAgg._count.id;
    const totalExpenses = expenseRows.reduce((s, e) => s + Number(e.amount), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0;
    const prevRevenue = Number(prevPeriod._sum.totalAmount ?? 0);
    const prevCount = prevPeriod._count.id;
    const revenuePct = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null;
    const salesPct = prevCount > 0 ? Math.round(((totalSales - prevCount) / prevCount) * 100) : null;
    const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // ── Expense breakdown by month and category ───────────────────
    const expensesByMonth: Record<string, number> = {};
    const expenseByCategoryMap: Record<string, number> = {};
    for (const e of expenseRows) {
      const mk = e.date.toISOString().slice(0, 7);
      expensesByMonth[mk] = (expensesByMonth[mk] ?? 0) + Number(e.amount);
      const cat = e.category?.name ?? 'Uncategorized';
      expenseByCategoryMap[cat] = (expenseByCategoryMap[cat] ?? 0) + Number(e.amount);
    }
    const expenseByCategory = Object.entries(expenseByCategoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // ── Credit aging ──────────────────────────────────────────────
    const now = new Date();
    const agingMap: Record<string, { count: number; amount: number }> = {
      '0–7 days':   { count: 0, amount: 0 },
      '8–30 days':  { count: 0, amount: 0 },
      '31–90 days': { count: 0, amount: 0 },
      '90+ days':   { count: 0, amount: 0 },
    };
    for (const c of creditSales) {
      const days = Math.floor((now.getTime() - new Date(c.date).getTime()) / 86400000);
      const bucket = days <= 7 ? '0–7 days' : days <= 30 ? '8–30 days' : days <= 90 ? '31–90 days' : '90+ days';
      agingMap[bucket].count++;
      agingMap[bucket].amount += Number(c.totalAmount);
    }
    const creditAging = Object.entries(agingMap).map(([bucket, v]) => ({ bucket, ...v }));

    // ── Products from DB groupBy ──────────────────────────────────
    // Catalog items: fetch current names from Product table (stable across renames)
    const catalogProductIds = catalogGroupBy
      .map((p) => p.productId)
      .filter((id): id is string => id != null);
    const productNameMap = new Map(
      catalogProductIds.length > 0
        ? (await this.prisma.product.findMany({
            where: { id: { in: catalogProductIds } },
            select: { id: true, name: true },
          })).map((p) => [p.id, p.name])
        : [],
    );

    const catalogProducts = catalogGroupBy.map((p) => {
      const revenue = Number(p._sum.lineTotal ?? 0);
      const units = Number(p._sum.quantity ?? 0);
      const name = (p.productId ? productNameMap.get(p.productId) : undefined) ?? 'Unknown';
      return { name, revenue, units, transactions: p._count.id, avgPrice: units > 0 ? Math.round(revenue / units) : 0 };
    });
    const adHocProducts = adHocGroupBy.map((p) => {
      const revenue = Number(p._sum.lineTotal ?? 0);
      const units = Number(p._sum.quantity ?? 0);
      return { name: p.productName, revenue, units, transactions: p._count.id, avgPrice: units > 0 ? Math.round(revenue / units) : 0 };
    });
    const products = [...catalogProducts, ...adHocProducts].sort((a, b) => b.revenue - a.revenue);
    const totalUnits = products.reduce((s, p) => s + p.units, 0);

    // ── Basket stats from DB groupBy ──────────────────────────────
    const basketCountMap = new Map(basketGroupBy.map((b) => [b.saleId, b._count.id]));
    const itemCounts = salesLean.map((s) => basketCountMap.get(s.id) ?? 0);
    const totalItems = itemCounts.reduce((s, c) => s + c, 0);
    const avgItemsPerSale = totalSales > 0 ? Math.round((totalItems / totalSales) * 10) / 10 : 0;
    const multiItemSales = itemCounts.filter(c => c > 1).length;
    const multiItemPct = totalSales > 0 ? Math.round((multiItemSales / totalSales) * 100) : 0;
    const distMap: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4+': 0 };
    for (const c of itemCounts) {
      const key = c <= 0 ? '1' : c >= 4 ? '4+' : String(c);
      distMap[key] = (distMap[key] ?? 0) + 1;
    }
    const basketDistribution = [
      { items: '1', count: distMap['1'] ?? 0 },
      { items: '2', count: distMap['2'] ?? 0 },
      { items: '3', count: distMap['3'] ?? 0 },
      { items: '4+', count: distMap['4+'] ?? 0 },
    ];

    // ── Single-pass lean sales aggregation (no item data needed) ──
    const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDay: Record<string, { revenue: number; salesCount: number }> = {};
    const byMonth: Record<string, { revenue: number; salesCount: number; units: number }> = {};
    const byDow: { revenue: number; salesCount: number }[] = Array.from({ length: 7 }, () => ({ revenue: 0, salesCount: 0 }));
    const byHour: { hour: number; salesCount: number; revenue: number }[] = Array.from({ length: 24 }, (_, i) => ({ hour: i, salesCount: 0, revenue: 0 }));
    const byPayment: Record<string, { revenue: number; count: number }> = {};
    const customerRevMap: Record<string, { revenue: number; count: number }> = {};

    for (const s of salesLean) {
      const dayKey = s.date.toISOString().slice(0, 10);
      const monthKey = s.date.toISOString().slice(0, 7);
      const dow = new Date(s.date).getDay();
      const hour = new Date(s.createdAt).getHours();
      const amt = Number(s.totalAmount);
      const saleItemCount = basketCountMap.get(s.id) ?? 0;

      byDay[dayKey] = byDay[dayKey] ?? { revenue: 0, salesCount: 0 };
      byDay[dayKey].revenue += amt;
      byDay[dayKey].salesCount += 1;

      byDow[dow].revenue += amt;
      byDow[dow].salesCount += 1;

      byHour[hour].salesCount += 1;
      byHour[hour].revenue += amt;

      byPayment[s.paymentMethod] = byPayment[s.paymentMethod] ?? { revenue: 0, count: 0 };
      byPayment[s.paymentMethod].revenue += amt;
      byPayment[s.paymentMethod].count += 1;

      if (s.customerId) {
        customerRevMap[s.customerId] = customerRevMap[s.customerId] ?? { revenue: 0, count: 0 };
        customerRevMap[s.customerId].revenue += amt;
        customerRevMap[s.customerId].count += 1;
      }

      byMonth[monthKey] = byMonth[monthKey] ?? { revenue: 0, salesCount: 0, units: 0 };
      byMonth[monthKey].revenue += amt;
      byMonth[monthKey].salesCount += 1;
      // units per month derived from product groupBy later; approximate via item counts
      byMonth[monthKey].units += saleItemCount;
    }

    // ── Revenue by day (fill gaps) ────────────────────────────────
    const revenueByDay: { date: string; revenue: number; salesCount: number }[] = [];
    const cur = new Date(dateFrom);
    while (cur <= endOfTo) {
      const key = cur.toISOString().slice(0, 10);
      revenueByDay.push({ date: key, ...(byDay[key] ?? { revenue: 0, salesCount: 0 }) });
      cur.setDate(cur.getDate() + 1);
    }

    // ── Revenue by month with expenses + profit ───────────────────
    const revenueByMonth = Object.entries(byMonth)
      .map(([month, v]) => {
        const expenses = expensesByMonth[month] ?? 0;
        return {
          month, ...v,
          avgOrderValue: v.salesCount > 0 ? v.revenue / v.salesCount : 0,
          expenses,
          netProfit: v.revenue - expenses,
        };
      })
      .sort((a, b) => a.month.localeCompare(b.month));

    const dayOfWeek = byDow.map((v, i) => ({ day: i, dayName: DOW[i], ...v }));
    const hourOfDay = byHour;

    const paymentBreakdown = Object.entries(byPayment)
      .map(([method, v]) => ({ method, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // ── Customer follow-up queries ────────────────────────────────
    let topCustomers: { id: string; name: string; phone: string | null; revenue: number; salesCount: number }[] = [];
    let newCount = 0, returningCount = 0, newRevenue = 0, returningRevenue = 0;
    const customerIdsInPeriod = Object.keys(customerRevMap);

    if (customerIdsInPeriod.length > 0) {
      const topCustomerIds = Object.entries(customerRevMap)
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 10)
        .map(([id]) => id);

      const [customerDetails, firstSaleDates] = await Promise.all([
        this.prisma.customer.findMany({
          where: { id: { in: topCustomerIds } },
          select: { id: true, name: true, phone: true },
        }),
        this.prisma.sale.groupBy({
          by: ['customerId'],
          where: { businessId, customerId: { in: customerIdsInPeriod } },
          _min: { date: true },
        }),
      ]);

      const detailMap = new Map(customerDetails.map(c => [c.id, c]));
      topCustomers = topCustomerIds
        .map(id => {
          const d = detailMap.get(id);
          if (!d) return null;
          const s = customerRevMap[id];
          return { id: d.id, name: d.name, phone: d.phone ?? null, revenue: s.revenue, salesCount: s.count };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);

      const firstSaleMap = new Map(firstSaleDates.map(f => [f.customerId, f._min.date]));
      for (const [custId, stats] of Object.entries(customerRevMap)) {
        const first = firstSaleMap.get(custId);
        if (!first) continue;
        if (new Date(first) >= dateFrom) {
          newCount++;
          newRevenue += stats.revenue;
        } else {
          returningCount++;
          returningRevenue += stats.revenue;
        }
      }
    }

    return {
      summary: {
        totalRevenue, totalSales, avgOrderValue, totalUnits,
        totalExpenses, netProfit, profitMargin,
        revenuePct, salesPct,
      },
      revenueByDay,
      revenueByMonth,
      dayOfWeek,
      hourOfDay,
      products,
      paymentBreakdown,
      basketStats: { avgItemsPerSale, multiItemPct, distribution: basketDistribution },
      topCustomers,
      creditAging,
      expenseByCategory,
      customerInsight: {
        newCount, returningCount, newRevenue, returningRevenue,
        uncategorizedRevenue: totalRevenue - newRevenue - returningRevenue,
      },
    };
  }

  async getAnalytics(userId: string, businessId: string) {
    await this.businesses.assertMinRole(userId, businessId, 'MANAGER');
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [salesThisMonth, expensesThisMonth] = await Promise.all([
      this.prisma.sale.findMany({
        where: { businessId, status: 'COMPLETED', date: { gte: monthStart } },
        select: {
          totalAmount: true, paymentMethod: true,
          items: { select: { productName: true, lineTotal: true } },
        },
      }),
      this.prisma.expense.aggregate({
        where: { businessId, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const productRevenue: Record<string, number> = {};
    const paymentTotals: Partial<Record<PaymentMethod, number>> = {};
    for (const s of salesThisMonth) {
      const amt = Number(s.totalAmount);
      paymentTotals[s.paymentMethod] = (paymentTotals[s.paymentMethod] ?? 0) + amt;
      for (const item of s.items) {
        productRevenue[item.productName] = (productRevenue[item.productName] ?? 0) + Number(item.lineTotal);
      }
    }

    const topProducts = Object.entries(productRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const paymentBreakdown = Object.entries(paymentTotals).map(([method, revenue]) => ({ method, revenue }));
    const totalRevenue = salesThisMonth.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalExpenses = Number(expensesThisMonth._sum.amount ?? 0);

    return { topProducts, paymentBreakdown, totalExpenses, netProfit: totalRevenue - totalExpenses, totalRevenue };
  }
}
