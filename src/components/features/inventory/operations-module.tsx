'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { StockOperationStatusBadge } from '@/components/shared/status-badge';
import { usePermission, useSession } from '@/components/shared/session-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { apiGet, apiPatch, apiPost } from '@/lib/api-client';
import { formatDateTime, formatNumber, formatVND, getErrorMessage, parseNumber } from '@/lib/utils';
import {
  STOCK_OPERATION_LABELS,
  STOCK_OPERATION_STATUS_LABELS,
  type CreateStockOperationInput,
  type StockItem,
  type StockOperation,
  type StockOperationStatus,
  type StockOperationType,
  type Store,
  type Supplier,
} from '@/types';

const TYPE_OPTIONS = Object.entries(STOCK_OPERATION_LABELS) as Array<[StockOperationType, string]>;
const STATUS_OPTIONS = Object.entries(STOCK_OPERATION_STATUS_LABELS) as Array<[StockOperationStatus, string]>;

interface OperationsResponse {
  items: StockOperation[];
  total: number;
}

interface StockResponse {
  items: StockItem[];
}

interface CatalogResponse {
  stores: Store[];
  suppliers: Supplier[];
}

interface DraftLine {
  key: string;
  productId: string;
  quantity: string;
  costPrice: string;
}

function newLine(): DraftLine {
  return { key: `line_${Math.random().toString(36).slice(2, 9)}`, productId: '', quantity: '1', costPrice: '' };
}

/** Cac hanh dong doi trang thai phieu kho (chi hien khi co quyen APPROVE_STOCK). */
const STATUS_ACTIONS: Array<{
  label: string;
  next: StockOperationStatus;
  variant: 'default' | 'success' | 'outline';
  from: StockOperationStatus[];
}> = [
  { label: 'Duyệt', next: 'APPROVED', variant: 'default', from: ['PENDING'] },
  { label: 'Thực hiện', next: 'DONE', variant: 'success', from: ['APPROVED'] },
  { label: 'Hủy', next: 'CANCELLED', variant: 'outline', from: ['DRAFT', 'PENDING', 'APPROVED'] },
];

