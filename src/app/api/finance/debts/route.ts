import { ApiError, jsonError, jsonOk, requireApiPermission, requireApiSession } from '@/lib/api-guard';
import { debtSummary, listDebts, settleDebt } from '@/lib/mock/repo-debts';
import type { CashbookEntry, DebtRecord } from '@/types';

/** GET /api/finance/debts - Danh sach cong no khach hang / nha cung cap + tong hop. */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const partnerType = searchParams.get('partnerType') as DebtRecord['partnerType'] | null;
    const status = searchParams.get('status') as DebtRecord['status'] | null;

    const items = listDebts({
      partnerType: partnerType ?? undefined,
      status: status ?? undefined,
      onlyOverdue: searchParams.get('onlyOverdue') === 'true',
      search: searchParams.get('q') ?? undefined,
    });

    return jsonOk({ items, total: items.length, summary: debtSummary() });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/finance/debts - Ghi nhan thanh toan cong no (quyen MANAGE_DEBT). */
export async function POST(request: Request) {
  try {
    const session = await requireApiPermission('MANAGE_DEBT');
    const body = (await request.json().catch(() => ({}))) as {
      debtId?: string;
      amount?: number;
      method?: CashbookEntry['method'];
    };

    if (!body.debtId) throw new ApiError(400, 'Thiếu mã phiếu công nợ.');
    if (!body.amount || body.amount <= 0) throw new ApiError(400, 'Số tiền thanh toán phải lớn hơn 0.');

    const debt = settleDebt(session, {
      debtId: body.debtId,
      amount: Math.round(body.amount),
      method: body.method ?? 'CASH',
    });

    return jsonOk({
      debt,
      message: `Đã ghi nhận thanh toán ${body.amount.toLocaleString('vi-VN')}đ cho ${debt.partnerName}.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
