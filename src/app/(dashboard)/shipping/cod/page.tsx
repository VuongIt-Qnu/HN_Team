import { CodModule } from '@/components/features/shipping/cod-module';

export const metadata = {
  title: 'Kỹ thuật & Giao hàng COD | HN Group',
};

/** Route /shipping/cod - tuyen giao hang, thu ho COD va chup anh hoan thien cua NV Ky thuat. */
export default function CodPage() {
  return <CodModule />;
}
