import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createPayment, getPaymentsByOrder } from '@/lib/payments/service';
import type { CreatePaymentInput } from '@/lib/payments/types';

/** GET /api/payments?orderId=... - Danh sach payment cua 1 don hang. */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const orderId = new URL(request.url).searchParams.get('orderId') ?? '';
    if (!orderId) throw new ApiError(400, 'Thieu orderId.');
    return jsonOk({ items: getPaymentsByOrder(orderId), total: getPaymentsByOrder(orderId).length });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/payments - Tao payment qua provider dang cau hinh (mac dinh: mock). */
export async function POST(request: Request) {
  try {
    await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as CreatePaymentInput;
    try {
      const payment = await createPayment(body);
      return jsonOk(
        {
          payment,
          mockNote:
            payment.provider === 'mock'
              ? 'Che do mock: khong co tien that. Goi POST /api/payments/webhook voi status PAID de mo phong hang bao tien ve.'
              : undefined,
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : 'Khong tao duoc payment.');
    }
  } catch (error) {
    return jsonError(error);
  }
}
