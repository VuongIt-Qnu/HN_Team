import type { SessionUser, UserRecord } from '@/types';
import { ROLE_DEFAULT_PERMISSIONS } from '@/types';
import { MAIN_STORE_ID } from './seed-catalog';

/**
 * Tai khoan mau (Mock User) - Buoc 2 cua workflow.
 * Mat khau demo duoc bam bang Bcrypt o `src/lib/mock/db.ts` (ham ensurePasswords)
 * voi cung 1 mat khau demo: `hn@123456`.
 */
export interface SeedUser extends Omit<UserRecord, 'storeName'> {
  password: string;
}

export const DEMO_PASSWORD = 'hn@123456';

export const seedUsers: SeedUser[] = [
  {
    id: 'us_root',
    username: 'root',
    fullName: 'Nguyễn Đức Hùng (Giám đốc)',
    phone: '0901 222 333',
    email: 'hung.nd@hngroup.vn',
    role: 'ROOT_ADMIN',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    allowedRoutes: ['/*'],
    permissions: ROLE_DEFAULT_PERMISSIONS.ROOT_ADMIN,
    discountLimit: 100,
    lastLoginAt: '2026-09-22T01:12:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_manager',
    username: 'quanly01',
    fullName: 'Trần Mạnh Quân',
    phone: '0902 333 444',
    email: 'quan.tm@hngroup.vn',
    role: 'STORE_MANAGER',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    // Ma tran: /dashboard, /pos, /orders/*, /inventory/*, /reports/*
    allowedRoutes: ['/dashboard', '/pos', '/orders/*', '/inventory/*', '/reports/*'],
    permissions: ROLE_DEFAULT_PERMISSIONS.STORE_MANAGER,
    discountLimit: 15,
    lastLoginAt: '2026-09-21T09:30:00.000Z',
    createdAt: '2024-02-10T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_accountant',
    username: 'ketoan01',
    fullName: 'Phạm Thị Lan',
    phone: '0903 444 555',
    email: 'lan.pt@hngroup.vn',
    role: 'ACCOUNTANT',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    // Ma tran: /dashboard, /finance/*, /reports/*, /orders/wholesale
    allowedRoutes: ['/dashboard', '/finance/*', '/reports/*', '/orders/wholesale'],
    permissions: ROLE_DEFAULT_PERMISSIONS.ACCOUNTANT,
    discountLimit: 0,
    lastLoginAt: '2026-09-22T02:05:00.000Z',
    createdAt: '2024-03-05T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_warehouse',
    username: 'thukho01',
    fullName: 'Đỗ Văn Thắng',
    phone: '0904 555 666',
    email: 'thang.dv@hngroup.vn',
    role: 'WAREHOUSE',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    // Thu kho chi duoc vao phan he kho va BI AN gia von (khong cap VIEW_COST_PRICE).
    allowedRoutes: ['/inventory/*'],
    permissions: ROLE_DEFAULT_PERMISSIONS.WAREHOUSE,
    discountLimit: 0,
    lastLoginAt: '2026-09-22T00:40:00.000Z',
    createdAt: '2024-05-19T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_cashier',
    username: 'thungan01',
    fullName: 'Lê Thị Mai',
    phone: '0905 666 777',
    email: 'mai.lt@hngroup.vn',
    role: 'POS_CASHIER',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    // Ma tran: /pos, /orders/retail + duoc cap them /inventory/stock de tra cuu ton.
    allowedRoutes: ['/pos', '/orders/retail', '/inventory/stock'],
    permissions: [],
    discountLimit: 5,
    lastLoginAt: '2026-09-22T03:00:00.000Z',
    createdAt: '2025-07-01T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_technician',
    username: 'kythuat01',
    fullName: 'Vũ Hồng Nam',
    phone: '0906 777 888',
    email: 'nam.vh@hngroup.vn',
    role: 'TECHNICIAN',
    storeId: MAIN_STORE_ID,
    status: 'ACTIVE',
    // Nhan vien ky thuat: nhan don giao COD duoc gan + chup anh hoan thien tai /shipping/cod
    allowedRoutes: ['/shipping/cod'],
    permissions: [],
    discountLimit: 0,
    lastLoginAt: '2026-09-22T03:15:00.000Z',
    createdAt: '2025-09-12T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
  {
    id: 'us_locked',
    username: 'thungan02',
    fullName: 'Bùi Thu Trang',
    phone: '0907 888 999',
    role: 'POS_CASHIER',
    storeId: 'st_hcm',
    status: 'LOCKED',
    allowedRoutes: ['/pos', '/orders/retail'],
    permissions: [],
    discountLimit: 5,
    createdAt: '2025-10-02T00:00:00.000Z',
    password: DEMO_PASSWORD,
  },
];

/** Payload JWT se luu theo cau truc SessionUser. */
export type { SessionUser };
