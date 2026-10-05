import { AuditModule } from '@/components/features/inventory/audit-module';

export const metadata = {
  title: 'Kiểm kê kho | HN Group',
};

/** Route /inventory/audit - Phien kiem ke va xu ly lech kho. */
export default function InventoryAuditPage() {
  return <AuditModule />;
}
