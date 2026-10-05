'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { usePermission } from '@/components/shared/session-context';
import { CashbookStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn, formatDateTime, formatNumber, formatVND, getErrorMessage, parseNumber } from '@/lib/utils';
import {
  CASHBOOK_CATEGORY_LABELS,
  CASHBOOK_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type CashbookCategory,
  type CashbookEntry,
  type CashbookSummary,
  type CashbookType,
} from '@/types';

type Method = CashbookEntry['method'];

const METHODS: Method[] = ['CASH', 'VIETQR', 'TRANSFER'];
const RECEIPT_TONE = 'text-[hsl(142_72%_32%)]';
const CATEGORIES: Record<CashbookType, CashbookCategory[]> = {
  RECEIPT: ['SALE', 'DEBT_COLLECT', 'OTHER_INCOME'],
  PAYMENT: ['SUPPLIER_PAYMENT', 'SALARY', 'REFUND', 'OTHER_EXPENSE'],
};

interface CashbookResponse { items: CashbookEntry[]; total: number; summary: CashbookSummary }

interface EntryForm {
  type: CashbookType;
  category: CashbookCategory;
  amount: number;
  method: Method;
  partnerName: string;
  refCode: string;
  description: string;
}

const EMPTY_FORM: EntryForm = { type: 'RECEIPT', category: 'SALE', amount: 0, method: 'CASH', partnerName: '', refCode: '', description: '' };

