import type { StockItem, StockOperation, StockOperationStatus, StockOperationType } from '@/types';
import { db, storeNameById, stockQtyOf } from './db';

/** Repository ton kho & truy van phieu kho (Mock). */

/**
 * Bang ton kho.
 * Soft delete (skill §5.3): mac dinh chi hien san pham ACTIVE dang kinh doanh;
 * truyen includeInactive=true (man hinh quan ly, da kiem quyen o Route) de xem ca hang NGUNG kinh doanh.
 */
export function listStock(
  storeId: string,
  search?: string,
  onlyLow?: boolean,
  includeInactive = false,
): StockItem[] {
  const state = db();
  const storeName = storeNameById(storeId);
  let items: StockItem[] = state.products
    .filter((product) => includeInactive || product.status === 'ACTIVE')
    .map((product) => {
    const quantity = stockQtyOf(product.id, storeId);
    return {
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      categoryName: product.categoryName,
      unit: product.unit,
      storeId,
      storeName,
      quantity,
      minStock: product.minStock,
      sellPrice: product.sellPrice,
      costPrice: product.costPrice,
      stockValue: quantity * (product.costPrice ?? 0),
      status: product.status,
      updatedAt: product.updatedAt,
    };
  });

  if (search) {
    const keyword = search.trim().toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        item.sku.toLowerCase().includes(keyword) ||
        item.barcode.includes(keyword),
    );
  }
  if (onlyLow) items = items.filter((item) => item.quantity <= item.minStock);

  return items.sort((a, b) => a.quantity - b.quantity);
}

export function findStockItem(storeId: string, productId: string): StockItem | undefined {
  return listStock(storeId).find((item) => item.productId === productId);
}

export interface StockOperationFilter {
  type?: StockOperationType;
  status?: StockOperationStatus;
  storeId?: string;
  search?: string;
  limit?: number;
}

export function listStockOperations(filter: StockOperationFilter = {}): StockOperation[] {
  let result = [...db().stockOperations];
  if (filter.type) result = result.filter((o) => o.type === filter.type);
  if (filter.status) result = result.filter((o) => o.status === filter.status);
  if (filter.storeId) result = result.filter((o) => o.storeId === filter.storeId || o.toStoreId === filter.storeId);
  if (filter.search) {
    const keyword = filter.search.trim().toLowerCase();
    result = result.filter(
      (o) =>
        o.code.toLowerCase().includes(keyword) ||
        (o.supplierName ?? '').toLowerCase().includes(keyword) ||
        o.items.some((i) => i.name.toLowerCase().includes(keyword)),
    );
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filter.limit ? result.slice(0, filter.limit) : result;
}

export function findStockOperation(id: string): StockOperation | undefined {
  return db().stockOperations.find((o) => o.id === id);
}

/** Danh sach san pham phuc vu dropdown chon hang (nhe, khong kem gia von voi vai tro bi an). */
export function listStockOptions(storeId: string) {
  return listStock(storeId).map((item) => ({
    productId: item.productId,
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    sellPrice: item.sellPrice,
    costPrice: item.costPrice,
  }));
}
