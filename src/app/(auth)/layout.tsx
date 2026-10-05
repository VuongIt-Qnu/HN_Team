import Link from 'next/link';

/** Layout khu vuc xac thuc (Dang nhap): nen gradient + the trung tam. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Link href="/login" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-hngroup.webp"
              alt="Logo HN Group"
              width={500}
              height={436}
              className="h-10 w-10 rounded-md object-contain"
            />
            <span className="text-lg font-semibold">HN Group · Web Sales v5.0</span>
          </Link>
        </div>
        {children}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Hệ thống quản lý bán hàng · kho · công nợ — phân quyền RBAC theo vai trò
        </p>
      </div>
    </div>
  );
}
