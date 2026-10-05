import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { buildRevenueCharts } from '@/lib/mock/repo-reports';

/** Nam nho nhat duoc phep xem bieu do (tranh tham so rac tu URL). */
const MIN_YEAR = 2000;

/**
 * GET /api/reports/charts?year=2026 - Du lieu 2 bieu do doanh thu
 * (ngay trong thang & thang trong nam) - CHI tai khoan ROOT_ADMIN.
 */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    if (session.role !== 'ROOT_ADMIN') {
      throw new ApiError(403, 'Chỉ tài khoản Quản trị (Admin) được xem biểu đồ doanh thu.', 'FORBIDDEN');
    }

    const { searchParams } = new URL(request.url);
    const requestedYear = Number.parseInt(searchParams.get('year') ?? '', 10);
    const currentYear = new Date().getFullYear();
    const year = Number.isFinite(requestedYear) && requestedYear >= MIN_YEAR ? requestedYear : currentYear;

    return jsonOk({ charts: buildRevenueCharts(year) });
  } catch (error) {
    return jsonError(error);
  }
}
