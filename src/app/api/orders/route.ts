import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createOrder } from '@/lib/mock/repo-pos';
import { listOrders } from '@/lib/mock/repo-orders';
import { serializeOrder, serializeOrders } from '@/lib/serializers';
import type { CreateOrderInput, OrderChannel, OrderStatus, PaymentMethod } from '@/types';

/** GET /api/orders - Danh sach hoa don theo kenh / trang thai / tu khoa. */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') as OrderChannel | null;
    const status = searchParams.get('status') as OrderStatus | null;
    const paymentMethod = searchParams.get('paymentMethod') as PaymentMethod | null;
    const search = searchParams.get('q') ?? undefined;
    const from = searchParams.get('from') ?? undefined;
    const to = searchParams.get('to') ?? undefined;
    const limit = Number.parseInt(searchParams.get('limit') ?? '0', 10);

    const items = listOrders({
      channel: channel ?? undefined,
      status: status ?? undefined,
      paymentMethod: paymentMethod ?? undefined,
      customerId: searchParams.get('customerId') ?? undefined,
      shipperId: searchParams.get('shipperId') ?? undefined,
      search,
      from,
      to,
      limit: limit > 0 ? limit : undefined,
    });

    return jsonOk({ items: serializeOrders(session, items), total: items.length });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/orders - Chot don tai man hinh POS (khoa gia & chiet khau theo quyen). */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as CreateOrderInput;

    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new ApiError(400, 'Giỏ hàng đang trống, chưa thể thanh toán.');
    }
    if (!body.paymentMethod) {
      throw new ApiError(400, 'Vui lòng chọn phương thức thanh toán.');
    }

    let order;
    try {
      order = createOrder(session, body);
    } catch (error) {
      // Loi nghiep vu tu repository (thieu khach hang, vuot chiet khau, het hang...)
      // -> 400 thay vi 500 de form bao gia / POS hien thi dung message.
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : 'Không tạo được đơn hàng.');
    }
    return jsonOk({ order: serializeOrder(session, order) }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
