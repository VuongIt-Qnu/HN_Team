import { hasPermission } from '@/lib/rbac';
import type { Order, OrderItem, ReportOverview, SessionUser, StockOperation } from '@/types';

/**
 * Tang so hoa du lieu tra ve API: loai bo thong tin GIA VON / LOI NHUAN
 * voi tai khoan khong duoc cap quyen VIEW_COST_PRICE (theo muc 4.4 cua skill).
 */

function stripItem(session: SessionUser, item: OrderItem): OrderItem {
  if (hasPermission(session, 'VIEW_COST_PRICE')) return item;
  const clone: OrderItem = { ...item };
  delete clone.costPrice;
  delete clone.lineProfit;
  return clone;
}

export function serializeOrder(session: SessionUser, order: Order): Order {
  return { ...order, items: order.items.map((item) => stripItem(session, item)) };
}

export function serializeOrders(session: SessionUser, orders: Order[]): Order[] {
  return orders.map((order) => serializeOrder(session, order));
}

export function serializeStockOperation(session: SessionUser, operation: StockOperation): StockOperation {
  if (hasPermission(session, 'VIEW_COST_PRICE')) return operation;
  const clone: StockOperation = {
    ...operation,
    items: operation.items.map((item) => {
      const itemClone = { ...item };
      delete itemClone.costPrice;
      return itemClone;
    }),
  };
  delete clone.totalValue;
  return clone;
}

export function serializeStockOperations(session: SessionUser, operations: StockOperation[]): StockOperation[] {
  return operations.map((operation) => serializeStockOperation(session, operation));
}

export function serializeReport(session: SessionUser, report: ReportOverview): ReportOverview {
  if (hasPermission(session, 'VIEW_COST_PRICE')) return report;
  const clone: ReportOverview = { ...report };
  delete clone.cost;
  delete clone.profit;
  delete clone.inventoryValue;
  const stripRow = <T extends { cost?: number; profit?: number }>(row: T): T => {
    const rowClone = { ...row };
    delete rowClone.cost;
    delete rowClone.profit;
    return rowClone;
  };
  clone.byDay = report.byDay.map(stripRow);
  clone.topProducts = report.topProducts.map(stripRow);
  clone.byStore = report.byStore.map(stripRow);
  return clone;
}
