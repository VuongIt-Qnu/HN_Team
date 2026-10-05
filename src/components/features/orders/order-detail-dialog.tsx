'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { OrderDetailActions, OrderDetailContent } from '@/components/features/orders/order-detail-content';
import { formatDateTime } from '@/lib/utils';
import { ORDER_CHANNEL_LABELS, type Order, type OrderStatus } from '@/types';

export {
  OrderDetailActions,
  OrderDetailAside,
  OrderDetailContent,
} from '@/components/features/orders/order-detail-content';
export type { OrderDetailAsideProps } from '@/components/features/orders/order-detail-content';

interface Props {
  order: Order | null;
  onClose: () => void;
  /** Callback doi trang thai; neu khong truyen thi hop thoai chi de xem chi tiet. */
  onChangeStatus?: (orderId: string, status: OrderStatus) => void;
  pending?: boolean;
}

/**
 * Hop thoai chi tiet hoa don (dung cho Laptop/Tablet/Mobile - noi bo cuc khong du cho split view):
 * dong hang, tong ket, gia von theo quyen va cum nut chuyen trang thai.
 * Noi dung tai su dung tu `OrderDetailContent` nen dialog va panel Master-Detail tren man hinh rong
 * luon doc cung mot nguon du lieu (RULE 12/23).
 */
export function OrderDetailDialog({ order, onClose, onChangeStatus, pending }: Props) {
  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Hoá đơn {order?.code} <OrderStatusBadge status={order?.status ?? 'DRAFT'} />
          </DialogTitle>
          <DialogDescription>
            {order && (
              <>
                {ORDER_CHANNEL_LABELS[order.channel]} · {formatDateTime(order.createdAt)} · Thu ngân {order.cashierName}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {order && <OrderDetailContent order={order} />}

        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          {order && <OrderDetailActions order={order} onChangeStatus={onChangeStatus} pending={pending} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
