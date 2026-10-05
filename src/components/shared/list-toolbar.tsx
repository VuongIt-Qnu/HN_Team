'use client';

import type { ReactNode } from 'react';
import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ListToolbarProps {
  title: string;
  /** O tim kiem chuan (co nhan cho screen reader thay vi chi co placeholder). */
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
  };
  onClear?: () => void;
  showClear?: boolean;
  /** Cac bo loc bo sung (Select, Input ngay...) va nut hanh dong chinh cua khu vuc. */
  children?: ReactNode;
  className?: string;
}

/**
 * Thanh cong cu chuan cho man hinh danh sach (map tu vung "bo loc + Refresh (F5)" cua app desktop v4.5):
 * tieu de + tim kiem + bo loc + xoa loc. Dung chung de cac man danh sach khong bi lech style (RULE 12/23).
 */
export function ListToolbar({ title, search, onClear, showClear, children, className }: ListToolbarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 border-b px-4 py-3', className)}>
      <h2 className="mr-auto text-sm font-semibold">{title}</h2>

      {search && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            className={cn('h-9 w-64 pl-9', search.className)}
            placeholder={search.placeholder}
            value={search.value}
            onChange={(event) => search.onChange(event.target.value)}
            aria-label={search.label ?? 'Tìm kiếm'}
          />
        </div>
      )}

      {children}

      {showClear && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <RotateCcw className="h-3.5 w-3.5" /> Xoá lọc
        </Button>
      )}
    </div>
  );
}
