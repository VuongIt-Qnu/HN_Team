'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PermissionCode, RoleCode, Store, UserStatus } from '@/types';
import { ROLE_LABELS, ROLES, USER_STATUS_LABELS } from '@/types';

/** Trang thai form tai khoan (dung chung cho dialog them/sua). */
export interface UserFormState {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email: string;
  role: RoleCode;
  storeId: string;
  status: UserStatus;
  discountLimit: number;
  allowedRoutes: string[];
  permissions: PermissionCode[];
}

export function emptyUserForm(storeId: string, allowedRoutes: string[], permissions: PermissionCode[]): UserFormState {
  return {
    username: '',
    password: '',
    fullName: '',
    phone: '',
    email: '',
    role: 'POS_CASHIER',
    storeId,
    status: 'ACTIVE',
    discountLimit: 5,
    allowedRoutes,
    permissions,
  };
}

interface Props {
  form: UserFormState;
  stores: Store[];
  isEditing: boolean;
  onChange: (patch: Partial<UserFormState>) => void;
  onRoleChange: (role: RoleCode) => void;
}

/** Cum truong thong tin ca nhan + vai tro + chi nhanh + han muc chiet khau. */
export function UserFormFields({ form, stores, isEditing, onChange, onRoleChange }: Props) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="username">Tên đăng nhập *</Label>
        <Input
          id="username"
          value={form.username}
          onChange={(event) => onChange({ username: event.target.value })}
          placeholder="vd: thungan03"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">{isEditing ? 'Mật khẩu mới (bỏ trống để giữ nguyên)' : 'Mật khẩu *'}</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(event) => onChange({ password: event.target.value })}
          placeholder="Tối thiểu 6 ký tự"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fullName">Họ tên *</Label>
        <Input id="fullName" value={form.fullName} onChange={(event) => onChange({ fullName: event.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="phone">Số điện thoại</Label>
        <Input id="phone" value={form.phone} onChange={(event) => onChange({ phone: event.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={form.email} onChange={(event) => onChange({ email: event.target.value })} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Vai trò *</Label>
        <Select id="role" value={form.role} onChange={(event) => onRoleChange(event.target.value as RoleCode)}>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="storeId">Chi nhánh *</Label>
        <Select id="storeId" value={form.storeId} onChange={(event) => onChange({ storeId: event.target.value })}>
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Trạng thái</Label>
        <Select
          id="status"
          value={form.status}
          onChange={(event) => onChange({ status: event.target.value as UserStatus })}
        >
          {(Object.keys(USER_STATUS_LABELS) as UserStatus[]).map((status) => (
            <option key={status} value={status}>
              {USER_STATUS_LABELS[status]}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="discountLimit">Hạn mức chiết khấu (%)</Label>
        <Input
          id="discountLimit"
          type="number"
          min={0}
          max={100}
          value={form.discountLimit}
          onChange={(event) => onChange({ discountLimit: Number(event.target.value) })}
        />
      </div>
    </div>
  );
}
