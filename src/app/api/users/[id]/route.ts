import { ApiError, jsonError, jsonOk, requireApiPermission } from '@/lib/api-guard';
import { findUserById, lockUser, updateUser } from '@/lib/mock/db';
import type { UpdateUserInput } from '@/lib/mock/db';

interface RouteContext {
  params: { id: string };
}

/** GET /api/users/[id] - Chi tiet 1 tai khoan. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await requireApiPermission('MANAGE_USERS');
    const user = findUserById(params.id);
    if (!user) throw new ApiError(404, 'Không tìm thấy tài khoản.');
    const { passwordHash: _passwordHash, ...record } = user;
    return jsonOk({ user: record });
  } catch (error) {
    return jsonError(error);
  }
}

/** PATCH /api/users/[id] - Cap nhat thong tin / phan quyen / khoa tai khoan. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiPermission('MANAGE_USERS');
    const body = (await request.json().catch(() => ({}))) as UpdateUserInput & { action?: 'LOCK' };

    if (params.id === session.id && body.status && body.status !== 'ACTIVE') {
      throw new ApiError(400, 'Không thể tự khóa tài khoản đang đăng nhập.');
    }

    const user = body.action === 'LOCK' ? lockUser(params.id) : updateUser(params.id, body);
    return jsonOk({ user });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE /api/users/[id] - Khoa tai khoan (khong xoa cung de bao toan lich su giao dich). */
export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiPermission('MANAGE_USERS');
    if (params.id === session.id) throw new ApiError(400, 'Không thể khóa tài khoản đang đăng nhập.');
    const user = lockUser(params.id);
    return jsonOk({ user, message: `Đã khóa tài khoản ${user.username}.` });
  } catch (error) {
    return jsonError(error);
  }
}
