'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Camera, CircleDollarSign, Eye, MapPin, PhoneCall, RefreshCw, Wrench } from 'lucide-react';
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
import { OrderDetailAside, OrderDetailDialog } from '@/components/features/orders/order-detail-dialog';
import { OrderPhotoUploader } from '@/components/features/shipping/order-photo-uploader';
import { toast } from '@/components/ui/toast';
import { useCodCollectMutation, useOrderStatusMutation } from '@/hooks/use-orders';
import { apiGet } from '@/lib/api-client';
import { COMPLETION_PHOTO_REQUIRED_MESSAGE, hasCompletionPhoto } from '@/lib/order-rules';
import { formatDateTime, formatNumber, formatVND, getErrorMessage, normalizeVN } from '@/lib/utils';
import type { Order } from '@/types';

/** Bo loc nhanh theo tien do tuyen giao. */
type CodFilter = 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'ALL';

/**
 * Man hinh /shipping/cod - doi chieu "Quan ly giao hang COD" cua app desktop v4.5,
 * nay la man hinh lam viec cua **NV Ky thuat** (giao hang + hoan thien cong viec).
 * Uu tien thao tac 1 tay tren dien thoai: card co san nut Goi khach / Mo ban do / Da thu tien / Chup anh,
 * con man hinh rong thi co them luoi + panel chi tiet (Master-Detail) va dong TONG.
 * Quy tac nghiep vu: ky thuat chi thay don duoc gan; don COD phai co it nhat 1 anh hoan thien
 * (chup tai noi giao) truoc khi bam "Giao thanh cong" - xem `src/lib/order-rules.ts`.
 */
