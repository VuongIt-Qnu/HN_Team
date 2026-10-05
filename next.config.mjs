/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Du an uu tien `npm run typecheck` (tsc) thay cho ESLint de giu "kho deps" nhe.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Cho phep import lucide-react theo named import ma khong lam phinh bundle.
    optimizePackageImports: ['lucide-react'],
  },
};

export default nextConfig;
