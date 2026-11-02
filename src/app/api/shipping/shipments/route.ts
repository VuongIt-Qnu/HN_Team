import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createShipment, getShipmentsByOrder, trackShipment } from '@/lib/shipping/service';
import type { CreateShipmentInput } from '@/lib/shipping/types';

/** GET /api/shipping/shipments?orderId=... hoac ?trackingCode=... */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const params = new URL(request.url).searchParams;
    const orderId = params.get('orderId') ?? '';
    const trackingCode = params.get('trackingCode') ?? '';
    if (orderId) {
      const items = getShipmentsByOrder(orderId);
      return jsonOk({ items, total: items.length });
    }
    if (trackingCode) {
      const shipment = await trackShipment(trackingCode);
      if (!shipment) throw new ApiError(404, 'Khong tim thay van don.');
      return jsonOk({ shipment });
    }
    throw new ApiError(400, 'Thieu orderId hoac trackingCode.');
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/shipping/shipments - Tao van don qua provider dang cau hinh (mac dinh: mock). */
export async function POST(request: Request) {
  try {
    await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as CreateShipmentInput;
    try {
      const shipment = await createShipment(body);
      return jsonOk({ shipment }, { status: 201 });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : 'Khong tao duoc van don.');
    }
  } catch (error) {
    return jsonError(error);
  }
}