/** Man hinh phieu kho: loc, duyet / thuc thi / huy va lap phieu moi. */
export function OperationsModule() {
  const queryClient = useQueryClient();
  const canApprove = usePermission('APPROVE_STOCK');
  const canViewCost = usePermission('VIEW_COST_PRICE');

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const operationsQuery = useQuery({
    queryKey: ['inventory-operations', type, status, keyword],
    queryFn: () => apiGet<OperationsResponse>('/api/inventory/operations', { type, status, q: keyword }),
  });

  const items = operationsQuery.data?.items ?? [];
  const hasFilter = type.length > 0 || status.length > 0 || keyword.length > 0;

  /** PATCH /api/inventory/operations/[id] roi lam moi danh sach + bao toast. */
  const updateStatus = useMutation({
    mutationFn: (payload: { id: string; status: StockOperationStatus }) =>
      apiPatch<{ operation: StockOperation; message: string }>(`/api/inventory/operations/${payload.id}`, {
        status: payload.status,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast.success(data.message);
    },
    onError: (error) => toast.error('Không cập nhật được phiếu kho', getErrorMessage(error)),
  });

  const renderActions = (operation: StockOperation) => {
    const allowed = STATUS_ACTIONS.filter((action) => action.from.includes(operation.status));
    if (!canApprove || allowed.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex justify-end gap-1.5">
        {allowed.map((action) => (
          <Button
            key={action.next}
            size="sm"
            variant={action.variant}
            disabled={updateStatus.isPending}
            onClick={() => updateStatus.mutate({ id: operation.id, status: action.next })}
          >
            {action.label}
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Phiếu kho"
        description="Lập và duyệt phiếu Nhập / Xuất / Chuyển / Điều chỉnh tồn kho."
        actions={<Button onClick={() => setCreating(true)}>+ Tạo mới</Button>}
      />

      <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo mã phiếu / nhà cung cấp / tên hàng"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select aria-label="Loại phiếu" className="lg:w-56" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">Tất cả loại phiếu</option>
          {TYPE_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select aria-label="Trạng thái" className="lg:w-44" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Card>

      {operationsQuery.isLoading ? (
        <Card>
          <TableSkeleton rows={7} cols={canViewCost ? 10 : 9} />
        </Card>
      ) : operationsQuery.isError ? (
        <Card className="p-6 text-sm text-destructive">{getErrorMessage(operationsQuery.error)}</Card>
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilter ? 'Không tìm thấy phiếu kho phù hợp' : undefined}
          description={hasFilter ? 'Thử đổi bộ lọc loại phiếu hoặc trạng thái.' : undefined}
          actionLabel={hasFilter ? 'Xoá bộ lọc' : undefined}
          onAction={
            hasFilter
              ? () => {
                  setType('');
                  setStatus('');
                  setSearch('');
                }
              : () => setCreating(true)
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã phiếu</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Kho</TableHead>
                <TableHead>Nhà cung cấp</TableHead>
                <TableHead className="text-right">Tổng SL</TableHead>
                {canViewCost && <TableHead className="text-right">Tổng giá trị</TableHead>}
                <TableHead>Người lập</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((operation) => (
                <TableRow key={operation.id}>
                  <TableCell>
                    <span className="block font-medium">{operation.code}</span>
                    {operation.reason && (
                      <span className="block max-w-[240px] truncate text-xs text-muted-foreground">{operation.reason}</span>
                    )}
                  </TableCell>
                  <TableCell>{STOCK_OPERATION_LABELS[operation.type]}</TableCell>
                  <TableCell>
                    {operation.type === 'TRANSFER' && operation.toStoreName
                      ? `${operation.storeName} → ${operation.toStoreName}`
                      : operation.storeName}
                  </TableCell>
                  <TableCell>{operation.supplierName ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatNumber(operation.totalQuantity)}</TableCell>
                  {canViewCost && <TableCell className="text-right">{formatVND(operation.totalValue)}</TableCell>}
                  <TableCell>{operation.createdByName}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(operation.createdAt)}</TableCell>
                  <TableCell>
                    <StockOperationStatusBadge status={operation.status} />
                  </TableCell>
                  <TableCell className="text-right">{renderActions(operation)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Hiển thị {formatNumber(items.length)} / {formatNumber(operationsQuery.data?.total ?? items.length)} phiếu kho
          </p>
        </Card>
      )}

      <CreateOperationDialog open={creating} onOpenChange={setCreating} canViewCost={canViewCost} />
    </div>
  );
}

/** Dialog lap phieu kho: nhap/xuat/chuyen/dieu chinh, chon dong hang va gui duyet. */
function CreateOperationDialog({
  open,
  onOpenChange,
  canViewCost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canViewCost: boolean;
}) {
  const queryClient = useQueryClient();

  const [type, setType] = useState<StockOperationType>('IMPORT');
  const [toStoreId, setToStoreId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [reason, setReason] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);

  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: () => apiGet<CatalogResponse>('/api/catalog'),
    enabled: open,
  });
  const stockQuery = useQuery({
    queryKey: ['inventory-stock'],
    queryFn: () => apiGet<StockResponse>('/api/inventory/stock'),
    enabled: open,
  });
  const stockItems = stockQuery.data?.items ?? [];
  const stores = catalogQuery.data?.stores ?? [];
  const suppliers = catalogQuery.data?.suppliers ?? [];

  const createOperation = useMutation({
    mutationFn: () =>
      apiPost<{ operation: StockOperation; message: string }>('/api/inventory/operations', {
        type,
        toStoreId: type === 'TRANSFER' ? toStoreId || undefined : undefined,
        supplierId: type === 'IMPORT' ? supplierId || undefined : undefined,
        reason: reason.trim() || undefined,
        items: lines
          .filter((line) => line.productId)
          .map((line) => ({
            productId: line.productId,
            quantity: Number(line.quantity) || 0,
            costPrice: canViewCost && line.costPrice ? Number(line.costPrice) : undefined,
          })),
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['inventory-operations'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      toast.success(data.message);
      setLines([newLine()]);
      setReason('');
      onOpenChange(false);
    },
    onError: (error) => toast.error('Không lập được phiếu kho', getErrorMessage(error)),
  });

  const canSubmit = lines.some((line) => line.productId) && (type !== 'TRANSFER' || !!toStoreId) && !createOperation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lập phiếu kho</DialogTitle>
          <DialogDescription>Phiếu sau khi lập sẽ ở trạng thái chờ duyệt của quản lý.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Loại phiếu</Label>
            <Select value={type} onChange={(event) => setType(event.target.value as StockOperationType)}>
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
          {type === 'TRANSFER' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Chuyển đến kho</Label>
              <Select value={toStoreId} onChange={(event) => setToStoreId(event.target.value)}>
                <option value="">— Chọn kho đến —</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {type === 'IMPORT' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nhà cung cấp</Label>
              <Select value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
                <option value="">— Không chọn —</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
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
                aria-label="Số lượng"
                className="w-20"
                inputMode="numeric"
                value={line.quantity}
                onChange={(event) =>
                  setLines((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: event.target.value } : item)))
                }
              />
              {canViewCost && type === 'IMPORT' && (
                <Input
                  aria-label="Đơn giá nhập"
                  className="w-28"
                  inputMode="numeric"
                  placeholder="Giá nhập"
                  value={line.costPrice}
                  onChange={(event) =>
                    setLines((prev) => prev.map((item, i) => (i === index ? { ...item, costPrice: event.target.value } : item)))
                  }
                />
              )}
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

        <Input placeholder="Lý do / diễn giải (tuỳ chọn)" value={reason} onChange={(event) => setReason(event.target.value)} />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button disabled={!canSubmit} onClick={() => createOperation.mutate()}>
            {createOperation.isPending ? 'Đang lưu…' : 'Gửi phiếu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

