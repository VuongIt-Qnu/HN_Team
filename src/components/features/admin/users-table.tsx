'use client';

import { Lock, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/utils';
import { ROLE_LABELS, USER_STATUS_LABELS, type UserRecord } from '@/types';

interface Props {
  users: UserRecord[];
  onEdit: (user: UserRecord) => void;
  onLock: (user: UserRecord) => void;
}

/** Bang danh sach tai khoan: Username, Ho ten, Vai tro, Chi nhanh, Trang thai, quyen. */
export function UsersTable({ users, onEdit, onLock }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Họ tên</TableHead>
          <TableHead>Vai trò</TableHead>
          <TableHead>Chi nhánh</TableHead>
          <TableHead>Route / Quyền</TableHead>
          <TableHead>Trạng thái</TableHead>
          <TableHead>Đăng nhập cuối</TableHead>
          <TableHead className="text-right">Thao tác</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => {
          const allRoutes = user.allowedRoutes.includes('/*');
          return (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-xs font-semibold">{user.username}</TableCell>
              <TableCell>
                <p className="font-medium">{user.fullName}</p>
                <p className="text-[11px] text-muted-foreground">{user.phone || '—'}</p>
              </TableCell>
              <TableCell>
                <Badge variant={user.role === 'ROOT_ADMIN' ? 'default' : 'secondary'}>{ROLE_LABELS[user.role]}</Badge>
              </TableCell>
              <TableCell className="text-xs">{user.storeName}</TableCell>
              <TableCell className="text-xs">
                <p>{allRoutes ? 'Toàn quyền /*' : `${user.allowedRoutes.length} route`}</p>
                <p className="text-muted-foreground">
                  {user.permissions.length} quyền thao tác · CK {user.discountLimit}%
                </p>
              </TableCell>
              <TableCell>
                <Badge
                  variant={user.status === 'ACTIVE' ? 'success' : user.status === 'LOCKED' ? 'destructive' : 'secondary'}
                >
                  {USER_STATUS_LABELS[user.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'Chưa đăng nhập'}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={user.status === 'LOCKED'}
                    onClick={() => onLock(user)}
                  >
                    <Lock className="h-3.5 w-3.5" /> Khoá
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
