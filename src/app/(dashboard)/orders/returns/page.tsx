import { ReturnsModule } from '@/components/features/orders/returns-module';

export const metadata = {
  title: 'Đổi trả hàng | HN Group',
};

/** Route /orders/returns - tra cứu hoa don va xu ly tra hang. */
export default function ReturnsPage() {
  return <ReturnsModule />;
}
