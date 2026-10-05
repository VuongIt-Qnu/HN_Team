import { ApiError, jsonError, jsonOk, requireApiPermission, requireApiSession } from '@/lib/api-guard';
import { createUser, listUsers } from '@/lib/mock/db';
import type { CreateUserInput } from '@/lib/mock/db';

/** GET /api/users - Danh sach tai khoan (yeu cau quyen MANAGE_USERS). */
export async function GET() {
  try {
    await requireApiPermission('MANAGE_USERS');
    return jsonOk({ items: listUsers() });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/users - Tao tai khoan nhan vien voi route & quyen thao tac duoc tich chon. */
export async function POST(request: Request) {
  try {
    await requireApiPermission('MANAGE_USERS');
    const body = (await request.json().catch(() => ({}))) as Partial<CreateUserInput>;

    if (!body.username?.trim()) throw new ApiError(400, 'Vui lòng nhập tên đăng nhập.');
    if (!body.password || body.password.length < 6) {
      throw new ApiError(400, 'Mật khẩu tối thiểu 6 ký tự.');
    }
    if (!body.fullName?.trim()) throw new ApiError(400, 'Vui lòng nhập họ tên nhân viên.');
    if (!body.role) throw new ApiError(400, 'Vui lòng chọn vai trò.');
    if (!body.storeId) throw new ApiError(400, 'Vui lòng chọn chi nhánh.');
    if (!body.allowedRoutes?.length) {
      throw new ApiError(400, 'Vui lòng tích chọn ít nhất 1 URL Route được phép truy cập.');
    }

    const user = createUser({
      username: body.username,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone ?? '',
      email: body.email,
      role: body.role,
      storeId: body.storeId,
      status: body.status,
      allowedRoutes: body.allowedRoutes,
      permissions: body.permissions ?? [],
      discountLimit: body.discountLimit,
    });

    return jsonOk({ user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE khong ho tro o API nay: dung PATCH /api/users/[id] voi status LOCKED. */
export async function PUT() {
  try {
    await requireApiSession();
    throw new ApiError(405, 'Phương thức không được hỗ trợ. Dùng PATCH /api/users/[id].');
  } catch (error) {
    return jsonError(error);
  }
}
