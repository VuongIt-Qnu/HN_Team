'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { usePermission, useSession } from '@/components/shared/session-context';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { TableSkeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductDeactivateDialog, ProductPriceDialog } from '@/components/features/inventory/product-manage-dialog';
import { apiGet } from '@/lib/api-client';
import { formatNumber, formatVND, getErrorMessage } from '@/lib/utils';
import { PRODUCT_STATUS_LABELS, type StockItem, type Store } from '@/types';

interface StockListResponse {
  items: StockItem[];
  total: number;
  storeId: string;
  canViewCost: boolean;
}

/** Man hinh Ton kho: loc theo kho / tu khoa / hang duoi dinh muc + quan ly Trang thai kinh doanh (soft delete). */
export function StockModule() {
  const session = useSession();
  const router = useRouter();
  const canViewCostByRole = usePermission('VIEW_COST_PRICE');
  /** Doi gia ban hien tai (WAREHOUSE skill §8) - quyen EDIT_SELL_PRICE. */
  const canEditPrice = usePermission('EDIT_SELL_PRICE');
  /** Ngung kinh doanh (soft delete) + xem hang ngung kinh doanh - quyen DELETE_DATA (ADMIN). */
  const canManageProducts = usePermission('DELETE_DATA');
  const showActions = canEditPrice || canManageProducts;

  const [storeId, setStoreId] = useState(session.storeId);
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  /** Tab DANG kinh doanh / DA ngung kinh doanh (chi admin moi thay tab thu 2). */
  const [view, setView] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [priceTarget, setPriceTarget] = useState<StockItem | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StockItem | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  const catalogQuery = useQuery({
    queryKey: ['catalog'],
    queryFn: () => apiGet<{ stores: Store[] }>('/api/catalog'),
  });

  const stockQuery = useQuery({
    queryKey: ['inventory-stock', storeId, keyword, onlyLow, view],
    queryFn: () =>
      apiGet<StockListResponse>('/api/inventory/stock', {
        search: keyword,
        onlyLow,
        storeId,
        includeInactive: view === 'INACTIVE' ? 'true' : undefined,
      }),
  });

  /** Tab "Da ngung kinh doanh": API tra ca ACTIVE + INACTIVE -> loc lai lay INACTIVE. */
  const items = (stockQuery.data?.items ?? []).filter(
    (item) => view !== 'INACTIVE' || item.status === 'INACTIVE',
  );
  const stores = catalogQuery.data?.stores ?? [];
  const canViewCost = canViewCostByRole && (stockQuery.data?.canViewCost ?? false);
  const hasFilter = keyword.length > 0 || onlyLow || view === 'INACTIVE';

  const clearFilter = () => {
    setSearch('');
    setOnlyLow(false);
    setView('ACTIVE');
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Tồn kho"
        description="Bảng tồn kho theo chi nhánh — mặt hàng dưới định mức được tô đỏ."
        actions={
          <Button asChild>
            <Link href="/inventory/operations">+ Tạo mới</Link>
          </Button>
        }
      />

      <Card className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Tìm theo tên sản phẩm / mã SKU / mã vạch"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {canManageProducts && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant={view === 'ACTIVE' ? 'default' : 'outline'} onClick={() => setView('ACTIVE')}>
              Đang kinh doanh
            </Button>
            <Button size="sm" variant={view === 'INACTIVE' ? 'default' : 'outline'} onClick={() => setView('INACTIVE')}>
              Đã ngừng kinh doanh
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Checkbox id="only-low" checked={onlyLow} onCheckedChange={(checked) => setOnlyLow(checked === true)} />
          <Label htmlFor="only-low" className="cursor-pointer text-sm">
            Chỉ hiện hàng dưới định mức
          </Label>
        </div>
        <Select
          aria-label="Chọn kho"
          className="sm:w-60"
          value={storeId}
          onChange={(event) => setStoreId(event.target.value)}
        >
          {stores.map((store) => (
            <option key={store.id} value={store.id}>
              {store.name}
            </option>
          ))}
          {stores.length === 0 && <option value={session.storeId}>{session.storeName}</option>}
        </Select>
      </Card>

      {stockQuery.isLoading ? (
        <Card>
          <TableSkeleton rows={8} cols={(canViewCost ? 8 : 6) + 2} />
        </Card>
      ) : stockQuery.isError ? (
        <Card className="p-6 text-sm text-destructive">{getErrorMessage(stockQuery.error)}</Card>
      ) : items.length === 0 ? (
        <EmptyState
          title={hasFilter ? 'Không tìm thấy mặt hàng phù hợp' : undefined}
          description={
            hasFilter
              ? view === 'INACTIVE'
                ? 'Chưa có sản phẩm nào ngừng kinh doanh.'
                : 'Thử xoá từ khoá hoặc bỏ lọc hàng dưới định mức.'
              : undefined
          }
          actionLabel={view === 'INACTIVE' || !hasFilter ? undefined : 'Xoá bộ lọc'}
          onAction={hasFilter ? clearFilter : () => router.push('/inventory/operations')}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>Đơn vị</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead className="text-right">Định mức</TableHead>
                <TableHead className="text-right">Giá bán</TableHead>
                {canViewCost && <TableHead className="text-right">Giá vốn</TableHead>}
                {canViewCost && <TableHead className="text-right">Giá trị tồn</TableHead>}
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.productId}>
                  <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                  <TableCell>
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-xs text-muted-foreground">{item.categoryName}</span>
                  </TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={item.quantity <= item.minStock ? 'destructive' : 'secondary'}>
                      {formatNumber(item.quantity)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(item.minStock)}</TableCell>
                  <TableCell className="text-right">{formatVND(item.sellPrice)}</TableCell>
                  {canViewCost && <TableCell className="text-right">{formatVND(item.costPrice)}</TableCell>}
                  {canViewCost && (
                    <TableCell className="text-right font-semibold">{formatVND(item.stockValue)}</TableCell>
                  )}
                  <TableCell>
                    <Badge variant={item.status === 'ACTIVE' ? 'success' : 'outline'}>
                      {PRODUCT_STATUS_LABELS[item.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {showActions ? (
                      <div className="flex justify-end gap-1.5">
                        {canEditPrice && (
                          <Button size="sm" variant="outline" onClick={() => setPriceTarget(item)}>
                            Đổi giá
                          </Button>
                        )}
                        {canManageProducts && item.status === 'ACTIVE' && (
                          <Button size="sm" variant="destructive" onClick={() => setDeactivateTarget(item)}>
                            Ngừng KD
                          </Button>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="border-t px-3 py-2 text-xs text-muted-foreground">
            Hiển thị {formatNumber(items.length)} / {formatNumber(stockQuery.data?.total ?? items.length)} mặt hàng · Kho:{' '}
            {items[0]?.storeName ?? session.storeName}
          </p>
        </Card>
      )}

      {/* Quan ly gia ban + Ngung kinh doanh (soft delete) - theo WAREHOUSE_PRODUCT_MANAGEMENT_SKILL */}
      <ProductPriceDialog item={priceTarget} onClose={() => setPriceTarget(null)} />
      <ProductDeactivateDialog item={deactivateTarget} onClose={() => setDeactivateTarget(null)} />
    </div>
  );
}

