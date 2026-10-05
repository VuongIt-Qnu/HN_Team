import type { PaymentMethod } from '@/types';

/** Kieu du lieu gio hang POS (Multi-tab Orders). */

export interface CartLine {
  lineId: string;
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  /** Gia niem yet - dung de phat hien nguoi dung da sua gia. */
  basePrice: number;
  unitPrice: number;
  quantity: number;
  discount: number;
  stock: number;
}

export interface OrderTab {
  tabId: string;
  label: string;
  customerId?: string;
  customerName: string;
  lines: CartLine[];
  orderDiscount: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  note: string;
  /** Ky thuat duoc gan khi chon thanh toan COD (de don tu vao tuyen /shipping/cod). */
  technicianId?: string;
  technicianName?: string;
  /** Dia chi giao hang khi chon thanh toan COD. */
  deliveryAddress?: string;
  createdAt: string;
}

export const POS_UNKNOWN_CUSTOMER = 'Khách lẻ (không định danh)';

export function createOrderTab(index: number): OrderTab {
  return {
    tabId: `tab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    label: `Đơn ${index}`,
    customerName: POS_UNKNOWN_CUSTOMER,
    lines: [],
    orderDiscount: 0,
    paymentMethod: 'CASH',
    paidAmount: 0,
    note: '',
    createdAt: new Date().toISOString(),
  };
}

export function createCartLine(line: Omit<CartLine, 'lineId'>): CartLine {
  return { ...line, lineId: `ln_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
}

/** Tinh tong tien cua 1 tab: tam tinh, chiet khau, tien thua, ghi no. */
export function computeTabTotals(tab: OrderTab) {
  const subtotal = tab.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const lineDiscount = tab.lines.reduce((sum, line) => sum + line.discount, 0);
  const totalDiscount = lineDiscount + tab.orderDiscount;
  const total = Math.max(0, subtotal - totalDiscount);
  const discountPercent = subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0;
  const change = Math.max(0, tab.paidAmount - total);
  const debt = Math.max(0, total - tab.paidAmount);
  const quantity = tab.lines.reduce((sum, line) => sum + line.quantity, 0);
  const hasEditedPrice = tab.lines.some((line) => line.unitPrice !== line.basePrice);
  return { subtotal, lineDiscount, totalDiscount, total, discountPercent, change, debt, quantity, hasEditedPrice };
}
