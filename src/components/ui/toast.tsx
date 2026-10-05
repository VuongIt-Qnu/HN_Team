'use client';

import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** He thong thong bao (Toast) nhe, dung Zustand - khong can them dependency. */

export type ToastVariant = 'default' | 'success' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  items: ToastItem[];
  push: (item: Omit<ToastItem, 'id'>) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  push: (item) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    set({ items: [...get().items, { ...item, id }] });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => get().dismiss(id), 4500);
    }
    return id;
  },
  dismiss: (id) => set({ items: get().items.filter((item) => item.id !== id) }),
}));

/** API goi thong bao: toast.success('Đã lưu'), toast.error('Lỗi...') */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'error' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ title, description, variant: 'default' }),
};

const ICONS: Record<ToastVariant, React.ReactNode> = {
  default: <Info className="h-4 w-4 text-primary" />,
  success: <CheckCircle2 className="h-4 w-4 text-success" />,
  error: <AlertTriangle className="h-4 w-4 text-destructive" />,
};

export function Toaster() {
  const items = useToastStore((state) => state.items);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-lg border bg-background p-3 shadow-lg',
            item.variant === 'error' && 'border-destructive/40',
            item.variant === 'success' && 'border-success/40',
          )}
        >
          <span className="mt-0.5">{ICONS[item.variant]}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label="Đóng thông báo"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
