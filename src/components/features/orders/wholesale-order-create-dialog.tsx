'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ScanLine, Search, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/shared/empty-state';
import { usePermission, useSession } from '@/components/shared/session-context';
import { CustomerCreateDialog } from '@/components/features/customers/customer-create-dialog';
import { apiGet, apiPost } from '@/lib/api-client';
import { formatNumber, formatVND, getErrorMessage, parseNumber } from '@/lib/utils';
import type { Customer, Order, Product } from '@/types';

/** Dong hang cua phieu bao gia / don si (giu tren client truoc khi luu). */
interface QuoteLine {
  productId: string;
  sku: string;
  name: string;
  unit: string;
  /** Gia niem yet - dung de phat hien viec da sua gia. */
  basePrice: number;
  unitPrice: number;
  quantity: number;
  discount: number;
  stock: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Goi sau khi tao thanh cong (module co the chon phieu moi vao danh sach). */
  onCreated?: (order: Order) => void;
}

/**
 * Form "Tao bao gia / Don ban si" (kenh WHOLESALE) tren man hinh /orders/wholesale.
 * - 2 cach luu: DRAFT (nhap) & PENDING (gui duyet) - CHUA tru kho, CHUA ghi so quy
 *   (xem repo-pos.ts); hieu ung chi chay khi phieu chuyen COMPLETED sau duyet.
 * - Bat buoc chach khach hang da dinh danh; ho tro tao khach hang moi ngay trong form.
 */
