import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createStockOperation } from '@/lib/mock/repo-stock-ops';
import { listStockOperations } from '@/lib/mock/repo-stock';
import { serializeStockOperations } from '@/lib/serializers';
import type { CreateStockOperationInput, StockOperationStatus, StockOperationType } from '@/types';

/** GET /api/inventory/operations - Danh sach phieu nhap/xuat/chuyen/dieu chinh. */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as StockOperationType | null;
    const status = searchParams.get('status') as StockOperationStatus | null;

    const items = listStockOperations({
      type: type ?? undefined,
      status: status ?? undefined,
      storeId: searchParams.get('storeId') ?? undefined,
      search: searchParams.get('q') ?? undefined,
    });

    return jsonOk({ items: serializeStockOperations(session, items), total: items.length });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/inventory/operations - Lap phieu kho (Thủ kho / Quản lý). */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as CreateStockOperationInput;

    if (!body.type) throw new ApiError(400, 'Vui lòng chọn loại phiếu kho.');
    if (!Array.isArray(body.items) || body.items.length === 0) {
      throw new ApiError(400, 'Phiếu kho phải có ít nhất 1 dòng hàng.');
    }

    let operation;
    try {
      operation = createStockOperation(session, body);
    } catch (error) {
      // Loi nghiep vu tu repository (thieu so luong, het hang, hang ngung kinh doanh...)
      // -> 400 thay vi 500 (cung pattern voi POST /api/orders).
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : 'Không tạo được phiếu kho.');
    }
    return jsonOk(
      { operation: serializeStockOperations(session, [operation])[0], message: `Đã lập phiếu ${operation.code} (chờ duyệt).` },
      { status: 201 },
    );
  } catch (error) {
    return jsonError(error);
  }
}
