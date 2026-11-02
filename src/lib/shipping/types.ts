/**
 * Khung van chuyen chung (carrier-agnostic).
 * Chua gan hang van chuyen cu the nao (GHN / GHTK / Viettel Post / ...).
 * Muon gan hang that, chi can them 1 adapter implement ShippingProvider
 * va dang ky no trong providers.ts, khong can sua route.
 */

export type ShipmentStatus =
  | 'CREATED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETURNED';

export interface Address {
  name: string;
  phone: string;
  address: string;
  ward?: string;
  district: string;
  province: string;
}

export interface QuoteInput {
  fromProvince: string;
  toProvince: string;
  weightKg: number;
  codAmount?: number;
}

export interface QuoteResult {
  provider: string;
  service: string;
  fee: number;
  estimatedDays: number;
  currency: 'VND';
}

export interface CreateShipmentInput {
  orderId: string;
  sender: Address;
  receiver: Address;
  weightKg: number;
  codAmount?: number;
  service?: string;
  note?: string;
}

export interface ShipmentHistoryItem {
  status: ShipmentStatus;
  at: string;
  note?: string;
}

export interface ShipmentRecord {
  id: string;
  orderId: string;
  provider: string;
  trackingCode: string;
  service: string;
  fee: number;
  codAmount: number;
  status: ShipmentStatus;
  sender: Address;
  receiver: Address;
  history: ShipmentHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentWebhookPayload {
  provider: string;
  trackingCode: string;
  status: ShipmentStatus;
  note?: string;
}

/**
 * Hop dong bat buoc cua moi hang van chuyen.
 * Adapter that PHai tu xac thuc webhook ben trong verifyWebhook
 * (token / chu ky cua hang) truoc khi tra ve payload.
 */
export interface ShippingProvider {
  readonly name: string;
  quote(input: QuoteInput): Promise<QuoteResult>;
  createShipment(input: CreateShipmentInput): Promise<ShipmentRecord>;
  track(trackingCode: string): Promise<ShipmentRecord | null>;
  cancelShipment(trackingCode: string): Promise<ShipmentRecord | null>;
  verifyWebhook(body: unknown, headers: Headers): Promise<ShipmentWebhookPayload | null>;
}
