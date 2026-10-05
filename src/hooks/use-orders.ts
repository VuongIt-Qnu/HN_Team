'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/toast';
import { apiDelete, apiGet, apiPatch, apiPost, apiUpload, buildQuery } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import type { Order, OrderChannel, OrderStatus } from '@/types';

export interface OrderQueryFilter {
  channel?: OrderChannel;
  status?: OrderStatus | '';
  q?: string;
  from?: string;
  to?: string;
  limit?: number;
}

/** Truy van danh sach hoa don theo bo loc (dung chung cho cac man hinh don hang). */
export function useOrdersQuery(key: string, filter: OrderQueryFilter) {
  return useQuery({
    queryKey: ['orders', key, filter],
    queryFn: () =>
      apiGet<{ items: Order[]; total: number }>('/api/orders', {
        channel: filter.channel,
        status: filter.status || undefined,
        q: filter.q || undefined,
        from: filter.from || undefined,
        to: filter.to || undefined,
        limit: filter.limit,
      }),
  });
}

/** Doi trang thai hoa don (duyet / giao / hoan tat / huy / tra hang). */
export function useOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus }) =>
      apiPatch<{ order: Order }>(`/api/orders/${input.orderId}`, { status: input.status }),
    onSuccess: (data) => {
      toast.success('Đã cập nhật hoá đơn', `${data.order.code} → ${data.order.status}`);
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
      void queryClient.invalidateQueries({ queryKey: ['inventory-stock'] });
      void queryClient.invalidateQueries({ queryKey: ['cashbook'] });
    },
    onError: (error) => toast.error('Không thể cập nhật hoá đơn', getErrorMessage(error)),
  });
}

/** Thu ho COD (dung cho man hinh ky thuat giao hang). */
export function useCodCollectMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; amount: number }) =>
      apiPost<{ order: Order; message: string }>('/api/shipping/cod', input),
    onSuccess: (data) => {
      toast.success('Đã ghi nhận thu hộ COD', data.message);
      void queryClient.invalidateQueries({ queryKey: ['shipping-cod'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toast.error('Không thể ghi nhận thu hộ', getErrorMessage(error)),
  });
}

/** Tai anh hoan thien (chup tu camera hoac chon tu thu vien) cho don giao COD. */
export function useCodPhotoUploadMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiUpload<{ order: Order; uploaded: number; skipped: string[]; message: string }>(
        '/api/shipping/cod/photos',
        formData,
      ),
    onSuccess: (data) => {
      toast.success('Đã tải ảnh hoàn thiện', data.message);
      if (data.skipped.length > 0) toast.error('Một số ảnh bị bỏ qua', data.skipped.join('; '));
      void queryClient.invalidateQueries({ queryKey: ['shipping-cod'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toast.error('Không tải được ảnh hoàn thiện', getErrorMessage(error)),
  });
}

/** Xoa 1 anh hoan thien da tai len (chup lai khi anh bi mo / sai don). */
export function useCodPhotoDeleteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; photoId: string }) =>
      apiDelete<{ order: Order; message: string }>(
        `/api/shipping/cod/photos${buildQuery({ orderId: input.orderId, photoId: input.photoId })}`,
      ),
    onSuccess: (data) => {
      toast.success('Đã xoá ảnh hoàn thiện', data.message);
      void queryClient.invalidateQueries({ queryKey: ['shipping-cod'] });
      void queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => toast.error('Không xoá được ảnh hoàn thiện', getErrorMessage(error)),
  });
}
