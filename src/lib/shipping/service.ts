import { getShippingProvider } from './providers';
import { getShipment, listShipmentsByOrder, updateShipmentStatus } from './store';
import type { CreateShipmentInput, QuoteInput, QuoteResult, ShipmentRecord } from './types';

function requireAddress(value: unknown, label: string): void {
  const address = value as Record<string, unknown> | null;
  if (!address || typeof address.name !== 'string' || typeof address.phone !== 'string') {
    throw new Error(`Thieu thong tin ${label}.`);
  }
  if (typeof address.address !== 'string' || typeof address.district !== 'string') {
    throw new Error(`Thieu dia chi ${label}.`);
  }
  if (typeof address.province !== 'string') {
    throw new Error(`Thieu tinh/thanh ${label}.`);
  }
}

export function quoteShipping(input: QuoteInput): Promise<QuoteResult> {
  return getShippingProvider().quote(input);
}

export function createShipment(input: CreateShipmentInput): Promise<ShipmentRecord> {
  if (!input.orderId?.trim()) throw new Error('Thieu orderId.');
  requireAddress(input.sender, 'nguoi gui');
  requireAddress(input.receiver, 'nguoi nhan');
  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    throw new Error('Khoi luong phai lon hon 0.');
  }
  return getShippingProvider().createShipment(input);
}

export function getShipmentById(id: string): ShipmentRecord | undefined {
  return getShipment(id);
}

export function getShipmentsByOrder(orderId: string): ShipmentRecord[] {
  return listShipmentsByOrder(orderId);
}

export function trackShipment(trackingCode: string): Promise<ShipmentRecord | null> {
  return getShippingProvider().track(trackingCode);
}

export async function handleShippingWebhook(
  body: unknown,
  headers: Headers,
): Promise<ShipmentRecord | null> {
  const provider = getShippingProvider();
  const payload = await provider.verifyWebhook(body, headers);
  if (!payload) return null;
  return updateShipmentStatus(payload.trackingCode, payload.status, payload.note) ?? null;
}
