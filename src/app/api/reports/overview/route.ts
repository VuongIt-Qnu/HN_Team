import { jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { buildReportOverview } from '@/lib/mock/repo-reports';
import { serializeReport } from '@/lib/serializers';

function defaultRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** GET /api/reports/overview - Bao cao doanh thu / loi nhuan / hang ban chay. */
export async function GET(request: Request) {
  try {
    const session = await requireApiSession();
    const { searchParams } = new URL(request.url);
    const range = defaultRange(Number.parseInt(searchParams.get('days') ?? '7', 10) || 7);
    const from = searchParams.get('from') ?? range.from;
    const to = searchParams.get('to') ?? range.to;

    const report = buildReportOverview(from, to);
    return jsonOk({ report: serializeReport(session, report) });
  } catch (error) {
    return jsonError(error);
  }
}
