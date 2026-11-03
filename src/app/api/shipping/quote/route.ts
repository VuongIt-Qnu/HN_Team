import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { quoteShipping } from '@/lib/shipping/service';
import type { QuoteInput } from '@/lib/shipping/types';

/** POST /api/shipping/quote - Bao gia ship qua provider dang cau hinh (mac dinh: mock). */
export async function POST(request: Request) {
  try {
    await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as QuoteInput;
    try {
      const quote = await quoteShipping(body);
      return jsonOk({
        quote,
        mockNote:
          quote.provider === 'mock'
            ? 'Gia mock theo cong thuc tam, khong phai bang gia that cua hang van chuyen.'
            : undefined,
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(400, error instanceof Error ? error.message : 'Khong tinh duoc phi ship.');
    }
  } catch (error) {
    return jsonError(error);
  }
}
