import type { RoleCode } from '@/types';

/**
 * Danh muc route cua ung dung - dung cho ca 2 muc dich:
 * 1. Sinh Menu Sidebar theo quyen cua nguoi dung.
 * 2. Sinh bang Checkbox phan quyen trong Modal `/admin/users`.
 */
export interface AppRoute {
  path: string;
  label: string;
  group: string;
  description: string;
  /** Vai tro duoc truy cap theo ma tran RBAC mac dinh. */
  defaultRoles: RoleCode[];
  /** Yeu cau quyen thao tac bo sung (ngoai vai tro). */
  requiredPermission?: keyof typeof import('@/types').PERMISSION_LABELS;
}

export const APP_ROUTES: AppRoute[] = [
  {
    path: '/dashboard',
    label: 'Tổng quan',
    group: 'Bảng điều khiển',
    description: 'Số liệu doanh thu, đơn hàng, công nợ trong ngày',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'],
  },
  {
    path: '/pos',
    label: 'Bán hàng POS',
    group: 'Bán hàng',
    description: 'Màn hình thu ngân bán lẻ tốc độ cao (Fullscreen)',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'POS_CASHIER'],
  },
  {
    path: '/orders/retail',
    label: 'Đơn bán lẻ',
    group: 'Bán hàng',
    description: 'Danh sách hoá đơn bán lẻ',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'POS_CASHIER'],
  },
  {
    path: '/orders/wholesale',
    label: 'Báo giá & đơn sỉ',
    group: 'Bán hàng',
    description: 'Báo giá sỉ cần duyệt, đơn bán buôn',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'],
  },
  {
    path: '/orders/returns',
    label: 'Trả hàng / Hoàn tiền',
    group: 'Bán hàng',
    description: 'Tiếp nhận trả hàng và duyệt hoàn tiền',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'],
  },
  {
    path: '/shipping/cod',
    label: 'Kỹ thuật & Giao hàng COD',
    group: 'Bán hàng',
    description: 'Tuyến của kỹ thuật: gọi khách, thu hộ COD, chụp ảnh hoàn thiện (Mobile)',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'TECHNICIAN'],
  },
  {
    path: '/inventory/stock',
    label: 'Tồn kho',
    group: 'Kho hàng',
    description: 'Bảng tồn kho theo chi nhánh',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'WAREHOUSE'],
  },
  {
    path: '/inventory/operations',
    label: 'Phiếu Nhập / Xuất / Chuyển',
    group: 'Kho hàng',
    description: 'Lập và thực thi phiếu kho',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'WAREHOUSE'],
  },
  {
    path: '/inventory/audit',
    label: 'Kiểm kê kho',
    group: 'Kho hàng',
    description: 'Phiên kiểm kê và xử lý lệch kho',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'WAREHOUSE'],
  },
  {
    path: '/finance/cashbook',
    label: 'Sổ quỹ',
    group: 'Tài chính',
    description: 'Phiếu thu / phiếu chi và số dư quỹ',
    defaultRoles: ['ROOT_ADMIN', 'ACCOUNTANT'],
  },
  {
    path: '/finance/debts',
    label: 'Công nợ',
    group: 'Tài chính',
    description: 'Công nợ khách hàng & nhà cung cấp',
    defaultRoles: ['ROOT_ADMIN', 'ACCOUNTANT', 'STORE_MANAGER'],
  },
  {
    path: '/reports',
    label: 'Báo cáo',
    group: 'Tài chính',
    description: 'Doanh thu, lợi nhuận, hàng bán chạy',
    defaultRoles: ['ROOT_ADMIN', 'STORE_MANAGER', 'ACCOUNTANT'],
  },
  {
    path: '/admin/users',
    label: 'Tài khoản & Phân quyền',
    group: 'Hệ thống',
    description: 'Quản lý nhân viên, gán route và quyền thao tác',
    defaultRoles: ['ROOT_ADMIN'],
    requiredPermission: 'MANAGE_USERS',
  },
];

/** Route cong khai, khong can dang nhap. */
export const PUBLIC_ROUTES = ['/login', '/403-forbidden', '/404'];

/** Route mac dinh khi dang nhap lan dau theo vai tro. */
export const ROLE_HOME_ROUTE: Record<RoleCode, string> = {
  ROOT_ADMIN: '/dashboard',
  STORE_MANAGER: '/dashboard',
  ACCOUNTANT: '/dashboard',
  WAREHOUSE: '/inventory/stock',
  POS_CASHIER: '/pos',
  TECHNICIAN: '/shipping/cod',
};

/** Route FULLSCREEN: an Sidebar/Topbar de tap trung ban hang. */
export const FULLSCREEN_ROUTES = ['/pos'];

/** Han muc chiet khau (%) toi da khi KHONG co quyen DISCOUNT_OVER_LIMIT. */
export const DEFAULT_DISCOUNT_LIMIT = 10;

export const SESSION_COOKIE = 'hn_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 gio

/** Phim tat man hinh POS (buoc 5 cua workflow). */
export const POS_HOTKEYS = [
  { key: 'F2', label: 'Mở tab đơn mới' },
  { key: 'F3', label: 'Tìm / quét mã sản phẩm' },
  { key: 'F4', label: 'Tìm khách hàng' },
  { key: 'F12', label: 'Thanh toán & in hoá đơn' },
  { key: 'ESC', label: 'Huỷ giỏ hàng' },
] as const;
