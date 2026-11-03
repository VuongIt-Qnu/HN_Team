import { ApiError, jsonError, jsonOk } from '@/lib/api-guard';
import { handlePaymentWebhook } from '@/lib/payments/service';

/**
 * POST /api/payments/webhook - Hang thanh toan bao tien ve.
 * Khong dung session dang nhap (hang goi tu ben ngoai), thay vao do:
 * - neu dat PAYMENT_WEBHOOK_SECRET thi phai co header x-webhook-secret trung khop;
 * - adapter that PHai xac thuc chu ky ben trong verifyWebhook truoc khi doi trang thai.
 * Webhook khong hop le tra 400, khong lam thay doi du lieu.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (secret && request.headers.get('x-webhook-secret') !== secret) {
      throw new ApiError(401, 'Webhook khong hop le.');
    }
    const body = await request.json().catch(() => null);
    const payment = await handlePaymentWebhook(body, request.headers);
    if (!payment) throw new ApiError(400, 'Webhook khong hop le hoac payment khong ton tai.');
    return jsonOk({ payment });
  } catch (error) {
    return jsonError(error);
  }
}
