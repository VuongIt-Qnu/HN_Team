import { getSession } from '@/lib/auth/session';
import { resolveHomeRoute } from '@/lib/rbac';
import { redirect } from 'next/navigation';
import { SessionProvider } from '@/components/shared/session-context';
import { AppShell } from '@/components/shared/app-shell';

/**
 * Layout khu vuc da dang nhap: kiem tra session o Server,
 * inject user vao Client Context roi render AppShell (Sidebar + Topbar).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const home = resolveHomeRoute(session);

  return (
    <SessionProvider user={session}>
      <AppShell>{children}</AppShell>
      <span className="hidden" data-home-route={home} />
    </SessionProvider>
  );
}
