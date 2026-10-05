'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { hasPermission } from '@/lib/rbac';
import { canAccessRoute } from '@/lib/rbac';
import type { PermissionCode, SessionUser } from '@/types';

interface SessionContextValue {
  user: SessionUser;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Cung cap session cho Client Components (duoc inject tu Server Layout). */
export function SessionProvider({ user, children }: { user: SessionUser; children: ReactNode }) {
  return <SessionContext.Provider value={{ user }}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionUser {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession phải được dùng bên trong <SessionProvider>.');
  }
  return context.user;
}

/** Kiem tra quyen thao tac (an/hien nut bam theo RBAC). */
export function usePermission(permission: PermissionCode): boolean {
  const user = useSession();
  return hasPermission(user, permission);
}

/** Kiem tra quyen truy cap route. */
export function useRouteAccess(path: string): boolean {
  const user = useSession();
  return canAccessRoute(user.allowedRoutes, path);
}
