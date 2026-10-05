import type { StockAuditSession, StockOperation, StockOperationItem, StockOperationStatus, StockOperationType } from '@/types';
import { products, STORE_ID_MAIN, stores, suppliers } from './seed-catalog';

/** Phieu kho & phien kiem ke mau. */

interface OpSpec {
  id: string;
  code: string;
  type: StockOperationType;
  status: StockOperationStatus;
  daysAgo: number;
  hour: number;
  storeId?: string;
  toStoreId?: string;
  supplierId?: string;
  reason?: string;
  /** [productId, quantity, costPrice tuy chinh] */
  lines: Array<[string, number, number?]>;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
}

const WAREHOUSE_STAFF = { id: 'us_warehouse', name: 'Đỗ Văn Thắng' };
const MANAGER_STAFF = { id: 'us_manager', name: 'Trần Mạnh Quân' };

function buildOperation(spec: OpSpec): StockOperation {
  const created = new Date();
  created.setDate(created.getDate() - spec.daysAgo);
  created.setHours(spec.hour, 0, 0, 0);
  const createdAt = created.toISOString();

  const items: StockOperationItem[] = spec.lines.map(([productId, quantity, costPrice], index) => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error(`Seed data loi: khong tim thay san pham ${productId}`);
    return {
      id: `${spec.id}_it${index + 1}`,
      productId: product.id,
      sku: product.sku,
      name: product.name,
      unit: product.unit,
      quantity,
      costPrice: costPrice ?? product.costPrice,
    };
  });

  const store = stores.find((s) => s.id === (spec.storeId ?? STORE_ID_MAIN)) ?? stores[0];
  const toStore = stores.find((s) => s.id === spec.toStoreId);
  const supplier = suppliers.find((s) => s.id === spec.supplierId);

  return {
    id: spec.id,
    code: spec.code,
    type: spec.type,
    status: spec.status,
    storeId: store.id,
    storeName: store.name,
    toStoreId: toStore?.id,
    toStoreName: toStore?.name,
    supplierId: supplier?.id,
    supplierName: supplier?.name,
    items,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    totalValue: items.reduce((sum, item) => sum + item.quantity * (item.costPrice ?? 0), 0),
    reason: spec.reason,
    createdBy: spec.createdBy ?? WAREHOUSE_STAFF.id,
    createdByName: spec.createdByName ?? WAREHOUSE_STAFF.name,
    approvedBy: spec.approvedBy,
    approvedByName: spec.approvedByName,
    createdAt,
    approvedAt: spec.approvedBy ? createdAt : undefined,
  };
}

const operationSpecs: OpSpec[] = [
  { id: 'op_pn01', code: 'PN-20260919-0001', type: 'IMPORT', status: 'DONE', daysAgo: 3, hour: 8, supplierId: 'sup_samsung', reason: 'Nhập hàng Samsung đợt 3 tháng 9', lines: [['pr_ss_s24', 5], ['pr_ss_a55', 10], ['pr_ss_buds', 20]], approvedBy: MANAGER_STAFF.id, approvedByName: MANAGER_STAFF.name },
  { id: 'op_pn02', code: 'PN-20260921-0002', type: 'IMPORT', status: 'APPROVED', daysAgo: 1, hour: 9, supplierId: 'sup_sunhouse', reason: 'Nhập gia dụng Sunhouse', lines: [['pr_noi_chao', 10], ['pr_am_sieu', 30]], approvedBy: MANAGER_STAFF.id, approvedByName: MANAGER_STAFF.name },
  { id: 'op_pn03', code: 'PN-20260922-0003', type: 'IMPORT', status: 'PENDING', daysAgo: 0, hour: 8, supplierId: 'sup_vpp', reason: 'Nhập văn phòng phẩm cho trường học', lines: [['pr_giay_a4', 100], ['pr_but_thien', 80], ['pr_bia_ho', 50]] },
  { id: 'op_px04', code: 'PX-20260922-0004', type: 'EXPORT', status: 'DONE', daysAgo: 0, hour: 9, reason: 'Xuất bán theo hoá đơn HD-R-20260922-0001', lines: [['pr_ss_a55', 1], ['pr_ss_buds', 1], ['pr_sac_anhn', 2]], approvedBy: MANAGER_STAFF.id, approvedByName: MANAGER_STAFF.name },
  { id: 'op_px05', code: 'PX-20260922-0005', type: 'EXPORT', status: 'DRAFT', daysAgo: 0, hour: 11, reason: 'Xuất hàng trưng bày showroom tầng 1', lines: [['pr_quat_dk', 2], ['pr_noi_com', 2]], createdBy: MANAGER_STAFF.id, createdByName: MANAGER_STAFF.name },
  { id: 'op_pc06', code: 'PC-20260920-0006', type: 'TRANSFER', status: 'APPROVED', daysAgo: 2, hour: 14, toStoreId: 'st_hcm', reason: 'Bổ sung tồn cho chi nhánh HCM', lines: [['pr_ss_buds', 10], ['pr_chuot_mx', 5]], approvedBy: MANAGER_STAFF.id, approvedByName: MANAGER_STAFF.name },
  { id: 'op_pc07', code: 'PC-20260922-0007', type: 'TRANSFER', status: 'PENDING', daysAgo: 0, hour: 10, toStoreId: 'st_danang', reason: 'Chuyển tablet & loa cho Đà Nẵng', lines: [['pr_ss_tab', 3], ['pr_loa_ss', 2]] },
  { id: 'op_dc08', code: 'DC-20260917-0008', type: 'ADJUST', status: 'DONE', daysAgo: 5, hour: 16, reason: 'Điều chỉnh lệch kho theo phiên kiểm kê KK-20260917-0001', lines: [['pr_am_sieu', 2], ['pr_kep_bam', 3]], approvedBy: MANAGER_STAFF.id, approvedByName: MANAGER_STAFF.name },
];

