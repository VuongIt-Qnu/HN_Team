import { readFile, stat } from 'node:fs/promises';
import { ApiError, jsonError, requireApiSession } from '@/lib/api-guard';
import { mimeTypeFromPath, resolveStoredFile } from '@/lib/photo-storage';

interface RouteContext {
  params: { path: string[] };
}

/**
 * GET /api/uploads/[...path] - Phuc vu anh hoan thien da luu tren dia.
 * Anh gan voi khach hang/khach hang nen BAT BUOC dang nhap: middleware khong chan /api
 * va file trong `public/` khong duoc dung vi file sinh ra sau khi build.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    await requireApiSession();

    const relativePath = (params.path ?? []).join('/');
    const absolutePath = resolveStoredFile(relativePath);
    if (!absolutePath) throw new ApiError(400, 'Đường dẫn ảnh không hợp lệ.');

    const info = await stat(absolutePath).catch(() => null);
    if (!info || !info.isFile()) throw new ApiError(404, 'Không tìm thấy ảnh.');

    const file = await readFile(absolutePath);
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': mimeTypeFromPath(relativePath),
        'Content-Length': String(info.size),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
