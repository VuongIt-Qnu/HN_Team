import { ApiError, jsonError, jsonOk, requireApiSession, stripCostFieldsList } from '@/lib/api-guard';
import { hasPermission } from '@/lib/rbac';
import { listStock } from '@/lib/mock/repo-stock';

/**
 * GET /api/inventory/stock - Bang ton kho cua chi nhanh.
 * Query: ?search=&onlyLow=true&storeId=&includeInactive=true
 * Soft delete (skill §5.3): mac dinh chi hien mat hang DANG kinh doanh;
 * includeInactive=true (xem ca hang ngung kinh doanh) chi cho tai khoan co quyen DELETE_DATA.
 * Bao mat: an `costPrice` / `stockValue` voi tai khoan khong co quyen VIEW_COST_PRICE.
 */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const onlyLow = searchParams.get('onlyLow') === 'true';
    const storeId = searchParams.get('storeId') ?? session.storeId;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (includeInactive && !hasPermission(session, 'DELETE_DATA')) {
      throw new ApiError(403, 'Bạn không có quyền xem sản phẩm đã ngừng kinh doanh.', 'FORBIDDEN');
    }

    const items = listStock(storeId, search, onlyLow, includeInactive);
    return jsonOk({
      items: stripCostFieldsList(session, items),
      total: items.length,
      storeId,
      canViewCost: session.permissions.includes('VIEW_COST_PRICE') || session.role === 'ROOT_ADMIN',
    });
  } catch (error) {
    return jsonError(error);
  }
}
