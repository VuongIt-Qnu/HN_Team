'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { PageHeader } from '@/components/shared/page-header';
import { SummaryStrip } from '@/components/shared/summary-strip';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { OrderDetailDialog } from '@/components/features/orders/order-detail-dialog';
import { useOrderStatusMutation, useOrdersQuery } from '@/hooks/use-orders';
import { formatDateTime, formatNumber, formatVND, getErrorMessage } from '@/lib/utils';
import { ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, type Order, type OrderStatus } from '@/types';

/** Man hinh /orders/retail - danh sach hoa don ban le (kenh RETAIL). */
export function RetailOrdersModule() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);

  const { data, isLoading, isError, error, refetch } = useOrdersQuery('retail', {
    channel: 'RETAIL',
    status,
    q,
    from,
    to,
  });
  const statusMutation = useOrderStatusMutation();

  const orders = data?.items ?? [];

  /** So lieu tom tat tinh tren dung du lieu API tra ve (khong them nghiep vu moi). */
  const summary = useMemo(
    () => ({
      orders: orders.length,
      revenue: orders.reduce((sum, order) => sum + order.total, 0),
      quantity: orders.reduce((sum, order) => sum + order.items.reduce((lineSum, item) => lineSum + item.quantity, 0), 0),
      pending: orders.filter((order) => order.status === 'PENDING').length,
    }),
    [orders],
  );

  const hasFilter = Boolean(q || status || from || to);
  const clearFilters = () => {
    setQ('');
    setStatus('');
    setFrom('');
    setTo('');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đơn bán lẻ"
        description={`${formatNumber(summary.orders)} hoá đơn đang hiển thị · Tổng doanh thu ${formatVND(summary.revenue)}`}
        actions={
          <Button asChild>
            <Link href="/pos">
              <Plus className="h-4 w-4" /> Tạo mới (POS)
            </Link>
          </Button>
        }
      />

      <SummaryStrip
        items={[
          { label: 'Hoá đơn', value: formatNumber(summary.orders) },
          { label: 'Doanh thu', value: formatVND(summary.revenue) },
          { label: 'Sản phẩm đã bán', value: formatNumber(summary.quantity) },
          {
            label: 'Chờ duyệt',
            value: formatNumber(summary.pending),
            tone: summary.pending > 0 ? 'warning' : 'default',
            hint: summary.pending > 0 ? 'Cần duyệt trước khi giao hàng' : 'Không còn hoá đơn chờ',
          },
        ]}
      />

      <Card>
        <ListToolbar
          title="Danh sách hoá đơn"
          search={{
            value: q,
            onChange: setQ,
            placeholder: 'Mã HĐ / khách hàng / tên hàng',
            label: 'Tìm hoá đơn',
          }}
          showClear={hasFilter}
          onClear={clearFilters}
        >
          <Select
            aria-label="Lọc theo trạng thái"
            className="h-9 w-44"
            value={status}
            onChange={(event) => setStatus(event.target.value as OrderStatus | '')}
          >
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((item) => (
              <option key={item} value={item}>
                {ORDER_STATUS_LABELS[item]}
              </option>
            ))}
          </Select>
          <Input
            aria-label="Từ ngày"
            className="h-9 w-40"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            aria-label="Đến ngày"
            className="h-9 w-40"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </ListToolbar>

        <CardContent className="p-0">
          {/* SKILL muc 12 - Partial data: giu du lieu da tai duoc, chi canh bao khi lam moi that bai. */}
          {isError && orders.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="mr-auto">{getErrorMessage(error)} — đang hiển thị dữ liệu của lần tải trước.</span>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                <RotateCcw className="h-3.5 w-3.5" /> Thử lại
              </Button>
            </div>
          )}

          {isError && orders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                Thử lại
              </Button>
            </div>
          ) : isLoading ? (
            <>
              <div className="hidden md:block">
                <TableSkeleton rows={6} cols={8} />
              </div>
              {/* SKILL muc 13: loading state cua Mobile la card, khong ep bang rong vao man hinh nho. */}
              <div className="space-y-3 p-4 md:hidden">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24 w-full" />
                ))}
              </div>
            </>
          ) : orders.length === 0 ? (
            <EmptyState
              className="m-4"
              title={hasFilter ? 'Không có hoá đơn phù hợp bộ lọc' : undefined}
              description={hasFilter ? 'Thử đổi từ khoá, trạng thái hoặc khoảng ngày.' : undefined}
              actionLabel={hasFilter ? 'Xoá bộ lọc' : undefined}
              onAction={hasFilter ? clearFilters : undefined}
            >
              {!hasFilter && (
                <Button asChild size="sm" className="mt-1">
                  <Link href="/pos">
                    <Plus className="h-3.5 w-3.5" /> Mở màn hình POS
                  </Link>
                </Button>
              )}
            </EmptyState>
          ) : (
            <>
              {/* SKILL muc 13 - Desktop: bang day du; Tablet: bang rut gon (cot phu an tu <1024px, van xem duoc o chi tiet); Mobile: card/list ben duoi. */}
              <Table containerClassName="hidden max-h-[62vh] scrollbar-thin md:block">
                <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                  <TableRow>
                    <TableHead className="w-28">Mã HĐ</TableHead>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead className="hidden text-right lg:table-cell">Số SP</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead className="hidden lg:table-cell">Thanh toán</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="w-24 text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer odd:bg-muted/25"
                      onClick={() => setSelected(order)}
                    >
                      <TableCell className="font-mono text-xs font-semibold">{order.code}</TableCell>
                      <TableCell className="max-w-[240px]">
                        <p className="truncate font-medium">{order.customerName}</p>
                        <p className="text-[11px] text-muted-foreground">{order.customerPhone ?? '—'}</p>
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums lg:table-cell">
                        {formatNumber(order.items.reduce((sum, item) => sum + item.quantity, 0))}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatVND(order.total)}</TableCell>
                      <TableCell className="hidden text-xs lg:table-cell">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelected(order);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" /> Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/*
                SKILL muc 13 + RULE 11/18: Mobile (<768px) khong ep bang rong vao man hinh nho
                -> card/list. Card hien day du thong tin cua bang (khong an bot du lieu),
                cham vao card de mo chi tiet (OrderDetailDialog) nhu desktop.
              */}
              <ul className="divide-y md:hidden">
                {orders.map((order) => (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(order)}
                      aria-label={`Xem chi tiết hoá đơn ${order.code}`}
                      className="w-full px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold">{order.code}</span>
                        <OrderStatusBadge status={order.status} />
                        <span className="ml-auto text-sm font-bold tabular-nums">{formatVND(order.total)}</span>
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">{order.customerName}</span>
                      <span className="block text-[11px] text-muted-foreground">{order.customerPhone ?? '—'}</span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span>Số SP: {formatNumber(order.items.reduce((sum, item) => sum + item.quantity, 0))}</span>
                        <span aria-hidden>·</span>
                        <span>{PAYMENT_METHOD_LABELS[order.paymentMethod]}</span>
                        <span aria-hidden>·</span>
                        <span>{formatDateTime(order.createdAt)}</span>
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                        <Eye className="h-3.5 w-3.5" aria-hidden /> Xem chi tiết
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                Hiển thị {formatNumber(orders.length)} / {formatNumber(data?.total ?? orders.length)} hoá đơn · Doanh thu
                danh sách: {formatVND(summary.revenue)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <OrderDetailDialog
        order={selected}
        pending={statusMutation.isPending}
        onClose={() => setSelected(null)}
        onChangeStatus={(orderId, nextStatus) =>
          statusMutation.mutate({ orderId, status: nextStatus }, { onSuccess: () => setSelected(null) })
        }
      />
    </div>
  );
}

/**
 * O so lieu tom tat (muc 15 - Dashboard Design: KPI truoc, du lieu chi tiet sau).
 * Dung luoi + duong ke thay vi long nhieu Card vao nhau (muc 7 cua RULES).
 */
function SummaryCell({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div className="bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 text-lg font-bold tabular-nums ${tone === 'warning' ? 'text-warning' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}
