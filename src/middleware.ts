import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/jwt';
import { PUBLIC_ROUTES } from '@/lib/constants';
import { canAccessRoute, hasPermission, resolveHomeRoute } from '@/lib/rbac';

/**
 * Route Guard (Buoc 3 cua workflow):
 * 1. Chua dang nhap -> chuyen huong ve /login (kem tham so ?next=...).
 * 2. Truy cap route khong duoc cap phep -> chuyen huong ve /403-forbidden.
 * 3. Route /admin/* yeu cau quyen MANAGE_USERS.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isPublic) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // Trang chu -> dieu huong ve route mac dinh theo vai tro.
  if (pathname === '/' || pathname === '/dashboard' && !canAccessRoute(session.allowedRoutes, '/dashboard')) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = resolveHomeRoute(session);
    homeUrl.search = '';
    return NextResponse.redirect(homeUrl);
  }

  if (pathname.startsWith('/admin') && !hasPermission(session, 'MANAGE_USERS')) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = '/403-forbidden';
    forbiddenUrl.search = '';
    forbiddenUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(forbiddenUrl);
  }

  if (!canAccessRoute(session.allowedRoutes, pathname)) {
    const forbiddenUrl = request.nextUrl.clone();
    forbiddenUrl.pathname = '/403-forbidden';
    forbiddenUrl.search = '';
    forbiddenUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(forbiddenUrl);
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Bo qua: file tinh, API (API tu tra ve 401/403 dang JSON qua api-guard),
   * va cac asset cua Next.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js)$).*)'],
};
