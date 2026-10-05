'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { apiGet } from '@/lib/api-client';
import { computeTabTotals, type OrderTab } from '@/lib/pos-types';
import { usePosStore } from '@/lib/pos-store';
import { cn, formatNumber, formatVND, parseNumber } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/types';
import { PosCustomerPicker } from '@/components/features/pos/pos-customer-picker';
import { PosTotalsCard } from '@/components/features/pos/pos-totals-card';
import { Button } from '@/components/ui/button';

/** Nhan vien ky thuat tra ve tu GET /api/catalog (de thu ngan gan don COD). */
export interface TechnicianOption {
  id: string;
  username: string;
  fullName: string;
  phone?: string;
}

interface Props {
  tab: OrderTab;
  submitting: boolean;
  customerInputRef: React.RefObject<HTMLInputElement>;
  onCheckout: () => void;
}

const QUICK_CASH = [50000, 100000, 200000, 500000];
const METHOD_BUTTON_CLASS =
  'rounded-md border px-2 py-2 text-sm font-medium transition-colors disabled:opacity-50';

/** Panel thanh toan ben phai man hinh POS. */
export function PosPaymentPanel({ tab, submitting, customerInputRef, onCheckout }: Props) {
  const updateTab = usePosStore((state) => state.updateTab);
  const totals = computeTabTotals(tab);
  const isCod = tab.paymentMethod === 'COD';

  /**
   * Khi chon COD: tai danh sach NV Ky thuat de thu ngan gan nguoi phu trach.
   * Don COD duoc tao o trang thai CONFIRMED nen se tu co mat trong tuyen
   * /shipping/cod cua ky thuat do (cho duyet / nhan giao).
   */
  const { data: technicians, isFetching: loadingTechnicians } = useQuery({
    queryKey: ['pos-technicians'],
    queryFn: () => apiGet<{ technicians: TechnicianOption[] }>('/api/catalog'),
    enabled: isCod,
    staleTime: 60_000,
  });
  const technicianOptions = technicians?.technicians ?? [];

  const selectMethod = (method: PaymentMethod) => {
    updateTab(tab.tabId, {
      paymentMethod: method,
      // Doi phuong thuc khac COD -> xoa thong tin giao hang de tranh du lieu cu.
      ...(method === 'COD'
        ? {}
        : { technicianId: undefined, technicianName: undefined, deliveryAddress: undefined }),
    });
  };

  return (
    <div className="flex h-full w-[350px] shrink-0 flex-col gap-3 overflow-y-auto border-l bg-card p-4">
      <PosCustomerPicker tab={tab} inputRef={customerInputRef} />
      <PosTotalsCard tab={tab} />

      <div className="space-y-1.5">
        <Label>Phương thức thanh toán</Label>
        <div className="grid grid-cols-2 gap-2">
          {(['CASH', 'VIETQR'] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => selectMethod(method)}
              className={cn(METHOD_BUTTON_CLASS, tab.paymentMethod === method ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}
            >
              {method === 'CASH' ? 'Tiền mặt' : 'VietQR'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(['CARD', 'TRANSFER', 'COD'] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => selectMethod(method)}
              className={cn('rounded-md border px-2 py-1.5 text-xs transition-colors', tab.paymentMethod === method ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted')}
            >
              {PAYMENT_METHOD_LABELS[method]}
            </button>
          ))}
        </div>
      </div>

      {isCod && (
        <div className="space-y-1.5 rounded-md border border-dashed p-2.5">
          <Label className="flex items-center gap-1">
            <UserRound className="h-3.5 w-3.5" /> NV Kỹ thuật phụ trách
          </Label>
          <Select
            value={tab.technicianId ?? ''}
            onChange={(event) => {
              const option = technicianOptions.find((item) => item.id === event.target.value);
              updateTab(tab.tabId, {
                technicianId: option?.id || undefined,
                technicianName: option?.fullName,
              });
            }}
            disabled={loadingTechnicians}
          >
            <option value="">-- Chọn kỹ thuật nhận đơn --</option>
            {technicianOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.fullName} ({option.username})
              </option>
            ))}
          </Select>
          <Input
            placeholder="Địa chỉ giao hàng (vd: Số 12 Lê Trọng Tấn, Hà Đông)"
            value={tab.deliveryAddress ?? ''}
            onChange={(event) => updateTab(tab.tabId, { deliveryAddress: event.target.value })}
          />
          <p className="text-[11px] leading-snug text-muted-foreground">
            Đơn COD được tạo ở trạng thái <span className="font-semibold">Đã xác nhận</span> và tự vào tuyến của kỹ
            thuật để duyệt / đi giao.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Tiền khách đưa</Label>
        <Input
          className="text-right text-lg font-semibold"
          value={formatNumber(tab.paidAmount)}
          onChange={(event) => updateTab(tab.tabId, { paidAmount: parseNumber(event.target.value) })}
        />
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" size="sm" onClick={() => updateTab(tab.tabId, { paidAmount: totals.total })}>
            Đủ tiền
          </Button>
          {QUICK_CASH.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateTab(tab.tabId, { paidAmount: tab.paidAmount + amount })}
            >
              +{formatNumber(amount / 1000)}k
            </Button>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>Tiền thừa trả khách</span>
          <span className="text-[hsl(142_72%_32%)]">{formatVND(totals.change)}</span>
        </div>
        {totals.debt > 0 && (
          <div className="flex items-center justify-between rounded bg-[hsl(38_92%_50%)]/10 px-2 py-1 text-sm text-[hsl(38_92%_30%)]">
            <span>Ghi nợ khách</span>
            <span className="font-semibold">{formatVND(totals.debt)}</span>
          </div>
        )}
      </div>

      <Button
        type="button"
        size="lg"
        className="mt-auto w-full"
        disabled={submitting || tab.lines.length === 0 || (isCod && !tab.technicianId)}
        onClick={onCheckout}
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {isCod ? 'Lên đơn COD & chuyển kỹ thuật (F12)' : 'Thanh toán & In hoá đơn (F12)'}
      </Button>
      {isCod && !tab.technicianId && (
        <p className="-mt-1 text-[11px] leading-snug text-destructive">
          Chọn NV Kỹ thuật phụ trách để lên đơn COD và chuyển lịch giao cho kỹ thuật duyệt.
        </p>
      )}
    </div>
  );
}
