import { generateDocCode } from '@/lib/utils';
import type { CashbookEntry, CashbookSummary, SessionUser } from '@/types';
import { db, storeNameById } from './db';
import { OPENING_BALANCE } from './seed-finance';

/** Repository so quy (Mock). */

export interface CashbookFilter {
  type?: CashbookEntry['type'];
  status?: CashbookEntry['status'];
  method?: CashbookEntry['method'];
  storeId?: string;
  from?: string;
  to?: string;
  search?: string;
  limit?: number;
}

export function listCashbook(filter: CashbookFilter = {}): CashbookEntry[] {
  let result = [...db().cashbookEntries];
  if (filter.type) result = result.filter((e) => e.type === filter.type);
  if (filter.status) result = result.filter((e) => e.status === filter.status);
  if (filter.method) result = result.filter((e) => e.method === filter.method);
  if (filter.storeId) result = result.filter((e) => e.storeId === filter.storeId);
  if (filter.from) {
    const from = new Date(filter.from).getTime();
    result = result.filter((e) => new Date(e.createdAt).getTime() >= from);
  }
  if (filter.to) {
    const to = new Date(filter.to).getTime();
    result = result.filter((e) => new Date(e.createdAt).getTime() <= to);
  }
  if (filter.search) {
    const keyword = filter.search.trim().toLowerCase();
    result = result.filter(
      (e) =>
        e.code.toLowerCase().includes(keyword) ||
        e.description.toLowerCase().includes(keyword) ||
        (e.partnerName ?? '').toLowerCase().includes(keyword),
    );
  }
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filter.limit ? result.slice(0, filter.limit) : result;
}

export interface CreateCashbookInput {
  type: CashbookEntry['type'];
  category: CashbookEntry['category'];
  amount: number;
  method: CashbookEntry['method'];
  partnerName?: string;
  refCode?: string;
  description: string;
}

export function nextCashbookSequence(): number {
  db().counters.CB += 1;
  return db().counters.CB;
}

export function createCashbookEntry(session: SessionUser, input: CreateCashbookInput): CashbookEntry {
  if (!input.amount || input.amount <= 0) throw new Error('Số tiền trên phiếu thu/chi phải lớn hơn 0.');
  if (!input.description?.trim()) throw new Error('Vui lòng nhập diễn giải cho phiếu thu/chi.');

  const entry: CashbookEntry = {
    id: `cb_${Date.now().toString(36)}`,
    code: generateDocCode(input.type === 'RECEIPT' ? 'PT' : 'PC', nextCashbookSequence()),
    type: input.type,
    category: input.category,
    status: 'POSTED',
    amount: input.amount,
    method: input.method,
    storeId: session.storeId,
    storeName: storeNameById(session.storeId),
    partnerName: input.partnerName,
    refCode: input.refCode,
    description: input.description.trim(),
    createdBy: session.id,
    createdByName: session.fullName,
    createdAt: new Date().toISOString(),
  };

  db().cashbookEntries.unshift(entry);
  return entry;
}

export function approveCashbookEntry(id: string, session: SessionUser): CashbookEntry {
  const entry = db().cashbookEntries.find((e) => e.id === id);
  if (!entry) throw new Error('Không tìm thấy phiếu thu/chi.');
  entry.status = 'POSTED';
  entry.approvedBy = session.id;
  entry.approvedByName = session.fullName;
  return entry;
}

/** So du quy = So du dau ky + tong thu - tong chi (chi tinh phieu da hach toan). */
export function cashbookSummary(storeId?: string): CashbookSummary {
  const entries = listCashbook({ storeId }).filter((e) => e.status === 'POSTED');
  const totalReceipt = entries.filter((e) => e.type === 'RECEIPT').reduce((sum, e) => sum + e.amount, 0);
  const totalPayment = entries.filter((e) => e.type === 'PAYMENT').reduce((sum, e) => sum + e.amount, 0);
  return {
    openingBalance: OPENING_BALANCE,
    totalReceipt,
    totalPayment,
    closingBalance: OPENING_BALANCE + totalReceipt - totalPayment,
  };
}
