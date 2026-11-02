import { getShipment, saveShipment, updateShipmentStatus } from './store';
import type {
  CreateShipmentInput,
  QuoteInput,
  QuoteResult,
  ShipmentRecord,
  ShipmentStatus,
  ShipmentWebhookPayload,
  ShippingProvider,
} from './types';

/**
 * Carrier mock dung cho khung chung: gia ship chi la cong thuc tam,
 * KHONG phai bang gia that cua hang nao. Khi gan hang that, ham quote
 * phai goi API tinh phi cua hang thay cho cong thuc nay.
 */
class MockShippingProvider implements ShippingProvider {
  readonly name = 'mock';

  async quote(input: QuoteInput): Promise<QuoteResult> {
    if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
      throw new Error('Khoi luong phai lon hon 0.');
    }
    const sameProvince =
      input.fromProvince.trim().toLowerCase() === input.toProvince.trim().toLowerCase();
    const fee = 20000 + Math.ceil(input.weightKg) * 5000 + (sameProvince ? 0 : 10000);
    return {
      provider: 'mock',
      service: 'STANDARD',
      fee,
      estimatedDays: sameProvince ? 1 : 3,
      currency: 'VND',
    };
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentRecord> {
    const quote = await this.quote({
      fromProvince: input.sender.province,
      toProvince: input.receiver.province,
      weightKg: input.weightKg,
      codAmount: input.codAmount,
    });
    const now = new Date().toISOString();
    const shipment: ShipmentRecord = {
      id: `ship_${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`,
      orderId: input.orderId,
      provider: 'mock',
      trackingCode: `HN${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`,
      service: input.service ?? quote.service,
      fee: quote.fee,
      codAmount: input.codAmount ?? 0,
      status: 'CREATED',
      sender: input.sender,
      receiver: input.receiver,
      history: [{ status: 'CREATED', at: now, note: input.note }],
      createdAt: now,
      updatedAt: now,
    };
    return saveShipment(shipment);
  }

  async track(trackingCode: string): Promise<ShipmentRecord | null> {
    return getShipment(trackingCode) ?? null;
  }

  async cancelShipment(trackingCode: string): Promise<ShipmentRecord | null> {
    return updateShipmentStatus(trackingCode, 'CANCELLED', 'Huy boi cua hang.') ?? null;
  }

  async verifyWebhook(body: unknown): Promise<ShipmentWebhookPayload | null> {
    if (!body || typeof body !== 'object') return null;
    const payload = body as Record<string, unknown>;
    if (payload.provider !== 'mock') return null;
    if (typeof payload.trackingCode !== 'string') return null;
    const allowed: ShipmentStatus[] = [
      'PICKED_UP',
      'IN_TRANSIT',
      'DELIVERED',
      'FAILED',
      'CANCELLED',
      'RETURNED',
    ];
    if (!allowed.includes(String(payload.status) as ShipmentStatus)) return null;
    return {
      provider: 'mock',
      trackingCode: payload.trackingCode,
      status: payload.status as ShipmentStatus,
      note: typeof payload.note === 'string' ? payload.note : undefined,
    };
  }
}

const registry = new Map<string, ShippingProvider>();
registry.set('mock', new MockShippingProvider());

/** Adapter that goi ham nay de dang ky them, vi du registerShippingProvider('ghn', new GHNProvider()). */
export function registerShippingProvider(name: string, provider: ShippingProvider): void {
  registry.set(name, provider);
}

export function getShippingProvider(): ShippingProvider {
  const name = process.env.SHIPPING_PROVIDER?.trim().toLowerCase() || 'mock';
  const provider = registry.get(name);
  if (!provider) {
    throw new Error(`Chua cau hinh hang van chuyen '${name}'. Hien chi co 'mock'.`);
  }
  return provider;
}
