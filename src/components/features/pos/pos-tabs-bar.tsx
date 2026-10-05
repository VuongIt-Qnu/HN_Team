'use client';

import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { computeTabTotals, type OrderTab } from '@/lib/pos-types';
import { cn, formatVND } from '@/lib/utils';

interface Props {
  tabs: OrderTab[];
  activeTabId: string;
  onSelect: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onAdd: () => void;
}

/** Thanh tab da don (Multi-tab Orders) cho man hinh POS. */
export function PosTabsBar({ tabs, activeTabId, onSelect, onClose, onAdd }: Props) {
  return (
    <div className="ml-2 flex flex-1 items-center gap-1 overflow-x-auto">
      {tabs.map((tab) => {
        const totals = computeTabTotals(tab);
        const active = tab.tabId === activeTabId;
        return (
          <button
            key={tab.tabId}
            type="button"
            onClick={() => onSelect(tab.tabId)}
            className={cn(
              'flex items-center gap-1 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-xs font-medium',
              active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}
            <span className="text-[11px]">
              ({tab.lines.length}) · {formatVND(totals.total)}
            </span>
            {tabs.length > 1 && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(event) => {
                  event.stopPropagation();
                  onClose(tab.tabId);
                }}
                className="ml-1 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive"
                aria-label={`Đóng ${tab.label}`}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
      <Button type="button" variant="ghost" size="sm" onClick={onAdd} title="Mở đơn mới (F2)">
        <Plus className="h-3.5 w-3.5" /> Đơn mới
      </Button>
    </div>
  );
}
