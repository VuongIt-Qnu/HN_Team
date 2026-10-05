'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/shared/sidebar';
import { Topbar } from '@/components/shared/topbar';
import { FULLSCREEN_ROUTES } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Khung ung dung: Sidebar + Topbar cho cac trang quan tri.
 * Rieng man hinh POS duoc thi cong FULLSCREEN (an Sidebar/Topbar) de tap trung ban hang.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isFullscreen = FULLSCREEN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isFullscreen) {
    return <main className="min-h-screen bg-background">{children}</main>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="relative z-50">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className={cn('flex min-w-0 flex-1 flex-col')}>
        <Topbar onToggleSidebar={() => setMobileOpen((open) => !open)} />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
