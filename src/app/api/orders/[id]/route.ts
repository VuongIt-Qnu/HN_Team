import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { findOrder, updateOrderStatus } from '@/lib/mock/repo-orders';
import { hasPermission } from '@/lib/rbac';
import { serializeOrder } from '@/lib/serializers';
import type { OrderStatus } from '@/types';

interface RouteContext {
  params: { id: string };
}

const APPROVAL_STATUSES: OrderStatus[] = ['CONFIRMED', 'RETURNED', 'CANCELLED', 'DELIVERING'];

/** GET /api/orders/[id] - Chi tiet hoa don. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiSession();
    const order = findOrder(params.id);
    if (!order) throw new ApiError(404, 'Không tìm thấy hoá đơn.');
    return jsonOk({ order: serializeOrder(session, order) });
  } catch (error) {
    return jsonError(error);
  }
}

/** PATCH /api/orders/[id] - Duyet / doi trang thai don hang (theo quyen APPROVE_ORDER). */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as { status?: OrderStatus };
    if (!body.status) throw new ApiError(400, 'Thiếu trạng thái cần cập nhật.');

    /**
     * Ngoai le: NV Ky thuat duoc "Nhan don" (PENDING -> CONFIRMED) voi don COD duoc gan
     * cho chinh minh - khong can APPROVE_ORDER. Ky thuat khong co APPROVE_ORDER van duyet
     * duoc lich giao cua minh ngay tren mobile.
     */
    const session = await requireApiSession();
    const target = APPROVAL_STATUSES.includes(body.status) ? findOrder(params.id) : undefined;
    const isTechnicianAccept =
      body.status === 'CONFIRMED' &&
      target?.paymentMethod === 'COD' &&
      target?.shipperId === session.id &&
      target?.status === 'PENDING';
    if (!isTechnicianAccept && APPROVAL_STATUSES.includes(body.status) && !hasPermission(session, 'APPROVE_ORDER')) {
      throw new ApiError(403, 'Bạn không có quyền thực hiện thao tác này.', 'FORBIDDEN');
    }

    const order = updateOrderStatus(params.id, body.status, session);
    return jsonOk({ order: serializeOrder(session, order) });
  } catch (error) {
    return jsonError(error);
  }
}
