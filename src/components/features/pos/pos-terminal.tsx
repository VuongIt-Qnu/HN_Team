'use client';

import { useRef, useState } from 'react';
import { useSession } from '@/components/shared/session-context';
import { PosCartTable } from '@/components/features/pos/pos-cart-table';
import { PosHeader } from '@/components/features/pos/pos-header';
import { PosPaymentPanel } from '@/components/features/pos/pos-payment-panel';
import { PosProductSearch, PosQuickPicks } from '@/components/features/pos/pos-product-search';
import { PosReceiptDialog } from '@/components/features/pos/pos-receipt-dialog';
import { useHotkeys } from '@/hooks/use-hotkeys';
import { usePosCheckout } from '@/hooks/use-pos-checkout';
import { POS_HOTKEYS } from '@/lib/constants';
import { computeTabTotals } from '@/lib/pos-types';
import { usePosStore } from '@/lib/pos-store';
import { formatVND } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import type { Order } from '@/types';

/**
 * Man hinh POS ban hang toc do cao (Buoc 5 cua workflow).
 * Fullscreen + autofocus o quet ma vach + gio hang da don (Multi-tab) +
 * phim tat F2/F3/F4/F12/ESC, Enter thanh toan nhanh +
 * Offline-First: gio hang luu localStorage qua Zustand persist.
 */
export function PosTerminal() {
  const user = useSession();
  const searchRef = useRef<HTMLInputElement>(null);
  const customerRef = useRef<HTMLInputElement>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const tabs = usePosStore((state) => state.tabs);
  const activeTabId = usePosStore((state) => state.activeTabId);
  const addTab = usePosStore((state) => state.addTab);
  const closeTab = usePosStore((state) => state.closeTab);
  const setActiveTab = usePosStore((state) => state.setActiveTab);
  const addProduct = usePosStore((state) => state.addProduct);
  const clearTab = usePosStore((state) => state.clearTab);

  const tab = tabs.find((item) => item.tabId === activeTabId) ?? tabs[0];
  const totals = computeTabTotals(tab);
  const checkout = usePosCheckout(tab, setReceipt);

  const openNewTab = () => {
    addTab();
    toast.info('Đã mở đơn mới', 'Giỏ hàng riêng cho khách tiếp theo.');
    window.setTimeout(() => searchRef.current?.focus(), 60);
  };

  /** Dang ky phim tat theo dung dac ta Buoc 5. */
  useHotkeys({
    F2: () => openNewTab(),
    F3: () => searchRef.current?.focus(),
    F4: () => customerRef.current?.focus(),
    F12: () => checkout.mutate(),
    ENTER: () => checkout.mutate(),
    ESC: () => {
      if (tab.lines.length > 0) {
        clearTab(tab.tabId);
        toast.info('Đã huỷ giỏ hàng hiện tại');
      }
    },
  });

  return (
    <div className="pos-shell">
      <PosHeader
        tabs={tabs}
        activeTabId={tab.tabId}
        onSelect={setActiveTab}
        onClose={closeTab}
        onAdd={openNewTab}
      />

      <div className="flex min-h-0 flex-1">
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="space-y-2 border-b bg-card px-4 py-3">
            <PosProductSearch
              inputRef={searchRef}
              onPick={(product) => addProduct(tab.tabId, product)}
              onExactBarcode={(product) => addProduct(tab.tabId, product)}
            />
            <PosQuickPicks onPick={(product) => addProduct(tab.tabId, product)} />
          </div>

          {tab.lines.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
              <p className="text-base font-semibold">Chưa có dữ liệu</p>
              <p className="text-sm text-muted-foreground">
                Quét mã vạch hoặc bấm <span className="font-mono font-semibold">F3</span> để tìm sản phẩm — Bấm
                <span className="font-semibold"> [+ Đơn mới]</span> để mở đơn khác
              </p>
            </div>
          ) : (
            <PosCartTable tab={tab} />
          )}

          <div className="flex shrink-0 items-center justify-between border-t bg-card px-4 py-2 text-sm">
            <span className="text-muted-foreground">
              {tab.lines.length} dòng hàng · {totals.quantity} sản phẩm
              {totals.hasEditedPrice && <span className="ml-2 text-[hsl(38_92%_35%)]">(có dòng đã sửa giá)</span>}
            </span>
            <span className="font-semibold">
              Tổng: <span className="text-primary">{formatVND(totals.total)}</span>
            </span>
          </div>
        </section>

        <PosPaymentPanel
          tab={tab}
          submitting={checkout.isPending}
          customerInputRef={customerRef}
          onCheckout={() => checkout.mutate()}
        />
      </div>

      <footer className="pos-hotkey-bar">
        {POS_HOTKEYS.map((hotkey) => (
          <span key={hotkey.key}>
            <span className="pos-hotkey-key">{hotkey.key}</span>
            {hotkey.label}
          </span>
        ))}
        <span className="ml-auto">
          Thu ngân: {user.username} · Enter: Thanh toán nhanh
        </span>
      </footer>

      <PosReceiptDialog order={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}
