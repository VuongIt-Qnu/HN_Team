import { cn } from '@/lib/utils';

/** Skeleton loader dung khi dang fetch du lieu (muc 4.1 cua skill). */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

/** Skeleton dang bang: hien thi trong khi cho API tra ve danh sach. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-9 w-full" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-7 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export { Skeleton };
