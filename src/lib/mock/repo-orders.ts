import { normalizeVN } from '@/lib/utils';
import { generateDocCode } from '@/lib/utils';
import { assertCanComplete, hasCompletionPhoto } from '@/lib/order-rules';
import type {
  Order,
  OrderChannel,
  OrderPhoto,
  OrderStatus,
  PaymentMethod,
  SessionUser,
} from '@/types';
import { db, mutateStock, nextSequence } from './db';
import { applyOrderEffects } from './repo-pos';

/** Repository truy van & dieu chinh trang thai don hang (Mock). */

export interface OrderFilter {
  channel?: OrderChannel;
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  customerId?: string;
  shipperId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export function listOrders(filter: OrderFilter = {}): Order[] {
  let result = [...db().orders];

  if (filter.channel) result = result.filter((o) => o.channel === filter.channel);
  if (filter.status) result = result.filter((o) => o.status === filter.status);
  if (filter.paymentMethod) result = result.filter((o) => o.paymentMethod === filter.paymentMethod);
  if (filter.customerId) result = result.filter((o) => o.customerId === filter.customerId);
  if (filter.shipperId) result = result.filter((o) => o.shipperId === filter.shipperId);
  if (filter.from) {
    const from = new Date(filter.from).getTime();
    result = result.filter((o) => new Date(o.createdAt).getTime() >= from);
  }
  if (filter.to) {
    const to = new Date(filter.to).getTime();
    result = result.filter((o) => new Date(o.createdAt).getTime() <= to);
  }
  if (filter.search) {
    const keyword = normalizeVN(filter.search);
    result = result.filter(
      (o) =>
        normalizeVN(o.code).includes(keyword) ||
        normalizeVN(o.customerName).includes(keyword) ||
        o.items.some((i) => normalizeVN(i.name).includes(keyword) || i.barcode.includes(keyword)),
    );
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filter.limit ? result.slice(0, filter.limit) : result;
}

export function findOrder(id: string): Order | undefined {
  return db().orders.find((o) => o.id === id);
}

export function findOrderByCode(code: string): Order | undefined {
  return db().orders.find((o) => o.code === code);
}

/**
 * Doi trang thai don hang: duyet / giao hang / hoan tat / huy / tra hang.
 * - Tra hang (COMPLETED -> RETURNED): hoan kho + tao phieu chi hoan tien (cho duyet).
 * - Hoan tat (-> COMPLETED): ap dung hieu ung kho + phieu thu (neu chua ap dung).
 * - Don COD chi duoc hoan tat khi da co anh hoan thien (xem `src/lib/order-rules.ts`).
 * - Ky thuat nhan lich giao: don COD PENDING duoc gan cho minh thi duoc chuyen
 *   sang CONFIRMED (khi len don tu POS don da o CONFIRMED nen khong can buoc nay).
 */
export function updateOrderStatus(id: string, status: OrderStatus, session: SessionUser): Order {
  const order = findOrder(id);
  if (!order) throw new Error('Không tìm thấy hoá đơn.');

  if (
    status === 'CONFIRMED' &&
    order.status === 'PENDING' &&
    order.paymentMethod === 'COD' &&
    order.shipperId !== undefined &&
    !(session.role === 'TECHNICIAN' && order.shipperId !== session.id)
  ) {
    throw new Error('Đơn COD chờ duyệt: chỉ kỹ thuật được gán mới được nhận đơn.');
  }

  if (status === 'COMPLETED') assertCanComplete(order);

  if (order.status === 'COMPLETED' && status === 'RETURNED') {
    for (const item of order.items) {
      mutateStock(item.productId, order.storeId, item.quantity);
    }
    db().cashbookEntries.unshift({
      id: `cb_${Date.now().toString(36)}`,
      code: generateDocCode('PC', nextSequence('CB')),
      type: 'PAYMENT',
      category: 'REFUND',
      status: 'WAITING_APPROVAL',
      amount: order.total,
      method: 'CASH',
      storeId: order.storeId,
      storeName: order.storeName,
      partnerName: order.customerName,
      refCode: order.code,
      description: `Hoàn tiền hàng trả theo hoá đơn ${order.code}`,
      createdBy: session.id,
      createdByName: session.fullName,
      createdAt: new Date().toISOString(),
    });
  }

  if (status === 'COMPLETED' && order.status !== 'COMPLETED') {
    applyOrderEffects(order, session);
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();
  return order;
}

/** Ghi nhan tien thu ho COD tu NV Ky thuat. */
export function collectCodPayment(
  orderId: string,
  collectedAmount: number,
  session: SessionUser,
): Order {
  const order = findOrder(orderId);
  if (!order) throw new Error('Không tìm thấy đơn giao hàng.');
  if (order.status !== 'DELIVERING' && order.status !== 'CONFIRMED') {
    throw new Error('Chỉ cập nhật thu hộ COD cho đơn đang giao hoặc đã xác nhận.');
  }

  order.paidAmount += Math.max(0, collectedAmount);
  order.debtAmount = Math.max(order.total - order.paidAmount, 0);
  order.codAmount = order.debtAmount;
  order.updatedAt = new Date().toISOString();

  if (collectedAmount > 0) {
    db().cashbookEntries.unshift({
      id: `cb_${Date.now().toString(36)}`,
      code: generateDocCode('PT', nextSequence('CB')),
      type: 'RECEIPT',
      category: 'DEBT_COLLECT',
      status: 'POSTED',
      amount: Math.max(0, collectedAmount),
      method: 'CASH',
      storeId: order.storeId,
      storeName: order.storeName,
      partnerName: order.customerName,
      refCode: order.code,
      description: `Kỹ thuật ${session.fullName} thu hộ COD đơn ${order.code}`,
      createdBy: session.id,
      createdByName: session.fullName,
      createdAt: new Date().toISOString(),
    });
  }

  // Thu du tien: chi tu dong hoan tat khi don da co anh hoan thien (quy tac nghiep vu COD);
  // neu chua co anh thi giu nguyen trang thai de ky thuat chup anh va bam "Giao thanh cong".
  if (order.debtAmount === 0 && hasCompletionPhoto(order)) {
    order.status = 'COMPLETED';
  }
  return order;
}

/**
 * Danh sach don COD cua ky thuat dang dang nhap.
 * Bao gom ca PENDING (don COD vua len tu POS / ban si, doi ky thuat nhan duyet)
 * de ky thuat luon thay lich can xu ly ngay khi thu ngan len don.
 */
export function listCodOrders(shipperId: string): Order[] {
  return listOrders({ paymentMethod: 'COD' }).filter(
    (o) =>
      o.shipperId === shipperId &&
      (o.status === 'PENDING' || o.status === 'DELIVERING' || o.status === 'CONFIRMED' || o.status === 'COMPLETED'),
  );
}

/** Gan danh sach anh hoan thien (file da duoc luu xuong dia o tang API) vao don hang. */
export function addOrderPhotos(orderId: string, photos: OrderPhoto[]): Order {
  const order = findOrder(orderId);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');

  order.photos = [...(order.photos ?? []), ...photos];
  order.updatedAt = new Date().toISOString();
  return order;
}

/**
 * Xoa 1 anh hoan thien khoi don hang.
 * Tra ve ban ghi anh da xoa de tang API xoa tiep file tren dia (undefined neu khong tim thay).
 */
export function removeOrderPhoto(orderId: string, photoId: string): OrderPhoto | undefined {
  const order = findOrder(orderId);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');

  const photo = (order.photos ?? []).find((item) => item.id === photoId);
  if (!photo) return undefined;

  order.photos = (order.photos ?? []).filter((item) => item.id !== photoId);
  order.updatedAt = new Date().toISOString();
  return photo;
}
