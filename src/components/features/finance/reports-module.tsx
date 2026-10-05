'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RevenueChartsPanel } from '@/components/features/finance/revenue-charts-panel';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { usePermission, useSession } from '@/components/shared/session-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiGet } from '@/lib/api-client';
import { cn, formatDate, formatNumber, formatVND, getErrorMessage } from '@/lib/utils';
import type { ReportOverview, RevenueReportRow } from '@/types';

const QUICK_RANGES = [
  { days: 1, label: 'Hôm nay (1 ngày)' },
  { days: 7, label: '7 ngày' },
  { days: 30, label: '30 ngày' },
];

const PROFIT_TONE = 'text-[hsl(142_72%_32%)]';

/** Dinh dang ngay theo yyyy-mm-dd (gio dia phuong) cho input type="date". */
function toInputDate(date: Date): string {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;
}

interface ReportTableProps {
  title: string;
  labelHeader: string;
  countHeader: string;
  rows: RevenueReportRow[];
  showProfit: boolean;
}

/** Bang so lieu bao cao (theo ngay / san pham / chi nhanh), cot Loi nhuan chi hien khi co quyen. */
function ReportTable({ title, labelHeader, countHeader, rows, showProfit }: ReportTableProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-3">
        {rows.length === 0 ? (
          <p className="px-4 pb-2 text-sm text-muted-foreground">Chưa có dữ liệu trong khoảng thời gian này.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labelHeader}</TableHead>
                <TableHead className="text-right">{countHeader}</TableHead>
                <TableHead className="text-right">Doanh thu</TableHead>
                {showProfit && <TableHead className="text-right">Lợi nhuận</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={`${row.label}-${index}`}>
                  <TableCell className="font-medium">{row.label}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.orderCount)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatVND(row.revenue)}</TableCell>
                  {showProfit && <TableCell className={cn('text-right font-semibold', PROFIT_TONE)}>{formatVND(row.profit)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

/** Man hinh Bao cao: bo loc thoi gian, the chi so, 3 bang so lieu, bieu do Admin va nut xuat CSV. */
export function ReportsModule() {
  const canViewCost = usePermission('VIEW_COST_PRICE');
  const canExport = usePermission('EXPORT_REPORT');
  const { role } = useSession();
  /** Khoi bieu do thong ke chi danh cho tai khoan Quan tri (Admin). */
  const isAdmin = role === 'ROOT_ADMIN';

  const [quickDays, setQuickDays] = useState<number | null>(7);
  const [printingCharts, setPrintingCharts] = useState(false);
  const [from, setFrom] = useState(() => toInputDate(new Date(Date.now() - 6 * 86400000)));
  const [to, setTo] = useState(() => toInputDate(new Date()));

  /**
   * In rieng khu vuc bieu do: cac phan khac cua trang duoc them class `print:hidden`
   * trong luc trinh duyet mo hop thoai in, sau khi in xong tra ve trang thai binh thuong.
   */
  useEffect(() => {
    if (!printingCharts) return undefined;
    const finishPrinting = () => setPrintingCharts(false);
    window.addEventListener('afterprint', finishPrinting);
    const timer = window.setTimeout(() => window.print(), 80);
    return () => {
      window.removeEventListener('afterprint', finishPrinting);
      window.clearTimeout(timer);
    };
  }, [printingCharts]);

  const params: Record<string, string | number> = quickDays
    ? { days: quickDays }
    : { from: `${from}T00:00:00`, to: `${to}T23:59:59` };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'overview', params],
    queryFn: () => apiGet<{ report: ReportOverview }>('/api/reports/overview', params),
    enabled: quickDays !== null || (from !== '' && to !== ''),
  });

  const report = data?.report;

  /** Xuat CSV bang Blob thuan (khong dung thu vien ngoai). */
  function exportCsv() {
    if (!report) return;
    const header = ['Ngày', 'Số đơn', 'Doanh thu', ...(canViewCost ? ['Lợi nhuận'] : [])];
    const rows = report.byDay.map((row) => [
      row.label,
      String(row.orderCount),
      String(row.revenue),
      ...(canViewCost ? [String(row.profit ?? 0)] : []),
    ]);
    const csv = [header, ...rows].map((line) => line.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bao-gia-doanh-thu.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  const cards: Array<{ label: string; value: string; tone?: string }> = [
    { label: 'Doanh thu', value: formatVND(report?.revenue), tone: 'text-primary' },
    { label: 'Số đơn hàng', value: formatNumber(report?.orderCount) },
    { label: 'Công nợ khách', value: formatVND(report?.customerDebt), tone: 'text-destructive' },
    { label: 'Công nợ NCC', value: formatVND(report?.supplierDebt), tone: 'text-destructive' },
    { label: 'Tồn quỹ', value: formatVND(report?.cashBalance) },
    ...(canViewCost
      ? [
          { label: 'Giá vốn', value: formatVND(report?.cost) },
          { label: 'Lợi nhuận', value: formatVND(report?.profit), tone: PROFIT_TONE },
          { label: 'Giá trị tồn kho', value: formatVND(report?.inventoryValue) },
        ]
      : []),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Báo cáo"
        description="Doanh thu, lợi nhuận và hàng bán chạy theo khoảng thời gian."
        actions={canExport ? <Button variant="outline" disabled={!report || report.byDay.length === 0} onClick={exportCsv}>Xuất CSV</Button> : undefined}
      />
      <div className={cn('space-y-4', printingCharts && 'print:hidden')}>
        <Card>
          <CardContent className="flex flex-wrap items-end gap-2 p-4">
            {QUICK_RANGES.map((range) => (
              <Button key={range.days} size="sm" variant={quickDays === range.days ? 'default' : 'outline'} onClick={() => setQuickDays(range.days)}>
                {range.label}
              </Button>
            ))}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <Input type="date" className="h-9 w-[160px]" value={from} onChange={(event) => { setFrom(event.target.value); setQuickDays(null); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <Input type="date" className="h-9 w-[160px]" value={to} onChange={(event) => { setTo(event.target.value); setQuickDays(null); }} />
            </div>
            {report && (
              <span className="ml-auto text-xs text-muted-foreground">
                Kỳ báo cáo: {formatDate(report.from)} — {formatDate(report.to)}
              </span>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label}>
              <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
              <CardContent className={cn('text-lg font-semibold', card.tone)}>{card.value}</CardContent>
            </Card>
          ))}
        </div>
        {isLoading ? (
          <Card><TableSkeleton rows={6} cols={4} /></Card>
        ) : isError ? (
          <Card><p className="p-4 text-sm text-destructive">{getErrorMessage(error)}</p></Card>
        ) : !report || report.byDay.length === 0 ? (
          <EmptyState title="Chưa có dữ liệu" description="Không có đơn hàng nào trong khoảng thời gian đã chọn." />
        ) : (
          <>
            <ReportTable title="Doanh thu theo ngày" labelHeader="Ngày" countHeader="Số đơn" rows={report.byDay} showProfit={canViewCost} />
            <ReportTable title="Top sản phẩm bán chạy" labelHeader="Sản phẩm" countHeader="SL bán" rows={report.topProducts} showProfit={canViewCost} />
            <ReportTable title="Theo chi nhánh" labelHeader="Chi nhánh" countHeader="Số đơn" rows={report.byStore} showProfit={canViewCost} />
          </>
        )}
      </div>

      {isAdmin && <RevenueChartsPanel onPrint={() => setPrintingCharts(true)} />}
    </div>
  );
}
