'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { apiPost } from '@/lib/api-client';
import { computeTabTotals, type OrderTab } from '@/lib/pos-types';
import { usePosStore } from '@/lib/pos-store';
import { formatVND, getErrorMessage } from '@/lib/utils';
import type { Order } from '@/types';

/**
 * Nghiep vu chot don tai POS: gui gio hang len API, xu ly thanh cong/that bai
 * (bao gom truong hop mat mang - Offline-First) va lam moi du lieu lien quan.
 *
 * Don COD tu POS: gui kem ky thuat phu trach + dia chi giao; API tao don o trang
 * thai CONFIRMED (cho duyet) nen don tu co mat trong tuyen /shipping/cod cua
 * ky thuat do (thay cho viec phai nhap tay lich giao).
 */
export function usePosCheckout(tab: OrderTab, onPaid: (order: Order) => void) {
  const queryClient = useQueryClient();
  const clearTab = usePosStore((state) => state.clearTab);
  const totals = computeTabTotals(tab);
  const isCod = tab.paymentMethod === 'COD';

  return useMutation({
    mutationFn: async () => {
      if (tab.lines.length === 0) throw new Error('Giỏ hàng đang trống, chưa thể thanh toán.');
      if (isCod && !tab.technicianId) {
        throw new Error('Đơn COD phải chọn NV Kỹ thuật phụ trách để chuyển lịch giao cho kỹ thuật duyệt.');
      }
      return apiPost<{ order: Order }>('/api/orders', {
        customerId: tab.customerId,
        customerName: tab.customerName,
        channel: 'RETAIL',
        items: tab.lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
        })),
        discount: tab.orderDiscount,
        paymentMethod: tab.paymentMethod,
        paidAmount: tab.paidAmount || totals.total,
        note: tab.note,
        technicianId: isCod ? tab.technicianId : undefined,
        deliveryAddress: isCod ? tab.deliveryAddress : undefined,
        status: isCod ? 'CONFIRMED' : 'COMPLETED',
      });
    },
    onSuccess: (data) => {
      onPaid(data.order);
      clearTab(tab.tabId);
      void queryClient.invalidateQueries({ queryKey: ['pos-products'] });
      void queryClient.invalidateQueries({ queryKey: ['pos-products-quick'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['shipping-cod'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(
        isCod ? `Đã lên đơn COD ${data.order.code}` : `Đã thanh toán hoá đơn ${data.order.code}`,
        isCod
          ? `Đã chuyển cho ${data.order.shipperName ?? 'NV Kỹ thuật'} duyệt và đi giao.`
          : `Tổng tiền: ${formatVND(data.order.total)}`,
      );
    },
    onError: (error) => {
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      toast.error(
        'Không thể thanh toán',
        offline
          ? 'Thiết bị đang mất mạng — giỏ hàng đã được lưu tạm trên máy, vui lòng thử lại khi có mạng.'
          : getErrorMessage(error),
      );
    },
  });
}
