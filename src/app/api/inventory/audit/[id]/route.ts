import { ApiError, jsonError, jsonOk, requireApiPermission } from '@/lib/api-guard';
import { approveStockAudit, rejectStockAudit } from '@/lib/mock/repo-audit';

interface RouteContext {
  params: { id: string };
}

/** PATCH /api/inventory/audit/[id] - Duyet / tu choi phien kiem ke (quyen APPROVE_STOCK). */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiPermission('APPROVE_STOCK');
    const body = (await request.json().catch(() => ({}))) as { action?: 'APPROVE' | 'REJECT'; reason?: string };

    if (body.action === 'REJECT') {
      const audit = rejectStockAudit(params.id, session, body.reason);
      return jsonOk({ audit, message: `Đã từ chối phiên kiểm kê ${audit.code}.` });
    }

    if (body.action === 'APPROVE' || !body.action) {
      const audit = approveStockAudit(params.id, session);
      if (!audit) throw new ApiError(404, 'Không tìm thấy phiên kiểm kê.');
      return jsonOk({
        audit,
        message: `Đã duyệt ${audit.code} và cập nhật tồn kho theo số lượng thực tế.`,
      });
    }

    throw new ApiError(400, 'Hành động không hợp lệ.');
  } catch (error) {
    return jsonError(error);
  }
}
