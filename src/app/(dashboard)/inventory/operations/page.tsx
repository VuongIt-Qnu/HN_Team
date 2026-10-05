import { OperationsModule } from '@/components/features/inventory/operations-module';

export const metadata = {
  title: 'Phiếu kho | HN Group',
};

/** Route /inventory/operations - Danh sach & lap phieu nhap/xuat/chuyen/dieu chinh. */
export default function InventoryOperationsPage() {
  return <OperationsModule />;
}
