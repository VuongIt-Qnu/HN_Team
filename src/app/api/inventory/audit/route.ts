import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createStockAudit, listStockAudits } from '@/lib/mock/repo-audit';
import type { StockAuditStatus } from '@/types';

/** GET /api/inventory/audit - Danh sach phien kiem ke. */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as StockAuditStatus | null;

    const items = listStockAudits({
      status: status ?? undefined,
      storeId: searchParams.get('storeId') ?? undefined,
    });
    return jsonOk({ items, total: items.length });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/inventory/audit - Lap phien kiem ke voi so luong thuc te dem duoc. */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as {
      items?: Array<{ productId: string; countedQty: number }>;
      note?: string;
    };

    if (!body.items?.length) throw new ApiError(400, 'Vui lòng chọn sản phẩm và nhập số lượng thực tế.');

    const audit = createStockAudit(session, {
      items: body.items.map((item) => ({
        productId: item.productId,
        countedQty: Number(item.countedQty) || 0,
      })),
      note: body.note,
    });

    return jsonOk({ audit, message: `Đã lập phiên kiểm kê ${audit.code} (chờ duyệt).` }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
