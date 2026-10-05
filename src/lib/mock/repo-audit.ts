import { generateDocCode } from '@/lib/utils';
import type {
  SessionUser,
  StockAuditItem,
  StockAuditSession,
  StockAuditStatus,
} from '@/types';
import { db, findProduct, nextSequence, setStock, storeNameById, stockQtyOf } from './db';

/** Repository kiem ke kho (Mock). */

export interface StockAuditFilter {
  status?: StockAuditStatus;
  storeId?: string;
}

export function listStockAudits(filter: StockAuditFilter = {}): StockAuditSession[] {
  let result = [...db().stockAudits];
  if (filter.status) result = result.filter((a) => a.status === filter.status);
  if (filter.storeId) result = result.filter((a) => a.storeId === filter.storeId);
  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createStockAudit(
  session: SessionUser,
  input: { items: Array<{ productId: string; countedQty: number }>; note?: string },
): StockAuditSession {
  const state = db();
  if (!input.items.length) throw new Error('Phiên kiểm kê phải có ít nhất 1 sản phẩm.');

  const items: StockAuditItem[] = input.items.map((line, index) => {
    const product = findProduct(line.productId);
    if (!product) throw new Error(`Sản phẩm không tồn tại (${line.productId}).`);
    const systemQty = stockQtyOf(product.id, session.storeId);
    return {
      id: `auit_${Date.now().toString(36)}_${index}`,
      productId: product.id,
      sku: `${product.sku} · ${product.barcode}`,
      name: product.name,
      unit: product.unit,
      systemQty,
      countedQty: line.countedQty,
      diffQty: line.countedQty - systemQty,
    };
  });

  const audit: StockAuditSession = {
    id: `au_${Date.now().toString(36)}`,
    code: generateDocCode('KK', nextSequence('AUDIT')),
    storeId: session.storeId,
    storeName: storeNameById(session.storeId),
    status: 'PENDING_APPROVAL',
    items,
    totalDiffQty: items.reduce((sum, item) => sum + Math.abs(item.diffQty), 0),
    createdBy: session.id,
    createdByName: session.fullName,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  state.stockAudits.unshift(audit);
  return audit;
}

/** Duyet phien kiem ke: cap nhat ton kho theo so luong thuc te. */
export function approveStockAudit(id: string, session: SessionUser): StockAuditSession {
  const audit = db().stockAudits.find((a) => a.id === id);
  if (!audit) throw new Error('Không tìm thấy phiên kiểm kê.');
  if (audit.status !== 'PENDING_APPROVAL') {
    throw new Error('Chỉ duyệt được phiên kiểm kê đang ở trạng thái "Chờ duyệt".');
  }

  for (const item of audit.items) {
    if (item.diffQty !== 0) {
      setStock(item.productId, audit.storeId, item.countedQty);
    }
  }

  audit.status = 'APPROVED';
  audit.approvedBy = session.id;
  audit.approvedByName = session.fullName;
  audit.note = `${audit.note ? `${audit.note} · ` : ''}Đã duyệt điều chỉnh tồn kho`;
  return audit;
}

export function rejectStockAudit(id: string, session: SessionUser, reason?: string): StockAuditSession {
  const audit = db().stockAudits.find((a) => a.id === id);
  if (!audit) throw new Error('Không tìm thấy phiên kiểm kê.');
  audit.status = 'REJECTED';
  audit.approvedBy = session.id;
  audit.approvedByName = session.fullName;
  audit.note = `${audit.note ? `${audit.note} · ` : ''}Từ chối duyệt${reason ? `: ${reason}` : ''}`;
  return audit;
}
