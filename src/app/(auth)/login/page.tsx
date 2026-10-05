import { Suspense } from 'react';
import { LoginForm } from '@/components/features/auth/login-form';

export const metadata = {
  title: 'Đăng nhập | HN Group',
};

/** Route /login - bao Suspense cho useSearchParams() de prerender khong loi. */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
