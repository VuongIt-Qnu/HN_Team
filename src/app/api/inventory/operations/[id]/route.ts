import { ApiError, jsonError, jsonOk, requireApiPermission, requireApiSession } from '@/lib/api-guard';
import { updateStockOperationStatus } from '@/lib/mock/repo-stock-ops';
import { findStockOperation } from '@/lib/mock/repo-stock';
import { serializeStockOperation } from '@/lib/serializers';
import type { StockOperationStatus } from '@/types';

interface RouteContext {
  params: { id: string };
}

/** PATCH /api/inventory/operations/[id] - Duyet / thuc thi / huy phieu kho. */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const body = (await request.json().catch(() => ({}))) as { status?: StockOperationStatus };
    if (!body.status) throw new ApiError(400, 'Thiếu trạng thái cần cập nhật.');

    // Duyet / thuc thi phieu can quyen APPROVE_STOCK; huy phieu chi can dang nhap.
    const session =
      body.status === 'APPROVED' || body.status === 'DONE'
        ? await requireApiPermission('APPROVE_STOCK')
        : await requireApiSession();

    const operation = updateStockOperationStatus(params.id, body.status, session);
    return jsonOk({
      operation: serializeStockOperation(session, operation),
      message: `Phiếu ${operation.code} đã chuyển sang trạng thái ${body.status}.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** GET /api/inventory/operations/[id] - Chi tiet phieu kho. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiSession();
    const operation = findStockOperation(params.id);
    if (!operation) throw new ApiError(404, 'Không tìm thấy phiếu kho.');
    return jsonOk({ operation: serializeStockOperation(session, operation) });
  } catch (error) {
    return jsonError(error);
  }
}
