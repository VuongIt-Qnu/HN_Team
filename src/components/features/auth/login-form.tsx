'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Loader2, Lock, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/toast';
import { apiPost, HttpError } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import type { SessionUser } from '@/types';

const DEMO_PASSWORD = 'hn@123456';

/** Tai khoan mau (mock) de kiem thu phan quyen - mat khau chung: hn@123456 */
const DEMO_ACCOUNTS = [
  { username: 'root', label: 'Giám đốc / Admin', note: 'Toàn quyền hệ thống' },
  { username: 'quanly01', label: 'Quản lý cửa hàng', note: 'Duyệt đơn sỉ, phiếu kho' },
  { username: 'ketoan01', label: 'Kế toán', note: 'Sổ quỹ, công nợ, báo cáo' },
  { username: 'thukho01', label: 'Thủ kho', note: 'Phiếu kho, ẩn giá vốn' },
  { username: 'thungan01', label: 'Thu ngân POS', note: 'Khóa sửa giá, hạn mức CK 5%' },
  { username: 'kythuat01', label: 'NV Kỹ thuật', note: 'Giao hàng COD, chụp ảnh hoàn thiện' },
];

/** Form dang nhap (client): goi /api/auth/login va dieu huong theo homeRoute RBAC. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next');

  const [username, setUsername] = useState('root');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('hn-last-username');
    if (saved) setUsername(saved);
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await apiPost<{ user: SessionUser; homeRoute: string }>('/api/auth/login', {
        username,
        password,
      });
      window.localStorage.setItem('hn-last-username', username);
      toast.success(`Xin chào ${data.user.fullName}!`, `Vai trò: ${data.user.role}`);
      const target = nextUrl && nextUrl.startsWith('/') ? nextUrl : data.homeRoute;
      router.replace(target);
      router.refresh();
    } catch (error) {
      const message = error instanceof HttpError ? error.message : getErrorMessage(error);
      toast.error('Đăng nhập thất bại', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5 text-primary" /> Đăng nhập hệ thống
          </CardTitle>
          <CardDescription>Sử dụng tài khoản nội bộ do Giám đốc/Admin cấp tại /admin/users</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Tên đăng nhập</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  autoFocus
                  className="pl-9"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="vd: thungan01"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Mật khẩu tài khoản mẫu: <span className="font-mono font-semibold text-foreground">{DEMO_PASSWORD}</span>
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tài khoản mẫu để kiểm thử RBAC</CardTitle>
          <CardDescription>Bấm để điền nhanh, sau đó bấm Đăng nhập</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {DEMO_ACCOUNTS.map((account, index) => (
            <div key={account.username}>
              {index > 0 && <Separator className="my-2" />}
              <button
                type="button"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(DEMO_PASSWORD);
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-muted"
              >
                <span>
                  <span className="block text-sm font-medium">{account.label}</span>
                  <span className="block font-mono text-xs text-muted-foreground">{account.username}</span>
                </span>
                <span className="text-right text-[11px] text-muted-foreground">{account.note}</span>
              </button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
