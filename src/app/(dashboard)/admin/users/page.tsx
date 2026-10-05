import { redirect } from 'next/navigation';
import { UsersModule } from '@/components/features/admin/users-module';
import { getSession } from '@/lib/auth/session';
import { hasPermission } from '@/lib/rbac';

export const metadata = {
  title: 'Tài khoản & Phân quyền | HN Group',
};

/**
 * Route /admin/users: chi ROOT_ADMIN (quyen MANAGE_USERS) duoc truy cap.
 * Middleware da chan truoc do; day la lop bao ve thu 2 o Server Component.
 */
export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!hasPermission(session, 'MANAGE_USERS')) redirect('/403-forbidden?from=/admin/users');

  return <UsersModule />;
}
