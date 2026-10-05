'use client';

import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { usePermission } from '@/components/shared/session-context';
import { DebtStatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/toast';
import { apiGet, apiPost } from '@/lib/api-client';
import { cn, formatDate, formatDateTime, formatNumber, formatVND, getErrorMessage, parseNumber } from '@/lib/utils';
import {
  DEBT_PARTNER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type CashbookEntry,
  type DebtPartnerType,
  type DebtRecord,
  type DebtSummary,
} from '@/types';

type Method = CashbookEntry['method'];

const METHODS: Method[] = ['CASH', 'VIETQR', 'TRANSFER'];
const DANGER_TONE = 'text-destructive';

interface DebtsResponse { items: DebtRecord[]; total: number; summary: DebtSummary }

/** So tien con lai phai thu / phai tra cua mot phieu cong no. */
function remainingOf(debt: DebtRecord): number {
  return Math.max(debt.totalDebt - debt.paidAmount, 0);
}

/** Phieu cong no qua han (theo trang thai hoac theo ngay den han). */
function isOverdue(debt: DebtRecord): boolean {
  return debt.status === 'OVERDUE' || new Date(debt.dueDate).getTime() < Date.now();
}

/** O nhap co nhan nho gon (dung cho thanh bo loc va form). */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

/** Man hinh Cong no: the tong hop, bo loc khach/NCC, bang cong no va Dialog thu/tra no. */
export function DebtsModule() {
  const canManage = usePermission('MANAGE_DEBT');
  const queryClient = useQueryClient();

  const [partnerType, setPartnerType] = useState<DebtPartnerType>('CUSTOMER');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [target, setTarget] = useState<DebtRecord | null>(null);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<Method>('CASH');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['debts', { partnerType, onlyOverdue, keyword }],
    queryFn: () =>
      apiGet<DebtsResponse>('/api/finance/debts', {
        partnerType, onlyOverdue: onlyOverdue ? 'true' : undefined, q: keyword || undefined,
      }),
  });

  function closeDialog() {
    setTarget(null);
    setAmount(0);
  }

  function openSettle(debt: DebtRecord) {
    setTarget(debt);
    setAmount(remainingOf(debt));
    setMethod('CASH');
  }

  const settleDebt = useMutation({
    mutationFn: (payload: { debtId: string; amount: number; method: Method }) => apiPost<{ message: string }>('/api/finance/debts', payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['debts'] });
      void queryClient.invalidateQueries({ queryKey: ['cashbook'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(result.message);
      closeDialog();
    },
    onError: (mutationError) => toast.error('Không thể ghi nhận thanh toán', getErrorMessage(mutationError)),
  });

  const items = data?.items ?? [];
  const summary = data?.summary;
  const cards: Array<{ label: string; value?: number; tone?: string; hint?: string }> = [
    { label: 'Nợ khách hàng', value: summary?.totalCustomerDebt, tone: DANGER_TONE },
    { label: 'Nợ nhà cung cấp', value: summary?.totalSupplierDebt, tone: 'text-[hsl(38_92%_35%)]' },
    { label: 'Quá hạn', value: summary?.overdueAmount, tone: DANGER_TONE, hint: `${formatNumber(summary?.overdueCount ?? 0)} phiếu quá hạn` },
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Công nợ" description="Công nợ khách hàng & nhà cung cấp, theo dõi phiếu quá hạn." />
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle></CardHeader>
            <CardContent className={cn('text-lg font-semibold', card.tone)}>
              {formatVND(card.value)}
              {card.hint && <span className="ml-2 text-xs font-normal text-muted-foreground">({card.hint})</span>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          {(['CUSTOMER', 'SUPPLIER'] as DebtPartnerType[]).map((item) => (
            <Button key={item} size="sm" variant={partnerType === item ? 'default' : 'outline'} onClick={() => setPartnerType(item)}>
              {DEBT_PARTNER_TYPE_LABELS[item]}
            </Button>
          ))}
          <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
            <Checkbox checked={onlyOverdue} onCheckedChange={(value) => setOnlyOverdue(value === true)} />
            Chỉ quá hạn
          </label>
          <Input className="h-9 w-full sm:w-72" placeholder="Tìm theo tên hoặc mã đối tác..." value={keyword} onChange={(event) => setKeyword(event.target.value)} />
        </CardContent>
      </Card>
      <Card>
        {isLoading ? (
          <TableSkeleton rows={8} cols={10} />
        ) : isError ? (
          <p className="p-4 text-sm text-destructive">{getErrorMessage(error)}</p>
        ) : items.length === 0 ? (
          <EmptyState className="border-0" title="Chưa có dữ liệu" description="Không có phiếu công nợ nào khớp bộ lọc hiện tại." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đối tác</TableHead><TableHead>Tên đối tác</TableHead><TableHead>SĐT</TableHead>
                <TableHead className="text-right">Tổng nợ</TableHead><TableHead className="text-right">Đã thanh toán</TableHead>
                <TableHead className="text-right">Còn lại</TableHead><TableHead>Hạn thanh toán</TableHead>
                <TableHead>Giao dịch gần nhất</TableHead><TableHead>Trạng thái</TableHead><TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((debt) => (
                <TableRow key={debt.id}>
                  <TableCell className="font-medium">{debt.partnerCode}</TableCell>
                  <TableCell>{debt.partnerName}</TableCell>
                  <TableCell>{debt.phone || '—'}</TableCell>
                  <TableCell className="text-right">{formatVND(debt.totalDebt)}</TableCell>
                  <TableCell className="text-right">{formatVND(debt.paidAmount)}</TableCell>
                  <TableCell className={cn('text-right font-bold', DANGER_TONE)}>{formatVND(remainingOf(debt))}</TableCell>
                  <TableCell className={cn('whitespace-nowrap', isOverdue(debt) && DANGER_TONE)}>{formatDate(debt.dueDate)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(debt.lastTransactionAt)}</TableCell>
                  <TableCell><DebtStatusBadge status={debt.status} /></TableCell>
                  <TableCell className="text-right">
                    {canManage && remainingOf(debt) > 0 ? (
                      <Button size="sm" variant="outline" onClick={() => openSettle(debt)}>
                        {debt.partnerType === 'CUSTOMER' ? 'Thu nợ' : 'Trả nợ'}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
      <Dialog open={target !== null} onOpenChange={(next) => { if (!next) closeDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{target?.partnerType === 'SUPPLIER' ? 'Trả nợ nhà cung cấp' : 'Thu nợ khách hàng'}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (target) settleDebt.mutate({ debtId: target.id, amount: Math.round(amount), method }); }}>
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-semibold">{target?.partnerName}</p>
              <p className="text-muted-foreground">
                {target?.partnerCode} · Dư nợ còn lại: <span className={cn('font-semibold', DANGER_TONE)}>{formatVND(target ? remainingOf(target) : 0)}</span>
              </p>
            </div>
            <Field label="Số tiền thanh toán (VNĐ)">
              <Input inputMode="numeric" className="text-right font-semibold" placeholder="0" value={formatNumber(amount)} onChange={(event) => setAmount(parseNumber(event.target.value))} />
            </Field>
            <Field label="Phương thức">
              <Select value={method} onChange={(event) => setMethod(event.target.value as Method)}>
                {METHODS.map((item) => (<option key={item} value={item}>{PAYMENT_METHOD_LABELS[item]}</option>))}
              </Select>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Huỷ</Button>
              <Button type="submit" variant="success" disabled={settleDebt.isPending || amount <= 0 || (target ? amount > remainingOf(target) : true)}>
                {settleDebt.isPending ? 'Đang gửi...' : target?.partnerType === 'SUPPLIER' ? 'Xác nhận trả nợ' : 'Xác nhận thu nợ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
