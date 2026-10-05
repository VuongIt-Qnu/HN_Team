import { redirect } from 'next/navigation';

/** Trang goc: Middleware se dieu huong theo vai tro, day la lop bao hiem thu 2. */
export default function RootPage() {
  redirect('/dashboard');
}
