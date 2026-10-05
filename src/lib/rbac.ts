import type { PermissionCode, RoleCode, SessionUser } from '@/types';

/**
 * Engine RBAC dung chung cho Middleware (Edge), Server Components va API Guard.
 * Luu y: file nay KHONG duoc import thu vien Node-only (bcrypt, prisma...) vi
 * Middleware chay tren Edge Runtime.
 */

const hasWildcard = (routes: string[]) => routes.includes('*') || routes.includes('/*');

/** Kiem tra 1 route cu the co nam trong danh sach route duoc cap hay khong. */
export function matchesRoute(pattern: string, pathname: string): boolean {
  if (pattern === '*' || pattern === '/*') return true;
  if (pattern === pathname) return true;
  if (pattern.endsWith('/*')) {
    const base = pattern.slice(0, -2);
    return pathname === base || pathname.startsWith(`${base}/`);
  }
  return false;
}

export function canAccessRoute(allowedRoutes: string[] | undefined, pathname: string): boolean {
  if (!allowedRoutes || allowedRoutes.length === 0) return false;
  if (hasWildcard(allowedRoutes)) return true;
  return allowedRoutes.some((pattern) => matchesRoute(pattern, pathname));
}

export function hasPermission(
  user: Pick<SessionUser, 'permissions' | 'role'> | null | undefined,
  permission: PermissionCode,
): boolean {
  if (!user) return false;
  if (user.role === 'ROOT_ADMIN') return true;
  return user.permissions.includes(permission);
}

export function hasAnyPermission(
  user: Pick<SessionUser, 'permissions' | 'role'> | null | undefined,
  permissions: PermissionCode[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

/** Route mac dinh khi dang nhap (uu tien route nguoi dung duoc phep dau tien). */
export function resolveHomeRoute(user: Pick<SessionUser, 'allowedRoutes' | 'role'>): string {
  if (user.role === 'ROOT_ADMIN') return '/dashboard';
  const priority = ['/dashboard', '/pos', '/shipping/cod', '/inventory/stock', '/finance/cashbook', '/reports'];
  const hit = priority.find((route) => canAccessRoute(user.allowedRoutes, route));
  return hit ?? '/403-forbidden';
}

/** Nhan hien thi ngan gon cho tung vai tro. */
export function roleBadgeLabel(role: RoleCode): string {
  switch (role) {
    case 'ROOT_ADMIN':
      return 'Admin';
    case 'STORE_MANAGER':
      return 'QL cửa hàng';
    case 'ACCOUNTANT':
      return 'Kế toán';
    case 'WAREHOUSE':
      return 'Thủ kho';
    case 'POS_CASHIER':
      return 'Thu ngân';
    case 'TECHNICIAN':
      return 'Kỹ thuật';
    default:
      return role;
  }
}
