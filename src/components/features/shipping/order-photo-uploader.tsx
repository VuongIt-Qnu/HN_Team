'use client';

import { useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useCodPhotoDeleteMutation, useCodPhotoUploadMutation } from '@/hooks/use-orders';
import {
  ALLOWED_PHOTO_MIME_TYPES,
  formatPhotoSize,
  MAX_PHOTOS_PER_REQUEST,
  MAX_PHOTO_SIZE_BYTES,
  MAX_PHOTO_SIZE_LABEL,
} from '@/lib/photo-limits';
import { cn, formatDateTime } from '@/lib/utils';
import type { Order, OrderPhoto } from '@/types';

interface Props {
  order: Order;
  /** An gon cho card mobile: chi hien cum nut + day thumbnail + so luong anh. */
  compact?: boolean;
  className?: string;
}

/**
 * Chup anh hoan thien va day len website (mobile-first).
 * - "Chup anh": input `capture="environment"` -> mo truc tiep camera sau tren dien thoai.
 * - "Chon anh": lay tu thu vien anh cua may.
 * - File tai len qua `POST /api/shipping/cod/photos` (multipart) va duoc luu THAT tren server
 *   (uploads/orders/<orderId>/...) nen xem lai duoc tren moi thiet bi.
 * - Quy tac: don COD phai co it nhat 1 anh truoc khi bam "Giao thanh cong".
 */
export function OrderPhotoUploader({ order, compact = false, className }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<OrderPhoto | null>(null);

  const uploadMutation = useCodPhotoUploadMutation();
  const deleteMutation = useCodPhotoDeleteMutation();

  const photos = order.photos ?? [];
  const locked = order.status === 'CANCELLED' || order.status === 'RETURNED';
  const busy = uploadMutation.isPending;

  const resetInputs = () => {
    if (cameraRef.current) cameraRef.current.value = '';
    if (libraryRef.current) libraryRef.current.value = '';
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    if (files.length > MAX_PHOTOS_PER_REQUEST) {
      toast.error('Quá nhiều ảnh', `Mỗi lần chỉ tải tối đa ${MAX_PHOTOS_PER_REQUEST} ảnh.`);
      resetInputs();
      return;
    }

    const tooLarge = files.find((file) => file.size > MAX_PHOTO_SIZE_BYTES);
    if (tooLarge) {
      toast.error('Ảnh quá lớn', `${tooLarge.name} vượt quá ${MAX_PHOTO_SIZE_LABEL}. Vui lòng chụp lại ở chế độ tiêu chuẩn.`);
      resetInputs();
      return;
    }

    const wrongType = files.find((file) => !ALLOWED_PHOTO_MIME_TYPES.includes(file.type));
    if (wrongType) {
      toast.error('Định dạng ảnh không hỗ trợ', `${wrongType.name}: chỉ nhận ảnh JPG, PNG, WEBP hoặc HEIC.`);
      resetInputs();
      return;
    }

    const formData = new FormData();
    formData.append('orderId', order.id);
    for (const file of files) formData.append('files', file);

    try {
      await uploadMutation.mutateAsync(formData);
    } catch {
      // Da co toast loi tu hook useCodPhotoUploadMutation.
    } finally {
      resetInputs();
    }
  };

  const handleDelete = (photo: OrderPhoto) => {
    deleteMutation.mutate({ orderId: order.id, photoId: photo.id }, { onSuccess: () => setPreview(null) });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(event) => void handleFiles(event.target.files)}
        />

        <Button type="button" size="sm" disabled={busy || locked} onClick={() => cameraRef.current?.click()}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {busy ? 'Đang tải...' : 'Chụp ảnh'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || locked}
          onClick={() => libraryRef.current?.click()}
        >
          <ImagePlus className="h-3.5 w-3.5" /> Chọn ảnh
        </Button>

        <span
          className={cn(
            'text-[11px] font-medium',
            photos.length > 0 ? 'text-[hsl(142_72%_32%)]' : 'text-muted-foreground',
          )}
        >
          {photos.length > 0 ? `Đã có ${photos.length} ảnh hoàn thiện` : 'Chưa có ảnh hoàn thiện'}
        </span>
      </div>

      {!compact && (
        <p className="text-[11px] text-muted-foreground">
          Ảnh lưu trực tiếp lên website (tối đa {MAX_PHOTOS_PER_REQUEST} ảnh/lần, mỗi ảnh ≤ {MAX_PHOTO_SIZE_LABEL}).
          {photos.length === 0 && ' Cần ít nhất 1 ảnh trước khi bấm “Giao thành công”.'}
        </p>
      )}

      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.id}>
              <button
                type="button"
                onClick={() => setPreview(photo)}
                className="block overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Xem ảnh hoàn thiện ${photo.fileName} (${formatPhotoSize(photo.size)})`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.fileName}
                  loading="lazy"
                  className={cn('object-cover', compact ? 'h-14 w-14' : 'h-20 w-20')}
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-sm">Ảnh hoàn thiện đơn {order.code}</DialogTitle>
          <DialogDescription className="text-xs">
            {preview
              ? `${preview.fileName} · ${formatPhotoSize(preview.size)} · ${formatDateTime(preview.createdAt)}`
              : ''}
          </DialogDescription>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.fileName} className="max-h-[65vh] w-full rounded-md object-contain" />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending || locked}
                  onClick={() => handleDelete(preview)}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Xoá ảnh này
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
