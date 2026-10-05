'use client';

import { useState, type MouseEvent } from 'react';
import { cn, formatVND } from '@/lib/utils';

/**
 * Bieu do duong (line chart) ve bang SVG thuan - khong dung thu vien ngoai
 * (theo quy uoc cua du an: khong them dependency chi de ve bieu do).
 *
 * Ho tro: tieu de + phu de, luoi doc/ngang, chu giai ben phai, tooltip khi hover.
 */

/** Mau cho cac chuoi bieu do 12 thang (Thang 1..12) - quay vong 12 hue. */
export function chartColor(index: number): string {
  return `hsl(${(index * 30) % 360} 72% 44%)`;
}

/** Mau so sanh 2 nam bieu do: "Nam nay" = mau thuong hieu, "Nam ngoai" = mau canh bao. */
export const CHART_COMPARE_COLORS = ['hsl(var(--primary))', 'hsl(var(--warning))'] as const;

export interface LineChartSeries {
  key: string;
  label: string;
  /** Mau duong ke (chuoi hsl hoac hsl(var(--token))). */
  color: string;
  /** Gia tri theo tung moc truc X (index 0 = moc dau tien). */
  values: number[];
}

interface LineChartProps {
  title: string;
  subtitle?: string;
  /** Nhan truc X tuong ung tung phan tu cua `values`. */
  xLabels: string[];
  series: LineChartSeries[];
  /** Buoc nhay khi ve vach truc X (mac dinh 1). */
  xTickStep?: number;
  className?: string;
}

/* Kich thuoc he toa do SVG (viewBox) - SVG tu co gian theo be rong container. */
const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 420;
const PAD_LEFT = 78;
const PAD_RIGHT = 200;
const PAD_TOP = 18;
const PAD_BOTTOM = 48;
const PLOT_WIDTH = VIEW_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_HEIGHT = VIEW_HEIGHT - PAD_TOP - PAD_BOTTOM;
const Y_TICK_COUNT = 5;
const MAX_TOOLTIP_ROWS = 8;
const TOOLTIP_WIDTH = 250;
const TOOLTIP_ROW_HEIGHT = 18;
const AXIS_LABEL_CLASS = 'fill-muted-foreground text-[12px]';

/** Lam tron len moc truc Y "dep" theo 1 / 2 / 2,5 / 5 / 10 x 10^n. */
function niceCeil(value: number): number {
  if (value <= 0) return 1_000_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** 201300000 -> "201,3 tr" (nhan truc Y gon, tranh tran be rong). */
function formatAxisValue(value: number): string {
  if (value === 0) return '0';
  const abs = Math.abs(value);
  const unit =
    abs >= 1_000_000_000
      ? { size: 1_000_000_000, suffix: ' tỷ' }
      : abs >= 1_000_000
        ? { size: 1_000_000, suffix: ' tr' }
        : abs >= 1_000
          ? { size: 1_000, suffix: ' ng' }
          : { size: 1, suffix: '' };
  const scaled = value / unit.size;
  const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1).replace('.', ',');
  return `${text}${unit.suffix}`;
}

