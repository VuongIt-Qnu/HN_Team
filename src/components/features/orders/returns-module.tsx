'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Eye, RefreshCw, ShieldAlert, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton, TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/shared/empty-state';
import { ListToolbar } from '@/components/shared/list-toolbar';
import { MasterDetailLayout } from '@/components/shared/master-detail-layout';
import { PageHeader } from '@/components/shared/page-header';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { SummaryStrip } from '@/components/shared/summary-strip';
import { TotalsPanel } from '@/components/shared/totals-panel';
import { usePermission } from '@/components/shared/session-context';
import { OrderDetailAside, OrderDetailDialog } from '@/components/features/orders/order-detail-dialog';
import { useOrderStatusMutation, useOrdersQuery } from '@/hooks/use-orders';
import { formatDateTime, formatNumber, formatVND, getErrorMessage } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type Order, type OrderStatus } from '@/types';

type ReturnsTab = 'returnable' | 'history';

/**
 * Man hinh /orders/returns - doi chieu "Quan ly khach tra lai" cua app desktop v4.5.
 * Web: 2 tab (hoa don co the tra | lich su da tra) + Master-Detail + dong TONG.
 * Nghiep vu giu nguyen: chi hoa don HOAN TAT (COMPLETED) moi duoc chuyen sang DA TRA HANG (RETURNED),
 * backend se tu hoan ton kho va sinh phieu chi hoan tien (tien mat, CHO DUYET) trong so quy.
 */
