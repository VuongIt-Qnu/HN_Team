import { jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { listCategories, listSuppliers, listTechnicians } from '@/lib/mock/db';
import { db } from '@/lib/mock/db';

/** GET /api/catalog - Danh muc nen (chi nhanh, nhom hang, NCC, NV Ky thuat) cho cac form nhap lieu. */
export async function GET() {
  try {
    await requireApiSession();
    return jsonOk({
      stores: db().stores,
      categories: listCategories(),
      suppliers: listSuppliers(),
      technicians: listTechnicians(),
    });
  } catch (error) {
    return jsonError(error);
  }
}
