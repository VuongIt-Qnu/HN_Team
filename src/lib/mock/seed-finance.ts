import type { CashbookEntry, DebtRecord } from '@/types';
import { customers, MAIN_STORE_ID, stores, suppliers } from './seed-catalog';

/** So quy & cong no mau. */

interface EntrySpec {
  id: string;
  code: string;
  type: CashbookEntry['type'];
  category: CashbookEntry['category'];
  status?: CashbookEntry['status'];
  amount: number;
  method: CashbookEntry['method'];
  daysAgo: number;
  hour: number;
  partnerName?: string;
  refCode?: string;
  description: string;
  createdBy?: string;
  createdByName?: string;
  approvedBy?: string;
  approvedByName?: string;
}

const ACCOUNTANT = { id: 'us_accountant', name: 'Phạm Thị Lan' };
const CASHIER = { id: 'us_cashier', name: 'Lê Thị Mai' };
const MANAGER = { id: 'us_manager', name: 'Trần Mạnh Quân' };

const mainStore = stores[0];

function buildEntry(spec: EntrySpec): CashbookEntry {
  const created = new Date();
  created.setDate(created.getDate() - spec.daysAgo);
  created.setHours(spec.hour, 0, 0, 0);
  const creator = spec.createdBy ? { id: spec.createdBy, name: spec.createdByName ?? '' } : ACCOUNTANT;
  return {
    id: spec.id,
    code: spec.code,
    type: spec.type,
    category: spec.category,
    status: spec.status ?? 'POSTED',
    amount: spec.amount,
    method: spec.method,
    storeId: mainStore.id,
    storeName: mainStore.name,
    partnerName: spec.partnerName,
    refCode: spec.refCode,
    description: spec.description,
    createdBy: creator.id,
    createdByName: creator.name,
    approvedBy: spec.approvedBy,
    approvedByName: spec.approvedByName,
    createdAt: created.toISOString(),
  };
}

const entrySpecs: EntrySpec[] = [
  { id: 'cb_0001', code: 'PT-20260922-0001', type: 'RECEIPT', category: 'SALE', amount: 19440000, method: 'CASH', daysAgo: 0, hour: 9, partnerName: 'Anh Nguyễn Văn Hùng', refCode: 'HD-R-20260922-0001', description: 'Thu tiền bán lẻ tại quầy', createdBy: CASHIER.id, createdByName: CASHIER.name },
  { id: 'cb_0002', code: 'PT-20260922-0002', type: 'RECEIPT', category: 'SALE', amount: 545000, method: 'VIETQR', daysAgo: 0, hour: 10, partnerName: 'Khách lẻ', refCode: 'HD-R-20260922-0002', description: 'Thu tiền bán lẻ chuyển khoản VietQR', createdBy: CASHIER.id, createdByName: CASHIER.name },
  { id: 'cb_0003', code: 'PT-20260922-0003', type: 'RECEIPT', category: 'DEBT_COLLECT', amount: 15000000, method: 'TRANSFER', daysAgo: 0, hour: 11, partnerName: 'Công ty TNHH TM Đông Á', description: 'Thu hồi công nợ đợt 2' },
  { id: 'cb_0004', code: 'PC-20260921-0004', type: 'PAYMENT', category: 'SUPPLIER_PAYMENT', amount: 28000000, method: 'TRANSFER', daysAgo: 1, hour: 14, partnerName: 'Samsung Vina Electronics', description: 'Thanh toán tiền hàng đợt 3/9' },
  { id: 'cb_0005', code: 'PT-20260921-0005', type: 'RECEIPT', category: 'SALE', amount: 10000000, method: 'TRANSFER', daysAgo: 1, hour: 14, partnerName: 'Cửa hàng Điện máy Minh Phát', refCode: 'HD-S-20260921-0005', description: 'Khách thanh toán trước 50% đơn sỉ' },
  { id: 'cb_0006', code: 'PC-20260921-0006', type: 'PAYMENT', category: 'REFUND', amount: 4590000, method: 'CASH', daysAgo: 3, hour: 10, partnerName: 'Anh Lê Quang Minh', refCode: 'HD-R-20260919-0009', description: 'Hoàn tiền hàng trả lỗi loa', approvedBy: MANAGER.id, approvedByName: MANAGER.name },
  { id: 'cb_0007', code: 'PC-20260920-0007', type: 'PAYMENT', category: 'SALARY', amount: 78500000, method: 'TRANSFER', daysAgo: 2, hour: 16, description: 'Chi lương kỳ 1 tháng 9 cho 18 nhân sự' },
  { id: 'cb_0008', code: 'PC-20260920-0008', type: 'PAYMENT', category: 'SUPPLIER_PAYMENT', amount: 12000000, method: 'CASH', daysAgo: 2, hour: 17, partnerName: 'Sunhouse Việt Nam', description: 'Trả tiền nhập gia dụng', status: 'WAITING_APPROVAL' },
  { id: 'cb_0009', code: 'PT-20260919-0009', type: 'RECEIPT', category: 'DEBT_COLLECT', amount: 32400000, method: 'TRANSFER', daysAgo: 3, hour: 9, partnerName: 'Cửa hàng Điện máy Minh Phát', description: 'Thu hồi toàn bộ công nợ tháng 8' },
  { id: 'cb_0010', code: 'PC-20260919-0010', type: 'PAYMENT', category: 'OTHER_EXPENSE', amount: 2350000, method: 'CASH', daysAgo: 3, hour: 15, description: 'Chi phí điện, nước, internet tháng 9/2026' },
  { id: 'cb_0011', code: 'PT-20260918-0011', type: 'RECEIPT', category: 'SALE', amount: 85860000, method: 'TRANSFER', daysAgo: 4, hour: 9, partnerName: 'Trường THCS Ngôi Sao', refCode: 'HD-O-20260918-0010', description: 'Thu tiền đơn hàng văn phòng phẩm cho trường' },
  { id: 'cb_0012', code: 'PC-20260918-0012', type: 'PAYMENT', category: 'OTHER_EXPENSE', amount: 5600000, method: 'CASH', daysAgo: 4, hour: 14, description: 'Chi phí vận chuyển & bốc xếp' },
  { id: 'cb_0013', code: 'PT-20260917-0013', type: 'RECEIPT', category: 'OTHER_INCOME', amount: 1800000, method: 'CASH', daysAgo: 5, hour: 11, description: 'Thu tiền cho thuê mặt bằng trưng bày' },
  { id: 'cb_0014', code: 'PC-20260917-0014', type: 'PAYMENT', category: 'SUPPLIER_PAYMENT', amount: 6450000, method: 'CASH', daysAgo: 5, hour: 16, partnerName: 'Logitech Việt Nam', description: 'Trả tiền nhập phụ kiện', status: 'WAITING_APPROVAL' },
];

