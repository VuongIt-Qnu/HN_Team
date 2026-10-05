'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  ShoppingCart,
  Truck,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TableSkeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge } from '@/components/shared/status-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { usePermission, useSession } from '@/components/shared/session-context';
import { apiGet } from '@/lib/api-client';
import { canAccessRoute } from '@/lib/rbac';
import { formatDateTime, formatNumber, formatVND } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type DebtSummary, type Order, type ReportOverview, type StockItem } from '@/types';

interface ReportResponse {
  report: ReportOverview;
}

interface DebtResponse {
  summary: DebtSummary;
}

/** Dashboard tong quan: so lieu kinh doanh, canh bao ton kho, hoa don moi nhat, loi tat theo quyen. */
export function DashboardModule() {
  const user = useSession();
  const canViewCost = usePermission('VIEW_COST_PRICE');

  const reportQuery = useQuery({
    queryKey: ['reports', 'overview', 7],
    queryFn: () => apiGet<ReportResponse>('/api/reports/overview', { days: 7 }),
  });
  const ordersQuery = useQuery({
    queryKey: ['orders', 'dashboard'],
    queryFn: () => apiGet<{ items: Order[] }>('/api/orders', { limit: 8 }),
  });
  const debtQuery = useQuery({
    queryKey: ['debts', 'dashboard'],
    queryFn: () => apiGet<DebtResponse>('/api/finance/debts'),
  });
  const stockQuery = useQuery({
    queryKey: ['inventory-stock', 'low'],
    queryFn: () => apiGet<{ items: StockItem[] }>('/api/inventory/stock', { onlyLow: true }),
  });

  const report = reportQuery.data?.report;
  const orders = ordersQuery.data?.items ?? [];
  const lowStock = stockQuery.data?.items ?? [];
  const maxRevenue = Math.max(1, ...(report?.byDay.map((row) => row.revenue) ?? [1]));

  const shortcuts = [
    { path: '/pos', label: 'Bán hàng POS', icon: <ShoppingCart className="h-4 w-4" /> },
    { path: '/orders/wholesale', label: 'Duyệt báo giá sỉ', icon: <ClipboardList className="h-4 w-4" /> },
    { path: '/inventory/operations', label: 'Lập phiếu kho', icon: <Boxes className="h-4 w-4" /> },
    { path: '/finance/cashbook', label: 'Sổ quỹ', icon: <Wallet className="h-4 w-4" /> },
    { path: '/shipping/cod', label: 'Kỹ thuật & giao hàng COD', icon: <Truck className="h-4 w-4" /> },
    { path: '/reports', label: 'Báo cáo', icon: <BadgeDollarSign className="h-4 w-4" /> },
  ].filter((item) => canAccessRoute(user.allowedRoutes, item.path));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Xin chào, ${user.fullName}`}
        description={`${user.storeName} · Dữ liệu 7 ngày gần nhất (cập nhật ${formatDateTime(new Date())})`}
        actions={
          canAccessRoute(user.allowedRoutes, '/pos') ? (
            <Button asChild>
              <Link href="/pos">
                <ShoppingCart className="h-4 w-4" /> Mở màn hình POS
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Doanh thu 7 ngày"
          value={report ? formatVND(report.revenue) : '—'}
          hint={`${formatNumber(report?.orderCount ?? 0)} hoá đơn`}
          loading={reportQuery.isLoading}
        />
        <MetricCard
          title="Công nợ khách hàng"
          value={debtQuery.data ? formatVND(debtQuery.data.summary.totalCustomerDebt) : '—'}
          hint={`Quá hạn: ${formatVND(debtQuery.data?.summary.overdueAmount ?? 0)}`}
          tone="warning"
          loading={debtQuery.isLoading}
        />
        <MetricCard
          title="Tồn quỹ hiện tại"
          value={report ? formatVND(report.cashBalance) : '—'}
          hint="Đã gồm phiếu thu/chi đã hạch toán"
          loading={reportQuery.isLoading}
        />
        {canViewCost ? (
          <MetricCard
            title="Lợi nhuận 7 ngày"
            value={report ? formatVND(report.profit ?? 0) : '—'}
            hint={`Giá trị tồn kho: ${formatVND(report?.inventoryValue ?? 0)}`}
            tone="success"
            loading={reportQuery.isLoading}
          />
        ) : (
          <MetricCard
            title="Cảnh báo tồn kho"
            value={`${formatNumber(lowStock.length)} mặt hàng`}
            hint="Hàng đang ở dưới định mức tồn tối thiểu"
            tone="warning"
            loading={stockQuery.isLoading}
          />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Doanh thu theo ngày</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportQuery.isLoading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : report?.byDay.length ? (
              report.byDay.map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-sm">
                  <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{row.label}</span>
                  <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(4, (row.revenue / maxRevenue) * 100)}%` }}
                    />
                  </span>
                  <span className="w-28 shrink-0 text-right font-medium">{formatVND(row.revenue)}</span>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">{row.orderCount} đơn</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Chưa có dữ liệu doanh thu trong 7 ngày gần nhất.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(38_92%_40%)]" /> Hàng sắp hết ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stockQuery.isLoading ? (
              <TableSkeleton rows={4} cols={2} />
            ) : lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tất cả mặt hàng đều đang trên định mức tồn an toàn.</p>
            ) : (
              lowStock.slice(0, 6).map((item) => (
                <div key={item.productId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{item.name}</span>
                  <Badge variant={item.quantity === 0 ? 'destructive' : 'warning'}>
                    {formatNumber(item.quantity)} / {formatNumber(item.minStock)}
                  </Badge>
                </div>
              ))
            )}
            {canAccessRoute(user.allowedRoutes, '/inventory/stock') && (
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/inventory/stock">
                  Xem bảng tồn kho <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Hoá đơn gần nhất</CardTitle>
          {canAccessRoute(user.allowedRoutes, '/orders/retail') && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/orders/retail">
                Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {ordersQuery.isLoading ? (
            <TableSkeleton rows={5} cols={6} />
          ) : orders.length === 0 ? (
            <EmptyState
              className="m-4"
              title="Chưa có dữ liệu"
              description="Bấm [+ Tạo mới] để mở màn hình POS và tạo hoá đơn đầu tiên"
              actionLabel="+ Tạo mới (POS)"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã HĐ</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead>Thanh toán</TableHead>
                  <TableHead>Thu ngân</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-semibold">{order.code}</TableCell>
                    <TableCell className="max-w-[220px] truncate">{order.customerName}</TableCell>
                    <TableCell className="text-right font-semibold">{formatVND(order.total)}</TableCell>
                    <TableCell className="text-xs">{PAYMENT_METHOD_LABELS[order.paymentMethod]}</TableCell>
                    <TableCell className="text-xs">{order.cashierName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lối tắt theo quyền của bạn</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {shortcuts.length === 0 && (
            <p className="text-sm text-muted-foreground">Tài khoản của bạn chưa được cấp URL Route nào.</p>
          )}
          {shortcuts.map((item) => (
            <Button key={item.path} asChild variant="outline" size="sm">
              <Link href={item.path}>
                {item.icon} {item.label}
              </Link>
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  tone = 'default',
  loading,
}: {
  title: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning';
  loading?: boolean;
}) {
  const toneClass =
    tone === 'success' ? 'text-[hsl(142_72%_32%)]' : tone === 'warning' ? 'text-[hsl(38_92%_35%)]' : 'text-foreground';

  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className={`text-xl font-bold ${toneClass}`}>{loading ? '...' : value}</p>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
