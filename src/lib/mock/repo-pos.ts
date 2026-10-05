import { hasPermission } from '@/lib/rbac';
import { generateDocCode } from '@/lib/utils';
import type { CreateOrderInput, Order, OrderChannel, OrderItem, OrderStatus, SessionUser } from '@/types';
import {
  db,
  findCustomer,
  findProduct,
  findUserById,
  mutateStock,
  nextSequence,
  storeNameById,
  stockQtyOf,
} from './db';

/**
 * Nghiep vu ban hang (POS): tao hoa don + ap dung hieu ung kho & so quy.
 * Quy tac bat buoc:
 * - Thieu quyen EDIT_SELL_PRICE -> ep gia theo gia niem yet (khoa sua gia).
 * - Chiet khau vuot han muc va khong co quyen DISCOUNT_OVER_LIMIT -> tu choi.
 * - Khach le chua dinh danh phai thanh toan du (khong cho ghi no vo danh).
 * - Don nhap (DRAFT) duoc phep am kho de "giu hang" tam thoi.
 * - Don COD tu POS: bat buoc chon NV Ky thuat phu trach, don duoc tao o trang thai
 *   CONFIRMED (cho duyet) de tu hien len tuyen giao /shipping/cod cua ky thuat do.
 */

const CHANNEL_PREFIX: Record<OrderChannel, string> = { RETAIL: 'HD-R', WHOLESALE: 'HD-S', ONLINE: 'HD-O' };

