export * from './rbac';
export * from './catalog';
export * from './order';
export * from './inventory';
export * from './finance';

/** Bao du lieu phan trang chuan tra ve tu API. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Phan hoi loi chuan cua API. */
export interface ApiErrorPayload {
  message: string;
  code?: string;
  details?: unknown;
}
