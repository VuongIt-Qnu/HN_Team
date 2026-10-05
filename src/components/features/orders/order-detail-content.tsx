'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MasterDetailPanel, MasterDetailPlaceholder } from '@/components/shared/master-detail-layout';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { OrderPhotoGallery } from '@/components/features/orders/order-photo-gallery';
import { usePermission, useSession } from '@/components/shared/session-context';
import { TotalsPanel, type TotalItem } from '@/components/shared/totals-panel';
import { cn, formatDateTime, formatNumber, formatVND } from '@/lib/utils';
import { COMPLETION_PHOTO_REQUIRED_MESSAGE } from '@/lib/order-rules';
import { ORDER_CHANNEL_LABELS, PAYMENT_METHOD_LABELS, type Order, type OrderStatus } from '@/types';

/** Dong ket so cua hoa don (Tạm tính / Chiết khấu / Tổng cộng / Còn nợ / Giá vốn...). */
function buildTotals(order: Order, canViewCost: boolean, costTotal: number, profit: number): TotalItem[] {
  const items: TotalItem[] = [{ label: 'Tạm tính', value: formatVND(order.subtotal) }];

  if (order.discount > 0) items.push({ label: 'Chiết khấu', value: `-${formatVND(order.discount)}` });
  items.push({ label: 'Tổng cộng', value: formatVND(order.total), emphasis: true });
  items.push({ label: 'Khách đưa', value: formatVND(order.paidAmount) });
  if (order.changeAmount > 0) items.push({ label: 'Tiền thừa', value: formatVND(order.changeAmount) });
  if (order.debtAmount > 0) items.push({ label: 'Còn nợ', value: formatVND(order.debtAmount), tone: 'danger' });

  if (canViewCost) {
    items.push({ label: 'Giá vốn', value: formatVND(costTotal) });
    items.push({ label: 'Lợi nhuận', value: formatVND(profit), emphasis: true });
  }

  return items;
}

/** Thong tin chung cua hoa don: khach hang, chi nhanh, thanh toan, giao hang. */
function OrderMeta({ order, compact, hideDelivery }: { order: Order; compact?: boolean; hideDelivery?: boolean }) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
      <p>
        <span className="text-muted-foreground">Khách hàng: </span>
        <span className="font-medium">{order.customerName}</span>
      </p>
      <p>
        <span className="text-muted-foreground">Điện thoại: </span>
        {order.customerPhone ?? '—'}
      </p>
      <p>
        <span className="text-muted-foreground">Chi nhánh: </span>
        {order.storeName}
      </p>
      <p>
        <span className="text-muted-foreground">Thanh toán: </span>
        {PAYMENT_METHOD_LABELS[order.paymentMethod]}
      </p>
      {order.shipperName && (
        <p>
          <span className="text-muted-foreground">Kỹ thuật phụ trách: </span>
          {order.shipperName}
        </p>
      )}
      {order.deliveryAddress && !hideDelivery && (
        <p className="sm:col-span-2">
          <span className="text-muted-foreground">Địa chỉ giao: </span>
          {order.deliveryAddress}
        </p>
      )}
    </div>
  );
}

/**
 * Than noi dung chi tiet hoa don, dung chung cho ca hai ngu canh:
 * - `compact = false`: hop thoai tren Laptop/Tablet/Mobile (bang dong hang day du).
 * - `compact = true`: panel Master-Detail tren man hinh rong (danh sach dong hang gon hon).
 */