export function createOrder(session: SessionUser, input: CreateOrderInput): Order {
  const state = db();
  const storeId = session.storeId;
  const storeName = storeNameById(storeId);
  const channel: OrderChannel = input.channel ?? 'RETAIL';
  const isCod = input.paymentMethod === 'COD';

  /**
   * Don COD len tu POS: bat buoc gan ky thuat, trang thai CONFIRMED (cho duyet) de don
   * tu xuat hien trong tuyen giao cua ky thuat do. Chi tru truong hop client chi dinh
   * ro trang thai khac (vi du DRAFT - luu nhap).
   */
  let status: OrderStatus = input.status ?? 'COMPLETED';
  let technicianId: string | undefined;
  let technicianName: string | undefined;
  let deliveryAddress: string | undefined;
  if (isCod && status !== 'DRAFT') {
    technicianId = input.technicianId?.trim() || undefined;
    technicianName = input.technicianName?.trim() || undefined;
    if (!technicianId) {
      throw new Error('Đơn COD phải chọn NV Kỹ thuật phụ trách để chuyển lịch giao cho kỹ thuật duyệt.');
    }
    const technician = findUserById(technicianId);
    if (!technician || technician.role !== 'TECHNICIAN' || technician.status !== 'ACTIVE') {
      throw new Error('NV Kỹ thuật được chọn không còn hoạt động. Vui lòng chọn kỹ thuật khác.');
    }
    technicianName = technician.fullName;
    deliveryAddress = input.deliveryAddress?.trim() || undefined;
    if (input.status === undefined) status = 'CONFIRMED';
  }
  const isDraft = status === 'DRAFT';
  const isWholesaleQuote = channel === 'WHOLESALE' && (status === 'PENDING' || status === 'DRAFT');
  /** Bao gia / don si cho duyet: giu hang tren giay, chua tru kho + chua ghi so quy. */
  const skipStockCheck = isDraft || isWholesaleQuote;
  const canEditPrice = hasPermission(session, 'EDIT_SELL_PRICE');
  const canOverDiscount = hasPermission(session, 'DISCOUNT_OVER_LIMIT');

  if (!input.items.length) {
    throw new Error('Giỏ hàng đang trống, chưa thể thanh toán.');
  }

  if (channel === 'WHOLESALE' && !input.customerId) {
    throw new Error('Báo giá / đơn sỉ phải chọn khách hàng sỉ đã định danh (không bán vô danh).');
  }

  const items: OrderItem[] = input.items.map((line, index) => {
    const product = findProduct(line.productId);
    if (!product) throw new Error(`Sản phẩm không tồn tại (${line.productId}).`);
    /** Soft delete (skill §13): khong duoc ban hang da NGUNG kinh doanh - enforce o backend, khong chi an UI. */
    if (product.status !== 'ACTIVE') {
      throw new Error(`"${product.name}" đã ngừng kinh doanh, không thể bán.`);
    }
    const quantity = Math.max(1, Math.floor(line.quantity));
    const available = stockQtyOf(product.id, storeId);
    if (!skipStockCheck && quantity > available) {
      throw new Error(`"${product.name}" chỉ còn ${available} ${product.unit} trong kho.`);
    }
    const unitPrice = canEditPrice && line.unitPrice > 0 ? line.unitPrice : product.sellPrice;
    const discount = Math.max(0, line.discount || 0);
    return {
      id: `it_${Date.now().toString(36)}_${index}`,
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      unit: product.unit,
      quantity,
      unitPrice,
      discount,
      lineTotal: unitPrice * quantity - discount,
      costPrice: product.costPrice,
      lineProfit: unitPrice * quantity - discount - (product.costPrice ?? 0) * quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = Math.max(0, input.discount || 0);
  const total = subtotal - discount;
  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;

  if (discountPercent > session.discountLimit && !canOverDiscount) {
    throw new Error(
      `Chiết khấu ${discountPercent.toFixed(1)}% vượt hạn mức ${session.discountLimit}% của tài khoản. Cần quyền "Chiết khấu vượt hạn mức".`,
    );
  }

  const paidAmount = Math.max(0, input.paidAmount || 0);
  const customer = input.customerId ? findCustomer(input.customerId) : undefined;
  const debtAmount = Math.max(total - paidAmount, 0);

  if (debtAmount > 0 && !customer) {
    throw new Error('Khách lẻ chưa định danh phải thanh toán đủ. Vui lòng chọn khách hàng để ghi nợ.');
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: `od_${Date.now().toString(36)}`,
    code: generateDocCode(CHANNEL_PREFIX[channel], nextSequence('ORD')),
    channel,
    status,
    customerId: customer?.id,
    customerName: customer?.name ?? input.customerName?.trim() ?? 'Khách lẻ (không định danh)',
    customerPhone: customer?.phone,
    customerType: customer?.type,
    storeId,
    storeName,
    items,
    subtotal,
    discount,
    total,
    paidAmount: isDraft ? 0 : paidAmount,
    changeAmount: !isDraft && paidAmount > total ? paidAmount - total : 0,
    debtAmount: isDraft ? 0 : debtAmount,
    paymentMethod: input.paymentMethod,
    cashierId: session.id,
    cashierName: session.fullName,
    note: input.note,
    codAmount: input.paymentMethod === 'COD' ? debtAmount : undefined,
    shipperId: technicianId,
    shipperName: technicianName,
    deliveryAddress,
    createdAt: now,
    updatedAt: now,
  };

  state.orders.unshift(order);
  /**
   * Bao gia si (PENDING) + nhap (DRAFT) chi luu phieu, chua tru kho / ghi so quy.
   * Tru kho + ghi nhan thanh toan (neu co) khi phieu chuyen COMPLETED (xem repo-orders.ts).
   */
  if (!isWholesaleQuote && !isDraft) applyOrderEffects(order, session);
  return order;
}

/** Ap dung hieu ung kho + so quy cho don hang (chi chay 1 lan cho moi don). */
export function applyOrderEffects(order: Order, session: SessionUser): void {
  const state = db();
  if (state.appliedOrderIds.includes(order.id)) return;
  state.appliedOrderIds.push(order.id);

  for (const item of order.items) {
    mutateStock(item.productId, order.storeId, -item.quantity);
  }

  if (order.paidAmount > 0) {
    state.cashbookEntries.unshift({
      id: `cb_${Date.now().toString(36)}`,
      code: generateDocCode('PT', nextSequence('CB')),
      type: 'RECEIPT',
      category: 'SALE',
      status: 'POSTED',
      amount: order.paidAmount,
      method: order.paymentMethod === 'VIETQR' ? 'VIETQR' : order.paymentMethod === 'CASH' ? 'CASH' : 'TRANSFER',
      storeId: order.storeId,
      storeName: order.storeName,
      partnerName: order.customerName,
      refCode: order.code,
      description: `Thu tiền bán hàng theo hoá đơn ${order.code}`,
      createdBy: session.id,
      createdByName: session.fullName,
      createdAt: new Date().toISOString(),
    });
  }
}
