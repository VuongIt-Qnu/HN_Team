'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { AuditStatusBadge } from '@/components/shared/status-badge';
import { usePermission, useSession } from '@/components/shared/session-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { cn, formatDateTime, formatNumber, getErrorMessage, parseNumber } from '@/lib/utils';
import type { StockAuditSession, StockItem } from '@/types';

interface AuditResponse {
  items: StockAuditSession[];
  total: number;
}

interface StockResponse {
  items: StockItem[];
}

interface DraftLine {
  key: string;
  productId: string;
  countedQty: string;
}

function newLine(): DraftLine {
  return { key: `line_${Math.random().toString(36).slice(2, 9)}`, productId: '', countedQty: '0' };
}

/** Man hinh kiem ke: xem phien, duyet dieu chinh / tu choi va lap phien moi. */
export function AuditModule() {
  const queryClient = useQueryClient();
  const canApprove = usePermission('APPROVE_STOCK');
  const [creating, setCreating] = useState(false);

  const auditQuery = useQuery({
    queryKey: ['inventory-audit'],
    queryFn: () => apiGet<AuditResponse>('/api/inventory/audit'),
  });

  const items = auditQuery.data?.items ?? [];

  /** PATCH /api/inventory/audit/[id] voi action APPROVE | REJECT. */
  const reviewAudit = useMutation({
    mutationFn: (payload: { id: string; action: 'APPROVE' | 'REJECT' }) =>
      apiPatch<{ audit: StockAuditSession; message: string }>(`/api/inventory/audit/${payload.id}`, {
        action: payload.action,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast.success(data.message);
    },
    onError: (error) => toast.error('Không xử lý được phiên kiểm kê', getErrorMessage(error)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kiểm kê kho"
        description="Phiên kiểm kê thực tế, đối chiếu tồn hệ thống và duyệt điều chỉnh lệch kho."
        actions={<Button onClick={() => setCreating(true)}>+ Tạo mới</Button>}
      />

      {auditQuery.isLoading ? (
        <Card>
          <TableSkeleton rows={6} cols={5} />
        </Card>
      ) : auditQuery.isError ? (
        <Card className="p-6 text-sm text-destructive">{getErrorMessage(auditQuery.error)}</Card>
      ) : items.length === 0 ? (
        <EmptyState onAction={() => setCreating(true)} />
      ) : (
        <div className="space-y-4">
          {items.map((audit) => (
            <Card key={audit.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle>{audit.code}</CardTitle>
                      <AuditStatusBadge status={audit.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {audit.storeName} · {audit.createdByName} · {formatDateTime(audit.createdAt)}
                    </p>
                    <p className="text-sm">
                      Tổng lệch:{' '}
                      <span
                        className={cn(
                          'font-semibold',
                          audit.totalDiffQty === 0 ? 'text-[hsl(142_72%_32%)]' : 'text-destructive',
                        )}
                      >
                        {formatNumber(audit.totalDiffQty)}
                      </span>
                    </p>
                    {audit.note && <p className="text-xs text-muted-foreground">Ghi chú: {audit.note}</p>}
                  </div>
                  {canApprove && audit.status === 'PENDING_APPROVAL' && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        disabled={reviewAudit.isPending}
                        onClick={() => reviewAudit.mutate({ id: audit.id, action: 'APPROVE' })}
                      >
                        Duyệt điều chỉnh
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewAudit.isPending}
                        onClick={() => reviewAudit.mutate({ id: audit.id, action: 'REJECT' })}
                      >
                        Từ chối
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Tên sản phẩm</TableHead>
                        <TableHead className="text-right">Tồn hệ thống</TableHead>
                        <TableHead className="text-right">Thực tế</TableHead>
                        <TableHead className="text-right">Lệch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audit.items.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-mono text-xs">{line.sku}</TableCell>
                          <TableCell>
                            {line.name} <span className="text-xs text-muted-foreground">({line.unit})</span>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(line.systemQty)}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.countedQty)}</TableCell>
                          <TableCell
                            className={cn(
                              'text-right font-semibold',
                              line.diffQty === 0 ? 'text-[hsl(142_72%_32%)]' : 'text-destructive',
                            )}
                          >
                            {line.diffQty > 0 ? `+${formatNumber(line.diffQty)}` : formatNumber(line.diffQty)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateAuditDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/** Dialog lap phien kiem ke: chon san pham, nhap so dem thuc te, gui cho quan ly duyet. */
function CreateAuditDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();

  const stockQuery = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => apiGet<StockResponse>('/api/inventory/stock'),
    enabled: open,
  });
  const stockItems = stockQuery.data?.items ?? [];

  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [note, setNote] = useState('');

  const createAudit = useMutation({
    mutationFn: () =>
      apiPost<{ audit: StockAuditSession; message: string }>('/api/inventory/audit', {
        items: lines
          .filter((line) => line.productId)
          .map((line) => ({ productId: line.productId, countedQty: Number(line.countedQty) || 0 })),
        note: note.trim() || undefined,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-audit'] });
      toast.success(data.message);
      setLines([newLine()]);
      setNote('');
      onOpenChange(false);
    },
    onError: (error) => toast.error('Không lập được phiên kiểm kê', getErrorMessage(error)),
  });

  const canSubmit = lines.some((line) => line.productId) && !createAudit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lập phiên kiểm kê</DialogTitle>
          <DialogDescription>Nhập số lượng thực tế đếm được; hệ thống tự đối chiếu tồn kho hiện tại.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
          {lines.map((line, index) => (
            <div key={line.key} className="flex items-center gap-2">
              <Select
                aria-label="Sản phẩm"
                className="flex-1"
                value={line.productId}
                onChange={(event) =>
                  setLines((prev) => prev.map((item, i) => (i === index ? { ...item, productId: event.target.value } : item)))
                }
              >
                <option value="">— Chọn sản phẩm —</option>
                {stockItems.map((item) => (
                  <option key={`${item.productId}-${item.storeId}`} value={item.productId}>
                    {item.name} ({item.sku}) — {item.storeName}: {formatNumber(item.quantity)} {item.unit}
                  </option>
                ))}
              </Select>
              <Input
                aria-label="Số lượng thực tế"
                className="w-28"
                inputMode="numeric"
                value={line.countedQty}
                onChange={(event) =>
                  setLines((prev) => prev.map((item, i) => (i === index ? { ...item, countedQty: event.target.value } : item)))
                }
              />
              <Button
                aria-label="Xoá dòng"
                disabled={lines.length === 1}
                size="icon"
                variant="ghost"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, newLine()])}>
            + Thêm dòng
          </Button>
        </div>

        <Textarea placeholder="Ghi chú (tuỳ chọn)" value={note} onChange={(event) => setNote(event.target.value)} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button disabled={!canSubmit} onClick={() => createAudit.mutate()}>
            {createAudit.isPending ? 'Đang lưu…' : 'Gửi kiểm kê'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

