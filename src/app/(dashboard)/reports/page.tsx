import { ReportsModule } from '@/components/features/finance/reports-module';

export const metadata = {
  title: 'Báo cáo | HN Group',
};

/** Route /reports - bao cao doanh thu, loi nhuan, hang ban chay. */
export default function ReportsPage() {
  return <ReportsModule />;
}
