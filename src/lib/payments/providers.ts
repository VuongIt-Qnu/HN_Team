import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  PaymentRecord,
  PaymentWebhookPayload,
} from './types';

/**
 * Provider mock dung cho khung chung: khong goi hang that, khong co tien that.
 * Cach test: tao payment -> goi POST /api/payments/webhook voi
 * { provider: 'mock', paymentId, status: 'PAID' } de mo phong hang bao tien ve.
 */
class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: `pay_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      orderId: input.orderId,
      amount: input.amount,
      currency: 'VND',
      channel: 'GATEWAY',
      provider: 'mock',
      status: 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    return { payment };
  }

  async verifyWebhook(body: unknown): Promise<PaymentWebhookPayload | null> {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    if (payload.provider !== 'mock') return null;
    if (typeof payload.paymentId !== 'string') return null;
    if (!['PAID', 'FAILED', 'CANCELLED'].includes(String(payload.status))) return null;
    return {
      provider: 'mock',
      paymentId: payload.paymentId,
      status: payload.status as PaymentWebhookPayload['status'],
      providerRef: typeof payload.providerRef === 'string' ? payload.providerRef : undefined,
    };
  }
}

const registry = new Map<string, PaymentProvider>();
registry.set('mock', new MockPaymentProvider());

/** Adapter that goi ham nay de dang ky them, vi du registerPaymentProvider('vnpay', new VNPayProvider()). */
export function registerPaymentProvider(name: string, provider: PaymentProvider): void {
  registry.set(name, provider);
}

export function getPaymentProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER?.trim().toLowerCase() || 'mock';
  const provider = registry.get(name);
  if (!provider) {
    throw new Error(`Chua cau hinh provider thanh toan '${name}'. Hien chi co 'mock'.`);
  }
  return provider;
}
