import type { Order } from '@/types';

/**
 * Quy tac nghiep vu dung chung cho ca Mock Repo va Route Handler.
 * File nay KHONG import Next/server hay Node-only de co the dung o bat ky tang nao.
 */

/** Loi vi pham quy tac nghiep vu (api-guard se map thanh HTTP 400). */
export class OrderRuleError extends Error {
  code = 'ORDER_RULE_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'OrderRuleError';
  }
}

export const COMPLETION_PHOTO_REQUIRED_MESSAGE =
  'Đơn giao hàng (COD) phải có ít nhất 1 ảnh hoàn thiện trước khi chuyển sang Hoàn tất.';

/**
 * Don giao hang (thanh toan COD) bat buoc co anh hoan thien truoc khi hoan tat
 * (theo yeu cau nghiep vu cua chu dau tu: ky thuat phai chup anh nghiem thu/giao hang).
 */
export function requiresCompletionPhoto(order: Pick<Order, 'paymentMethod'>): boolean {
  return order.paymentMethod === 'COD';
}

export function hasCompletionPhoto(order: Pick<Order, 'photos'>): boolean {
  return (order.photos?.length ?? 0) > 0;
}

/** Chan hoan tat don neu chua du anh hoan thien. */
export function assertCanComplete(order: Pick<Order, 'paymentMethod' | 'photos'>): void {
  if (requiresCompletionPhoto(order) && !hasCompletionPhoto(order)) {
    throw new OrderRuleError(COMPLETION_PHOTO_REQUIRED_MESSAGE);
  }
}
