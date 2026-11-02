/**
 * Khung thanh toan chung (provider-agnostic).
 * Chua gan cong thanh toan cu the nao (VNPay / MoMo / ...).
 * Muon gan hang that, chi can them 1 adapter implement PaymentProvider
 * va dang ky no trong providers.ts, khong can sua route hay don hang.
 */

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED';

/** Kenh thanh toan hien thi cho nguoi dung, khong phu thuoc hang nao. */
export type PaymentChannel = 'CASH' | 'COD' | 'BANK_TRANSFER' | 'GATEWAY';

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  currency: 'VND';
  channel: PaymentChannel;
  /** Ten provider: 'mock' o che do khung chung, vi du 'vnpay' khi gan that. */
  provider: string;
  status: PaymentStatus;
  checkoutUrl?: string;
  providerRef?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  description?: string;
  returnUrl?: string;
  customerName?: string;
  customerPhone?: string;
}

export interface CreatePaymentResult {
  payment: PaymentRecord;
  checkoutUrl?: string;
}

export interface PaymentWebhookPayload {
  provider: string;
  paymentId: string;
  status: PaymentStatus;
  providerRef?: string;
}

/**
 * Hop dong bat buoc cua moi cong thanh toan.
 * Adapter that PHai tu xac thuc chu ky webhook ben trong verifyWebhook
 * (vi du HMAC cua VNPay / MoMo) truoc khi tra ve payload.
 * Adapter mock duoc mien tru vi khong co tien that.
 */
export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyWebhook(body: unknown, headers: Headers): Promise<PaymentWebhookPayload | null>;
}
