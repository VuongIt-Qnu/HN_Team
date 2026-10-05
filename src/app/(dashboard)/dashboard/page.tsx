import { DashboardModule } from '@/components/features/dashboard/dashboard-module';

export const metadata = {
  title: 'Tổng quan | HN Group',
};

/** Route /dashboard - bang dieu khien chung cho Quan ly / Ke toan / Admin. */
export default function DashboardPage() {
  return <DashboardModule />;
}
