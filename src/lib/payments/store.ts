import type { PaymentRecord, PaymentStatus } from './types';

/**
 * Store tam trong bo nho, cung gioi han nhu Mock Data Layer hien tai:
 * tat server la mat du lieu. Khi chuyen sang Prisma, thay file nay bang
 * repository doc/ghi bang Payment, giu nguyen ten ham de khong sua route.
 */
const payments = new Map<string, PaymentRecord>();

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING: ['PAID', 'FAILED', 'CANCELLED'],
  PAID: ['REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  REFUNDED: [],
};

export function savePayment(payment: PaymentRecord): PaymentRecord {
  payments.set(payment.id, payment);
  return payment;
}

export function getPayment(id: string): PaymentRecord | undefined {
  return payments.get(id);
}

export function listPaymentsByOrder(orderId: string): PaymentRecord[] {
  return [...payments.values()].filter((payment) => payment.orderId === orderId);
}

/** Chi cho phep chuyen trang thai hop le, tranh webhook trung / sai thu tu. */
export function updatePaymentStatus(
  id: string,
  status: PaymentStatus,
  providerRef?: string,
): PaymentRecord | undefined {
  const payment = payments.get(id);
  if (!payment) return undefined;
  if (payment.status === status) return payment;
  if (!ALLOWED_TRANSITIONS[payment.status].includes(status)) return payment;
  const updated: PaymentRecord = {
    ...payment,
    status,
    providerRef: providerRef ?? payment.providerRef,
    updatedAt: new Date().toISOString(),
    paidAt: status === 'PAID' ? new Date().toISOString() : payment.paidAt,
  };
  payments.set(id, updated);
  return updated;
}
