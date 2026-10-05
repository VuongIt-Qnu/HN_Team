'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSession } from '@/components/shared/session-context';
import { canAccessRoute, resolveHomeRoute } from '@/lib/rbac';
import { PosTabsBar } from '@/components/features/pos/pos-tabs-bar';
import type { OrderTab } from '@/lib/pos-types';

interface Props {
  tabs: OrderTab[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
}

/** Header man hinh POS: nut thoat, ten chi nhanh, thanh tab da don va thong tin thu ngan. */
export function PosHeader({ tabs, activeTabId, onSelect, onClose, onAdd }: Props) {
  const user = useSession();

  /**
   * Thoat POS ve noi thu ngan duoc lam viec: /orders/retail luon duoc champ cho POS_CASHIER,
   * tranh tinh trang nut cu tro ve /dashboard nhung tai khoan thu ngan khong co quyen truy cap
   * nen bi day nguoc lai /pos.
   */
  const exitHref = canAccessRoute(user.allowedRoutes, '/orders/retail') ? '/orders/retail' : resolveHomeRoute(user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <Button asChild variant="ghost" size="sm" title="Thoát màn hình POS">
        <Link href={exitHref}>
          <ArrowLeft className="h-4 w-4" /> Thoát POS
        </Link>
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <div className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-hngroup.webp"
          alt="HN Group"
          width={500}
          height={436}
          className="h-5 w-5 shrink-0 object-contain"
        />
        POS · {user.storeName}
      </div>
      <PosTabsBar tabs={tabs} activeTabId={activeTabId} onSelect={onSelect} onClose={onClose} onAdd={onAdd} />
      <div className="whitespace-nowrap text-right text-xs">
        <p className="font-semibold">{user.fullName}</p>
        <p className="text-muted-foreground">Hạn mức CK: {user.discountLimit}%</p>
      </div>
    </header>
  );
}
