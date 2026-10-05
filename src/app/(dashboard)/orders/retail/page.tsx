import { RetailOrdersModule } from '@/components/features/orders/retail-orders-module';

export const metadata = {
  title: 'Đơn bán lẻ | HN Group',
};

/** Route /orders/retail - danh sach hoa don ban le. */
export default function RetailOrdersPage() {
  return <RetailOrdersModule />;
}
