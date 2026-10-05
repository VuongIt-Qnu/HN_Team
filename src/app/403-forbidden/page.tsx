import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSession } from '@/lib/auth/session';
import { resolveHomeRoute } from '@/lib/rbac';
import { ROLE_LABELS } from '@/types';

/** Trang 403: hien thi khi nguoi dung truy cap URL route chua duoc cap quyen. */
export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: { from?: string };
}) {
  const session = await getSession();
  const homeRoute = session ? resolveHomeRoute(session) : '/login';

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg rounded-lg border bg-background p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold">403 — Không có quyền truy cập</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</p>

        {searchParams.from && (
          <p className="mt-3 rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            Route bị chặn: {searchParams.from}
          </p>
        )}

        {session && (
          <div className="mt-4 space-y-1 text-xs text-muted-foreground">
            <p>
              Tài khoản: <span className="font-medium text-foreground">{session.username}</span> · Vai trò:{' '}
              <span className="font-medium text-foreground">{ROLE_LABELS[session.role]}</span>
            </p>
            <p>Liên hệ Giám đốc/Admin để được cấp thêm URL Route trong màn hình /admin/users.</p>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href={homeRoute}>Về trang mặc định</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Đăng nhập lại</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
