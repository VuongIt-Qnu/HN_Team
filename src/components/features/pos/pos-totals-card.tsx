'use client';

import { BadgePercent } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePermission, useSession } from '@/components/shared/session-context';
import { computeTabTotals, type OrderTab } from '@/lib/pos-types';
import { usePosStore } from '@/lib/pos-store';
import { formatNumber, formatVND, parseNumber } from '@/lib/utils';

/** The tong ket gio hang: tam tinh, giam gia dong, chiet khau don, canh bao vuot han muc. */
export function PosTotalsCard({ tab }: { tab: OrderTab }) {
  const user = useSession();
  const canOverDiscount = usePermission('DISCOUNT_OVER_LIMIT');
  const updateTab = usePosStore((state) => state.updateTab);
  const totals = computeTabTotals(tab);
  const overLimit = totals.discountPercent > user.discountLimit && !canOverDiscount;

  return (
    <div className="space-y-1.5 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Tạm tính ({formatNumber(totals.quantity)} SP)</span>
        <span className="font-medium">{formatVND(totals.subtotal)}</span>
      </div>
      {totals.lineDiscount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Giảm giá dòng</span>
          <span className="font-medium">-{formatVND(totals.lineDiscount)}</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-1 text-xs">
          <BadgePercent className="h-3.5 w-3.5" /> Chiết khấu đơn
        </Label>
        <Input
          className="h-8 w-28 text-right"
          value={formatNumber(tab.orderDiscount)}
          onChange={(event) => updateTab(tab.tabId, { orderDiscount: parseNumber(event.target.value) })}
        />
      </div>
      {overLimit && (
        <p className="rounded bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
          Chiết khấu {totals.discountPercent.toFixed(1)}% vượt hạn mức {user.discountLimit}% — cần quyền duyệt vượt hạn mức.
        </p>
      )}
      <div className="flex items-center justify-between border-t pt-1 text-lg font-bold">
        <span>Tổng cộng</span>
        <span className="text-primary">{formatVND(totals.total)}</span>
      </div>
    </div>
  );
}
