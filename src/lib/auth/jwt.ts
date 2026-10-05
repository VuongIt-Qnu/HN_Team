import { jwtVerify, SignJWT } from 'jose';
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from '@/lib/constants';
import type { PermissionCode, RoleCode, SessionUser } from '@/types';

/**
 * Ky & xac thuc JWT (HS256). File nay chay duoc tren Edge Runtime (Middleware)
 * lan Node Runtime (Route Handler / Server Component).
 */

export { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS };

const FALLBACK_SECRET = 'hn-group-dev-fallback-secret-please-change-32chars';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16 ? process.env.JWT_SECRET : FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    storeId: user.storeId,
    storeName: user.storeName,
    phone: user.phone,
    allowedRoutes: user.allowedRoutes,
    permissions: user.permissions,
    discountLimit: user.discountLimit,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());
}

export async function verifySession(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ['HS256'] });
    const id = payload.sub;
    if (!id) return null;
    return {
      id,
      username: String(payload.username ?? ''),
      fullName: String(payload.fullName ?? ''),
      role: payload.role as RoleCode,
      storeId: String(payload.storeId ?? ''),
      storeName: String(payload.storeName ?? ''),
      phone: String(payload.phone ?? ''),
      allowedRoutes: Array.isArray(payload.allowedRoutes) ? (payload.allowedRoutes as string[]) : [],
      permissions: Array.isArray(payload.permissions) ? (payload.permissions as PermissionCode[]) : [],
      discountLimit: typeof payload.discountLimit === 'number' ? payload.discountLimit : 0,
    };
  } catch {
    return null;
  }
}
