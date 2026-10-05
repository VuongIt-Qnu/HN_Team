import { ApiError, jsonError, jsonOk, requireApiPermission, stripCostFields } from '@/lib/api-guard';
import { findProduct, updateProductSellPrice } from '@/lib/mock/db';

interface RouteContext {
  params: { id: string };
}

/**
 * PATCH /api/products/[id]/selling-price - Doi gia ban HIENTAI cua san pham.
 * Quyen: EDIT_SELL_PRICE (ROOT_ADMIN / STORE_MANAGER) - Staff/Thu ngan / Thu kho -> 403.
 * Validate (skill §10): gia phai la so hanh > 0 (null/0/am/NaN -> 400); khong tim thay SP -> 404.
 * Chi cap nhat Product.sellPrice - DON HANG CU van giu nguyen unitPrice snapshot (skill §3.3).
 */
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const session = await requireApiPermission('EDIT_SELL_PRICE');

    const body = (await request.json().catch(() => ({}))) as { sellPrice?: unknown };
    const sellPrice = body.sellPrice;
    if (typeof sellPrice !== 'number' || !Number.isFinite(sellPrice) || sellPrice <= 0) {
      throw new ApiError(400, 'Giá bán phải là số lớn hơn 0.');
    }

    const existing = findProduct(params.id);
    if (!existing) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

    const product = updateProductSellPrice(params.id, Math.round(sellPrice));
    if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm.');

    return jsonOk({
      product: stripCostFields(session, product),
      message: `Đã cập nhật giá bán "${product.name}" thành ${product.sellPrice.toLocaleString('vi-VN')}đ.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}
