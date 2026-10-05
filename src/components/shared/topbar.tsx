'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, ShieldAlert, ShoppingCart, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumbs } from '@/components/shared/breadcrumbs';
import { useSession } from '@/components/shared/session-context';
import { apiPost } from '@/lib/api-client';
import { APP_ROUTES } from '@/lib/constants';
import { canAccessRoute } from '@/lib/rbac';
import { toast } from '@/components/ui/toast';
import { ROLE_LABELS } from '@/types';

/** Topbar: thong tin chi nhanh, trang thai mang (Offline-First), menu nguoi dung. */
export function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiPost('/api/auth/logout');
      toast.success('Đã đăng xuất', 'Hẹn gặp lại bạn!');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Không thể đăng xuất', 'Vui lòng thử lại.');
    } finally {
      setLoggingOut(false);
    }
  };

  const canUsePos = canAccessRoute(user.allowedRoutes, '/pos');
  const currentRoute = APP_ROUTES.find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));

  return (
    <header className="no-print flex h-14 shrink-0 items-center gap-3 border-b bg-card px-4">
      <button
        type="button"
        onClick={onToggleSidebar}
        className="rounded-md p-2 hover:bg-muted lg:hidden"
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Logo HN Group - chi hien thi khi Sidebar bi an (mobile/tablet). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-hngroup.webp"
        alt="HN Group"
        width={500}
        height={436}
        className="h-7 w-7 shrink-0 rounded object-contain lg:hidden"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{currentRoute?.label ?? user.storeName}</p>
        <Breadcrumbs pathname={pathname} root={user.storeName} className="mt-0.5" />
      </div>

      <span
        className={
          online
            ? 'hidden items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[11px] font-medium text-success sm:flex'
            : 'hidden items-center gap-1 rounded-full bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive sm:flex'
        }
        title={online ? 'Đang kết nối máy chủ' : 'Mất kết nối - giỏ hàng được lưu tạm trên thiết bị'}
      >
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {online ? 'Online' : 'Offline'}
      </span>

      {canUsePos && pathname !== '/pos' && (
        <Button asChild size="sm" variant="outline">
          <Link href="/pos">
            <ShoppingCart className="h-4 w-4" /> POS
          </Link>
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Menu tài khoản"
            className="flex items-center gap-2 rounded-md border px-2 py-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="hidden text-right leading-tight sm:block">
              <span className="block text-xs font-semibold">{user.fullName}</span>
              <span className="block text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</span>
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-bold uppercase">
              {user.username.slice(0, 2)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>Tài khoản</DropdownMenuLabel>
          <div className="px-2 pb-2 text-xs">
            <p className="font-semibold text-foreground">{user.fullName}</p>
            <p className="text-muted-foreground">
              {ROLE_LABELS[user.role]} · {user.storeName}
            </p>
            <p className="mt-1 text-muted-foreground">Hạn mức chiết khấu: {user.discountLimit}%</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/403-forbidden">
              <ShieldAlert className="h-4 w-4" /> Trang không có quyền
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => void handleLogout()}
            disabled={loggingOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" /> {loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