export function WholesaleOrderCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const user = useSession();
  const canEditPrice = usePermission('EDIT_SELL_PRICE');
  const canOverDiscount = usePermission('DISCOUNT_OVER_LIMIT');
  const queryClient = useQueryClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerKeyword, setCustomerKeyword] = useState('');
  const [productKeyword, setProductKeyword] = useState('');
  const [debounced, setDebounced] = useState('');
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [note, setNote] = useState('');

  /** Debounce tu khoa tim hang (220ms) - giong man hinh POS. */
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(productKeyword.trim()), 220);
    return () => clearTimeout(timer);
  }, [productKeyword]);

  /** Mo lai form = form moi toan bo (khong keo du lieu cua lan tao truoc). */
  useEffect(() => {
    if (open) {
      setCustomerKeyword('');
      setProductKeyword('');
      setDebounced('');
      setLines([]);
      setOrderDiscount(0);
      setNote('');
    }
  }, [open]);

  /** Tim khach hang - dung chung queryKey voi POS de invalidate lien tuc. */
  const { data: customerData, isFetching: searchingCustomer } = useQuery({
    queryKey: ['pos-customers', customerKeyword],
    queryFn: () => apiGet<{ items: Customer[] }>('/api/customers', { q: customerKeyword, limit: 6 }),
    enabled: customerKeyword.trim().length >= 1,
  });

  /** Tim san pham - dung chung queryKey voi POS. */
  const { data: productData, isFetching: searchingProduct } = useQuery({
    queryKey: ['pos-products', debounced],
    queryFn: () => apiGet<{ items: Product[] }>('/api/products', { q: debounced, limit: 10 }),
    enabled: debounced.length >= 1,
  });
  const productHits = productData?.items ?? [];

  /** Them san pham vao dong (da co thi tang SL) - giong addProduct cua POS. */
  const addProduct = (product: Product) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === product.id);
      if (existing) {
        return prev.map((line) =>
          line.productId === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          unit: product.unit,
          basePrice: product.sellPrice,
          unitPrice: product.sellPrice,
          quantity: 1,
          discount: 0,
          stock: product.stock,
        },
      ];
    });
    setProductKeyword('');
    setDebounced('');
  };

  /** Cap nhat 1 dong; SL ve 0 thi xoa dong (khong cho SL am). */
  const updateLine = (productId: string, patch: Partial<QuoteLine>) =>
    setLines((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, ...patch } : line))
        .filter((line) => line.quantity > 0),
    );

  const removeLine = (productId: string) =>
    setLines((prev) => prev.filter((line) => line.productId !== productId));

  const handlePickFirst = (event: React.FormEvent) => {
    event.preventDefault();
    const first = productHits[0];
    if (first) addProduct(first);
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    const lineDiscount = lines.reduce((sum, line) => sum + line.discount, 0);
    const totalDiscount = lineDiscount + orderDiscount;
    const total = Math.max(subtotal - totalDiscount, 0);
    return {
      subtotal,
      lineDiscount,
      totalDiscount,
      total,
      discountPercent: subtotal > 0 ? (totalDiscount / subtotal) * 100 : 0,
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }, [lines, orderDiscount]);

  const overLimit = totals.discountPercent > user.discountLimit && !canOverDiscount;

  /** Tao bao gia / don si (POST /api/orders, channel WHOLESALE). */
  const createQuote = useMutation({
    mutationFn: (status: 'DRAFT' | 'PENDING') => {
      if (!customer) throw new Error('Chưa chọn khách hàng.');
      return apiPost<{ order: Order }>('/api/orders', {
        channel: 'WHOLESALE',
        status,
        customerId: customer.id,
        paymentMethod: 'TRANSFER',
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
        })),
        discount: orderDiscount,
        paidAmount: 0,
        note: note.trim() || undefined,
      });
    },
    onSuccess: (data) => {
      toast.success(
        data.order.status === 'DRAFT'
          ? `Đã lưu nháp ${data.order.code}`
          : `Đã gửi duyệt ${data.order.code}`,
        `${data.order.customerName} · Tổng tiền ${formatVND(data.order.total)}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      onOpenChange(false);
      onCreated?.(data.order);
    },
    onError: (error) => toast.error('Không tạo được báo giá / đơn sỉ', getErrorMessage(error)),
  });

  const canSave = Boolean(customer) && lines.length > 0 && !createQuote.isPending;
  const blockHint = !customer
    ? 'Chưa chọn khách hàng — tìm khách có sẵn hoặc bấm [+ Khách hàng].'
    : lines.length === 0
      ? 'Chưa có dòng hàng — tìm sản phẩm ở cột Thêm sản phẩm.'
      : overLimit
        ? `Chiết khấu ${totals.discountPercent.toFixed(1)}% vượt hạn mức ${user.discountLimit}% — server sẽ từ chối nếu thiếu quyền.`
        : '';

  return (
    <Dialog open={open} onOpenChange={(next) => !createQuote.isPending && onOpenChange(next)}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Tạo báo giá / Đơn bán sỉ</DialogTitle>
          <DialogDescription>
            Lưu nháp hoặc gửi duyệt — phiếu chưa trừ kho, chưa ghi sổ quỹ cho tới khi được duyệt và
            hoàn tất.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Cot trai: khach hang + ghi chu */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>
                Khách hàng sỉ <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Tìm theo tên / SĐT / mã KH"
                  value={customerKeyword}
                  onChange={(event) => setCustomerKeyword(event.target.value)}
                />
                {searchingCustomer && (
                  <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {customerKeyword && (
                <div className="max-h-36 overflow-y-auto rounded-md border">
                  {customerData?.items.length ? (
                    customerData.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setCustomer(item);
                          setCustomerKeyword('');
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.name}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            {item.code} · {item.phone}
                          </span>
                        </span>
                        {item.debt > 0 && <Badge variant="warning">Nợ {formatVND(item.debt)}</Badge>}
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-muted-foreground">
                      Không tìm thấy — bấm [+ Khách hàng] để tạo mới.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {customer
                  ? `${customer.code} · ${customer.name} · ${customer.phone}`
                  : 'Chưa chọn khách hàng'}
              </span>
              {customer && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                  Bỏ chọn
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Khách mới chưa có trong danh sách?</span>
              <CustomerCreateDialog
                defaultType="WHOLESALE"
                triggerLabel="+ Khách hàng"
                onCreated={(created) => {
                  setCustomer(created);
                  setCustomerKeyword('');
                }}
              />
            </div>

            <div className="space-y-1">
              <Label>Ghi chú phiếu</Label>
              <Textarea
                placeholder="vd: Báo giá sỉ tháng 10, giao trong 2 ngày, công nợ 30 ngày"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          {/* Cot phai: tim & them san pham */}
          <div className="space-y-1">
            <Label>Thêm sản phẩm</Label>
            <form onSubmit={handlePickFirst} className="relative">
              <ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                placeholder="Gõ tên / mã SKU / barcode — Enter để thêm"
                value={productKeyword}
                onChange={(event) => setProductKeyword(event.target.value)}
              />
            </form>
            {debounced.length > 0 && (
              <div className="max-h-56 overflow-y-auto rounded-md border">
                {searchingProduct && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">Đang tìm sản phẩm...</p>
                )}
                {!searchingProduct && productHits.length === 0 && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    Không tìm thấy sản phẩm khớp “{debounced}”.
                  </p>
                )}
                {productHits.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addProduct(product)}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {product.sku} · Tồn {formatNumber(product.stock)} {product.unit}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold">{formatVND(product.sellPrice)}</span>
                  </button>
                ))}
              </div>
            )}
            {debounced.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Gõ từ khoá để tìm — Enter thêm ngay kết quả đầu tiên.
              </p>
            )}
          </div>
        </div>

        {/* Bang dong hang */}
        <div className="rounded-md border">
          {lines.length === 0 ? (
            <EmptyState
              className="border-0 py-8"
              title="Chưa có dòng hàng"
              description="Tìm sản phẩm ở ô “Thêm sản phẩm” để đưa vào báo giá."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mặt hàng</TableHead>
                    <TableHead className="text-right">SL</TableHead>
                    <TableHead className="text-right">Đơn giá</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Chiết khấu dòng</TableHead>
                    <TableHead className="text-right">Thành tiền</TableHead>
                    <TableHead className="w-10">
                      <span className="sr-only">Xoá</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow key={line.productId}>
                      <TableCell>
                        <span className="block font-medium">{line.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {line.sku} · {line.unit}
                          {line.unitPrice !== line.basePrice && ' · đã sửa giá'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          className="h-8 w-16 text-right"
                          value={line.quantity}
                          onChange={(event) =>
                            updateLine(line.productId, {
                              quantity: Math.max(0, Number.parseInt(event.target.value, 10) || 0),
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {canEditPrice ? (
                          <Input
                            className="h-8 w-28 text-right"
                            value={formatNumber(line.unitPrice)}
                            onChange={(event) =>
                              updateLine(line.productId, { unitPrice: parseNumber(event.target.value) })
                            }
                          />
                        ) : (
                          <span className="block text-right tabular-nums">{formatVND(line.unitPrice)}</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Input
                          className="h-8 w-24 text-right"
                          value={formatNumber(line.discount)}
                          onChange={(event) =>
                            updateLine(line.productId, { discount: parseNumber(event.target.value) })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatVND(line.unitPrice * line.quantity - line.discount)}
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => removeLine(line.productId)}
                          aria-label={`Xoá ${line.name}`}
                          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Tong ket */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="text-sm text-muted-foreground">
            <p>
              {lines.length} dòng · {totals.quantity} sản phẩm
            </p>
            {totals.lineDiscount > 0 && <p>Chiết khấu dòng: -{formatVND(totals.lineDiscount)}</p>}
          </div>
          <div className="w-full space-y-1 md:w-72">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="font-medium">{formatVND(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-sm">
              <Label htmlFor="wholesale-order-discount" className="text-muted-foreground">
                Chiết khấu đơn
              </Label>
              <Input
                id="wholesale-order-discount"
                className="h-8 w-32 text-right"
                value={formatNumber(orderDiscount)}
                onChange={(event) => setOrderDiscount(parseNumber(event.target.value))}
              />
            </div>
            {overLimit && (
              <p className="rounded bg-destructive/10 px-2 py-1 text-[11px] text-destructive">
                Chiết khấu {totals.discountPercent.toFixed(1)}% vượt hạn mức {user.discountLimit}% — cần
                quyền “Chiết khấu vượt hạn mức”.
              </p>
            )}
            <div className="flex items-center justify-between border-t pt-1 text-lg font-bold">
              <span>Tổng cộng</span>
              <span className="text-primary">{formatVND(totals.total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {blockHint && (
            <p className="mr-auto max-w-md text-xs leading-snug text-muted-foreground">{blockHint}</p>
          )}
          <Button type="button" variant="outline" disabled={createQuote.isPending} onClick={() => onOpenChange(false)}>
            Huỷ
          </Button>
          <Button type="button" variant="secondary" disabled={!canSave} onClick={() => createQuote.mutate('DRAFT')}>
            Lưu nháp
          </Button>
          <Button type="button" disabled={!canSave} onClick={() => createQuote.mutate('PENDING')}>
            {createQuote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu &amp; gửi duyệt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
