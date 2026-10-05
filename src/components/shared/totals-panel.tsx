import { cn } from '@/lib/utils';

export type TotalTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface TotalItem {
  label: string;
  value: string;
  tone?: TotalTone;
  /** O so lieu quan trong nhat (in dam, co hon) - tuong ung dong TONG cua luoi desktop v4.5. */
  emphasis?: boolean;
  /** An tren man hinh hep de dai so lieu khong bi vo dong. */
  hideBelow?: 'sm' | 'md' | 'lg';
}

const TONE_CLASS: Record<TotalTone, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
};

const HIDE_CLASS: Record<NonNullable<TotalItem['hideBelow']>, string> = {
  sm: 'hidden sm:inline-flex',
  md: 'hidden md:inline-flex',
  lg: 'hidden lg:inline-flex',
};

interface TotalsPanelProps {
  items: TotalItem[];
  /** Nhan cua dai so lieu (vi du: TỔNG). */
  label?: string;
  /**
   * `bar`: dai so lieu ngang, dat duoi bang danh sach (giong dong TỔNG cua luoi desktop).
   * `list`: danh sach doc, dat trong panel chi tiet / card tong ket.
   */
  variant?: 'bar' | 'list';
  /** Ghi chu nho duoi dai so lieu (vi du: so lieu theo bo loc hien tai). */
  note?: string;
  className?: string;
}

/**
 * Dai so lieu tong hop (APP_TO_WEB_UI_SKILL muc 15: KPI/tong ket dat dung ngu canh).
 * Tai su dung cho moi man danh sach co dong TONG: don si, tra hang, giao hang COD
 * thay vi moi man tu viet mot kieu (RULE 12/23).
 */
export function TotalsPanel({ items, label, variant = 'bar', note, className }: TotalsPanelProps) {
  if (variant === 'list') {
    return (
      <dl className={cn('divide-y border-t', className)}>
        {label && (
          <div className="px-4 pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </div>
        )}
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className={cn('tabular-nums', item.emphasis ? 'text-base font-bold' : 'font-semibold', TONE_CLASS[item.tone ?? 'default'])}>
              {item.value}
            </dd>
          </div>
        ))}
        {note && <p className="px-4 py-2 text-[11px] text-muted-foreground">{note}</p>}
      </dl>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t bg-muted/30 px-4 py-2 text-xs',
        className,
      )}
      role="group"
      aria-label={label ?? 'Tổng cộng'}
    >
      {label && (
        <span className="mr-auto text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      )}

      {items.map((item) => (
        <span key={item.label} className={cn('inline-flex items-baseline gap-1.5', item.hideBelow && HIDE_CLASS[item.hideBelow])}>
          <span className="text-muted-foreground">{item.label}:</span>
          <span className={cn('tabular-nums', item.emphasis ? 'text-base font-bold' : 'font-semibold', TONE_CLASS[item.tone ?? 'default'])}>
            {item.value}
          </span>
        </span>
      ))}

      {note && <p className="w-full text-right text-[11px] text-muted-foreground">{note}</p>}
    </div>
  );
}
