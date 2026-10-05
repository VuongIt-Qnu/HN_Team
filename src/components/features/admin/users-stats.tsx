'use client';

import { KeyRound, Lock, ShieldCheck, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { UserRecord } from '@/types';

export interface UserStats {
  total: number;
  active: number;
  locked: number;
  admins: number;
}

export function computeUserStats(users: UserRecord[]): UserStats {
  return {
    total: users.length,
    active: users.filter((user) => user.status === 'ACTIVE').length,
    locked: users.filter((user) => user.status === 'LOCKED').length,
    admins: users.filter((user) => user.role === 'ROOT_ADMIN').length,
  };
}

function StatCard({
  title,
  value,
  icon,
  tone = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'destructive';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p
            className={cn(
              'text-2xl font-bold',
              tone === 'success' && 'text-[hsl(142_72%_32%)]',
              tone === 'destructive' && 'text-destructive',
            )}
          >
            {value}
          </p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

/** Cum the thong ke tai khoan: tong, dang hoat dong, da khoa, quan tri. */
export function UsersStats({ stats }: { stats: UserStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard title="Tổng tài khoản" value={stats.total} icon={<Users className="h-4 w-4" />} />
      <StatCard
        title="Đang hoạt động"
        value={stats.active}
        icon={<ShieldCheck className="h-4 w-4" />}
        tone="success"
      />
      <StatCard title="Đã khoá" value={stats.locked} icon={<Lock className="h-4 w-4" />} tone="destructive" />
      <StatCard title="Quản trị (ROOT_ADMIN)" value={stats.admins} icon={<KeyRound className="h-4 w-4" />} />
    </div>
  );
}
