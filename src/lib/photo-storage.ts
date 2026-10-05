import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_PHOTO_SIZE_BYTES } from '@/lib/photo-limits';
import type { OrderPhoto } from '@/types';

/**
 * Luu anh hoan thien len dia (khong dung DB, khong dung base64 trong RAM):
 *   <UPLOAD_ROOT>/orders/<orderId>/<timestamp>-<random>.<ext>
 * Duoc phuc vu lai qua `GET /api/uploads/[...path]` (co kiem tra dang nhap)
 * nen anh van con sau khi khoi dong lai server.
 */

/** Thu muc goc luu anh; co the doi bang bien moi truong UPLOAD_DIR. */
export const UPLOAD_ROOT = process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), 'uploads');

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

export const ALLOWED_PHOTO_MIME_TYPES = Object.keys(MIME_EXTENSION);

/** Ghep duong dan tuyet doi trong UPLOAD_ROOT va chan path traversal ("../"). */
export function resolveStoredFile(relativePath: string): string | null {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const root = path.resolve(UPLOAD_ROOT);
  const absolute = path.resolve(root, normalized);
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null;
  return absolute;
}

/** Suy ra content-type tu duoi file (dung khi tra anh ve trinh duyet). */
export function mimeTypeFromPath(relativePath: string): string {
  const extension = path.extname(relativePath).toLowerCase().replace('.', '');
  const entry = Object.entries(MIME_EXTENSION).find(([, value]) => value === extension);
  return entry?.[0] ?? 'application/octet-stream';
}

export interface SaveOrderPhotosInput {
  orderId: string;
  files: File[];
  uploadedById: string;
  uploadedByName: string;
  note?: string;
}

export interface SaveOrderPhotosResult {
  photos: OrderPhoto[];
  /** File bi bo qua kem ly do (sai dinh dang / qua nang / rong). */
  skipped: string[];
}

/** Ghi file upload cua 1 don hang xuong dia va tra ve metadata de luu vao don. */
export async function saveOrderPhotos(input: SaveOrderPhotosInput): Promise<SaveOrderPhotosResult> {
  const photos: OrderPhoto[] = [];
  const skipped: string[] = [];
  const folder = `orders/${sanitizeSegment(input.orderId)}`;
  const targetDir = resolveStoredFile(folder);
  if (!targetDir) throw new Error('Đường dẫn lưu ảnh không hợp lệ.');

  await mkdir(targetDir, { recursive: true });

  for (const file of input.files) {
    const extension = MIME_EXTENSION[file.type];
    if (!extension) {
      skipped.push(`${file.name}: định dạng không hỗ trợ`);
      continue;
    }
    if (file.size <= 0) {
      skipped.push(`${file.name}: file rỗng`);
      continue;
    }
    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      skipped.push(`${file.name}: vượt quá 8MB`);
      continue;
    }

    const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const relativePath = `${folder}/${storedName}`;
    const absolutePath = resolveStoredFile(relativePath);
    if (!absolutePath) {
      skipped.push(`${file.name}: đường dẫn không hợp lệ`);
      continue;
    }

    await writeFile(absolutePath, Buffer.from(await file.arrayBuffer()));

    photos.push({
      id: `ph_${randomUUID().slice(0, 12)}`,
      path: relativePath,
      url: `/api/uploads/${relativePath}`,
      fileName: file.name || storedName,
      mimeType: file.type,
      size: file.size,
      note: input.note,
      uploadedById: input.uploadedById,
      uploadedByName: input.uploadedByName,
      createdAt: new Date().toISOString(),
    });
  }

  return { photos, skipped };
}

/** Xoa file anh tren dia (bo qua neu file da bi xoa truoc do). */
export async function deleteStoredPhoto(relativePath: string): Promise<void> {
  const absolutePath = resolveStoredFile(relativePath);
  if (!absolutePath) return;
  await unlink(absolutePath).catch(() => undefined);
}

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}
