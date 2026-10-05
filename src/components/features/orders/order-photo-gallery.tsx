'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime, cn } from '@/lib/utils';
import type { OrderPhoto } from '@/types';

interface Props {
  photos?: OrderPhoto[];
  className?: string;
}

/**
 * Thu vien anh hoan thien (chi xem) - dung o panel / hop thoai chi tiet hoa don
 * de Quan ly - Ke toan - Admin xem minh chung giao hang do ky thuat tai len.
 * Anh that duoc phuc vu qua `/api/uploads/...` (yeu cau dang nhap) nen phai dung the <img> thuong.
 */
export function OrderPhotoGallery({ photos, className }: Props) {
  const [preview, setPreview] = useState<OrderPhoto | null>(null);
  if (!photos || photos.length === 0) return null;

  const newest = photos[photos.length - 1];

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Ảnh hoàn thiện ({photos.length})
      </p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setPreview(photo)}
            className="overflow-hidden rounded-md border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Xem ảnh hoàn thiện ${photo.fileName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt={photo.fileName} loading="lazy" className="h-20 w-full object-cover" />
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        {newest.uploadedByName} · {formatDateTime(newest.createdAt)}
      </p>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogTitle className="text-sm">{preview?.fileName}</DialogTitle>
          {preview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview.url} alt={preview.fileName} className="max-h-[70vh] w-full rounded-md object-contain" />
              <p className="text-xs text-muted-foreground">
                {preview.uploadedByName} · {formatDateTime(preview.createdAt)}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