export function LineChart({ title, subtitle, xLabels, series, xTickStep = 1, className }: LineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const pointCount = Math.max(xLabels.length, 1);
  const maxValue = series.reduce(
    (max, item) => item.values.reduce((innerMax, value) => Math.max(innerMax, value), max),
    0,
  );
  const yMax = niceCeil(maxValue);
  const stepX = pointCount > 1 ? PLOT_WIDTH / (pointCount - 1) : PLOT_WIDTH;
  const xOf = (index: number) => PAD_LEFT + index * stepX;
  const yOf = (value: number) => PAD_TOP + PLOT_HEIGHT - (Math.min(Math.max(value, 0), yMax) / yMax) * PLOT_HEIGHT;

  const xTicks: number[] = [];
  for (let index = 0; index < pointCount; index += Math.max(xTickStep, 1)) xTicks.push(index);
  if (xTicks[xTicks.length - 1] !== pointCount - 1) xTicks.push(pointCount - 1);

  const hoveredRows = hoverIndex === null ? [] : series.filter((item) => (item.values[hoverIndex] ?? 0) !== 0);
  const tooltipRows = hoveredRows.slice(0, MAX_TOOLTIP_ROWS);
  const tooltipHeight = 30 + Math.max(tooltipRows.length, 1) * TOOLTIP_ROW_HEIGHT;
  const tooltipX =
    hoverIndex === null
      ? PAD_LEFT
      : Math.min(Math.max(xOf(hoverIndex) + 12, PAD_LEFT), PAD_LEFT + PLOT_WIDTH - TOOLTIP_WIDTH);

  /** Doi vi tri chuot (pixel) sang index moc truc X gan nhat. */
  function handleMouseMove(event: MouseEvent<SVGRectElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width === 0 || pointCount < 2) return;
    const ratio = (event.clientX - bounds.left) / bounds.width;
    setHoverIndex(Math.min(Math.max(Math.round(ratio * (pointCount - 1)), 0), pointCount - 1));
  }

  return (
    <figure className={cn('rounded-lg border bg-card p-4 shadow-sm print:break-inside-avoid', className)}>
      <figcaption className="mb-2 text-center">
        <p className="text-base font-bold uppercase tracking-wide">{title}</p>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </figcaption>

      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={subtitle ? `${title} — ${subtitle}` : title}
      >
        {/* Luoi ngang + nhan truc Y */}
        {Array.from({ length: Y_TICK_COUNT + 1 }).map((_, index) => {
          const value = (yMax / Y_TICK_COUNT) * index;
          const yPos = yOf(value);
          return (
            <g key={`y-${index}`}>
              <line
                x1={PAD_LEFT}
                y1={yPos}
                x2={PAD_LEFT + PLOT_WIDTH}
                y2={yPos}
                className="stroke-border"
                strokeDasharray={index === 0 ? undefined : '4 4'}
              />
              <text x={PAD_LEFT - 10} y={yPos + 4} textAnchor="end" className={AXIS_LABEL_CLASS}>
                {formatAxisValue(value)}
              </text>
            </g>
          );
        })}

        {/* Luoi doc + nhan truc X */}
        {xTicks.map((index) => (
          <g key={`x-${index}`}>
            <line
              x1={xOf(index)}
              y1={PAD_TOP}
              x2={xOf(index)}
              y2={PAD_TOP + PLOT_HEIGHT}
              className="stroke-border"
              strokeOpacity={0.7}
            />
            <text x={xOf(index)} y={PAD_TOP + PLOT_HEIGHT + 22} textAnchor="middle" className={AXIS_LABEL_CLASS}>
              {xLabels[index] ?? ''}
            </text>
          </g>
        ))}

        {/* Truc tung dam hon luoi */}
        <line
          x1={PAD_LEFT}
          y1={PAD_TOP}
          x2={PAD_LEFT}
          y2={PAD_TOP + PLOT_HEIGHT}
          className="stroke-foreground"
          strokeOpacity={0.55}
        />

        {/* Duong doanh thu cua tung chuoi */}
        {series.map((item) => (
          <path
            key={`line-${item.key}`}
            d={item.values
              .slice(0, pointCount)
              .map((value, index) => `${index === 0 ? 'M' : 'L'} ${xOf(index)} ${yOf(value)}`)
              .join(' ')}
            fill="none"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ stroke: item.color }}
          />
        ))}

        {/* Duong ke + diem nhan manh tai moc dang hover */}
        {hoverIndex !== null && (
          <g pointerEvents="none">
            <line
              x1={xOf(hoverIndex)}
              y1={PAD_TOP}
              x2={xOf(hoverIndex)}
              y2={PAD_TOP + PLOT_HEIGHT}
              className="stroke-muted-foreground"
              strokeDasharray="4 3"
            />
            {hoveredRows.map((item) => (
              <circle
                key={`dot-${item.key}`}
                cx={xOf(hoverIndex)}
                cy={yOf(item.values[hoverIndex] ?? 0)}
                r={3.5}
                strokeWidth={1.5}
                className="stroke-card"
                style={{ fill: item.color }}
              />
            ))}
          </g>
        )}

        {/* Chu giai (legend) ben phai - giong ban in bao cao */}
        {series.map((item, index) => (
          <g key={`legend-${item.key}`} transform={`translate(${PAD_LEFT + PLOT_WIDTH + 18}, ${PAD_TOP + 8 + index * 20})`}>
            <line x1={0} y1={6} x2={16} y2={6} strokeWidth={2.5} strokeLinecap="round" style={{ stroke: item.color }} />
            <text x={22} y={10} className={AXIS_LABEL_CLASS}>
              {item.label}
            </text>
          </g>
        ))}

        {/* Vung bat su kien hover de hien tooltip */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={PLOT_WIDTH}
          height={PLOT_HEIGHT}
          fill="transparent"
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIndex(null)}
        />

        {/* Tooltip chi tiet tai moc dang hover */}
        {hoverIndex !== null && (
          <g pointerEvents="none">
            <rect
              x={tooltipX}
              y={PAD_TOP + 6}
              width={TOOLTIP_WIDTH}
              height={tooltipHeight}
              rx={6}
              className="fill-popover stroke-border"
            />
            <text x={tooltipX + 10} y={PAD_TOP + 26} className="fill-foreground text-[12px] font-semibold">
              Mốc {xLabels[hoverIndex] ?? ''}
            </text>
            {tooltipRows.length === 0 ? (
              <text x={tooltipX + 10} y={PAD_TOP + 26 + TOOLTIP_ROW_HEIGHT} className={AXIS_LABEL_CLASS}>
                Không có doanh thu
              </text>
            ) : (
              tooltipRows.map((item, index) => (
                <g key={`tip-${item.key}`} transform={`translate(${tooltipX + 10}, ${PAD_TOP + 30 + index * TOOLTIP_ROW_HEIGHT})`}>
                  <rect x={0} y={4} width={9} height={9} rx={2} style={{ fill: item.color }} />
                  <text x={15} y={12} className={AXIS_LABEL_CLASS}>
                    {item.label}: {formatVND(item.values[hoverIndex] ?? 0)}
                  </text>
                </g>
              ))
            )}
          </g>
        )}
      </svg>
    </figure>
  );
}

