import { CashbookModule } from '@/components/features/finance/cashbook-module';

export const metadata = {
  title: 'Sổ quỹ | HN Group',
};

/** Route /finance/cashbook - so quy (phieu thu / phieu chi) va so du quy. */
export default function CashbookPage() {
  return <CashbookModule />;
}
