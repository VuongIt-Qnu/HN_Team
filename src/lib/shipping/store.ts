import type { ShipmentRecord, ShipmentStatus } from './types';

/**
 * Store tam trong bo nho, cung gioi han nhu Mock Data Layer hien tai:
 * tat server la mat du lieu. Khi chuyen sang Prisma, thay file nay bang
 * repository doc/ghi bang Shipment, giu nguyen ten ham.
 */
const shipments = new Map<string, ShipmentRecord>();

const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED: ['PICKED_UP', 'IN_TRANSIT', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'FAILED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  FAILED: [],
  CANCELLED: [],
  RETURNED: [],
};

export function saveShipment(shipment: ShipmentRecord): ShipmentRecord {
  shipments.set(shipment.id, shipment);
  shipments.set(`tracking:${shipment.trackingCode}`, shipment);
  return shipment;
}

export function getShipment(id: string): ShipmentRecord | undefined {
  return shipments.get(id) ?? shipments.get(`tracking:${id}`);
}

export function listShipmentsByOrder(orderId: string): ShipmentRecord[] {
  const seen = new Set<string>();
  const result: ShipmentRecord[] = [];
  for (const shipment of shipments.values()) {
    if (shipment.orderId === orderId && !seen.has(shipment.id)) {
      seen.add(shipment.id);
      result.push(shipment);
    }
  }
  return result;
}

export function updateShipmentStatus(
  trackingCode: string,
  status: ShipmentStatus,
  note?: string,
): ShipmentRecord | undefined {
  const shipment = shipments.get(`tracking:${trackingCode}`);
  if (!shipment) return undefined;
  if (shipment.status === status) return shipment;
  if (!ALLOWED_TRANSITIONS[shipment.status].includes(status)) return shipment;
  const updated: ShipmentRecord = {
    ...shipment,
    status,
    updatedAt: new Date().toISOString(),
    history: [...shipment.history, { status, at: new Date().toISOString(), note }],
  };
  return saveShipment(updated);
}
