import { generateDocCode } from '@/lib/utils';
import type {
  CreateStockOperationInput,
  SessionUser,
  StockOperation,
  StockOperationStatus,
} from '@/types';
import { STOCK_OPERATION_PREFIX } from '@/types';
import { db, findProduct, mutateStock, nextSequence, setStock, storeNameById, stockQtyOf } from './db';
import { findStockOperation } from './repo-stock';

/** Nghiep vu lap & thuc thi phieu kho (Mock). */

export function createStockOperation(session: SessionUser, input: CreateStockOperationInput): StockOperation {
  const state = db();
  if (!input.items.length) throw new Error('Phiếu kho phải có ít nhất 1 dòng hàng.');
  if (input.type === 'TRANSFER' && !input.toStoreId) {
    throw new Error('Phiếu chuyển kho bắt buộc chọn kho nhận.');
  }

  const items = input.items.map((line, index) => {
    const product = findProduct(line.productId);
    if (!product) throw new Error(`Sản phẩm không tồn tại (${line.productId}).`);
    /**
     * Soft delete (skill §5/§6): hang NGUNG kinh doanh van giu ton kho/lich su,
     * nhung khong duoc NHAP them (EXPORT/ADJUST van cho phep de don ton cuoi).
     */
    if (input.type === 'IMPORT' && product.status !== 'ACTIVE') {
      throw new Error(`"${product.name}" đã ngừng kinh doanh, không thể nhập thêm.`);
    }
    const quantity = Math.floor(line.quantity);
    if (input.type !== 'ADJUST' && quantity <= 0) {
      throw new Error('Số lượng trên phiếu phải lớn hơn 0.');
    }
    if (input.type === 'EXPORT' || input.type === 'TRANSFER') {
      const available = stockQtyOf(product.id, session.storeId);
      if (quantity > available) {
        throw new Error(`"${product.name}" chỉ còn ${available} ${product.unit}, không đủ để lập phiếu.`);
      }
    }
    return {
      id: `opit_${Date.now().toString(36)}_${index}`,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity,
      costPrice: line.costPrice ?? product.costPrice,
      note: line.note,
    };
  });

  const supplier = state.suppliers.find((s) => s.id === input.supplierId);
  const operation: StockOperation = {
    id: `op_${Date.now().toString(36)}`,
    code: generateDocCode(STOCK_OPERATION_PREFIX[input.type], nextSequence('WHS')),
    type: input.type,
    status: 'PENDING',
    storeId: session.storeId,
    storeName: storeNameById(session.storeId),
    toStoreId: input.toStoreId,
    toStoreName: input.toStoreId ? storeNameById(input.toStoreId) : undefined,
    supplierId: supplier?.id,
    supplierName: supplier?.name,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + item.quantity * (item.costPrice ?? 0), 0),
    reason: input.reason,
    createdBy: session.id,
    createdByName: session.fullName,
    createdAt: new Date().toISOString(),
  };

  state.stockOperations.unshift(operation);
  return operation;
}

/** Doi trang thai phieu kho; khi chuyen sang DONE se tu dong cap nhat ton kho. */
export function updateStockOperationStatus(
  id: string,
  status: StockOperationStatus,
  session: SessionUser,
): StockOperation {
  const operation = findStockOperation(id);
  if (!operation) throw new Error('Không tìm thấy phiếu kho.');

  const wasDone = operation.status === 'DONE';
  operation.status = status;

  if (status === 'APPROVED') {
    operation.approvedBy = session.id;
    operation.approvedByName = session.fullName;
    operation.approvedAt = new Date().toISOString();
  }

  if (status === 'DONE' && !wasDone) {
    for (const item of operation.items) {
      if (operation.type === 'IMPORT') {
        mutateStock(item.productId, operation.storeId, item.quantity);
      } else if (operation.type === 'EXPORT') {
        mutateStock(item.productId, operation.storeId, -item.quantity);
      } else if (operation.type === 'TRANSFER' && operation.toStoreId) {
        mutateStock(item.productId, operation.storeId, -item.quantity);
        mutateStock(item.productId, operation.toStoreId, item.quantity);
      } else if (operation.type === 'ADJUST') {
        setStock(item.productId, operation.storeId, item.quantity);
      }
    }
  }

  return operation;
}
