import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { getPaymentById } from '@/lib/payments/service';

/** GET /api/payments/[id] - Trang thai 1 payment. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireApiSession();
    const payment = getPaymentById(params.id);
    if (!payment) throw new ApiError(404, 'Khong tim thay payment.');
    return jsonOk({ payment });
  } catch (error) {
    return jsonError(error);
  }
}
