/**
 * Dinh nghia RBAC (Role Based Access Control) - bam sat ma tran phan quyen
 * trong `vibe-coding-skill.md` (muc 3).
 */

export type RoleCode =
  | 'ROOT_ADMIN'
  | 'STORE_MANAGER'
  | 'ACCOUNTANT'
  | 'WAREHOUSE'
  | 'POS_CASHIER'
  | 'TECHNICIAN';

export const ROLES: RoleCode[] = [
  'ROOT_ADMIN',
  'STORE_MANAGER',
  'ACCOUNTANT',
  'WAREHOUSE',
  'POS_CASHIER',
  'TECHNICIAN',
];

export const ROLE_LABELS: Record<RoleCode, string> = {
  ROOT_ADMIN: 'Giám đốc / Admin',
  STORE_MANAGER: 'Quản lý cửa hàng',
  ACCOUNTANT: 'Kế toán',
  WAREHOUSE: 'Thủ kho',
  POS_CASHIER: 'NV Bán hàng (POS)',
  TECHNICIAN: 'NV Kỹ thuật (Giao hàng – COD)',
};

/** Quyen thao tac chi tiet (checkbox trong Modal phan quyen). */
export type PermissionCode =
  | 'MANAGE_USERS'
  | 'EDIT_SELL_PRICE'
  | 'VIEW_COST_PRICE'
  | 'APPROVE_ORDER'
  | 'APPROVE_STOCK'
  | 'APPROVE_REFUND'
  | 'DISCOUNT_OVER_LIMIT'
  | 'MANAGE_CASHBOOK'
  | 'MANAGE_DEBT'
  | 'EXPORT_REPORT'
  | 'DELETE_DATA';

export const PERMISSIONS: PermissionCode[] = [
  'MANAGE_USERS',
  'EDIT_SELL_PRICE',
  'VIEW_COST_PRICE',
  'APPROVE_ORDER',
  'APPROVE_STOCK',
  'APPROVE_REFUND',
  'DISCOUNT_OVER_LIMIT',
  'MANAGE_CASHBOOK',
  'MANAGE_DEBT',
  'EXPORT_REPORT',
  'DELETE_DATA',
];

export const PERMISSION_LABELS: Record<PermissionCode, string> = {
  MANAGE_USERS: 'Quản lý tài khoản & phân quyền',
  EDIT_SELL_PRICE: 'Được sửa giá bán',
  VIEW_COST_PRICE: 'Được xem giá vốn / lãi',
  APPROVE_ORDER: 'Được duyệt đơn / báo giá sỉ',
  APPROVE_STOCK: 'Duyệt phiếu kho & kiểm kê',
  APPROVE_REFUND: 'Duyệt hoàn tiền / trả hàng',
  DISCOUNT_OVER_LIMIT: 'Chiết khấu vượt hạn mức',
  MANAGE_CASHBOOK: 'Quản lý sổ quỹ (thu/chi)',
  MANAGE_DEBT: 'Quản lý công nợ',
  EXPORT_REPORT: 'Xuất báo cáo',
  DELETE_DATA: 'Xóa dữ liệu',
};

/** Quyen thao tac mac dinh theo vai tro (co the ghi de tung tai khoan). */
export const ROLE_DEFAULT_PERMISSIONS: Record<RoleCode, PermissionCode[]> = {
  ROOT_ADMIN: [...PERMISSIONS],
  STORE_MANAGER: ['EDIT_SELL_PRICE', 'VIEW_COST_PRICE', 'APPROVE_ORDER', 'APPROVE_STOCK', 'APPROVE_REFUND', 'DISCOUNT_OVER_LIMIT', 'EXPORT_REPORT'],
  ACCOUNTANT: ['VIEW_COST_PRICE', 'APPROVE_ORDER', 'APPROVE_REFUND', 'MANAGE_CASHBOOK', 'MANAGE_DEBT', 'EXPORT_REPORT'],
  WAREHOUSE: ['APPROVE_STOCK'],
  POS_CASHIER: [],
  TECHNICIAN: [],
};

/** Mot user trong session (sau khi xac thuc JWT). */
export interface SessionUser {
  id: string;
  username: string;
  fullName: string;
  role: RoleCode;
  storeId: string;
  storeName: string;
  phone: string;
  /** Danh sach route duoc phep, ho tro wildcard: /orders/*, /* */
  allowedRoutes: string[];
  permissions: PermissionCode[];
  /** Han muc chiet khau toi da (%) khi khong co quyen DISCOUNT_OVER_LIMIT */
  discountLimit: number;
}

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED';

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Đang hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  LOCKED: 'Đã khóa',
};

/** Ban ghi user day du (chi tra ve cho ROOT_ADMIN). */
export interface UserRecord {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  email?: string;
  role: RoleCode;
  storeId: string;
  storeName: string;
  status: UserStatus;
  allowedRoutes: string[];
  permissions: PermissionCode[];
  discountLimit: number;
  lastLoginAt?: string;
  createdAt: string;
}
