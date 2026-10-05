'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Eye, Plus, RefreshCw, ShieldAlert, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
import { WholesaleOrderCreateDialog } from '@/components/features/orders/wholesale-order-create-dialog';
import { useOrderStatusMutation, useOrdersQuery } from '@/hooks/use-orders';
import { formatDateTime, formatNumber, formatVND, getErrorMessage } from '@/lib/utils';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@/types';

/** Uu tien hien thi phieu cho duyet truoc (giu nguyen nghiep vu man hinh ban si). */
const STATUS_PRIORITY: Record<OrderStatus, number> = {
  PENDING: 0,
  DRAFT: 1,
  CONFIRMED: 2,
  DELIVERING: 3,
  COMPLETED: 4,
  RETURNED: 5,
  CANCELLED: 6,
};

/**
 * Man hinh /orders/wholesale - bao gia & don ban si.
 * Doi chieu "Quan ly bao gia ban hang" cua app desktop v4.5: bo loc ngay + luoi co dong TONG.
 * Bo cuc Web: KPI -> thanh loc -> Master (luoi + dong TONG) | Detail (panel phai tu 1536px).
 */
export function WholesaleOrdersModule() {
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const canApprove = usePermission('APPROVE_ORDER');

  const { data, isLoading, isFetching, isError, error, refetch } = useOrdersQuery('wholesale', {
    channel: 'WHOLESALE',
    status,
    q,
    from,
    to,
  });
  const statusMutation = useOrderStatusMutation();

  const orders = useMemo(
    () =>
      [...(data?.items ?? [])].sort(
        (a, b) =>
          STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status] ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [data],
  );

  /**
   * Ban ghi dang chon duoc suy ra tu du lieu moi nhat cua API (khong giu ban sao cu) nen
   * sau khi duyet / hoan tat, panel chi tiet cap nhat trang thai ngay ma khong phai mo lai.
   */
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);

  /** So lieu tom tat tinh tren dung du lieu API tra ve (khong them nghiep vu moi). */
  const summary = useMemo(
    () => ({
      count: orders.length,
      pending: orders.filter((order) => order.status === 'PENDING').length,
      subtotal: orders.reduce((sum, order) => sum + order.subtotal, 0),
      discount: orders.reduce((sum, order) => sum + order.discount, 0),
      total: orders.reduce((sum, order) => sum + order.total, 0),
      paid: orders.reduce((sum, order) => sum + order.paidAmount, 0),
      debt: orders.reduce((sum, order) => sum + order.debtAmount, 0),
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

  const handleChangeStatus = (orderId: string, nextStatus: OrderStatus) =>
    statusMutation.mutate({ orderId, status: nextStatus });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo giá & Đơn bán sỉ"
        description={`Kênh bán sỉ (WHOLESALE) · ${formatNumber(summary.count)} phiếu đang hiển thị · ${formatNumber(summary.pending)} phiếu chờ duyệt`}
        actions={
          <>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" /> Tạo báo giá / Đơn sỉ
            </Button>
            <Badge variant={canApprove ? 'success' : 'secondary'}>
              {canApprove ? 'Bạn có quyền duyệt đơn sỉ' : 'Chỉ xem (thiếu quyền duyệt)'}
            </Badge>
          </>
        }
      />

      {/* RULE 17/18: neu thieu quyen thi noi ro ly do thay vi an nut mot cach kho hieu. */}
      {!canApprove && (
        <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>
            Chỉ Quản lý cửa hàng / Kế toán / Admin (quyền <span className="font-mono">APPROVE_ORDER</span>) được duyệt báo
            giá sỉ. Bạn vẫn xem được chi tiết và theo dõi công nợ.
          </span>
        </div>
      )}

      <SummaryStrip
        items={[
          { label: 'Phiếu đang hiển thị', value: formatNumber(summary.count) },
          {
            label: 'Chờ duyệt',
            value: formatNumber(summary.pending),
            tone: summary.pending > 0 ? 'warning' : 'default',
            hint: summary.pending > 0 ? 'Cần duyệt trước khi giao hàng' : 'Không còn phiếu chờ',
          },
          { label: 'Tổng giá trị sỉ', value: formatVND(summary.total) },
          {
            label: 'Còn nợ',
            value: formatVND(summary.debt),
            tone: summary.debt > 0 ? 'danger' : 'success',
            hint: summary.debt > 0 ? 'Theo dõi tại Công nợ khách hàng' : 'Đã thanh toán đủ',
          },
        ]}
      />

      <MasterDetailLayout
        master={
          <Card>
            <ListToolbar
              title="Danh sách báo giá & đơn bán sỉ"
              search={{
                value: q,
                onChange: setQ,
                placeholder: 'Số phiếu / khách hàng / mặt hàng',
                label: 'Tìm phiếu bán sỉ',
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
              <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
                <RefreshCw className={isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> Tải lại
              </Button>
            </ListToolbar>

            <CardContent className="p-0">
              {/* SKILL muc 12 - Partial data: giu du lieu da tai duoc, chi canh bao khi lam moi that bai. */}
              {isError && orders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="mr-auto">{getErrorMessage(error)} — đang hiển thị dữ liệu của lần tải trước.</span>
                  <Button variant="outline" size="sm" onClick={() => void refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" /> Thử lại
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
                  title={hasFilter ? 'Không có phiếu bán sỉ phù hợp bộ lọc' : undefined}
                  description={
                    hasFilter
                      ? 'Thử đổi từ khoá, trạng thái hoặc khoảng ngày.'
                      : 'Chưa có phiếu bán sỉ nào trong kỳ này.'
                  }
                  actionLabel={hasFilter ? 'Xoá bộ lọc' : undefined}
                  onAction={hasFilter ? clearFilters : undefined}
                />
              ) : (
                <>
                  {/* Desktop/Tablet (>=768px): luoi day du, cot phu an dan theo be rong (SKILL muc 13). */}
                  <Table containerClassName="hidden max-h-[62vh] scrollbar-thin md:block">
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead className="w-28">Số phiếu</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead className="hidden text-right xl:table-cell">Tiền hàng</TableHead>
                        <TableHead className="hidden text-right xl:table-cell">Giảm giá</TableHead>
                        <TableHead className="text-right">Tổng cộng</TableHead>
                        <TableHead className="hidden text-right lg:table-cell">Đã thanh toán</TableHead>
                        <TableHead className="text-right">Còn nợ</TableHead>
                        <TableHead className="hidden lg:table-cell">Nhân viên</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="w-56 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow
                          key={order.id}
                          data-state={order.id === selectedId ? 'selected' : undefined}
                          aria-selected={order.id === selectedId}
                          className="cursor-pointer odd:bg-muted/25"
                          onClick={() => setSelectedId(order.id)}
                        >
                          <TableCell className="font-mono text-xs font-semibold">{order.code}</TableCell>
                          <TableCell className="max-w-[240px]">
                            <p className="truncate font-medium">{order.customerName}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {order.customerPhone ?? '—'} · {formatNumber(order.items.length)} mặt hàng
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums xl:table-cell">
                            {formatVND(order.subtotal)}
                          </TableCell>
                          <TableCell className="hidden text-right tabular-nums xl:table-cell">
                            {formatVND(order.discount)}
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{formatVND(order.total)}</TableCell>
                          <TableCell className="hidden text-right tabular-nums lg:table-cell">
                            {formatVND(order.paidAmount)}
                          </TableCell>
                          <TableCell
                            className={
                              order.debtAmount > 0
                                ? 'text-right font-semibold tabular-nums text-destructive'
                                : 'text-right tabular-nums'
                            }
                          >
                            {formatVND(order.debtAmount)}
                          </TableCell>
                          <TableCell className="hidden text-xs lg:table-cell">
                            {order.cashierName}
                            <span className="block text-[11px] text-muted-foreground">
                              {formatDateTime(order.createdAt)}
                            </span>
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
                              {order.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    disabled={!canApprove || statusMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      statusMutation.mutate({ orderId: order.id, status: 'CONFIRMED' });
                                    }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    disabled={!canApprove || statusMutation.isPending}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      statusMutation.mutate({ orderId: order.id, status: 'CANCELLED' });
                                    }}
                                  >
                                    <XCircle className="h-3.5 w-3.5" /> Từ chối
                                  </Button>
                                </>
                              )}
                              {order.status === 'CONFIRMED' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  disabled={statusMutation.isPending}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    statusMutation.mutate({ orderId: order.id, status: 'COMPLETED' });
                                  }}
                                >
                                  Hoàn tất
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Mobile (<768px): bang -> card/list, day du thong tin (SKILL muc 13, RULE 11/18). */}
                  <ul className="divide-y md:hidden">
                    {orders.map((order) => (
                      <li key={order.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          aria-label={`Xem chi tiết phiếu ${order.code}`}
                          className="w-full px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{order.code}</span>
                            <OrderStatusBadge status={order.status} />
                            <span className="ml-auto text-sm font-bold tabular-nums">{formatVND(order.total)}</span>
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium">{order.customerName}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {order.customerPhone ?? '—'} · {formatNumber(order.items.length)} mặt hàng
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span>Tiền hàng: {formatVND(order.subtotal)}</span>
                            <span aria-hidden>·</span>
                            <span>Giảm giá: {formatVND(order.discount)}</span>
                            <span aria-hidden>·</span>
                            <span>Đã TT: {formatVND(order.paidAmount)}</span>
                            {order.debtAmount > 0 && (
                              <>
                                <span aria-hidden>·</span>
                                <span className="font-semibold text-destructive">
                                  Còn nợ: {formatVND(order.debtAmount)}
                                </span>
                              </>
                            )}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {order.cashierName} · {formatDateTime(order.createdAt)}
                          </span>
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <Eye className="h-3.5 w-3.5" aria-hidden /> Xem chi tiết
                          </span>
                        </button>

                        {/* Mobile khong co panel chi tiet -> dat san 2 thao tac chinh cua buoc duyet. */}
                        {order.status === 'PENDING' && (
                          <div className="mt-2 flex flex-wrap gap-2 px-3 pb-3">
                            <Button
                              size="sm"
                              disabled={!canApprove || statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ orderId: order.id, status: 'CONFIRMED' })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              disabled={!canApprove || statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ orderId: order.id, status: 'CANCELLED' })}
                            >
                              <XCircle className="h-3.5 w-3.5" /> Từ chối
                            </Button>
                          </div>
                        )}
                        {order.status === 'CONFIRMED' && (
                          <div className="mt-2 px-3 pb-3">
                            <Button
                              variant="success"
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ orderId: order.id, status: 'COMPLETED' })}
                            >
                              Hoàn tất
                            </Button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>

                  {/* Dong TONG giong luoi desktop: doi chieu nhanh cac cot tien cua danh sach dang loc. */}
                  <TotalsPanel
                    label="Tổng cộng danh sách"
                    items={[
                      { label: 'Tiền hàng', value: formatVND(summary.subtotal) },
                      { label: 'Giảm giá', value: formatVND(summary.discount) },
                      { label: 'Tổng cộng', value: formatVND(summary.total), emphasis: true },
                      { label: 'Đã thanh toán', value: formatVND(summary.paid), hideBelow: 'md' },
                      { label: 'Còn nợ', value: formatVND(summary.debt), tone: summary.debt > 0 ? 'danger' : 'default' },
                    ]}
                    note={`${formatNumber(summary.count)} phiếu bán sỉ theo bộ lọc hiện tại`}
                  />
                </>
              )}
            </CardContent>
          </Card>
        }
        detail={
          <OrderDetailAside
            order={selectedOrder}
            pending={statusMutation.isPending}
            onChangeStatus={handleChangeStatus}
            emptyTitle="Chọn một phiếu bán sỉ"
            emptyDescription="Bấm vào dòng trong danh sách để xem dòng hàng, công nợ và duyệt ngay tại panel này."
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

      {/* Form tao bao gia / don si (gap 1 cua yeu cau). */}
      <WholesaleOrderCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