export function OrderDetailContent({
  order,
  compact = false,
  hideDelivery = false,
  hidePhotos = false,
}: {
  order: Order;
  compact?: boolean;
  hideDelivery?: boolean;
  /** An khoi anh hoan thien khi man hinh da co khu vuc chup/xem anh rieng (vi du /shipping/cod). */
  hidePhotos?: boolean;
}) {
  const canViewCost = usePermission('VIEW_COST_PRICE');
  const costTotal = order.items.reduce((sum, item) => sum + (item.costPrice ?? 0) * item.quantity, 0);
  const profit = order.total - costTotal;

  const meta = <OrderMeta order={order} compact={compact} hideDelivery={hideDelivery} />;

  const lineList = (
    <ul className="divide-y rounded-md border text-sm">
      {order.items.map((item) => (
        <li key={item.id} className="px-3 py-2">
          <p className="font-medium">{item.name}</p>
          <p className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {formatNumber(item.quantity)} {item.unit} × {formatVND(item.unitPrice)}
              {item.discount > 0 && ` · giảm ${formatVND(item.discount)}`}
            </span>
            <span className="font-semibold tabular-nums text-foreground">{formatVND(item.lineTotal)}</span>
          </p>
          {canViewCost && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Giá vốn: {formatVND((item.costPrice ?? 0) * item.quantity)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );

  const lineTable = (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sản phẩm</TableHead>
          <TableHead className="text-right">SL</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Đơn giá</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Giảm giá</TableHead>
          <TableHead className="text-right">Thành tiền</TableHead>
          {canViewCost && <TableHead className="text-right">Giá vốn</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {order.items.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <p className="font-medium">{item.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {item.sku} · {item.barcode}
              </p>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatNumber(item.quantity)} {item.unit}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatVND(item.unitPrice)}</TableCell>
            <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatVND(item.discount)}</TableCell>
            <TableCell className="text-right font-semibold tabular-nums">{formatVND(item.lineTotal)}</TableCell>
            {canViewCost && (
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {formatVND((item.costPrice ?? 0) * item.quantity)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-3 text-sm">
      {compact ? <div className="px-4 pt-3">{meta}</div> : meta}
      {compact ? <div className="px-4">{lineList}</div> : lineTable}

      <TotalsPanel
        variant="list"
        label="Tổng kết hoá đơn"
        items={buildTotals(order, canViewCost, costTotal, profit)}
        note={canViewCost ? undefined : 'Ẩn giá vốn và lợi nhuận: tài khoản thiếu quyền VIEW_COST_PRICE.'}
        className={cn(compact ? 'pb-1' : 'rounded-md border')}
      />

      {order.note && (
        <p className={cn('rounded bg-muted px-3 py-2 text-xs text-muted-foreground', compact && 'mx-4')}>
          Ghi chú: {order.note}
        </p>
      )}

      {/* Minh chung giao hang do ky thuat tai len: Quan ly / Ke toan / Admin xem tai day. */}
      {!hidePhotos && <OrderPhotoGallery photos={order.photos} className={cn(compact && 'px-4 pb-1')} />}
    </div>
  );
}

/** Cum nut chuyen trang thai hoa don (duyet / giao / hoan tat / tra hang / huy). */
export function OrderDetailActions({
  order,
  onChangeStatus,
  pending,
  className,
}: {
  order: Order;
  onChangeStatus?: (orderId: string, status: OrderStatus) => void;
  pending?: boolean;
  className?: string;
}) {
  const canApprove = usePermission('APPROVE_ORDER');
  const session = useSession();
  // Quy tac COD: chua co anh hoan thien thi khong the chuyen sang Hoan tat (API cung chan 400).
  const needsCompletionPhoto = order.paymentMethod === 'COD' && (order.photos?.length ?? 0) === 0;
  /**
   * Don COD PENDING duoc gan: ky thuat do nhan don ngay tren mobile ma khong can
   * APPROVE_ORDER (API /api/orders/[id] co ngoai le tuong ung).
   */
  const isTechnicianAcceptedPending =
    order.paymentMethod === 'COD' &&
    order.status === 'PENDING' &&
    order.shipperId !== undefined &&
    (order.shipperId === session.id || session.role !== 'TECHNICIAN');
  if (!onChangeStatus) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {(order.status === 'PENDING' || order.status === 'DRAFT') && (
        <Button
          disabled={pending || (!canApprove && !isTechnicianAcceptedPending)}
          onClick={() => onChangeStatus(order.id, 'CONFIRMED')}
        >
          {isTechnicianAcceptedPending ? 'Nhận đơn' : canApprove ? 'Duyệt đơn' : 'Cần quyền duyệt đơn'}
        </Button>
      )}
      {order.status === 'CONFIRMED' && (
        <Button disabled={pending} variant="secondary" onClick={() => onChangeStatus(order.id, 'DELIVERING')}>
          Bắt đầu giao
        </Button>
      )}
      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'RETURNED' && (
        <Button
          disabled={pending || needsCompletionPhoto}
          variant="success"
          title={needsCompletionPhoto ? COMPLETION_PHOTO_REQUIRED_MESSAGE : undefined}
          onClick={() => onChangeStatus(order.id, 'COMPLETED')}
        >
          {needsCompletionPhoto ? 'Cần ảnh hoàn thiện' : 'Hoàn tất'}
        </Button>
      )}
      {order.status === 'COMPLETED' && (
        <Button
          disabled={pending || !canApprove}
          variant="destructive"
          onClick={() => onChangeStatus(order.id, 'RETURNED')}
        >
          Trả hàng
        </Button>
      )}
      {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
        <Button disabled={pending || !canApprove} variant="ghost" onClick={() => onChangeStatus(order.id, 'CANCELLED')}>
          Huỷ đơn
        </Button>
      )}
    </div>
  );
}

export interface OrderDetailAsideProps {
  order: Order | null;
  pending?: boolean;
  onChangeStatus?: (orderId: string, status: OrderStatus) => void;
  /** Mo ta khi chua chon ban ghi nao. */
  emptyTitle: string;
  emptyDescription?: string;
  /** Cum nut nghiep vu rieng cua man hinh (vi du thu ho COD), hien truoc nut doi trang thai. */
  extraActions?: ReactNode;
  /** Khoi bo sung duoi phan tong ket (vi du thong tin giao hang COD). */
  extraContent?: ReactNode;
  /** An dong "Dia chi giao" trong phan thong tin chung khi man hinh da co khoi giao hang rieng. */
  hideDelivery?: boolean;
  /** An khoi "Anh hoan thien" khi man hinh da co khu vuc chup/xem anh rieng (vi du /shipping/cod). */
  hidePhotos?: boolean;
}

/**
 * Panel chi tiet hoa don cho bo cuc Master-Detail tren man hinh rong.
 * Tai su dung `OrderDetailContent` + `OrderDetailActions` cua hop thoai nen du lieu va nghiep vu
 * luon dong nhat giua hai kieu hien thi (RULE 12/23).
 */
export function OrderDetailAside({
  order,
  pending,
  onChangeStatus,
  emptyTitle,
  emptyDescription,
  extraActions,
  extraContent,
  hideDelivery,
  hidePhotos,
}: OrderDetailAsideProps) {
  if (!order) return <MasterDetailPlaceholder title={emptyTitle} description={emptyDescription} />;

  return (
    <MasterDetailPanel
      title={`Hoá đơn ${order.code}`}
      subtitle={`${ORDER_CHANNEL_LABELS[order.channel]} · ${formatDateTime(order.createdAt)}`}
      actions={<OrderStatusBadge status={order.status} />}
    >
      <OrderDetailContent order={order} compact hideDelivery={hideDelivery} hidePhotos={hidePhotos} />
      {extraContent}
      {(extraActions || onChangeStatus) && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
          {extraActions}
          <OrderDetailActions order={order} onChangeStatus={onChangeStatus} pending={pending} />
        </div>
      )}
    </MasterDetailPanel>
  );
}
