'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { APP_ROUTES, DEFAULT_DISCOUNT_LIMIT } from '@/lib/constants';
import { PERMISSIONS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS, type PermissionCode, type RoleCode } from '@/types';

/** Tap route mac dinh theo vai tro (lay tu ma tran RBAC trong skill). */
export function defaultRoutesForRole(role: RoleCode): string[] {
  if (role === 'ROOT_ADMIN') return ['/*'];
  return APP_ROUTES.filter((route) => route.defaultRoles.includes(role)).map((route) => route.path);
}

export function defaultPermissionsForRole(role: RoleCode): PermissionCode[] {
  return [...ROLE_DEFAULT_PERMISSIONS[role]];
}

interface Props {
  role: RoleCode;
  allowedRoutes: string[];
  permissions: PermissionCode[];
  onRoutesChange: (routes: string[]) => void;
  onPermissionsChange: (permissions: PermissionCode[]) => void;
}

/**
 * Ma tran phan quyen chi tiet (Buoc 2 cua workflow):
 * bang Checkbox theo tung URL Route (nhom theo phan he) + quyen thao tac.
 */
export function PermissionMatrix({ role, allowedRoutes, permissions, onRoutesChange, onPermissionsChange }: Props) {
  const isAdmin = role === 'ROOT_ADMIN';
  const hasAllRoutes = allowedRoutes.includes('/*');

  const groups = APP_ROUTES.reduce<Record<string, typeof APP_ROUTES>>((acc, route) => {
    acc[route.group] = acc[route.group] ? [...acc[route.group], route] : [route];
    return acc;
  }, {});

  const toggleRoute = (path: string, checked: boolean) => {
    if (checked) {
      onRoutesChange(Array.from(new Set([...allowedRoutes.filter((item) => item !== '/*'), path])));
    } else {
      onRoutesChange(allowedRoutes.filter((item) => item !== path));
    }
  };

  const togglePermission = (permission: PermissionCode, checked: boolean) => {
    onPermissionsChange(
      checked ? Array.from(new Set([...permissions, permission])) : permissions.filter((item) => item !== permission),
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">1. URL Route được phép truy cập</p>
          <div className="flex items-center gap-2">
            <Badge variant={hasAllRoutes ? 'success' : 'secondary'}>
              {hasAllRoutes ? 'Toàn quyền (/*)' : `${allowedRoutes.length} route`}
            </Badge>
            <button
              type="button"
              className="text-xs text-primary underline-offset-2 hover:underline"
              onClick={() => {
                onRoutesChange(defaultRoutesForRole(role));
                onPermissionsChange(defaultPermissionsForRole(role));
              }}
            >
              Lấy theo vai trò mặc định
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded bg-muted px-2 py-1.5">
          <Checkbox
            id="route-all"
            checked={hasAllRoutes}
            disabled={isAdmin}
            onCheckedChange={(checked) => onRoutesChange(checked ? ['/*'] : [])}
          />
          <Label htmlFor="route-all" className="text-sm">
            Toàn quyền tất cả các trang (<span className="font-mono">/*</span>)
          </Label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(groups).map(([group, routes]) => (
            <div key={group} className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group}</p>
              {routes.map((route) => {
                const checked = hasAllRoutes || allowedRoutes.includes(route.path);
                return (
                  <div key={route.path} className="flex items-start gap-2">
                    <Checkbox
                      id={`route-${route.path}`}
                      className="mt-0.5"
                      checked={checked}
                      disabled={isAdmin || hasAllRoutes}
                      onCheckedChange={(value) => toggleRoute(route.path, value === true)}
                    />
                    <Label htmlFor={`route-${route.path}`} className="cursor-pointer font-normal">
                      <span className="block text-sm">{route.label}</span>
                      <span className="block font-mono text-[11px] text-muted-foreground">{route.path}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">2. Quyền thao tác</p>
          <Badge variant={permissions.length ? 'info' : 'secondary'}>{permissions.length} quyền</Badge>
        </div>
        <div className="grid gap-1.5 md:grid-cols-2">
          {PERMISSIONS.map((permission) => (
            <div key={permission} className="flex items-center gap-2">
              <Checkbox
                id={`perm-${permission}`}
                checked={isAdmin || permissions.includes(permission)}
                disabled={isAdmin}
                onCheckedChange={(value) => togglePermission(permission, value === true)}
              />
              <Label htmlFor={`perm-${permission}`} className="cursor-pointer font-normal">
                <span className="text-sm">{PERMISSION_LABELS[permission]}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">{permission}</span>
              </Label>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Hạn mức chiết khấu mặc định khi không có quyền “Chiết khấu vượt hạn mức”: {DEFAULT_DISCOUNT_LIMIT}%. Tài khoản
          không có quyền “Được xem giá vốn” sẽ không nhận được trường giá vốn/lợi nhuận từ API.
        </p>
      </div>
    </div>
  );
}
