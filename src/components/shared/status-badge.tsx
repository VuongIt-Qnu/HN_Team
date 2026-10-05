import { Badge } from '@/components/ui/badge';
import {
  CASHBOOK_STATUS_LABELS,
  DEBT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  STOCK_AUDIT_STATUS_LABELS,
  STOCK_OPERATION_STATUS_LABELS,
  type CashbookStatus,
  type DebtStatus,
  type OrderStatus,
  type StockAuditStatus,
  type StockOperationStatus,
} from '@/types';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

const ORDER_VARIANTS: Record<OrderStatus, Variant> = {
  DRAFT: 'outline',
  PENDING: 'warning',
  CONFIRMED: 'info',
  DELIVERING: 'info',
  COMPLETED: 'success',
  RETURNED: 'destructive',
  CANCELLED: 'secondary',
};

const STOCK_OP_VARIANTS: Record<StockOperationStatus, Variant> = {
  DRAFT: 'outline',
  PENDING: 'warning',
  APPROVED: 'info',
  DONE: 'success',
  CANCELLED: 'secondary',
};

const AUDIT_VARIANTS: Record<StockAuditStatus, Variant> = {
  COUNTING: 'outline',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'success',
  REJECTED: 'destructive',
};

const CASHBOOK_VARIANTS: Record<CashbookStatus, Variant> = {
  POSTED: 'success',
  WAITING_APPROVAL: 'warning',
  REJECTED: 'destructive',
};

const DEBT_VARIANTS: Record<DebtStatus, Variant> = {
  OPEN: 'warning',
  PARTIAL: 'info',
  PAID: 'success',
  OVERDUE: 'destructive',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_VARIANTS[status]}>{ORDER_STATUS_LABELS[status]}</Badge>;
}

export function StockOperationStatusBadge({ status }: { status: StockOperationStatus }) {
  return <Badge variant={STOCK_OP_VARIANTS[status]}>{STOCK_OPERATION_STATUS_LABELS[status]}</Badge>;
}

export function AuditStatusBadge({ status }: { status: StockAuditStatus }) {
  return <Badge variant={AUDIT_VARIANTS[status]}>{STOCK_AUDIT_STATUS_LABELS[status]}</Badge>;
}

export function CashbookStatusBadge({ status }: { status: CashbookStatus }) {
  return <Badge variant={CASHBOOK_VARIANTS[status]}>{CASHBOOK_STATUS_LABELS[status]}</Badge>;
}

export function DebtStatusBadge({ status }: { status: DebtStatus }) {
  return <Badge variant={DEBT_VARIANTS[status]}>{DEBT_STATUS_LABELS[status]}</Badge>;
}
