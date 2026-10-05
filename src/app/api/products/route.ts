import { ApiError, jsonError, jsonOk, requireApiSession, stripCostFieldsList } from '@/lib/api-guard';
import { hasPermission } from '@/lib/rbac';
import { listCategories, listProducts, listSuppliers, findProductByBarcode } from '@/lib/mock/db';
import { normalizeVN } from '@/lib/utils';

/**
 * GET /api/products - Tra cuu san pham cho POS & phieu kho.
 * Query: ?q=&barcode=&limit=&categoryId=&includeInactive=true
 * Soft delete (skill §8): mac dinh CHI tra ve san pham ACTIVE dang kinh doanh;
 * includeInactive=true chi cho tai khoan co quyen DELETE_DATA (man hinh quan ly).
 * Bao mat: loai bo `costPrice` neu tai khoan khong co quyen VIEW_COST_PRICE.
 */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q')?.trim() ?? '';
    const barcode = searchParams.get('barcode')?.trim() ?? '';
    const categoryId = searchParams.get('categoryId')?.trim() ?? '';
    const limit = Number.parseInt(searchParams.get('limit') ?? '0', 10);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (includeInactive && !hasPermission(session, 'DELETE_DATA')) {
      throw new ApiError(403, 'Bạn không có quyền xem sản phẩm đã ngừng kinh doanh.', 'FORBIDDEN');
    }

    if (barcode) {
      const product = findProductByBarcode(barcode, { includeInactive });
      const items = product ? [product] : [];
      return jsonOk({ items: stripCostFieldsList(session, items) });
    }

    let items = listProducts({ includeInactive });
    if (categoryId) items = items.filter((product) => product.categoryId === categoryId);
    if (keyword) {
      const normalized = normalizeVN(keyword);
      items = items.filter(
        (product) =>
          normalizeVN(product.name).includes(normalized) ||
          product.sku.toLowerCase().includes(keyword.toLowerCase()) ||
          product.barcode.includes(keyword),
      );
    }
    if (limit > 0) items = items.slice(0, limit);

    return jsonOk({
      items: stripCostFieldsList(session, items),
      categories: listCategories(),
      suppliers: listSuppliers(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
