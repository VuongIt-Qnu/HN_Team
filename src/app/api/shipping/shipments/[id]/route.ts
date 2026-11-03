import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { getShipmentById } from '@/lib/shipping/service';

/** GET /api/shipping/shipments/[id] - Chi tiet van don theo id hoac ma tracking. */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    await requireApiSession();
    const shipment = getShipmentById(params.id);
    if (!shipment) throw new ApiError(404, 'Khong tim thay van don.');
    return jsonOk({ shipment });
  } catch (error) {
    return jsonError(error);
  }
}
