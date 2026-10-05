import { ApiError, jsonError, jsonOk } from '@/lib/api-guard';
import { signSession } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/session';
import { authenticateUser } from '@/lib/mock/db';
import { resolveHomeRoute } from '@/lib/rbac';
import type { SessionUser } from '@/types';

/** POST /api/auth/login - Dang nhap bang username/password, cap JWT vao cookie httpOnly. */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string };
    const username = String(body.username ?? '').trim();
    const password = String(body.password ?? '');

    if (!username || !password) {
      throw new ApiError(400, 'Vui lòng nhập tên đăng nhập và mật khẩu.');
    }

    const user = authenticateUser(username, password);
    if (!user) {
      throw new ApiError(401, 'Tên đăng nhập hoặc mật khẩu không đúng (hoặc tài khoản đã bị khóa).');
    }

    const session: SessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      storeId: user.storeId,
      storeName: user.storeName,
      phone: user.phone,
      allowedRoutes: user.allowedRoutes,
      permissions: user.permissions,
      discountLimit: user.discountLimit,
    };

    const token = await signSession(session);
    await setSessionCookie(token);

    return jsonOk({ user: session, homeRoute: resolveHomeRoute(session) });
  } catch (error) {
    return jsonError(error);
  }
}
