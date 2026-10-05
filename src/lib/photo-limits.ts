/**
 * Gioi han anh hoan thien - dung CHUNG cho ca client (chan truoc khi tai len de tiet kiem 3G/4G)
 * va server (kiem tra lai lan cuoi). File nay khong import Node-only nen client import duoc.
 */

/** Anh dien thoai thuong 2-4MB -> cho phep toi 8MB/file va 6 file moi lan chup. */
export const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_PHOTOS_PER_REQUEST = 6;

export const ALLOWED_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/** Nhan hien thi cho nguoi dung (vi du: "8MB"). */
export const MAX_PHOTO_SIZE_LABEL = '8MB';

export function formatPhotoSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.max(Math.round(bytes / 1024), 1)}KB`;
}
