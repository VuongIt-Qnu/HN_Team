import { jsonError, jsonOk } from '@/lib/api-guard';
import { clearSessionCookie } from '@/lib/auth/session';

/** POST /api/auth/logout - Xoa cookie phien dang nhap. */
export async function POST() {
  try {
    await clearSessionCookie();
    return jsonOk({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
