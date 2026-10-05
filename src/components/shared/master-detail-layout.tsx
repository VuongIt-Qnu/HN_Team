'use client';

import type { ReactNode } from 'react';
import { FileSearch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

/**
 * Media query khop breakpoint `2xl` cua Tailwind.
 * Chi tu 1536px tro len moi du cho (256px Sidebar + padding + 384px panel) de dat
 * danh sach va chi tiet canh nhau ma khong lam vo luoi du lieu.
 */
export const MASTER_DETAIL_WIDE_QUERY = '(min-width: 1536px)';

interface MasterDetailLayoutProps {
  /** Khoi danh sach (master): bang tren may tinh, card/list tren dien thoai. */
  master: ReactNode;
  /**
   * Panel chi tiet hien thi ben phai tren man hinh rong (>= 1536px).
   * Truyen `undefined` thi bo cuc chi con 1 cot nhu cu.
   */
  detail?: ReactNode;
  /** Hop thoai chi tiet cho laptop/tablet/dien thoai (< 1536px). */
  dialog?: ReactNode;
  className?: string;
}

/**
 * Bo cuc Master - Detail theo tu duy Web (APP_TO_WEB_UI_SKILL muc 5: Mobile List -> Split View):
 * - Man hinh rong (>= 1536px): danh sach ben trai, panel chi tiet ben phai (sticky, tu cuon).
 * - Man hinh nho hon: chi hien danh sach va mo chi tiet bang `dialog` nhu truoc.
 * Nho vay nguoi dung desktop khong phai mo - dong modal lien tuc (RULE 20: Page -> Section -> Action).
 */
export function MasterDetailLayout({ master, detail, dialog, className }: MasterDetailLayoutProps) {
  const isWideScreen = useMediaQuery(MASTER_DETAIL_WIDE_QUERY);

  return (
    <div className={cn('grid items-start gap-4', detail && '2xl:grid-cols-[minmax(0,1fr)_384px]', className)}>
      <div className="min-w-0">{master}</div>

      {detail && (
        <aside
          className="scrollbar-thin hidden min-w-0 2xl:sticky 2xl:top-4 2xl:block 2xl:max-h-[calc(100vh-6rem)] 2xl:overflow-y-auto"
          aria-label="Chi tiết bản ghi đang chọn"
        >
          {detail}
        </aside>
      )}

      {/* Man hinh nho: chi tiet van la hop thoai de khong vo bo cuc danh sach. */}
      {!isWideScreen && dialog}
    </div>
  );
}

interface MasterDetailPanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Khung panel chi tiet: tieu de + vung thao tac + noi dung, dung token mau thong nhat. */
export function MasterDetailPanel({ title, subtitle, actions, children, className }: MasterDetailPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex-row items-start gap-2 space-y-0">
        <div className="mr-auto min-w-0">
          <CardTitle className="truncate text-sm font-semibold">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {actions}
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

/** Trang thai chua chon ban ghi nao trong panel chi tiet (man hinh rong). */
export function MasterDetailPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <EmptyState
      className="py-10"
      icon={<FileSearch className="h-6 w-6" />}
      title={title}
      description={description ?? 'Chọn một dòng trong danh sách để xem chi tiết.'}
    />
  );
}