export const cashbookEntries: CashbookEntry[] = entrySpecs.map(buildEntry);

/** So du dau ky (dau nam tai chinh). */
export const OPENING_BALANCE = 250000000;

/** Cong no mau. */

interface DebtSeed {
  id: string;
  partnerId: string;
  partnerType: DebtRecord['partnerType'];
  totalDebt: number;
  paidAmount: number;
  dueInDays: number;
  status: DebtRecord['status'];
  daysAgo: number;
  note?: string;
}

const debtSeeds: DebtSeed[] = [
  { id: 'dt_0001', partnerId: 'cus_si01', partnerType: 'CUSTOMER', totalDebt: 101500000, paidAmount: 15000000, dueInDays: 20, status: 'PARTIAL', daysAgo: 0, note: 'Đã thu 15 triệu, hạn 20 ngày tới' },
  { id: 'dt_0002', partnerId: 'cus_si02', partnerType: 'CUSTOMER', totalDebt: 32400000, paidAmount: 0, dueInDays: -3, status: 'OVERDUE', daysAgo: 5, note: 'Quá hạn 3 ngày, kế toán cần đôn đốc' },
  { id: 'dt_0003', partnerId: 'cus_le02', partnerType: 'CUSTOMER', totalDebt: 1250000, paidAmount: 0, dueInDays: 10, status: 'OPEN', daysAgo: 2 },
  { id: 'dt_0004', partnerId: 'cus_le03', partnerType: 'CUSTOMER', totalDebt: 480000, paidAmount: 0, dueInDays: -1, status: 'OVERDUE', daysAgo: 9, note: 'Khách hẹn trả khi nhận lương' },
  { id: 'dt_0005', partnerId: 'sup_samsung', partnerType: 'SUPPLIER', totalDebt: 48500000, paidAmount: 28000000, dueInDays: 12, status: 'PARTIAL', daysAgo: 1 },
  { id: 'dt_0006', partnerId: 'sup_logitech', partnerType: 'SUPPLIER', totalDebt: 12300000, paidAmount: 0, dueInDays: 6, status: 'OPEN', daysAgo: 4 },
  { id: 'dt_0007', partnerId: 'sup_sunhouse', partnerType: 'SUPPLIER', totalDebt: 6750000, paidAmount: 0, dueInDays: -2, status: 'OVERDUE', daysAgo: 7, note: 'Chờ duyệt phiếu chi PC-20260920-0008' },
];

function buildDebt(seed: DebtSeed): DebtRecord {
  const isCustomer = seed.partnerType === 'CUSTOMER';
  const partner = isCustomer
    ? customers.find((c) => c.id === seed.partnerId)
    : suppliers.find((s) => s.id === seed.partnerId);
  const due = new Date();
  due.setDate(due.getDate() + seed.dueInDays);
  const lastTransaction = new Date();
  lastTransaction.setDate(lastTransaction.getDate() - seed.daysAgo);
  return {
    id: seed.id,
    partnerType: seed.partnerType,
    partnerId: seed.partnerId,
    partnerCode: partner?.code ?? '—',
    partnerName: partner?.name ?? 'Không xác định',
    phone: partner?.phone ?? '—',
    totalDebt: seed.totalDebt,
    paidAmount: seed.paidAmount,
    dueDate: due.toISOString(),
    status: seed.status,
    lastTransactionAt: lastTransaction.toISOString(),
    note: seed.note,
  };
}

export const debts: DebtRecord[] = debtSeeds.map(buildDebt);
export { MAIN_STORE_ID };
