import { cn } from '@/lib/utils';

export interface SummaryItem {
  label: string;
  value: string;
  /** Ghi chu nho duoi so lieu (vi du: "chua bao gom VAT"). */
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

const TONE_CLASS: Record<NonNullable<SummaryItem['tone']>, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
};

/** So cot luoi theo so luong so lieu: 2 / 3 / 4 o (Mobile luon 1-2 o, khong ep 4 o). */
const COLUMN_CLASS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
};

/**
 * Dai so lieu tom tat (APP_TO_WEB_UI_SKILL muc 15 - Dashboard Design: KPI truoc, chi tiet sau).
 * Dung luoi + duong ke phan cach thay vi long nhieu Card vao nhau (RULE 07) va dung token mau (RULE 08/23).
 */
export function SummaryStrip({ items, className }: { items: SummaryItem[]; className?: string }) {
  const columnClass = COLUMN_CLASS[Math.min(Math.max(items.length, 1), 4)] ?? COLUMN_CLASS[4];

  return (
    <div className={cn('grid gap-px overflow-hidden rounded-lg border bg-border', columnClass, className)}>
      {items.map((item) => (
        <div key={item.label} className="bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className={cn('mt-0.5 text-lg font-bold tabular-nums', TONE_CLASS[item.tone ?? 'default'])}>{item.value}</p>
          {item.hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>}
        </div>
      ))}
    </div>
  );
}
