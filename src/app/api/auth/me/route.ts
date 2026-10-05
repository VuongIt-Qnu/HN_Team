import { jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';

/** GET /api/auth/me - Thong tin phien hien tai (dung cho Client Components). */
export async function GET() {
  try {
    const session = await requireApiSession();
    return jsonOk({ user: session });
  } catch (error) {
    return jsonError(error);
  }
}
