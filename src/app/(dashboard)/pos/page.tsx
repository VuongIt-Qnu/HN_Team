import { PosTerminal } from '@/components/features/pos/pos-terminal';

export const metadata = {
  title: 'Bán hàng POS | HN Group',
};

/** Route /pos - man hinh thu ngan (Fullscreen, khong Sidebar/Topbar). */
export default function PosPage() {
  return <PosTerminal />;
}