export function CodModule() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<CodFilter>('ACTIVE');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['shipping-cod'],
    queryFn: () => apiGet<{ items: Order[]; total: number }>('/api/shipping/cod'),
  });

  const collectMutation = useCodCollectMutation();
  const statusMutation = useOrderStatusMutation();

  const orders = listQuery.data?.items ?? [];

  /**
   * Tuyen giao chia 3 nhom nghiep vu:
   * - Cho duyet (PENDING): don COD vua len tu POS / ban si, doi ky thuat nhan.
   * - Dang giao (CONFIRMED / DELIVERING): da nhan, dang di giao / thu ho.
   * - Da giao (COMPLETED): da thu xong + co anh hoan thien.
   */
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'PENDING'), [orders]);
  const activeOrders = useMemo(
    () => orders.filter((order) => order.status === 'DELIVERING' || order.status === 'CONFIRMED'),
    [orders],
  );
  const doneOrders = useMemo(() => orders.filter((order) => order.status === 'COMPLETED'), [orders]);

  /** Tim kiem ngay tren du lieu tuyen (khong goi them API): so phieu / khach / dien thoai / dia chi. */
  const visibleOrders = useMemo(() => {
    const keyword = normalizeVN(q);
    const rawKeyword = q.trim().toLowerCase();
    const source =
      filter === 'PENDING'
        ? pendingOrders
        : filter === 'ACTIVE'
          ? activeOrders
          : filter === 'COMPLETED'
            ? doneOrders
            : orders;

    if (!keyword) return source;
    return source.filter(
      (order) =>
        normalizeVN(order.code).includes(keyword) ||
        normalizeVN(order.customerName).includes(keyword) ||
        normalizeVN(order.deliveryAddress ?? '').includes(keyword) ||
        (rawKeyword.length > 0 && (order.customerPhone ?? '').includes(rawKeyword)),
    );
  }, [pendingOrders, activeOrders, doneOrders, orders, q, filter]);

  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedId) ?? null, [orders, selectedId]);

  const summary = useMemo(
    () => ({
      pending: pendingOrders.length,
      active: activeOrders.length,
      pendingAmount: activeOrders.reduce((sum, order) => sum + (order.codAmount ?? 0), 0),
      done: doneOrders.length,
      collected: doneOrders.reduce((sum, order) => sum + (order.codAmount ?? 0), 0),
      /** So don dang giao nhung CHUA co anh hoan thien (chua the "Giao thanh cong"). */
      missingPhoto: activeOrders.filter((order) => !hasCompletionPhoto(order)).length,
    }),
    [pendingOrders, activeOrders, doneOrders],
  );

  const handleCollect = (order: Order) => {
    setCollectingId(order.id);
    collectMutation.mutate(
      { orderId: order.id, amount: order.codAmount ?? order.total },
      { onSettled: () => setCollectingId(null) },
    );
  };

  /** Don COD chua co anh hoan thien thi chua duoc hoan tat (API cung chan va tra 400). */
  const missingPhoto = (order: Order) => order.paymentMethod === 'COD' && !hasCompletionPhoto(order);

  const handleComplete = (order: Order) => {
    if (missingPhoto(order)) {
      toast.error('Chưa thể giao thành công', COMPLETION_PHOTO_REQUIRED_MESSAGE);
      return;
    }
    statusMutation.mutate({ orderId: order.id, status: 'COMPLETED' });
  };

  /** Lien ket nhanh cho ky thuat: goi khach & mo ban do theo dia chi giao (khong sua API). */
  const telHref = (phone?: string) => (phone ? `tel:${phone.replace(/\s+/g, '')}` : undefined);
  const mapHref = (address?: string) =>
    address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : undefined;

  /** Nhan trang thai anh hoan thien: da co anh / con thieu anh truoc khi giao thanh cong. */
  const photoBadge = (order: Order) => {
    const count = order.photos?.length ?? 0;
    if (count > 0) {
      return (
        <Badge variant="success">
          <Camera className="h-3 w-3" /> {count} ảnh
        </Badge>
      );
    }
    if (order.status === 'DELIVERING' || order.status === 'CONFIRMED') {
      return (
        <Badge variant="warning">
          <Camera className="h-3 w-3" /> Thiếu ảnh
        </Badge>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kỹ thuật – Giao hàng & hoàn thiện"
        description={`${formatNumber(summary.pending)} đơn chờ duyệt · ${formatNumber(summary.active)} đơn đang giao · Còn phải thu ${formatVND(summary.pendingAmount)} · ${formatNumber(summary.missingPhoto)} đơn chưa có ảnh hoàn thiện`}
        actions={
          <Badge variant="success">
            <Wrench className="h-3 w-3" /> Tuyến của tôi
          </Badge>
        }
      />

      <SummaryStrip
        items={[
          {
            label: 'Đơn chờ duyệt',
            value: formatNumber(summary.pending),
            tone: summary.pending > 0 ? 'warning' : 'default',
            hint: 'Thu ngân vừa lên đơn COD',
          },
          {
            label: 'Đơn đang giao',
            value: formatNumber(summary.active),
            tone: summary.active > 0 ? 'warning' : 'default',
            hint: 'Đã xác nhận / đang giao',
          },
          {
            label: 'Tiền cần thu',
            value: formatVND(summary.pendingAmount),
            tone: summary.pendingAmount > 0 ? 'danger' : 'default',
          },
          { label: 'Đã giao & thu tiền', value: formatNumber(summary.done), tone: 'success' },
          { label: 'Đã thu hộ', value: formatVND(summary.collected), tone: 'success' },
        ]}
      />

      <MasterDetailLayout
        master={
          <Card>
            <ListToolbar
              title="Đơn được gán cho tôi"
              search={{
                value: q,
                onChange: setQ,
                placeholder: 'Mã đơn / khách / điện thoại / địa chỉ',
                label: 'Tìm đơn giao',
              }}
              showClear={q.length > 0}
              onClear={() => setQ('')}
            >
              <Select
                aria-label="Lọc theo tiến độ giao"
                className="h-9 w-40"
                value={filter}
                onChange={(event) => setFilter(event.target.value as CodFilter)}
              >
                <option value="PENDING">Chờ duyệt</option>
                <option value="ACTIVE">Đang giao</option>
                <option value="COMPLETED">Đã giao</option>
                <option value="ALL">Tất cả</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()} disabled={listQuery.isFetching}>
                <RefreshCw className={listQuery.isFetching ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> Làm mới
              </Button>
            </ListToolbar>

            <CardContent className="p-0">
              {listQuery.isError && orders.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 border-b bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="mr-auto">{getErrorMessage(listQuery.error)} — đang hiển thị dữ liệu của lần tải trước.</span>
                  <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
                    <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                  </Button>
                </div>
              )}

              {/* Banner don cho duyet: thu ngan vua len don COD, ky thuat bam "Nhan don" de nhan lich giao. */}
              {!listQuery.isLoading && !listQuery.isError && summary.pending > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter('PENDING')}
                  className="flex w-full flex-wrap items-center gap-2 border-b bg-warning/10 px-3 py-2 text-left text-xs"
                >
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  <span className="mr-auto">
                    Có <span className="font-semibold">{formatNumber(summary.pending)} đơn COD mới</span> từ thu ngân cần
                    bạn nhận duyệt.
                  </span>
                  <span className="font-semibold text-primary underline underline-offset-2">Xem ngay</span>
                </button>
              )}

              {listQuery.isError && orders.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                  <p className="text-sm text-destructive">{getErrorMessage(listQuery.error)}</p>
                  <Button variant="outline" size="sm" onClick={() => void listQuery.refetch()}>
                    Thử lại
                  </Button>
                </div>
              ) : listQuery.isLoading ? (
                <>
                  <div className="hidden md:block">
                    <TableSkeleton rows={4} cols={6} />
                  </div>
                  <div className="space-y-3 p-4 md:hidden">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <Skeleton key={index} className="h-28 w-full" />
                    ))}
                  </div>
                </>
              ) : visibleOrders.length === 0 ? (
                <EmptyState
                  className="m-4"
                  title={q ? 'Không tìm thấy đơn phù hợp' : filter === 'COMPLETED' ? 'Chưa giao đơn nào' : 'Chưa có đơn nào được gán'}
                  description={
                    q
                      ? 'Thử lại bằng mã đơn, tên khách, số điện thoại hoặc địa chỉ khác.'
                      : 'Đơn bán online (COD) sau khi duyệt sẽ tự động xuất hiện tại đây theo kỹ thuật được phân công.'
                  }
                  actionLabel={q ? 'Xoá tìm kiếm' : undefined}
                  onAction={q ? () => setQ('') : undefined}
                />
              ) : (
                <>
                  {/* Desktop/Tablet (>=768px): luoi tuyen giao; Mobile: card co nut thao tac nhanh ben duoi. */}
                  <Table containerClassName="hidden max-h-[62vh] scrollbar-thin md:block">
                    <TableHeader className="sticky top-0 z-10 bg-muted/95 backdrop-blur">
                      <TableRow>
                        <TableHead className="w-28">Mã HĐ</TableHead>
                        <TableHead>Khách nhận</TableHead>
                        <TableHead>Địa chỉ giao</TableHead>
                        <TableHead className="text-right">Tiền thu hộ</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="w-64 text-right">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleOrders.map((order) => (
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
                            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <PhoneCall className="h-3 w-3" aria-hidden /> {order.customerPhone ?? '—'}
                            </p>
                          </TableCell>
                          <TableCell className="max-w-[260px]">
                            <p className="truncate text-xs">{order.deliveryAddress ?? '—'}</p>
                            <p className="text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {formatVND(order.codAmount ?? 0)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <OrderStatusBadge status={order.status} />
                              {photoBadge(order)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {telHref(order.customerPhone) && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={telHref(order.customerPhone)} aria-label={`Gọi khách ${order.customerName}`}>
                                    <PhoneCall className="h-3.5 w-3.5" /> Gọi
                                  </a>
                                </Button>
                              )}
                              {mapHref(order.deliveryAddress) && (
                                <Button asChild variant="outline" size="sm">
                                  <a
                                    href={mapHref(order.deliveryAddress)}
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label={`Mở bản đồ địa chỉ giao của ${order.code}`}
                                  >
                                    <MapPin className="h-3.5 w-3.5" /> Bản đồ
                                  </a>
                                </Button>
                              )}
                              {order.status === 'PENDING' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  disabled={statusMutation.isPending}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    statusMutation.mutate({ orderId: order.id, status: 'CONFIRMED' });
                                  }}
                                >
                                  <Wrench className="h-3.5 w-3.5" /> Nhận đơn
                                </Button>
                              )}
                              {/* Tu 1536px da co panel chi tiet ben phai -> an nut Xem cho gon luoi. */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="2xl:hidden"
                                aria-label={`Xem chi tiết đơn ${order.code}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedId(order.id);
                                }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {(order.status === 'DELIVERING' || order.status === 'CONFIRMED') && (
                                <Button
                                  size="sm"
                                  disabled={collectMutation.isPending || collectingId === order.id}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleCollect(order);
                                  }}
                                >
                                  <CircleDollarSign className="h-3.5 w-3.5" /> Đã thu tiền
                                </Button>
                              )}
                              {order.status === 'DELIVERING' && (
                                <Button
                                  variant="success"
                                  size="sm"
                                  disabled={statusMutation.isPending || missingPhoto(order)}
                                  title={missingPhoto(order) ? COMPLETION_PHOTO_REQUIRED_MESSAGE : undefined}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleComplete(order);
                                  }}
                                >
                                  Giao thành công
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Mobile (<768px) - uu tien thao tac 1 tay: card + Goi khach / Ban do / Da thu tien. */}
                  <ul className="divide-y md:hidden">
                    {visibleOrders.map((order) => (
                      <li key={order.id} className="px-3 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedId(order.id)}
                          aria-label={`Xem chi tiết đơn ${order.code}`}
                          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{order.code}</span>
                            <OrderStatusBadge status={order.status} />
                            <span className="ml-auto text-sm font-bold tabular-nums">
                              {formatVND(order.codAmount ?? 0)}
                            </span>
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium">{order.customerName}</span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {order.customerPhone ?? '—'}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted-foreground">
                            {order.deliveryAddress ?? '—'}
                          </span>
                          <span className="mt-1 block text-[11px] text-muted-foreground">
                            {formatDateTime(order.createdAt)}
                          </span>
                        </button>

                        <div className="mt-2 flex flex-wrap gap-2">
                          {telHref(order.customerPhone) && (
                            <Button asChild variant="outline" size="sm">
                              <a href={telHref(order.customerPhone)} aria-label={`Gọi khách ${order.customerName}`}>
                                <PhoneCall className="h-3.5 w-3.5" /> Gọi khách
                              </a>
                            </Button>
                          )}
                          {mapHref(order.deliveryAddress) && (
                            <Button asChild variant="outline" size="sm">
                              <a
                                href={mapHref(order.deliveryAddress)}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={`Mở bản đồ địa chỉ giao của ${order.code}`}
                              >
                                <MapPin className="h-3.5 w-3.5" /> Bản đồ
                              </a>
                            </Button>
                          )}
                          {(order.status === 'DELIVERING' || order.status === 'CONFIRMED') && (
                            <Button
                              size="sm"
                              disabled={collectMutation.isPending || collectingId === order.id}
                              onClick={() => handleCollect(order)}
                            >
                              <CircleDollarSign className="h-3.5 w-3.5" /> Đã thu tiền
                            </Button>
                          )}
                          {order.status === 'DELIVERING' && (
                            <Button
                              variant="success"
                              size="sm"
                              disabled={statusMutation.isPending || missingPhoto(order)}
                              title={missingPhoto(order) ? COMPLETION_PHOTO_REQUIRED_MESSAGE : undefined}
                              onClick={() => handleComplete(order)}
                            >
                              Giao thành công
                            </Button>
                          )}
                        </div>

                        {/* Chup / chon anh hoan thien ngay tren card - thao tac 1 tay tren dien thoai. */}
                        <OrderPhotoUploader order={order} compact className="mt-2" />
                      </li>
                    ))}
                  </ul>

                  {/* Dong TONG cua tuyen: so don / can thu / da thu theo dung bo loc dang hien thi. */}
                  <TotalsPanel
                    label="Tổng tuyến giao"
                    items={[
                      { label: 'Số đơn', value: formatNumber(visibleOrders.length) },
                      {
                        label: 'Cần thu',
                        value: formatVND(
                          visibleOrders.reduce(
                            (sum, order) => sum + (order.status === 'COMPLETED' ? 0 : order.codAmount ?? 0),
                            0,
                          ),
                        ),
                        tone: 'danger',
                      },
                      {
                        label: 'Đã thu',
                        value: formatVND(
                          visibleOrders.reduce(
                            (sum, order) => sum + (order.status === 'COMPLETED' ? order.codAmount ?? 0 : 0),
                            0,
                          ),
                        ),
                        tone: 'success',
                        emphasis: true,
                      },
                    ]}
                    note="Số liệu theo bộ lọc hiện tại trên tuyến của bạn"
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
            onChangeStatus={(orderId, status) => statusMutation.mutate({ orderId, status })}
            hideDelivery
            hidePhotos
            emptyTitle="Chọn một đơn giao"
            emptyDescription="Bấm vào dòng trong danh sách để xem hàng hoá, tiền thu hộ và thông tin liên hệ khách."
            extraContent={
              <>
                {selectedOrder?.deliveryAddress ? (
                <div className="border-t px-4 py-3 text-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Địa chỉ giao</p>
                  <p className="mt-1">{selectedOrder.deliveryAddress}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {telHref(selectedOrder.customerPhone) && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={telHref(selectedOrder.customerPhone)}
                          aria-label={`Gọi khách ${selectedOrder.customerName}`}
                        >
                          <PhoneCall className="h-3.5 w-3.5" /> Gọi khách
                        </a>
                      </Button>
                    )}
                    {mapHref(selectedOrder.deliveryAddress) && (
                      <Button asChild variant="outline" size="sm">
                        <a
                          href={mapHref(selectedOrder.deliveryAddress)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Mở bản đồ địa chỉ giao của ${selectedOrder.code}`}
                        >
                          <MapPin className="h-3.5 w-3.5" /> Mở bản đồ
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ) : null}

                {/* Chup anh hoan thien ngay trong panel chi tiet (man hinh rong). */}
                {selectedOrder && (
                  <div className="border-t px-4 py-3 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ảnh hoàn thiện công việc
                    </p>
                    <OrderPhotoUploader order={selectedOrder} className="mt-2" />
                  </div>
                )}
              </>
            }
            extraActions={
              <>
                {(selectedOrder?.status === 'DELIVERING' || selectedOrder?.status === 'CONFIRMED') && (
                  <Button
                    disabled={collectMutation.isPending || collectingId === selectedOrder.id}
                    onClick={() => handleCollect(selectedOrder)}
                  >
                    <CircleDollarSign className="h-3.5 w-3.5" /> Đã thu tiền
                  </Button>
                )}
                {selectedOrder?.status === 'DELIVERING' && (
                  <Button variant="success" disabled={statusMutation.isPending} onClick={() => handleComplete(selectedOrder)}>
                    Giao thành công
                  </Button>
                )}
              </>
            }
          />
        }
        dialog={
          <OrderDetailDialog
            order={selectedOrder}
            pending={statusMutation.isPending}
            onClose={() => setSelectedId(null)}
            onChangeStatus={(orderId, status) => statusMutation.mutate({ orderId, status })}
          />
        }
      />
    </div>
  );
}
