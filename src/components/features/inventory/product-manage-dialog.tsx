'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { apiPatch } from '@/lib/api-client';
import { formatNumber, formatVND, getErrorMessage, parseNumber } from '@/lib/utils';
import type { Product, StockItem } from '@/types';

interface ManageDialogProps {
  item: StockItem | null;
  onClose: () => void;
}

/**
 * Dialog Doi gia ban HIENTAI (WAREHOUSE skill §8 / STEP 7).
 * Chỉ người có quyền EDIT_SELL_PRICE thấy nút mở; server cũng enforce (PATCH selling-price).
 * Invalidate ['inventory-stock'] + ['pos-products'] để POS/báo giá lấy giá mới cho giao dịch sau;
 * đơn hàng cũ KHÔNG bị đổi (server chỉ sửa Product.sellPrice).
 */
export function ProductPriceDialog({ item, onClose }: ManageDialogProps) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(item?.sellPrice ?? 0);
  }, [item]);

  const mutation = useMutation({
    mutationFn: (sellPrice: number) =>
      apiPatch<{ product: Product; message: string }>(`/api/products/${item?.productId}/selling-price`, { sellPrice }),
    onSuccess: (data) => {
      toast.success('Đã cập nhật giá bán', data.message);
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      void queryClient.invalidateQueries({ queryKey: ['pos-products-quick'] });
      onClose();
    },
    onError: (error) => toast.error('Không thể đổi giá bán', getErrorMessage(error)),
  });

  const invalid = !Number.isFinite(value) || value <= 0;

  return (
    <Dialog open={item !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi giá bán</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-semibold">{item?.name}</p>
            <p className="text-muted-foreground">
              {item?.sku} · Giá hiện tại: <span className="font-medium text-foreground">{formatVND(item?.sellPrice)}</span>
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="product-sell-price">Giá bán mới (VNĐ)</Label>
            <Input
              id="product-sell-price"
              inputMode="numeric"
              className="text-right font-semibold"
              placeholder="0"
              value={formatNumber(value)}
              onChange={(event) => setValue(parseNumber(event.target.value))}
            />
            {invalid && <p className="text-xs text-destructive">Giá bán phải lớn hơn 0.</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            Giá mới chỉ áp dụng cho giao dịch tạo từ bây giờ — đơn hàng cũ vẫn giữ nguyên giá tại thời điểm bán.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Huỷ</Button>
          <Button
            type="button"
            disabled={invalid || mutation.isPending}
            onClick={() => mutation.mutate(Math.round(value))}
          >
            {mutation.isPending ? 'Đang lưu...' : 'Lưu giá mới'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog Ngung kinh doanh - SOFT DELETE (WAREHOUSE skill §5/§9/§STEP 8).
 * Chỉ người có quyền DELETE_DATA thấy nút; server PATCH deactivate dat status = INACTIVE,
 * KHONG xoa khoi DB -> don hang / phieu nhap / hoa don lich su van ton tai (skill §6).
 */
export function ProductDeactivateDialog({ item, onClose }: ManageDialogProps) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      apiPatch<{ product: Product; message: string }>(`/api/products/${item?.productId}/deactivate`),
    onSuccess: (data) => {
      toast.success('Đã ngừng kinh doanh', data.message);
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      void queryClient.invalidateQueries({ queryKey: ['pos-products-quick'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      onClose();
    },
    onError: (error) => toast.error('Không thể ngừng kinh doanh', getErrorMessage(error)),
  });

  return (
    <Dialog open={item !== null} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ngừng kinh doanh sản phẩm?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="rounded-md bg-muted/50 p-3">
            <p className="font-semibold">{item?.name}</p>
            <p className="text-muted-foreground">{item?.sku} · Tồn kho: {formatNumber(item?.quantity)} {item?.unit}</p>
          </div>
          <p>Bạn có chắc muốn ngừng kinh doanh sản phẩm này?</p>
          <p className="text-muted-foreground">
            Sản phẩm sẽ không còn hiển thị trong kho hàng đang kinh doanh.
            <br />
            Lịch sử nhập hàng và bán hàng vẫn được giữ lại.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Hủy</Button>
          <Button type="button" variant="destructive" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
