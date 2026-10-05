import { StockModule } from '@/components/features/inventory/stock-module';

export const metadata = {
  title: 'Tồn kho | HN Group',
};

/** Route /inventory/stock - Bang ton kho theo chi nhanh. */
export default function InventoryStockPage() {
  return <StockModule />;
}
