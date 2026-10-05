'use client';

import { useState } from 'react';
import { BarChart3, Printer } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { CHART_COMPARE_COLORS, LineChart, chartColor, type LineChartSeries } from '@/components/shared/line-chart';
import { useSession } from '@/components/shared/session-context';
import { SummaryStrip } from '@/components/shared/summary-strip';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { apiGet } from '@/lib/api-client';
import { formatVND, getErrorMessage } from '@/lib/utils';
import type { RevenueCharts } from '@/types';

/** Nhan truc X cua bieu do thang trong nam: 1..12. */
const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}`);

/** So nam cho phep chon o bo loc (nam hien tai va cac nam truoc). */
const YEAR_RANGE = 5;

/** Ngay lap bao cao theo dinh dang tren ban in: "Ngày 16 tháng 09 năm 2026". */
function formatReportDate(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `Ngày ${date.getDate()} tháng ${month} năm ${date.getFullYear()}`;
}

interface RevenueChartsPanelProps {
  /** Bao ra trang Bao cao de an cac phan khac khi in rieng khu vuc bieu do. */
  onPrint?: () => void;
}

/**
 * Khoi thong ke bieu do doanh thu - CHI hien thi voi tai khoan ROOT_ADMIN.
 * API `/api/reports/charts` cung chan 403 voi vai tro khac nen du lieu khong ro ri.
 */
export function RevenueChartsPanel({ onPrint }: RevenueChartsPanelProps) {
  const user = useSession();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['reports', 'charts', year],
    queryFn: () => apiGet<{ charts: RevenueCharts }>('/api/reports/charts', { year }),
  });

  const charts = data?.charts;
  const years = Array.from({ length: YEAR_RANGE }, (_, index) => currentYear - index);

  const dailyXLabels = Array.from({ length: charts?.daysInMonth ?? 31 }, (_, index) => `${index + 1}`);
  const dailySeries: LineChartSeries[] = (charts?.dailyByMonth ?? []).map((item, index) => ({
    key: `month-${index + 1}`,
    label: item.label,
    color: chartColor(index),
    values: item.values,
  }));
  const monthlySeries: LineChartSeries[] = (charts?.monthlyByYear ?? []).map((item, index) => ({
    key: `year-${index}`,
    label: `${item.label} (${index === 0 ? charts?.year : charts?.previousYear})`,
    color: CHART_COMPARE_COLORS[index] ?? CHART_COMPARE_COLORS[0],
    values: item.values,
  }));

  return (
    <section className="space-y-4">
      <Card className="no-print">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Thống kê biểu đồ doanh thu
            </CardTitle>
            <CardDescription>
              Riêng tài khoản Quản trị (Admin): biểu đồ doanh thu theo ngày trong tháng và theo tháng trong năm.
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="text-xs text-muted-foreground" htmlFor="revenue-chart-year">
              Năm
            </label>
            <Select
              id="revenue-chart-year"
              className="h-9 w-[110px]"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
            >
              {years.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
            <Button size="sm" variant="outline" disabled={!charts} onClick={() => onPrint?.()}>
              <Printer className="h-4 w-4" /> In biểu đồ
            </Button>
          </div>
        </CardHeader>
      </Card>

      {charts && (
        <SummaryStrip
          items={[
            { label: `Tổng doanh thu năm ${charts.year}`, value: formatVND(charts.yearTotal), tone: 'info' },
            {
              label: `Tổng doanh thu năm ${charts.previousYear}`,
              value: formatVND(charts.previousYearTotal),
              hint: 'Dùng để so sánh trên biểu đồ tháng trong năm',
            },
          ]}
        />
      )}

      {isLoading ? (
        <Card>
          <TableSkeleton rows={6} cols={4} />
        </Card>
      ) : isError ? (
        <Card>
          <p className="p-4 text-sm text-destructive">{getErrorMessage(error)}</p>
        </Card>
      ) : !charts ? null : (
        <>
          <LineChart
            title="Biểu đồ doanh thu ngày trong tháng"
            subtitle={`Năm: ${charts.year}`}
            xLabels={dailyXLabels}
            xTickStep={5}
            series={dailySeries}
          />
          <LineChart
            title="Biểu đồ doanh thu tháng trong năm"
            subtitle={`Năm: ${charts.year}`}
            xLabels={MONTH_LABELS}
            series={monthlySeries}
          />
          <div className="hidden pt-2 text-right print:block">
            <p className="text-sm italic text-muted-foreground">{formatReportDate(new Date())}</p>
            <p className="mt-6 text-sm font-semibold">Người lập</p>
            <p className="text-xs text-muted-foreground">(Ký, họ tên)</p>
            <p className="mt-8 text-sm font-semibold">{user.fullName}</p>
          </div>
        </>
      )}
    </section>
  );
}
