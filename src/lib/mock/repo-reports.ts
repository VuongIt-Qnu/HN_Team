import type { ReportOverview, RevenueChartSeries, RevenueCharts, RevenueReportRow } from '@/types';
import { db } from './db';
import { cashbookSummary } from './repo-cashbook';
import { debtSummary } from './repo-debts';

/** Bao cao tong quan: doanh thu, loi nhuan, hang ban chay, theo chi nhanh (Mock). */

function rowCost(orders: ReturnType<typeof db>['orders']): number {
  return orders.reduce(
    (sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + (item.costPrice ?? 0) * item.quantity, 0),
    0,
  );
}

export function buildReportOverview(from: string, to: string): ReportOverview {
  const state = db();
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();

  const orders = state.orders.filter((order) => {
    const time = new Date(order.createdAt).getTime();
    return time >= fromTime && time <= toTime && order.status !== 'CANCELLED' && order.status !== 'DRAFT';
  });

  const revenue = orders.reduce((sum, order) => sum + order.total, 0);
  const cost = rowCost(orders);

  const dayMap = new Map<string, RevenueReportRow>();
  for (const order of orders) {
    const date = new Date(order.createdAt);
    const label = `${`${date.getDate()}`.padStart(2, '0')}/${`${date.getMonth() + 1}`.padStart(2, '0')}`;
    const orderCost = order.items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0);
    const row = dayMap.get(label) ?? { label, orderCount: 0, revenue: 0, cost: 0, profit: 0 };
    row.orderCount += 1;
    row.revenue += order.total;
    row.cost = (row.cost ?? 0) + orderCost;
    row.profit = row.revenue - (row.cost ?? 0);
    dayMap.set(label, row);
  }

  const productMap = new Map<string, RevenueReportRow>();
  for (const order of orders) {
    for (const item of order.items) {
      const row =
        productMap.get(item.productId) ?? { label: item.name, orderCount: 0, revenue: 0, cost: 0, profit: 0 };
      row.orderCount += item.quantity;
      row.revenue += item.lineTotal;
      row.cost = (row.cost ?? 0) + (item.costPrice ?? 0) * item.quantity;
      row.profit = row.revenue - (row.cost ?? 0);
      productMap.set(item.productId, row);
    }
  }

  const storeMap = new Map<string, RevenueReportRow>();
  for (const order of orders) {
    const orderCost = order.items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0);
    const row =
      storeMap.get(order.storeId) ?? { label: order.storeName, orderCount: 0, revenue: 0, cost: 0, profit: 0 };
    row.orderCount += 1;
    row.revenue += order.total;
    row.cost = (row.cost ?? 0) + orderCost;
    row.profit = row.revenue - (row.cost ?? 0);
    storeMap.set(order.storeId, row);
  }

  const inventoryValue = Object.entries(state.stockQty).reduce(
    (storeSum, [, productMap]) =>
      storeSum +
      Object.entries(productMap).reduce((sum, [productId, qty]) => {
        const product = state.products.find((p) => p.id === productId);
        return sum + (product?.costPrice ?? 0) * qty;
      }, 0),
    0,
  );

  const summary = debtSummary();

  return {
    from,
    to,
    revenue,
    orderCount: orders.length,
    customerDebt: summary.totalCustomerDebt,
    supplierDebt: summary.totalSupplierDebt,
    cashBalance: cashbookSummary().closingBalance,
    cost,
    profit: revenue - cost,
    inventoryValue,
    byDay: [...dayMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    byStore: [...storeMap.values()].sort((a, b) => b.revenue - a.revenue),
  };
}

/**
 * Du lieu 2 bieu do thong ke doanh thu (danh rieng cho tai khoan ROOT_ADMIN):
 * 1. Doanh thu tung NGAY TRONG THANG - 12 chuoi "Thang 1".."Thang 12" cua nam `year`.
 * 2. Doanh thu tung THANG TRONG NAM - so sanh nam `year` voi nam `year - 1`.
 *
 * Cach tinh giong `buildReportOverview`: bo qua don DRAFT va CANCELLED,
 * doanh thu lay theo `order.total` nen so lieu khop voi bang "Doanh thu theo ngay".
 */
export function buildRevenueCharts(year: number): RevenueCharts {
  const state = db();
  const daysInMonth = 31;
  const previousYear = year - 1;

  const dailyByMonth: RevenueChartSeries[] = Array.from({ length: 12 }, (_, index) => ({
    label: `Tháng ${index + 1}`,
    values: new Array<number>(daysInMonth).fill(0),
  }));

  const monthlyByYear: RevenueChartSeries[] = [
    { label: 'Năm nay', values: new Array<number>(12).fill(0) },
    { label: 'Năm ngoái', values: new Array<number>(12).fill(0) },
  ];

  for (const order of state.orders) {
    if (order.status === 'CANCELLED' || order.status === 'DRAFT') continue;
    const createdAt = new Date(order.createdAt);
    const orderYear = createdAt.getFullYear();
    if (orderYear !== year && orderYear !== previousYear) continue;

    const monthIndex = createdAt.getMonth();
    if (orderYear === year) {
      dailyByMonth[monthIndex].values[createdAt.getDate() - 1] += order.total;
      monthlyByYear[0].values[monthIndex] += order.total;
    } else {
      monthlyByYear[1].values[monthIndex] += order.total;
    }
  }

  return {
    year,
    previousYear,
    daysInMonth,
    dailyByMonth,
    monthlyByYear,
    yearTotal: monthlyByYear[0].values.reduce((sum, value) => sum + value, 0),
    previousYearTotal: monthlyByYear[1].values.reduce((sum, value) => sum + value, 0),
  };
}
