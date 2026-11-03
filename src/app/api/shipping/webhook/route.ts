import { ApiError, jsonError, jsonOk } from '@/lib/api-guard';
import { handleShippingWebhook } from '@/lib/shipping/service';

/**
 * POST /api/shipping/webhook - Hang van chuyen bao trang thai giao hang.
 * Khong dung session dang nhap (hang goi tu ben ngoai), thay vao do:
 * - neu dat SHIPPING_WEBHOOK_SECRET thi phai co header x-webhook-secret trung khop;
 * - adapter that PHai xac thuc webhook ben trong verifyWebhook truoc khi doi trang thai.
 * Trang thai chi duoc chuyen theo thu tu hop le (xem store.ts).
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.SHIPPING_WEBHOOK_SECRET;
    if (secret && request.headers.get('x-webhook-secret') !== secret) {
      throw new ApiError(401, 'Webhook khong hop le.');
    }
    const body = await request.json().catch(() => null);
    const shipment = await handleShippingWebhook(body, request.headers);
    if (!shipment) throw new ApiError(400, 'Webhook khong hop le hoac van don khong ton tai.');
    return jsonOk({ shipment });
  } catch (error) {
    return jsonError(error);
  }
}