export const stockOperations: StockOperation[] = operationSpecs.map(buildOperation);

/** Phien kiem ke (Stock Audit). */

interface AuditSpec {
  id: string;
  code: string;
  status: StockAuditSession['status'];
  daysAgo: number;
  note?: string;
  /** [productId, soLuongHeThong, soLuongThucTe] */
  lines: Array<[string, number, number]>;
  approved?: boolean;
}

function buildAudit(spec: AuditSpec): StockAuditSession {
  const created = new Date();
  created.setDate(created.getDate() - spec.daysAgo);
  created.setHours(17, 30, 0, 0);
  const items = spec.lines.map(([productId, systemQty, countedQty], index) => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error(`Seed data loi: khong tim thay san pham ${productId}`);
    return {
      id: `${spec.id}_it${index + 1}`,
      productId: product.id,
      sku: `${product.sku} · ${product.barcode}`,
      name: product.name,
      unit: product.unit,
      systemQty,
      countedQty,
      diffQty: countedQty - systemQty,
    };
  });
  const store = stores[0];
  return {
    id: spec.id,
    code: spec.code,
    storeId: store.id,
    storeName: store.name,
    status: spec.status,
    items,
    totalDiffQty: items.reduce((sum, item) => sum + Math.abs(item.diffQty), 0),
    createdBy: WAREHOUSE_STAFF.id,
    createdByName: WAREHOUSE_STAFF.name,
    approvedBy: spec.approved ? MANAGER_STAFF.id : undefined,
    approvedByName: spec.approved ? MANAGER_STAFF.name : undefined,
    note: spec.note,
    createdAt: created.toISOString(),
  };
}

export const stockAudits: StockAuditSession[] = [
  buildAudit({
    id: 'au_0001', code: 'KK-20260917-0001', status: 'APPROVED', daysAgo: 5, approved: true,
    note: 'Kiểm kê định kỳ tuần 3 tháng 9 - đã duyệt điều chỉnh',
    lines: [['pr_am_sieu', 73, 75], ['pr_kep_bam', 99, 96], ['pr_giay_a4', 240, 240], ['pr_ss_buds', 48, 47], ['pr_sac_anhn', 60, 60], ['pr_noi_com', 34, 34]],
  }),
  buildAudit({
    id: 'au_0002', code: 'KK-20260922-0002', status: 'PENDING_APPROVAL', daysAgo: 0,
    note: 'Kiểm kê đột xuất nhóm hàng giá trị cao',
    lines: [['pr_ss_s24', 12, 11], ['pr_ip_15', 9, 9], ['pr_mac_air', 5, 4], ['pr_ss_tab', 11, 10], ['pr_loa_ss', 13, 13]],
  }),
  buildAudit({
    id: 'au_0003', code: 'KK-20260922-0003', status: 'COUNTING', daysAgo: 0,
    note: 'Đang kiểm kê - Thủ kho chưa chốt số liệu',
    lines: [['pr_giay_a4', 240, 238], ['pr_but_thien', 180, 180], ['pr_bia_ho', 150, 150], ['pr_may_in', 7, 7]],
  }),
];
