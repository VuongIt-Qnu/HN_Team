import type { ProductStatus } from './catalog';

/** Thuc the kho: ton kho, phieu kho, phien kiem ke. */

export interface StockItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  categoryName: string;
  unit: string;
  storeId: string;
  storeName: string;
  quantity: number;
  minStock: number;
  sellPrice: number;
  /** Chi tra ve khi co quyen VIEW_COST_PRICE. */
  costPrice?: number;
  /** Chi tra ve khi co quyen VIEW_COST_PRICE. */
  stockValue?: number;
  /** Trang thai kinh doanh (ACTIVE/INACTIVE) - dung cho cot Trang thai tren bang kho. */
  status: ProductStatus;
  updatedAt: string;
}

/** Nhap / Xuat / Chuyen / Kiem ke. */
export type StockOperationType = 'IMPORT' | 'EXPORT' | 'TRANSFER' | 'ADJUST';

export const STOCK_OPERATION_LABELS: Record<StockOperationType, string> = {
  IMPORT: 'Phiếu nhập kho',
  EXPORT: 'Phiếu xuất kho',
  TRANSFER: 'Phiếu chuyển kho',
  ADJUST: 'Phiếu điều chỉnh (kiểm kê)',
};

export const STOCK_OPERATION_PREFIX: Record<StockOperationType, string> = {
  IMPORT: 'PN',
  EXPORT: 'PX',
  TRANSFER: 'PC',
  ADJUST: 'DC',
};

export type StockOperationStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'DONE' | 'CANCELLED';

export const STOCK_OPERATION_STATUS_LABELS: Record<StockOperationStatus, string> = {
  DRAFT: 'Nháp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  DONE: 'Đã thực hiện',
  CANCELLED: 'Đã hủy',
};

export interface StockOperationItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  /** Don gia nhap (chi hien thi voi nguoi co quyen VIEW_COST_PRICE). */
  costPrice?: number;
  note?: string;
}

export interface StockOperation {
  id: string;
  code: string;
  type: StockOperationType;
  status: StockOperationStatus;
  storeId: string;
  storeName: string;
  toStoreId?: string;
  toStoreName?: string;
  supplierId?: string;
  supplierName?: string;
  items: StockOperationItem[];
  totalQuantity: number;
  /** Chi co khi co quyen VIEW_COST_PRICE. */
  totalValue?: number;
  reason?: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
  approvedAt?: string;
}

export interface StockAuditItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  systemQty: number;
  countedQty: number;
  /** countedQty - systemQty. */
  diffQty: number;
}

export type StockAuditStatus = 'COUNTING' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export const STOCK_AUDIT_STATUS_LABELS: Record<StockAuditStatus, string> = {
  COUNTING: 'Đang kiểm kê',
  PENDING_APPROVAL: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
};

export interface StockAuditSession {
  id: string;
  code: string;
  storeId: string;
  storeName: string;
  status: StockAuditStatus;
  items: StockAuditItem[];
  totalDiffQty: number;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  note?: string;
  createdAt: string;
}

export interface CreateStockOperationInput {
  type: StockOperationType;
  toStoreId?: string;
  supplierId?: string;
  reason?: string;
  items: Array<{ productId: string; quantity: number; costPrice?: number; note?: string }>;
}
