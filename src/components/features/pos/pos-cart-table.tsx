'use client';

import { Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermission } from '@/components/shared/session-context';
import { usePosStore } from '@/lib/pos-store';
import type { OrderTab } from '@/lib/pos-types';
import { formatNumber, formatVND, parseNumber } from '@/lib/utils';

interface Props {
  tab: OrderTab;
  onLookupBarcode?: (barcode: string) => void;
}

/** Bang gio hang: nut [- 1 +], don gia (khoa neu thieu quyen), giam gia dong, xoa dong. */
export function PosCartTable({ tab }: Props) {
  const canEditPrice = usePermission('EDIT_SELL_PRICE');
  const bumpQuantity = usePosStore((state) => state.bumpQuantity);
  const setQuantity = usePosStore((state) => state.setQuantity);
  const setLinePrice = usePosStore((state) => state.setLinePrice);
  const setLineDiscount = usePosStore((state) => state.setLineDiscount);
  const removeLine = usePosStore((state) => state.removeLine);

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            <TableHead>Sản phẩm</TableHead>
            <TableHead className="w-32 text-right">Số lượng</TableHead>
            <TableHead className="w-28 text-right">Đơn giá</TableHead>
            <TableHead className="w-24 text-right">Giảm giá</TableHead>
            <TableHead className="w-28 text-right">Thành tiền</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {tab.lines.map((line, index) => (
            <TableRow key={line.lineId}>
              <TableCell className="text-xs text-muted-foreground">{index + 1}</TableCell>
              <TableCell>
                <p className="font-medium">{line.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {line.sku} · {line.barcode} · Tồn: {formatNumber(line.stock)} {line.unit}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => bumpQuantity(tab.tabId, line.lineId, -1)}
                    aria-label="Giảm 1"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    className="h-7 w-12 px-1 text-center text-sm"
                    value={formatNumber(line.quantity)}
                    onChange={(event) => setQuantity(tab.tabId, line.lineId, parseNumber(event.target.value))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => bumpQuantity(tab.tabId, line.lineId, 1)}
                    aria-label="Tăng 1"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {canEditPrice ? (
                  <Input
                    className="h-7 w-24 text-right text-sm"
                    value={formatNumber(line.unitPrice)}
                    onChange={(event) => setLinePrice(tab.tabId, line.lineId, parseNumber(event.target.value))}
                  />
                ) : (
                  <span className="inline-flex items-center gap-1 text-sm" title="Tài khoản không có quyền sửa giá bán">
                    {formatVND(line.unitPrice)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Input
                  className="h-7 w-20 text-right text-sm"
                  value={formatNumber(line.discount)}
                  onChange={(event) => setLineDiscount(tab.tabId, line.lineId, parseNumber(event.target.value))}
                />
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatVND(line.unitPrice * line.quantity - line.discount)}
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeLine(tab.tabId, line.lineId)}
                  aria-label="Xóa dòng"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function PosCartLoading() {
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang xử lý...
    </div>
  );
}
