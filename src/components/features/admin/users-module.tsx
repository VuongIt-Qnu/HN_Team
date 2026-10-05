'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { UsersStats, computeUserStats } from '@/components/features/admin/users-stats';
import { UsersTable } from '@/components/features/admin/users-table';
import { UserFormDialog } from '@/components/features/admin/user-form-dialog';
import { apiDelete, apiGet } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import { ROLE_LABELS, ROLES, USER_STATUS_LABELS, type RoleCode, type UserRecord, type UserStatus } from '@/types';

/** Man hinh /admin/users - chi ROOT_ADMIN truy cap (chan ca Middleware va API Guard). */
export function UsersModule() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleCode | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [editing, setEditing] = useState<UserRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [locking, setLocking] = useState<UserRecord | null>(null);
  const [lockingPending, setLockingPending] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiGet<{ items: UserRecord[] }>('/api/users'),
  });

  const users = data?.items ?? [];

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter && user.role !== roleFilter) return false;
      if (statusFilter && user.status !== statusFilter) return false;
      if (!keyword) return true;
      return (
        user.username.toLowerCase().includes(keyword) ||
        user.fullName.toLowerCase().includes(keyword) ||
        user.phone.toLowerCase().includes(keyword)
      );
    });
  }, [users, search, roleFilter, statusFilter]);

  const stats = useMemo(() => computeUserStats(users), [users]);

  const handleLock = async () => {
    if (!locking) return;
    setLockingPending(true);
    try {
      const result = await apiDelete<{ user: UserRecord; message: string }>(`/api/users/${locking.id}`);
      toast.success('Đã khoá tài khoản', result.message);
      setLocking(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    } catch (error) {
      toast.error('Không thể khoá tài khoản', getErrorMessage(error));
    } finally {
      setLockingPending(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tài khoản & Phân quyền"
        description="Tạo tài khoản nhân viên, tích chọn URL Route được phép truy cập và cấp quyền thao tác chi tiết theo ma trận RBAC."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Thêm tài khoản
          </Button>
        }
      />

      <UsersStats stats={stats} />

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Danh sách tài khoản ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              className="h-9 w-56"
              placeholder="Tìm theo username / họ tên / SĐT"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select
              className="h-9 w-48"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value as RoleCode | '')}
            >
              <option value="">Tất cả vai trò</option>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
            <Select
              className="h-9 w-40"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as UserStatus | '')}
            >
              <option value="">Tất cả trạng thái</option>
              {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((status) => (
                <option key={status} value={status}>
                  {USER_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={6} cols={7} />
          ) : filtered.length === 0 ? (
            <EmptyState
              className="m-4"
              title="Chưa có dữ liệu"
              description="Bấm [+ Thêm tài khoản] để tạo tài khoản nhân viên đầu tiên"
              actionLabel="+ Thêm tài khoản"
              onAction={openCreate}
            />
          ) : (
            <UsersTable
              users={filtered}
              onEdit={(user) => {
                setEditing(user);
                setFormOpen(true);
              }}
              onLock={(user) => setLocking(user)}
            />
          )}
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editing}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: ['users'] })}
      />

      <Dialog open={!!locking} onOpenChange={(open) => !open && setLocking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Khoá tài khoản {locking?.username}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Nhân viên <span className="font-medium text-foreground">{locking?.fullName}</span> sẽ không thể đăng nhập
            nhưng toàn bộ dữ liệu giao dịch lịch sử vẫn được giữ nguyên.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLocking(null)}>
              Huỷ
            </Button>
            <Button variant="destructive" disabled={lockingPending} onClick={handleLock}>
              Khoá tài khoản
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
