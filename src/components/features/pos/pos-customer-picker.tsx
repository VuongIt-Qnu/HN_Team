'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiGet } from '@/lib/api-client';
import { CustomerCreateDialog } from '@/components/features/customers/customer-create-dialog';
import { POS_UNKNOWN_CUSTOMER, type OrderTab } from '@/lib/pos-types';
import { usePosStore } from '@/lib/pos-store';
import { formatVND } from '@/lib/utils';
import type { Customer } from '@/types';

interface Props {
  tab: OrderTab;
  inputRef: React.RefObject<HTMLInputElement>;
}

/** O tim khach hang (F4) + hien thi khach da chon, canh bao cong no. */
export function PosCustomerPicker({ tab, inputRef }: Props) {
  const updateTab = usePosStore((state) => state.updateTab);
  const [keyword, setKeyword] = useState('');

  const { data, isFetching } = useQuery({
    queryKey: ['pos-customers', keyword],
    queryFn: () => apiGet<{ items: Customer[] }>('/api/customers', { q: keyword, limit: 6 }),
    enabled: keyword.trim().length >= 1,
  });

  const pickCustomer = (customer: Customer | null) => {
    updateTab(tab.tabId, {
      customerId: customer?.id,
      customerName: customer ? customer.name : POS_UNKNOWN_CUSTOMER,
    });
    setKeyword('');
  };

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        <UserRound className="h-3.5 w-3.5" /> Khách hàng <span className="text-[11px] text-muted-foreground">(F4)</span>
      </Label>
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="pl-9"
          placeholder="Tìm theo tên / SĐT / mã KH"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        {isFetching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {keyword && (
        <div className="max-h-40 overflow-y-auto rounded-md border">
          {data?.items.length ? (
            data.items.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => pickCustomer(customer)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{customer.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {customer.code} · {customer.phone}
                  </span>
                </span>
                {customer.debt > 0 && <Badge variant="warning">Nợ {formatVND(customer.debt)}</Badge>}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-xs text-muted-foreground">Không tìm thấy khách hàng phù hợp.</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
        <span className="truncate">{tab.customerName}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => pickCustomer(null)}>
          Bỏ chọn
        </Button>
      </div>

      {/* Them khach hang moi ngay khi ban (gap 2 cua yeu cau) - tao xong tu dong chon vao tab. */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">Khách chưa có trong danh sách?</span>
        <CustomerCreateDialog
          defaultType="RETAIL"
          triggerLabel="Khách hàng"
          onCreated={(created) => pickCustomer(created)}
        />
      </div>
    </div>
  );
}