export function ReturnsModule() {
  const [tab, setTab] = useState<ReturnsTab>('returnable');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefund, setLastRefund] = useState<{ code: string; amount: number } | null>(null);
  const canManage = usePermission('APPROVE_ORDER');

  const { data, isLoading, isFetching, isError, error, refetch } = useOrdersQuery('returns', { q, from, to });
  const statusMutation = useOrderStatusMutation();

  /** Hoa don hoan tat (co the tra) va lich su da tra - loc tu dung du lieu API tra ve. */
  const returnableOrders = useMemo(
    () => (data?.items ?? []).filter((order) => order.status === 'COMPLETED'),
    [data],
  );
  const returnedOrders = useMemo(() => (data?.items ?? []).filter((order) => order.status === 'RETURNED'), [data]);
  const selectedOrder = useMemo(
    () => (data?.items ?? []).find((order) => order.id === selectedId) ?? null,
    [data, selectedId],
  );

  const summary = useMemo(
    () => ({
      returnable: returnableOrders.length,
      returnableValue: returnableOrders.reduce((sum, order) => sum + order.total, 0),
      returned: returnedOrders.length,
      returnedValue: returnedOrders.reduce((sum, order) => sum + order.total, 0),
    }),
    [returnableOrders, returnedOrders],
  );

  const hasFilter = Boolean(q || from || to);
  const clearFilters = () => {
    setQ('');
    setFrom('');
    setTo('');
  };

  const handleChangeStatus = (orderId: string, nextStatus: OrderStatus) =>
    statusMutation.mutate(
      { orderId, status: nextStatus },
      {
        onSuccess: (result) => {
          if (result.order.status === 'RETURNED') {
            setLastRefund({ code: result.order.code, amount: result.order.total });
          }
        },
      },
    );

  /**
   * Bang danh sach hoa don dung chung cho ca 2 tab (chi khac cot thao tac).
   * Desktop/Tablet = luoi, Mobile = card/list (SKILL muc 13, RULE 11/18).
   */
  const renderOrderList = (rows: Order[], mode: ReturnsTab) => (
    <>
      <Table containerClassName="hidden max-h-[62vh] scrollbar-thin md:block">
        <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
          <TableRow>
            <TableHead className="w-28">Mã HĐ</TableHead>
            <TableHead>Khách hàng</TableHead>
            <TableHead className="text-right">Tổng tiền</TableHead>
            <TableHead className="hidden lg:table-cell">Thanh toán</TableHead>
            <TableHead className="hidden lg:table-cell">Thời gian</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead className="w-48 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((order) => (
            <TableRow
              key={order.id}
              data-state={order.id === selectedId ? 'selected' : undefined}
              aria-selected={order.id === selectedId}
              className="cursor-pointer odd:bg-muted/25"
              onClick={() => setSelectedId(order.id)}
            >
              <TableCell className="font-mono text-xs font-semibold">{order.code}</TableCell>
              <TableCell className="max-w-[220px]">
                <p className="truncate font-medium">{order.customerName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {order.customerPhone ?? '—'} · {formatNumber(order.items.length)} mặt hàng
                </p>
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatVND(order.total)}</TableCell>
              <TableCell className="hidden text-xs lg:table-cell">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</TableCell>
              <TableCell className="hidden whitespace-nowrap text-xs text-muted-foreground lg:table-cell">
                {formatDateTime(order.createdAt)}
              </TableCell>
              <TableCell>
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {/* Tu 1536px da co panel chi tiet ben phai -> an nut Xem cho gon luoi. */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="2xl:hidden"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(order.id);
                    }}
                  >
                    <Eye className="h-3.5 w-3.5" /> Xem
                  </Button>
                  {mode === 'returnable' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!canManage || statusMutation.isPending}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleChangeStatus(order.id, 'RETURNED');
                      }}
                    >
                      <Undo2 className="h-3.5 w-3.5" /> Trả hàng
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Mobile (<768px): card/list day du thong tin, nut tra hang dat ngay tren card. */}
      <ul className="divide-y md:hidden">
        {rows.map((order) => (
          <li key={order.id} className="px-3 py-3">
            <button
              type="button"
              onClick={() => setSelectedId(order.id)}
              aria-label={`Xem chi tiết hoá đơn ${order.code}`}
              className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold">{order.code}</span>
                <OrderStatusBadge status={order.status} />
                <span className="ml-auto text-sm font-bold tabular-nums">{formatVND(order.total)}</span>
              </span>
              <span className="mt-1 block truncate text-sm font-medium">{order.customerName}</span>
              <span className="block text-[11px] text-muted-foreground">
                {order.customerPhone ?? '—'} · {formatNumber(order.items.length)} mặt hàng ·{' '}
                {PAYMENT_METHOD_LABELS[order.paymentMethod]}
              </span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                <Eye className="h-3.5 w-3.5" aria-hidden /> Xem chi tiết
              </span>
            </button>
            {mode === 'returnable' && (
              <Button
                variant="destructive"
                size="sm"
                className="mt-2"
                disabled={!canManage || statusMutation.isPending}
                onClick={() => handleChangeStatus(order.id, 'RETURNED')}
              >
                <Undo2 className="h-3.5 w-3.5" /> Trả hàng & hoàn tiền
              </Button>
            )}
          </li>
        ))}
      </ul>

      {/* Dong TONG theo dung danh sach dang hien thi (khong tinh tren toan bo du lieu). */}
      <TotalsPanel
        label={mode === 'returnable' ? 'Tổng giá trị có thể trả' : 'Tổng giá trị đã trả'}
        items={[
          { label: 'Số hoá đơn', value: formatNumber(rows.length) },
          {
            label: 'Tổng tiền',
            value: formatVND(rows.reduce((sum, order) => sum + order.total, 0)),
            emphasis: true,
            tone: mode === 'history' ? 'danger' : 'default',
          },
        ]}
        note={
          mode === 'returnable'
            ? 'Chọn một hoá đơn để xem dòng hàng trước khi xác nhận trả'
            : 'Hoá đơn đã hoàn tồn kho và sinh phiếu chi hoàn tiền chờ kế toán duyệt'
        }
      />
    </>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Đổi trả hàng"
        description={`${formatNumber(summary.returnable)} hoá đơn hoàn tất có thể trả · Đã trả ${formatNumber(summary.returned)} hoá đơn`}
        actions={
          <Badge variant={canManage ? 'success' : 'secondary'}>
            {canManage ? 'Được duyệt trả hàng' : 'Chỉ tra cứu'}
          </Badge>
        }
      />

      {/* RULE 17/18: thieu quyen thi noi ro ly do thay vi an nut kho hieu. */}
      {!canManage && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>
            Chỉ Quản lý cửa hàng / Kế toán / Admin (quyền <span className="font-mono">APPROVE_ORDER</span>) được xác nhận
            trả hàng. Bạn vẫn tra cứu được hoá đơn và lịch sử trả hàng.
          </span>
        </div>
      )}

      <SummaryStrip
        items={[
          { label: 'Hoá đơn có thể trả', value: formatNumber(summary.returnable), hint: 'Hoá đơn đã hoàn tất' },
          { label: 'Giá trị có thể trả', value: formatVND(summary.returnableValue) },
          {
            label: 'Đã trả hàng',
            value: formatNumber(summary.returned),
            tone: summary.returned > 0 ? 'danger' : 'default',
          },
          {
            label: 'Giá trị đã trả',
            value: formatVND(summary.returnedValue),
            tone: summary.returnedValue > 0 ? 'danger' : 'default',
            hint: 'Phiếu chi hoàn tiền chờ kế toán duyệt',
          },
        ]}
      />

      {lastRefund && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs">
          <Badge variant="info">Phiếu chi chờ duyệt</Badge>
          <p className="mr-auto">
            Đã trả hàng cho <span className="font-mono font-semibold">{lastRefund.code}</span> — hệ thống đã hoàn tồn kho và
            tự sinh phiếu chi hoàn tiền <span className="font-semibold">{formatVND(lastRefund.amount)}</span> (tiền mặt,
            trạng thái Chờ duyệt).
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/finance/cashbook">Mở sổ quỹ</Link>
          </Button>
        </div>
      )}

      <MasterDetailLayout
        master={
          <Card>
            <div className="border-b px-4 py-3">
              {/* Chuyen che do xem: hoa don co the tra | lich su da tra (segmented control, ho tro ban phim). */}
              <div
                className="flex w-fit items-center gap-1 rounded-md bg-muted p-1"
                role="group"
                aria-label="Chế độ xem danh sách trả hàng"
              >
                <Button
                  size="sm"
                  className="h-7"
                  variant={tab === 'returnable' ? 'secondary' : 'ghost'}
                  aria-pressed={tab === 'returnable'}
                  onClick={() => setTab('returnable')}
                >
                  Cần trả hàng ({formatNumber(summary.returnable)})
                </Button>
                <Button
                  size="sm"
                  className="h-7"
                  variant={tab === 'history' ? 'secondary' : 'ghost'}
                  aria-pressed={tab === 'history'}
                  onClick={() => setTab('history')}
                >
                  Lịch sử đã trả ({formatNumber(summary.returned)})
                </Button>
              </div>
            </div>

            <ListToolbar
              title={tab === 'returnable' ? 'Hoá đơn hoàn tất có thể trả' : 'Lịch sử trả hàng'}
              search={{
                value: q,
                onChange: setQ,
                placeholder: 'Mã HĐ / tên khách / tên hàng',
                label: 'Tìm hoá đơn',
              }}
              showClear={hasFilter}
              onClear={clearFilters}
            >
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
              <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
                <RefreshCw className={isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> Tải lại
              </Button>
            </ListToolbar>

            <CardContent className="p-0">
              {isError && (data?.items.length ?? 0) > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="mr-auto">{getErrorMessage(error)} — đang hiển thị dữ liệu của lần tải trước.</span>
                  <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                  </Button>
                </div>
              )}

              {isError && (data?.items.length ?? 0) === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <p className="text-sm text-destructive">{getErrorMessage(error)}</p>
                  <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    Thử lại
                  </Button>
                </div>
              ) : isLoading ? (
                <>
                  <div className="hidden md:block">
                    <TableSkeleton rows={5} cols={7} />
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-24 w-full" />
                    ))}
                  </div>
                </>
              ) : tab === 'returnable' && returnableOrders.length === 0 ? (
                <EmptyState
                  className="m-4"
                  title={hasFilter ? 'Không có hoá đơn hoàn tất phù hợp bộ lọc' : 'Chưa có hoá đơn hoàn tất để trả'}
                  description={
                    hasFilter
                      ? 'Thử đổi từ khoá hoặc khoảng ngày.'
                      : 'Chỉ hoá đơn ở trạng thái HOÀN TẤT mới được phép trả hàng; hoá đơn hoàn tất sẽ xuất hiện tại đây.'
                  }
                  actionLabel={hasFilter ? 'Xoá bộ lọc' : undefined}
                  onAction={hasFilter ? clearFilters : undefined}
                />
              ) : tab === 'history' && returnedOrders.length === 0 ? (
                <EmptyState
                  className="m-4"
                  title="Chưa có hoá đơn trả hàng nào"
                  description="Khi xác nhận trả hàng, hoá đơn sẽ được ghi vào lịch sử này kèm phiếu chi hoàn tiền chờ kế toán duyệt."
                />
              ) : tab === 'returnable' ? (
                renderOrderList(returnableOrders, 'returnable')
              ) : (
                renderOrderList(returnedOrders, 'history')
              )}
            </CardContent>
          </Card>
        }
        detail={
          <OrderDetailAside
            order={selectedOrder}
            pending={statusMutation.isPending}
            onChangeStatus={handleChangeStatus}
            emptyTitle="Chọn một hoá đơn"
            emptyDescription="Bấm vào dòng trong danh sách để xem dòng hàng và xác nhận trả hàng tại panel này."
          />
        }
        dialog={
          <OrderDetailDialog
            order={selectedOrder}
            pending={statusMutation.isPending}
            onClose={() => setSelectedId(null)}
            onChangeStatus={handleChangeStatus}
          />
        }
      />
    </div>
  );
}
