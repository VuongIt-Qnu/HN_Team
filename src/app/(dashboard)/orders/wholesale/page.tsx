import { WholesaleOrdersModule } from '@/components/features/orders/wholesale-orders-module';

export const metadata = {
  title: 'Báo giá & Đơn sỉ | HN Group',
};

/** Route /orders/wholesale - bao gia si can duyet + don ban buon. */
export default function WholesaleOrdersPage() {
  return <WholesaleOrdersModule />;
}
