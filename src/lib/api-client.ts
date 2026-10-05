import type { ApiErrorPayload } from '@/types';

/** Loi API co mang theo HTTP status de UI hien thi thong bao than thien. */
export class HttpError extends Error {
  status: number;

  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type QueryValue = string | number | boolean | undefined | null;

export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/** Doc payload + nem HttpError chuan cho moi kieu goi API (JSON, FormData...). */
async function parseResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = payload as ApiErrorPayload | null;
    throw new HttpError(response.status, error?.message ?? `Lỗi ${response.status}`, error?.code);
  }

  return payload as T;
}

/** Goi API noi bo, tu dong parse JSON va nem HttpError khi that bai. */
export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    credentials: 'same-origin',
  });

  return parseResponse<T>(response);
}

/**
 * Goi API voi FormData (tai file len server).
 * Luu y: KHONG tu set Content-Type de trinh duyet tu sinh boundary cua multipart/form-data.
 */
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    credentials: 'same-origin',
  });

  return parseResponse<T>(response);
}

export const apiGet = <T>(url: string, params?: Record<string, QueryValue>) => apiFetch<T>(`${url}${buildQuery(params)}`);

export const apiPost = <T>(url: string, body?: unknown) =>
  apiFetch<T>(url, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });

export const apiPatch = <T>(url: string, body?: unknown) =>
  apiFetch<T>(url, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) });

export const apiDelete = <T>(url: string) => apiFetch<T>(url, { method: 'DELETE' });
