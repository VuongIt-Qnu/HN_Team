import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { OrderRuleError } from '@/lib/order-rules';
import { hasPermission } from '@/lib/rbac';
import type { PermissionCode, SessionUser } from '@/types';

/** Loi API chuan: { message, code } */
export class ApiError extends Error {
  status: number;

  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ message: error.message, code: error.code }, { status: error.status });
  }
  // Vi pham quy tac nghiep vu (vi du: don COD chua co anh hoan thien) -> 400 de UI hien thi ro rang.
  if (error instanceof OrderRuleError) {
    return NextResponse.json({ message: error.message, code: error.code }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : 'Lỗi hệ thống';
  console.error('[API_ERROR]', error);
  return NextResponse.json({ message }, { status: 500 });
}

/** Bat buoc dang nhap cho Route Handler. */
export async function requireApiSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'UNAUTHENTICATED');
  }
  return session;
}

/** Bat buoc co quyen thao tac cu the (Guard phia Backend). */
export async function requireApiPermission(permission: PermissionCode): Promise<SessionUser> {
  const session = await requireApiSession();
  if (!hasPermission(session, permission)) {
    throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.', 'FORBIDDEN');
  }
  return session;
}

/** An gia von voi tai khoan khong co quyen VIEW_COST_PRICE (dung o moi API tra du lieu). */
export function stripCostFields<T extends object>(
  session: SessionUser,
  payload: T,
  fields: string[] = ['costPrice', 'stockValue', 'totalValue', 'lineProfit', 'profit', 'cost'],
): T {
  if (hasPermission(session, 'VIEW_COST_PRICE')) return payload;
  const clone = { ...(payload as Record<string, unknown>) };
  for (const field of fields) {
    delete clone[field];
  }
  return clone as T;
}

/** Ap dung stripCostFields cho 1 mang ban ghi. */
export function stripCostFieldsList<T extends object>(
  session: SessionUser,
  payload: T[],
  fields?: string[],
): T[] {
  return payload.map((item) => stripCostFields(session, item, fields));
}
