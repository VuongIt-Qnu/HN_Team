/** Thuc the danh muc: Store, Category, Product, Customer, Supplier. */

export interface Store {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  isMain: boolean;
}

export interface Category {
  id: string;
  code: string;
  name: string;
  productCount?: number;
}

export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  ACTIVE: 'Đang kinh doanh',
  INACTIVE: 'Ngừng kinh doanh',
};

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  sellPrice: number;
  /**
   * Gia von CHI duoc tra ve khi tai khoan co quyen VIEW_COST_PRICE.
   * Tang API se loai bo truong nay voi cac vai tro khac (xem `src/lib/api-guard.ts`).
   */
  costPrice?: number;
  /** Ton kho tai chi nhanh dang lam viec. */
  stock: number;
  minStock: number;
  supplierId: string;
  supplierName: string;
  allowDiscount: boolean;
  /** Soft delete: INACTIVE = ngung kinh doanh, van giu toan bo lich su nhap/ban. */
  status: ProductStatus;
  updatedAt: string;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE';

export interface Customer {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  type: CustomerType;
  /** Cong no hien tai (VND) - duong: khach dang no cua hang. */
  debt: number;
  points: number;
  note?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  phone: string;
  address: string;
  /** Duong: cua hang dang no nha cung cap. */
  debt: number;
  note?: string;
}
