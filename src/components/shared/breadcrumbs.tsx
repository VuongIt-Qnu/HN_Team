import { ChevronRight } from 'lucide-react';
import { APP_ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface BreadcrumbsProps {
  pathname: string;
  /** Ten goc hien thi dau tien (vi du: chi nhanh dang lam viec). */
  root?: string;
  className?: string;
}

/**
 * Breadcrumb chuan Web (APP_TO_WEB_UI_WORKFLOW Phase 5: "Mobile Header -> Header + Breadcrumb").
 * Thay cho viec hien pathname tho tren Topbar: nguoi dung luon biet minh dang o
 * phan he nao / man hinh nao - dieu ma menu ngang cua desktop v4.5 the hien bang tab.
 */
export function Breadcrumbs({ pathname, root, className }: BreadcrumbsProps) {
  const route = APP_ROUTES.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  const fallbackLabel = pathname.split('/').filter(Boolean).pop() ?? 'Trang';

  return (
    <nav aria-label="Đường dẫn" className={cn('flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground', className)}>
      {root && (
        <>
          <span className="truncate">{root}</span>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        </>
      )}
      {route && (
        <>
          <span className="truncate">{route.group}</span>
          <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        </>
      )}
      <span aria-current="page" className="truncate font-medium text-foreground">
        {route?.label ?? fallbackLabel}
      </span>
    </nav>
  );
}
