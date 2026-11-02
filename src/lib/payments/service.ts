import { getPaymentProvider } from './providers';
import { getPayment, listPaymentsByOrder, savePayment, updatePaymentStatus } from './store';
import type { CreatePaymentInput, PaymentRecord, PaymentStatus } from './types';

export function createPayment(input: CreatePaymentInput): Promise<PaymentRecord> {
  if (!input.orderId?.trim()) throw new Error('Thieu orderId.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new Error('So tien thanh toan phai lon hon 0.');
  }
  const provider = getPaymentProvider();
  return provider.createPayment(input).then(({ payment }) => savePayment(payment));
}

export function getPaymentById(id: string): PaymentRecord | undefined {
  return getPayment(id);
}

export function getPaymentsByOrder(orderId: string): PaymentRecord[] {
  return listPaymentsByOrder(orderId);
}

/**
 * Xu ly webhook sau khi provider da xac thuc chu ky.
 * GIOI HAN HIEN TAI (co tinh, de tranh ghi sai so lieu):
 * webhook chi doi trang thai ban ghi payment. Buoc tu dong ghi phieu quy
 * va doi trang thai don hang se noi vao repo-cashbook / repo-orders o
 * buoc tiep theo, khi da chon hang that va chuyen sang Prisma, vi store
 * hien tai la in-memory va don hang / payment dang o 2 store rieng.
 */
export async function handlePaymentWebhook(
  body: unknown,
  headers: Headers,
): Promise<PaymentRecord | null> {
  const provider = getPaymentProvider();
  const payload = await provider.verifyWebhook(body, headers);
  if (!payload) return null;
  const updated = updatePaymentStatus(payload.paymentId, payload.status, payload.providerRef);
  return updated ?? null;
}

export type { PaymentStatus };
