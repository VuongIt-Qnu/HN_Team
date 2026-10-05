import { generateDocCode } from '@/lib/utils';
import type { CashbookEntry, DebtRecord, DebtSummary, SessionUser } from '@/types';
import { db, storeNameById } from './db';
import { nextCashbookSequence } from './repo-cashbook';

/** Repository cong no (Mock). */

export interface DebtFilter {
  partnerType?: DebtRecord['partnerType'];
  status?: DebtRecord['status'];
  search?: string;
  onlyOverdue?: boolean;
}

export function listDebts(filter: DebtFilter = {}): DebtRecord[] {
  let result = [...db().debts];
  if (filter.partnerType) result = result.filter((d) => d.partnerType === filter.partnerType);
  if (filter.status) result = result.filter((d) => d.status === filter.status);
  if (filter.onlyOverdue) {
    result = result.filter((d) => d.status === 'OVERDUE' || new Date(d.dueDate).getTime() < Date.now());
  }
  if (filter.search) {
    const keyword = filter.search.trim().toLowerCase();
    result = result.filter(
      (d) => d.partnerName.toLowerCase().includes(keyword) || d.partnerCode.toLowerCase().includes(keyword),
    );
  }
  return result.sort((a, b) => b.totalDebt - b.paidAmount - (a.totalDebt - a.paidAmount));
}

export function debtSummary(): DebtSummary {
  const debts = listDebts();
  const customers = debts.filter((d) => d.partnerType === 'CUSTOMER');
  const suppliers = debts.filter((d) => d.partnerType === 'SUPPLIER');
  const overdue = debts.filter((d) => d.status === 'OVERDUE' || new Date(d.dueDate).getTime() < Date.now());
  return {
    totalCustomerDebt: customers.reduce((sum, d) => sum + Math.max(d.totalDebt - d.paidAmount, 0), 0),
    totalSupplierDebt: suppliers.reduce((sum, d) => sum + Math.max(d.totalDebt - d.paidAmount, 0), 0),
    overdueAmount: overdue.reduce((sum, d) => sum + Math.max(d.totalDebt - d.paidAmount, 0), 0),
    overdueCount: overdue.length,
  };
}

/** Ghi nhan thanh toan cong no (thu tien khach / tra tien NCC) + sinh phieu so quy. */
export function settleDebt(
  session: SessionUser,
  input: { debtId: string; amount: number; method: CashbookEntry['method'] },
): DebtRecord {
  const debt = db().debts.find((d) => d.id === input.debtId);
  if (!debt) throw new Error('Không tìm thấy phiếu công nợ.');
  if (!input.amount || input.amount <= 0) throw new Error('Số tiền thanh toán phải lớn hơn 0.');

  const remaining = Math.max(debt.totalDebt - debt.paidAmount, 0);
  if (input.amount > remaining) {
    throw new Error(`Số tiền vượt quá dư nợ còn lại (${remaining.toLocaleString('vi-VN')}đ).`);
  }

  debt.paidAmount += input.amount;
  debt.lastTransactionAt = new Date().toISOString();
  const left = debt.totalDebt - debt.paidAmount;
  debt.status = left === 0 ? 'PAID' : new Date(debt.dueDate).getTime() < Date.now() ? 'OVERDUE' : 'PARTIAL';

  const isCustomer = debt.partnerType === 'CUSTOMER';
  db().cashbookEntries.unshift({
    id: `cb_${Date.now().toString(36)}`,
    code: generateDocCode(isCustomer ? 'PT' : 'PC', nextCashbookSequence()),
    type: isCustomer ? 'RECEIPT' : 'PAYMENT',
    category: isCustomer ? 'DEBT_COLLECT' : 'SUPPLIER_PAYMENT',
    status: 'POSTED',
    amount: input.amount,
    method: input.method,
    storeId: session.storeId,
    storeName: storeNameById(session.storeId),
    partnerName: debt.partnerName,
    refCode: debt.partnerCode,
    description: isCustomer
      ? `Thu hồi công nợ của ${debt.partnerName}`
      : `Thanh toán công nợ cho ${debt.partnerName}`,
    createdBy: session.id,
    createdByName: session.fullName,
    createdAt: new Date().toISOString(),
  });

  return debt;
}
