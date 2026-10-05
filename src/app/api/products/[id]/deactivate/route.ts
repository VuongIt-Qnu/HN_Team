import { ApiError, jsonError, jsonOk, requireApiPermission, stripCostFields } from '@/lib/api-guard';
import { deactivateProduct, findProduct } from '@/lib/mock/db';

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/products/[id]/deactivate - SOFT DELETE: dat status = INACTIVE (skill §5/§9).
 * Quyen: DELETE_DATA (chi ADMIN mac dinh) - vai tro khac -> 403.
 * KHONG xoa khoi database: don hang / phieu nhap / hoa don / lich su ton kho van day du (skill §6).
 * Khong tim thay san pham -> 404 (skill §10).
 */
export async function PATCH(_request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiPermission('DELETE_DATA');

    const existing = findProduct(params.id);
    if (!existing) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

    const product = deactivateProduct(params.id);
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

    return jsonOk({
      product: stripCostFields(session, product),
      message: `Đã ngừng kinh doanh "${product.name}". Lịch sử nhập hàng và bán hàng vẫn được giữ lại.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
