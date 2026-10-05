import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'vietnamese'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'HN Group | Quản lý bán hàng, kho & công nợ',
  description:
    'Web App quản lý bán hàng v5.0: POS tốc độ cao, quản lý kho, sổ quỹ, công nợ và phân quyền RBAC theo vai trò.',
  icons: { icon: '/logo-hngroup.webp' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
