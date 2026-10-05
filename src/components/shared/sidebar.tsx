'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeDollarSign,
  BookOpenText,
  Boxes,
  ChevronDown,
  ClipboardList,
  Factory,
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import { useSession } from '@/components/shared/session-context';
import { APP_ROUTES } from '@/lib/constants';
import { canAccessRoute, roleBadgeLabel } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/types';

const ICONS: Record<string, React.ReactNode> = {
  '/dashboard': <LayoutDashboard className="h-4 w-4" />,
  '/pos': <ShoppingCart className="h-4 w-4" />,
  '/orders/retail': <BadgeDollarSign className="h-4 w-4" />,
  '/orders/wholesale': <ClipboardList className="h-4 w-4" />,
  '/orders/returns': <BookOpenText className="h-4 w-4" />,
  '/shipping/cod': <Truck className="h-4 w-4" />,
  '/inventory/stock': <Boxes className="h-4 w-4" />,
  '/inventory/operations': <Factory className="h-4 w-4" />,
  '/inventory/audit': <ClipboardList className="h-4 w-4" />,
  '/finance/cashbook': <Wallet className="h-4 w-4" />,
  '/finance/debts': <BookOpenText className="h-4 w-4" />,
  '/reports': <BadgeDollarSign className="h-4 w-4" />,
  '/admin/users': <Users className="h-4 w-4" />,
};

/** Khoa luu trang thai thu gon nhom menu (Web UX: nhieu phan he -> cho phep thu gon). */
const GROUP_STATE_STORAGE_KEY = 'hn-sidebar-groups-v1';

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useSession();
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const routes = APP_ROUTES.filter(
    (route) =>
      canAccessRoute(user.allowedRoutes, route.path) &&
      (!route.requiredPermission || user.role === 'ROOT_ADMIN' || user.permissions.includes(route.requiredPermission)),
  );

  const groups = routes.reduce<Record<string, typeof routes>>((acc, route) => {
    acc[route.group] = acc[route.group] ? [...acc[route.group], route] : [route];
    return acc;
  }, {});

  /** Route dang mo — ho tro ca route con (vi du /orders/retail/123). */
  const isActiveRoute = (path: string) => pathname === path || pathname.startsWith(`${path}/`);
  const activeRoute = routes.find((route) => isActiveRoute(route.path));

  /** Khoi phuc trang thai thu gon da luu tren trinh duyet. */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(GROUP_STATE_STORAGE_KEY);
      if (raw) setCollapsedGroups(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* localStorage co the bi chan - bo qua */
    }
  }, []);

  /** Luon mo nhom chua route dang dung de nguoi dung khong bi "mat menu". */
  useEffect(() => {
    if (!activeRoute) return;
    setCollapsedGroups((prev) => (prev[activeRoute.group] ? { ...prev, [activeRoute.group]: false } : prev));
  }, [activeRoute]);

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        window.localStorage.setItem(GROUP_STATE_STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* localStorage co the bi chan - bo qua */
      }
      return next;
    });
  };

  return (
    <aside className="no-print flex h-full w-64 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-hngroup.webp"
          alt="Logo HN Group"
          width={500}
          height={436}
          className="h-8 w-8 shrink-0 rounded-md object-contain"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">HN Group</p>
          <p className="text-[11px] text-muted-foreground">Quản lý bán hàng v5.0</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {Object.entries(groups).map(([group, items]) => {
          const collapsed = collapsedGroups[group] === true;
          const groupHasActive = items.some((route) => isActiveRoute(route.path));
          return (
            <div key={group} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleGroup(group)}
                aria-expanded={!collapsed}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wider transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  groupHasActive && collapsed ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <span className="truncate">{group}</span>
                <ChevronDown
                  className={cn('h-3.5 w-3.5 shrink-0 transition-transform', collapsed && '-rotate-90')}
                  aria-hidden
                />
              </button>

              {!collapsed &&
                items.map((route) => {
                  const active = isActiveRoute(route.path);
                  return (
                    <Link
                      key={route.path}
                      href={route.path}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground hover:bg-muted',
                      )}
                    >
                      {ICONS[route.path] ?? <Boxes className="h-4 w-4" />}
                      <span className="truncate">{route.label}</span>
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </nav>

      <div className="border-t px-4 py-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{user.fullName}</p>
        <p>{ROLE_LABELS[user.role]}</p>
        <p className="mt-1">
          Chi nhánh: <span className="text-foreground">{user.storeName}</span>
        </p>
        <p className="mt-1">
          Vai trò rút gọn: <span className="text-foreground">{roleBadgeLabel(user.role)}</span>
        </p>
      </div>
    </aside>
  );
}