/** O nhap co nhan nho gon (dung cho thanh bo loc va form). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

/** Man hinh So quy: the so du, bo loc, bang phieu thu/chi va Dialog lap phieu. */
export function CashbookModule() {
  const canManage = usePermission('MANAGE_CASHBOOK');
  const queryClient = useQueryClient();

  const [type, setType] = useState<CashbookType | ''>('');
  const [method, setMethod] = useState<Method | ''>('');
  const [keyword, setKeyword] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['cashbook', { type, method, keyword, from, to }],
    queryFn: () =>
      apiGet<CashbookResponse>('/api/finance/cashbook', {
        type: type || undefined, method: method || undefined, q: keyword || undefined,
        from: from || undefined, to: to ? `${to}T23:59:59` : undefined,
      }),
  });

  function closeDialog() {
    setOpen(false);
    setForm(EMPTY_FORM);
  }

  const createEntry = useMutation({
    mutationFn: (payload: EntryForm) =>
      apiPost<{ message: string }>('/api/finance/cashbook', {
        ...payload,
        amount: Math.round(payload.amount),
        partnerName: payload.partnerName.trim() || undefined,
        refCode: payload.refCode.trim() || undefined,
        description: payload.description.trim(),
      }),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['cashbook'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(result.message);
      closeDialog();
    },
    onError: (mutationError) => toast.error('Không thể lập phiếu', getErrorMessage(mutationError)),
  });

  const items = data?.items ?? [];
  const summary = data?.summary;
  const cards: Array<{ label: string; value?: number; tone?: string }> = [
    { label: 'Số dư đầu kỳ', value: summary?.openingBalance },
    { label: 'Tổng thu', value: summary?.totalReceipt, tone: RECEIPT_TONE },
    { label: 'Tổng chi', value: summary?.totalPayment, tone: 'text-destructive' },
    { label: 'Tồn quỹ hiện tại', value: summary?.closingBalance, tone: 'text-primary' },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Sổ quỹ" description="Phiếu thu / phiếu chi và số dư quỹ theo chi nhánh." actions={canManage ? <Button onClick={() => setOpen(true)}>+ Tạo mới</Button> : undefined} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
            <CardContent className={cn('text-lg font-semibold', card.tone)}>{formatVND(card.value)}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-5">
          <Field label="Loại phiếu">
            <Select value={type} onChange={(event) => setType(event.target.value as CashbookType | '')}>
              <option value="">Tất cả</option>
              {(['RECEIPT', 'PAYMENT'] as CashbookType[]).map((item) => (<option key={item} value={item}>{CASHBOOK_TYPE_LABELS[item]}</option>))}
            </Select>
          </Field>
          <Field label="Phương thức">
            <Select value={method} onChange={(event) => setMethod(event.target.value as Method | '')}>
              <option value="">Tất cả</option>
              {METHODS.map((item) => (<option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>))}
            </Select>
          </Field>
          <Field label="Từ ngày"><Input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="Đến ngày"><Input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
          <Field label="Tìm kiếm"><Input placeholder="Mã phiếu, đối tác, diễn giải..." value={keyword} onChange={(event) => setKeyword(event.target.value)} /></Field>
        </CardContent>
      </Card>
      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} cols={9} />
        ) : isError ? (
          <p className="p-4 text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <EmptyState className="border-0" onAction={canManage ? () => setOpen(true) : undefined} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead><TableHead>Loại</TableHead><TableHead>Danh mục</TableHead>
                <TableHead>Đối tác</TableHead><TableHead>Mã tham chiếu</TableHead><TableHead className="text-right">Số tiền</TableHead>
                <TableHead>Người lập</TableHead><TableHead>Thời gian</TableHead><TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.code}</TableCell>
                  <TableCell className={cn('font-medium', entry.type === 'RECEIPT' ? RECEIPT_TONE : 'text-destructive')}>{CASHBOOK_TYPE_LABELS[entry.type]}</TableCell>
                  <TableCell>{CASHBOOK_CATEGORY_LABELS[entry.category]}</TableCell>
                  <TableCell>{entry.partnerName ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{entry.refCode ?? '—'}</TableCell>
                  <TableCell className={cn('text-right font-semibold', entry.type === 'RECEIPT' ? RECEIPT_TONE : 'text-destructive')}>
                    {entry.type === 'RECEIPT' ? '+' : '-'}{formatVND(entry.amount)}
                  </TableCell>
                  <TableCell>{entry.createdByName}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
                  <TableCell><CashbookStatusBadge status={entry.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Lập phiếu thu / chi</DialogTitle></DialogHeader>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); createEntry.mutate(form); }}>
            <Field label="Loại phiếu">
              <Select value={form.type} onChange={(event) => { const nextType = event.target.value as CashbookType; setForm((prev) => ({ ...prev, type: nextType, category: CATEGORIES[nextType][0] })); }}>
                {(['RECEIPT', 'PAYMENT'] as CashbookType[]).map((item) => (<option key={item} value={item}>{CASHBOOK_TYPE_LABELS[item]}</option>))}
              </Select>
            </Field>
            <Field label="Danh mục">
              <Select value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as CashbookCategory }))}>
                {CATEGORIES[form.type].map((item) => (<option key={item} value={item}>{CASHBOOK_CATEGORY_LABELS[item]}</option>))}
              </Select>
            </Field>
            <Field label="Số tiền (VNĐ)">
              <Input inputMode="numeric" className="text-right font-semibold" placeholder="0" value={formatNumber(form.amount)} onChange={(event) => setForm((prev) => ({ ...prev, amount: parseNumber(event.target.value) }))} />
            </Field>
            <Field label="Phương thức">
              <Select value={form.method} onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value as Method }))}>
                {METHODS.map((item) => (<option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>))}
              </Select>
            </Field>
            <Field label="Đối tác"><Input placeholder="Tên khách hàng / nhà cung cấp" value={form.partnerName} onChange={(event) => setForm((prev) => ({ ...prev, partnerName: event.target.value }))} /></Field>
            <Field label="Mã tham chiếu"><Input placeholder="Mã đơn hàng / phiếu liên quan" value={form.refCode} onChange={(event) => setForm((prev) => ({ ...prev, refCode: event.target.value }))} /></Field>
            <Field label="Diễn giải"><Textarea rows={3} placeholder="Nội dung thu / chi..." value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></Field>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={closeDialog}>Huỷ</Button>
              <Button type="submit" disabled={createEntry.isPending || form.amount <= 0 || form.description.trim().length === 0}>{createEntry.isPending ? 'Đang lưu...' : 'Lưu phiếu'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
