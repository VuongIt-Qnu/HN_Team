import { ApiError, jsonError, jsonOk, requireApiPermission, requireApiSession } from '@/lib/api-guard';
import { cashbookSummary, createCashbookEntry, listCashbook } from '@/lib/mock/repo-cashbook';
import type { CashbookEntry } from '@/types';

/** GET /api/finance/cashbook - Danh sach phieu thu/chi + so du quy. */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as CashbookEntry['type'] | null;
    const status = searchParams.get('status') as CashbookEntry['status'] | null;
    const method = searchParams.get('method') as CashbookEntry['method'] | null;

    const items = listCashbook({
      type: type ?? undefined,
      status: status ?? undefined,
      method: method ?? undefined,
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      search: searchParams.get('q') ?? undefined,
    });

    return jsonOk({
      items,
      total: items.length,
      summary: cashbookSummary(searchParams.get('storeId') ?? undefined),
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/finance/cashbook - Lap phieu thu/chi (quyen MANAGE_CASHBOOK). */
export async function POST(request: Request) {
  try {
    const session = await requireApiPermission('MANAGE_CASHBOOK');
    const body = (await request.json().catch(() => ({}))) as {
      type?: CashbookEntry['type'];
      category?: CashbookEntry['category'];
      amount?: number;
      method?: CashbookEntry['method'];
      partnerName?: string;
      refCode?: string;
      description?: string;
    };

    if (!body.type) throw new ApiError(400, 'Vui lòng chọn loại phiếu (Thu/Chi).');
    if (!body.category) throw new ApiError(400, 'Vui lòng chọn loại thu/chi.');
    if (!body.amount || body.amount <= 0) throw new ApiError(400, 'Số tiền phải lớn hơn 0.');
    if (!body.description?.trim()) throw new ApiError(400, 'Vui lòng nhập diễn giải.');

    const entry = createCashbookEntry(session, {
      type: body.type,
      category: body.category,
      amount: Math.round(body.amount),
      method: body.method ?? 'CASH',
      partnerName: body.partnerName,
      refCode: body.refCode,
      description: body.description,
    });

    return jsonOk({ entry, message: `Đã lập phiếu ${entry.code}.` }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
