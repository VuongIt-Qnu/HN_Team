'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Barcode, Loader2, ScanLine, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiGet } from '@/lib/api-client';
import { formatNumber, formatVND, normalizeVN } from '@/lib/utils';
import type { Product } from '@/types';

interface Props {
  inputRef: React.RefObject<HTMLInputElement>;
  onPick: (product: Product) => void;
  onExactBarcode: (product: Product) => void;
}

/** O tim kiem / quet ma vach (F3) + danh sach ket qua, ho tro Enter de them nhanh. */
export function PosProductSearch({ inputRef, onPick, onExactBarcode }: Props) {
  const [keyword, setKeyword] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(keyword.trim()), 220);
    return () => clearTimeout(timer);
  }, [keyword]);

  const { data, isFetching } = useQuery({
    queryKey: ['pos-products', debounced],
    queryFn: () => apiGet<{ items: Product[] }>('/api/products', { q: debounced, limit: 12 }),
  });

  const items = data?.items ?? [];

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!keyword.trim()) return;
    const code = keyword.trim().toLowerCase();
    const scanned = items.find((product) => product.barcode.toLowerCase() === code || product.sku.toLowerCase() === code);
    const first = scanned ?? items[0];
    if (!first) return;
    if (scanned) onExactBarcode(scanned);
    else onPick(first);
    setKeyword('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <form onSubmit={handleSubmit} className="relative">
        <ScanLine className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          autoFocus
          className="h-10 pl-9 pr-24 text-sm"
          placeholder="Quét mã vạch hoặc gõ tên / mã SKU sản phẩm (F3) — Enter để thêm vào giỏ"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        {keyword && (
          <button
            type="button"
            onClick={() => {
              setKeyword('');
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-2.5 rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label="Xoá từ khoá"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {debounced.length > 0 && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-80 overflow-y-auto rounded-md border bg-popover shadow-lg">
          {isFetching && (
            <p className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tìm sản phẩm...
            </p>
          )}
          {!isFetching && items.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Không tìm thấy sản phẩm khớp từ khoá “{debounced}”.
            </p>
          )}
          {items.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => {
                onPick(product);
                setKeyword('');
                inputRef.current?.focus();
              }}
              className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{product.name}</span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Barcode className="h-3 w-3" /> {product.barcode} · {product.sku} · {product.categoryName}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold">{formatVND(product.sellPrice)}</span>
                <span
                  className={
                    product.stock <= product.minStock
                      ? 'block text-[11px] font-medium text-destructive'
                      : 'block text-[11px] text-muted-foreground'
                  }
                >
                  Tồn {formatNumber(product.stock)} {product.unit}
                </span>
              </span>
            </button>
          ))}
          {debounced.length > 0 && items.length > 0 && (
            <p className="px-3 py-1.5 text-[11px] text-muted-foreground">
              Gợi ý: {normalizeVN(items[0].name) === normalizeVN(debounced) ? 'đã khớp chính xác' : 'chọn sản phẩm để thêm vào giỏ'}
            </p>
          )}
        </div>
      )}

      {keyword.trim() === '' && (
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <Badge variant="outline">Mẹo</Badge> Quét mã vạch bằng máy quét: ký tự cuối là Enter sẽ tự thêm vào giỏ hàng
        </div>
      )}
    </div>
  );
}

export function PosQuickPicks({ onPick }: { onPick: (product: Product) => void }) {
  const { data } = useQuery({
    queryKey: ['pos-products-quick'],
    queryFn: () => apiGet<{ items: Product[] }>('/api/products', { limit: 8 }),
  });

  if (!data?.items?.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {data.items.slice(0, 8).map((product) => (
        <Button key={product.id} type="button" variant="outline" size="sm" onClick={() => onPick(product)}>
          {product.name.length > 26 ? `${product.name.slice(0, 26)}…` : product.name}
        </Button>
      ))}
    </div>
  );
}
