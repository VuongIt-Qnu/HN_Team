import type { CustomerType } from './catalog';

/** Trang thai don hang (Enum trong Prisma schema). */
export type OrderStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'CONFIRMED'
  | 'DELIVERING'
  | 'COMPLETED'
  | 'RETURNED'
  | 'CANCELLED';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  CONFIRMED: 'Đã xác nhận',
  DELIVERING: 'Đang giao',
  COMPLETED: 'Hoàn tất',
  RETURNED: 'Đã trả hàng',
  CANCELLED: 'Đã hủy',
};

export type PaymentMethod = 'CASH' | 'VIETQR' | 'CARD' | 'TRANSFER' | 'COD';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tiền mặt',
  VIETQR: 'VietQR',
  CARD: 'Thẻ',
  TRANSFER: 'Chuyển khoản',
  COD: 'Thu hộ COD',
};

/** Kenh ban: ban le (POS), ban si (duyet), ban online. */
export type OrderChannel = 'RETAIL' | 'WHOLESALE' | 'ONLINE';

export const ORDER_CHANNEL_LABELS: Record<OrderChannel, string> = {
  RETAIL: 'Bán lẻ (POS)',
  WHOLESALE: 'Bán sỉ',
  ONLINE: 'Online / Giao hàng',
};

export interface OrderItem {
  id: string;
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  /** Giam gia tren dong (VND). */
  discount: number;
  lineTotal: number;
  /** Chi co khi nguoi xem co quyen VIEW_COST_PRICE. */
  costPrice?: number;
  lineProfit?: number;
}

export interface Order {
  id: string;
  code: string;
  channel: OrderChannel;
  status: OrderStatus;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  customerType?: CustomerType;
  storeId: string;
  storeName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  debtAmount: number;
  paymentMethod: PaymentMethod;
  cashierId: string;
  cashierName: string;
  note?: string;
  /** Thong tin giao hang COD. */
  codAmount?: number;
  shipperId?: string;
  shipperName?: string;
  deliveryAddress?: string;
  /** Anh hoan thien cong viec (minh chung giao hang / nghiem thu) do ky thuat tai len. */
  photos?: OrderPhoto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Anh hoan thien gan voi 1 don hang.
 * File duoc luu tren dia (xem `src/lib/photo-storage.ts`) va phuc vu qua `/api/uploads/<path>`
 * nen anh khong mat khi khoi dong lai server (khac voi du lieu mock trong RAM).
 */
export interface OrderPhoto {
  id: string;
  /** Duong dan tuong doi trong thu muc upload, vi du: orders/od_123/1730000000-ab12cd.jpg */
  path: string;
  /** URL xem anh (di qua API co kiem tra dang nhap). */
  url: string;
  /** Ten file goc tren thiet bi (de doi chieu khi can). */
  fileName: string;
  mimeType: string;
  /** Dung luong file (bytes). */
  size: number;
  note?: string;
  uploadedById: string;
  uploadedByName: string;
  createdAt: string;
}

/** Du lieu client gui len khi thanh toan o man hinh POS. */
export interface CreateOrderInput {
  customerId?: string;
  customerName?: string;
  channel?: OrderChannel;
  items: Array<{ productId: string; quantity: number; unitPrice: number; discount: number }>;
  discount: number;
  paymentMethod: PaymentMethod;
  paidAmount: number;
  note?: string;
  /** Ky thuat duoc gan khi thanh toan COD (don se vao tuyen /shipping/cod de duyet). */
  technicianId?: string;
  technicianName?: string;
  /** Dia chi giao hang khi thanh toan COD. */
  deliveryAddress?: string;
  /** Ban nhap (luu tam) hay chot don. */
  status?: OrderStatus;
}
