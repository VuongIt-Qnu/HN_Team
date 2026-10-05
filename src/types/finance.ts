/** Thuc the tai chinh: so quy & cong no. */

export type CashbookType = 'RECEIPT' | 'PAYMENT';

export const CASHBOOK_TYPE_LABELS: Record<CashbookType, string> = {
  RECEIPT: 'Phiếu thu',
  PAYMENT: 'Phiếu chi',
};

export type CashbookCategory =
  | 'SALE'
  | 'DEBT_COLLECT'
  | 'SUPPLIER_PAYMENT'
  | 'SALARY'
  | 'REFUND'
  | 'OTHER_INCOME'
  | 'OTHER_EXPENSE';

export const CASHBOOK_CATEGORY_LABELS: Record<CashbookCategory, string> = {
  SALE: 'Thu tiền bán hàng',
  DEBT_COLLECT: 'Thu hồi công nợ',
  SUPPLIER_PAYMENT: 'Trả tiền nhà cung cấp',
  SALARY: 'Chi lương nhân viên',
  REFUND: 'Hoàn tiền khách hàng',
  OTHER_INCOME: 'Thu khác',
  OTHER_EXPENSE: 'Chi khác',
};

export type CashbookStatus = 'POSTED' | 'WAITING_APPROVAL' | 'REJECTED';

export const CASHBOOK_STATUS_LABELS: Record<CashbookStatus, string> = {
  POSTED: 'Đã hạch toán',
  WAITING_APPROVAL: 'Chờ duyệt',
  REJECTED: 'Từ chối',
};

export interface CashbookEntry {
  id: string;
  code: string;
  type: CashbookType;
  category: CashbookCategory;
  status: CashbookStatus;
  amount: number;
  method: 'CASH' | 'VIETQR' | 'TRANSFER';
  storeId: string;
  storeName: string;
  partnerName?: string;
  refCode?: string;
  description: string;
  createdBy: string;
  createdByName: string;
  approvedBy?: string;
  approvedByName?: string;
  createdAt: string;
}

export interface CashbookSummary {
  openingBalance: number;
  totalReceipt: number;
  totalPayment: number;
  closingBalance: number;
}

export type DebtPartnerType = 'CUSTOMER' | 'SUPPLIER';

export const DEBT_PARTNER_TYPE_LABELS: Record<DebtPartnerType, string> = {
  CUSTOMER: 'Khách hàng',
  SUPPLIER: 'Nhà cung cấp',
};

export type DebtStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export const DEBT_STATUS_LABELS: Record<DebtStatus, string> = {
  OPEN: 'Chưa thanh toán',
  PARTIAL: 'Thanh toán một phần',
  PAID: 'Đã tất toán',
  OVERDUE: 'Quá hạn',
};

export interface DebtRecord {
  id: string;
  partnerType: DebtPartnerType;
  partnerId: string;
  partnerCode: string;
  partnerName: string;
  phone: string;
  /** Duong: khach no cua hang. Am: cua hang no doi tac. */
  totalDebt: number;
  paidAmount: number;
  dueDate: string;
  status: DebtStatus;
  lastTransactionAt: string;
  note?: string;
}

export interface DebtSummary {
  totalCustomerDebt: number;
  totalSupplierDebt: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface RevenueReportRow {
  label: string;
  orderCount: number;
  revenue: number;
  /** Chi co khi co quyen VIEW_COST_PRICE. */
  cost?: number;
  profit?: number;
}

/** Mot chuoi du lieu cua bieu do doanh thu (vi du: "Thang 3", "Nam nay"). */
export interface RevenueChartSeries {
  /** Nhan hien thi o chu giai (legend) cua bieu do. */
  label: string;
  /** Doanh thu tai tung moc truc X (index 0 = moc dau tien). */
  values: number[];
}

/**
 * Du lieu 2 bieu do thong ke danh rieng cho tai khoan ROOT_ADMIN (trang Bao cao):
 * 1. Bieu do doanh thu NGAY TRONG THANG - 12 chuoi theo thang.
 * 2. Bieu do doanh thu THANG TRONG NAM - 2 chuoi nam nay / nam ngoai.
 */
export interface RevenueCharts {
  /** Nam dang xem tren bieu do thang. */
  year: number;
  /** Nam doi chieu (year - 1) tren bieu do thang. */
  previousYear: number;
  /** Do dai truc X cua bieu do ngay (so ngay toi da cua mot thang). */
  daysInMonth: number;
  /** 12 chuoi "Thang 1".."Thang 12": values[i] = doanh thu ngay i+1. */
  dailyByMonth: RevenueChartSeries[];
  /** 2 chuoi doanh thu 12 thang: nam dang xem va nam truoc do. */
  monthlyByYear: RevenueChartSeries[];
  /** Tong doanh thu nam dang xem (tinh theo don khong huy). */
  yearTotal: number;
  /** Tong doanh thu nam truoc do. */
  previousYearTotal: number;
}

export interface ReportOverview {
  from: string;
  to: string;
  revenue: number;
  orderCount: number;
  customerDebt: number;
  supplierDebt: number;
  cashBalance: number;
  /** Chi co khi co quyen VIEW_COST_PRICE. */
  cost?: number;
  profit?: number;
  /** Chi co khi co quyen VIEW_COST_PRICE. */
  inventoryValue?: number;
  byDay: RevenueReportRow[];
  topProducts: RevenueReportRow[];
  byStore: RevenueReportRow[];
}
