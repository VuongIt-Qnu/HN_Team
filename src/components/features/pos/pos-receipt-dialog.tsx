'use client';

import { useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReceiptView } from '@/components/features/pos/receipt-view';
import type { Order } from '@/types';

interface Props {
  order: Order | null;
  onClose: () => void;
  /** Tu dong mo hop thoai in cua trinh duyet ngay sau khi thanh toan thanh cong. */
  autoPrint?: boolean;
}

/** Hop thoai xem truoc & in hoa don nhiet 80mm. */
export function PosReceiptDialog({ order, onClose, autoPrint = true }: Props) {
  useEffect(() => {
    if (!order || !autoPrint) return undefined;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [order, autoPrint]);

  return (
    <Dialog open={!!order} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> Hoá đơn {order?.code}
          </DialogTitle>
        </DialogHeader>
        {order && <ReceiptView order={order} />}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Đóng (không in)
          </Button>
          <Button type="button" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> In hoá đơn
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
