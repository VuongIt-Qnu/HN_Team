'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { apiPost } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/utils';
import type { Customer } from '@/types';

interface CustomerForm { name: string; phone: string; address: string; type: Customer['type']; note: string; }
const EMPTY_FORM: CustomerForm = { name: '', phone: '', address: '', type: 'RETAIL', note: '' };
interface Props { onCreated?: (c: Customer) => void; defaultType?: Customer['type']; triggerLabel?: string; }

/** Nut + Dialog tao khach hang moi (POST /api/customers) - dung chung POS + bao gia si. */
export function CustomerCreateDialog({ onCreated, defaultType = 'RETAIL', triggerLabel = 'Thêm khách hàng' }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>({ ...EMPTY_FORM, type: defaultType });
  const openDialog = () => { setForm({ ...EMPTY_FORM, type: defaultType }); setOpen(true); };
  const mutation = useMutation({
    mutationFn: (p: CustomerForm) =>
      apiPost<{ customer: Customer }>('/api/customers', {
        name: p.name.trim(), phone: p.phone.trim(),
        address: p.address.trim() || undefined, type: p.type, note: p.note.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success('Đã thêm khách hàng', `${data.customer.code} · ${data.customer.name}`);
      void queryClient.invalidateQueries({ queryKey: ['pos-customers'] });
      void queryClient.invalidateQueries({ queryKey: ['customers'] });
      setOpen(false);
      onCreated?.(data.customer);
    },
    onError: (e) => toast.error('Không thêm được khách hàng', getErrorMessage(e)),
  });
  const canSubmit = form.name.trim().length >= 2 && form.phone.trim().length >= 8 && !mutation.isPending;
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={openDialog}>
        <Plus className="h-3.5 w-3.5" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={(n) => !mutation.isPending && setOpen(n)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm khách hàng mới</DialogTitle></DialogHeader>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(form); }}>
            <div className="space-y-1"><Label>Tên khách hàng <span className="text-destructive">*</span></Label>
              <Input autoFocus placeholder="vd: Cửa hàng Điện máy Minh Phát" value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Số điện thoại <span className="text-destructive">*</span></Label>
                <Input inputMode="tel" placeholder="vd: 0904 777 888" value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Loại khách</Label>
                <Select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as Customer['type'] }))}>
                  <option value="RETAIL">Khách lẻ</option><option value="WHOLESALE">Khách sỉ</option>
                </Select></div>
            </div>
            <div className="space-y-1"><Label>Địa chỉ</Label>
              <Input placeholder="vd: Long Biên, Hà Nội" value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Ghi chú (hạn mức / công nợ...)</Label>
              <Textarea placeholder="vd: Công nợ 45 ngày, hạn mức 200 triệu" value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Huỷ</Button>
              <Button type="submit" disabled={!canSubmit}>{mutation.isPending ? 'Đang lưu...' : 'Lưu khách hàng'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
