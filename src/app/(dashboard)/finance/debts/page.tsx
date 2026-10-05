import { DebtsModule } from '@/components/features/finance/debts-module';

export const metadata = {
  title: 'Công nợ | HN Group',
};

/** Route /finance/debts - cong no khach hang & nha cung cap. */
export default function DebtsPage() {
  return <DebtsModule />;
}
