import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { collectCodPayment, listCodOrders } from '@/lib/mock/repo-orders';
import { serializeOrder, serializeOrders } from '@/lib/serializers';
import { COMPLETION_PHOTO_REQUIRED_MESSAGE } from '@/lib/order-rules';

/** GET /api/shipping/cod - Danh sach don COD duoc gan cho ky thuat dang nhap. */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const shipperId = searchParams.get('shipperId') ?? session.id;

    if (session.role === 'TECHNICIAN' && shipperId !== session.id) {
      throw new ApiError(403, 'Bạn chỉ xem được đơn hàng được gán cho mình.');
    }

    const items = listCodOrders(shipperId);
    return jsonOk({ items: serializeOrders(session, items), total: items.length });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/shipping/cod - Ky thuat cap nhat tien thu ho COD cho don duoc gan. */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    if (session.role !== 'TECHNICIAN' && session.role !== 'ROOT_ADMIN' && session.role !== 'STORE_MANAGER') {
      throw new ApiError(403, 'Chỉ nhân viên kỹ thuật hoặc quản lý được cập nhật thu hộ COD.');
    }

    const body = (await request.json().catch(() => ({}))) as { orderId?: string; amount?: number };
    if (!body.orderId) throw new ApiError(400, 'Thiếu mã đơn hàng.');
    const amount = Number(body.amount ?? 0);
    if (amount < 0) throw new ApiError(400, 'Số tiền thu hộ không hợp lệ.');

    const order = collectCodPayment(body.orderId, amount, session);
    const needsPhoto = order.debtAmount === 0 && order.status !== 'COMPLETED';
    const message = needsPhoto
      ? `Đã thu đủ tiền đơn ${order.code}. ${COMPLETION_PHOTO_REQUIRED_MESSAGE}`
      : `Đã ghi nhận thu hộ ${amount.toLocaleString('vi-VN')}đ cho đơn ${order.code}.`;

    return jsonOk({ order: serializeOrder(session, order), message });
  } catch (error) {
    return jsonError(error);
  }
}
