'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { PermissionMatrix, defaultPermissionsForRole, defaultRoutesForRole } from '@/components/features/admin/permission-matrix';
import {
  UserFormFields,
  emptyUserForm,
  type UserFormState,
} from '@/components/features/admin/user-form-fields';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import type { RoleCode, Store, UserRecord } from '@/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = thêm mới, có giá trị = chỉnh sửa */
  user: UserRecord | null;
  onSaved: () => void;
}

const DEFAULT_STORE_ID = 'st_hanoi';

/** Modal Thêm/Sửa tài khoản + ma trận phân quyền chi tiết (Buoc 2 cua workflow). */
export function UserFormDialog({ open, onOpenChange, user, onSaved }: Props) {
  const { data: catalog } = useQuery({
    queryKey: ['catalog'],
    queryFn: () => apiGet<{ stores: Store[] }>('/api/catalog'),
    enabled: open,
  });
  const stores = catalog?.stores ?? [];
  const [form, setForm] = useState<UserFormState>(() =>
    emptyUserForm(DEFAULT_STORE_ID, defaultRoutesForRole('POS_CASHIER'), defaultPermissionsForRole('POS_CASHIER')),
  );

  useEffect(() => {
    if (!open) return;
    if (user) {
      setForm({
        username: user.username,
        password: '',
        fullName: user.fullName,
        phone: user.phone,
        email: user.email ?? '',
        role: user.role,
        storeId: user.storeId,
        status: user.status,
        discountLimit: user.discountLimit,
        allowedRoutes: user.allowedRoutes,
        permissions: user.permissions,
      });
    } else {
      setForm(
        emptyUserForm(
          stores[0]?.id ?? DEFAULT_STORE_ID,
          defaultRoutesForRole('POS_CASHIER'),
          defaultPermissionsForRole('POS_CASHIER'),
        ),
      );
    }
  }, [open, user, stores]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        username: form.username.trim(),
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        role: form.role,
        storeId: form.storeId,
        status: form.status,
        discountLimit: form.discountLimit,
        allowedRoutes: form.allowedRoutes,
        permissions: form.permissions,
      };
      if (user) {
        return apiPatch<{ user: UserRecord }>(`/api/users/${user.id}`, {
          ...payload,
          password: form.password || undefined,
        });
      }
      return apiPost<{ user: UserRecord }>('/api/users', { ...payload, password: form.password });
    },
    onSuccess: (data) => {
      toast.success(user ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản', `${data.user.fullName} (${data.user.username})`);
      onOpenChange(false);
      onSaved();
    },
    onError: (error) => toast.error('Không thể lưu tài khoản', getErrorMessage(error)),
  });

  const handleRoleChange = (role: RoleCode) => {
    setForm((prev) => ({
      ...prev,
      role,
      allowedRoutes: defaultRoutesForRole(role),
      permissions: defaultPermissionsForRole(role),
      discountLimit: role === 'ROOT_ADMIN' ? 100 : role === 'POS_CASHIER' ? 5 : 10,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{user ? `Sửa tài khoản: ${user.username}` : 'Thêm tài khoản nhân viên'}</DialogTitle>
          <DialogDescription>
            Tài khoản ROOT_ADMIN có toàn quyền; các vai trò khác chỉ truy cập được URL Route được tích chọn bên dưới
            (Middleware Route Guard sẽ chặn và chuyển hướng về /403-forbidden).
          </DialogDescription>
        </DialogHeader>

        <UserFormFields
          form={form}
          stores={stores}
          isEditing={!!user}
          onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
          onRoleChange={handleRoleChange}
        />

        <PermissionMatrix
          role={form.role}
          allowedRoutes={form.allowedRoutes}
          permissions={form.permissions}
          onRoutesChange={(allowedRoutes) => setForm((prev) => ({ ...prev, allowedRoutes }))}
          onPermissionsChange={(permissions) => setForm((prev) => ({ ...prev, permissions }))}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {user ? 'Lưu thay đổi' : 'Tạo tài khoản'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
