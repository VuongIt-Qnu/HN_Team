import type { Category, Customer, Product, Store, Supplier } from '@/types';

/**
 * Du lieu mau (Mock Data) - Buoc 4 cua workflow: "Tich hop mock data de kiem thu luong giao dich".
 * Du lieu duoc thiet ke giong that (chuoi ban le HN Group) de de doi chieu khi chuyen sang
 * PostgreSQL + Prisma (xem prisma/schema.prisma va prisma/seed.ts).
 */

export const STORE_ID_MAIN = 'st_hanoi';
export const MAIN_STORE_ID = STORE_ID_MAIN;

export const stores: Store[] = [
  {
    id: STORE_ID_MAIN,
    code: 'CH-HN01',
    name: 'HN Group - Trụ sở Hà Nội',
    address: '128 Trần Duy Hưng, Cầu Giấy, Hà Nội',
    phone: '0243 555 0101',
    isMain: true,
  },
  {
    id: 'st_hcm',
    code: 'CH-HCM01',
    name: 'HN Group - Chi nhánh HCM',
    address: '45 Nguyễn Thị Minh Khai, Quận 1, TP. HCM',
    phone: '0283 555 0202',
    isMain: false,
  },
  {
    id: 'st_danang',
    code: 'CH-DN01',
    name: 'HN Group - Chi nhánh Đà Nẵng',
    address: '77 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
    phone: '0236 555 0303',
    isMain: false,
  },
];

export const categories: Category[] = [
  { id: 'cat_phone', code: 'DM-DT', name: 'Điện thoại' },
  { id: 'cat_laptop', code: 'DM-LT', name: 'Laptop & Máy tính' },
  { id: 'cat_accessory', code: 'DM-PK', name: 'Phụ kiện' },
  { id: 'cat_home', code: 'DM-GD', name: 'Gia dụng' },
  { id: 'cat_office', code: 'DM-VP', name: 'Văn phòng phẩm' },
];

export const suppliers: Supplier[] = [
  { id: 'sup_samsung', code: 'NCC-SS', name: 'Samsung Vina Electronics', phone: '0243 999 1001', address: 'KCN Bắc Thăng Long, Hà Nội', debt: 48500000, note: 'Công nợ 30 ngày' },
  { id: 'sup_apple', code: 'NCC-AP', name: 'Apple Authorized VN', phone: '0283 999 2002', address: 'Quận 1, TP. HCM', debt: 0, note: 'Thanh toán ngay khi nhập' },
  { id: 'sup_logitech', code: 'NCC-LG', name: 'Logitech Việt Nam', phone: '0283 999 3003', address: 'Bình Thạnh, TP. HCM', debt: 12300000 },
  { id: 'sup_sunhouse', code: 'NCC-SH', name: 'Sunhouse Việt Nam', phone: '0243 999 4004', address: 'Thanh Trì, Hà Nội', debt: 6750000 },
  { id: 'sup_vpp', code: 'NCC-VP', name: 'VPP Hồng Hà', phone: '0243 999 5005', address: 'Hoàn Kiếm, Hà Nội', debt: 0 },
];

export const customers: Customer[] = [
  { id: 'cus_le01', code: 'KH-0001', name: 'Anh Nguyễn Văn Hùng', phone: '0912 345 678', address: 'Thanh Xuân, Hà Nội', type: 'RETAIL', debt: 0, points: 320, createdAt: '2025-03-11T08:00:00.000Z' },
  { id: 'cus_le02', code: 'KH-0002', name: 'Chị Trần Thu Hà', phone: '0988 111 222', address: 'Hai Bà Trưng, Hà Nội', type: 'RETAIL', debt: 1250000, points: 145, createdAt: '2025-06-02T08:00:00.000Z' },
  { id: 'cus_si01', code: 'KH-0003', name: 'Công ty TNHH TM Đông Á', phone: '0904 777 888', address: 'Long Biên, Hà Nội', type: 'WHOLESALE', debt: 86500000, points: 4820, note: 'Công nợ 45 ngày, hạn mức 200 triệu', createdAt: '2024-11-20T08:00:00.000Z' },
  { id: 'cus_si02', code: 'KH-0004', name: 'Cửa hàng Điện máy Minh Phát', phone: '0937 456 789', address: 'Hà Đông, Hà Nội', type: 'WHOLESALE', debt: 32400000, points: 2140, note: 'Giao hàng tận kho, thu COD 50%', createdAt: '2025-01-15T08:00:00.000Z' },
  { id: 'cus_vp01', code: 'KH-0005', name: 'Trường THCS Ngôi Sao', phone: '0243 777 666', address: 'Cầu Giấy, Hà Nội', type: 'WHOLESALE', debt: 0, points: 900, createdAt: '2025-04-08T08:00:00.000Z' },
  { id: 'cus_le03', code: 'KH-0006', name: 'Anh Lê Quang Minh', phone: '0967 333 444', address: 'Đống Đa, Hà Nội', type: 'RETAIL', debt: 480000, points: 60, createdAt: '2026-01-19T08:00:00.000Z' },
];

type SeedProduct = Omit<Product, 'categoryName' | 'supplierName' | 'updatedAt' | 'stock'> & { stockMain: number };

const rawProducts: SeedProduct[] = [
  { id: 'pr_ss_s24', sku: 'SP-0001', barcode: '8931234500011', name: 'Samsung Galaxy S24 256GB', categoryId: 'cat_phone', unit: 'Chiếc', sellPrice: 21990000, costPrice: 19850000, stockMain: 12, minStock: 5, supplierId: 'sup_samsung', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_ss_a55', sku: 'SP-0002', barcode: '8931234500028', name: 'Samsung Galaxy A55 5G 128GB', categoryId: 'cat_phone', unit: 'Chiếc', sellPrice: 9490000, costPrice: 8250000, stockMain: 24, minStock: 8, supplierId: 'sup_samsung', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_ip_15', sku: 'SP-0003', barcode: '8931234500035', name: 'iPhone 15 128GB', categoryId: 'cat_phone', unit: 'Chiếc', sellPrice: 20490000, costPrice: 18900000, stockMain: 9, minStock: 4, supplierId: 'sup_apple', allowDiscount: false, status: 'ACTIVE' },
  { id: 'pr_ip_13', sku: 'SP-0004', barcode: '8931234500042', name: 'iPhone 13 128GB', categoryId: 'cat_phone', unit: 'Chiếc', sellPrice: 14490000, costPrice: 12900000, stockMain: 6, minStock: 4, supplierId: 'sup_apple', allowDiscount: false, status: 'ACTIVE' },
  { id: 'pr_ss_buds', sku: 'SP-0005', barcode: '8931234500059', name: 'Tai nghe Samsung Galaxy Buds FE', categoryId: 'cat_accessory', unit: 'Bộ', sellPrice: 1490000, costPrice: 1050000, stockMain: 48, minStock: 10, supplierId: 'sup_samsung', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_mac_air', sku: 'SP-0006', barcode: '8931234500066', name: 'MacBook Air M3 13 inch 8GB/256GB', categoryId: 'cat_laptop', unit: 'Chiếc', sellPrice: 26490000, costPrice: 24500000, stockMain: 5, minStock: 3, supplierId: 'sup_apple', allowDiscount: false, status: 'ACTIVE' },
  { id: 'pr_asus_viv', sku: 'SP-0007', barcode: '8931234500073', name: 'Laptop Asus Vivobook 15 i5', categoryId: 'cat_laptop', unit: 'Chiếc', sellPrice: 15490000, costPrice: 13850000, stockMain: 8, minStock: 4, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_chuot_mx', sku: 'SP-0008', barcode: '8931234500080', name: 'Chuột không dây Logitech MX Master 3S', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 2390000, costPrice: 1720000, stockMain: 32, minStock: 10, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_kb_keychron', sku: 'SP-0009', barcode: '8931234500097', name: 'Bàn phím cơ Keychron K3 Pro', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 2750000, costPrice: 1980000, stockMain: 18, minStock: 6, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_sac_anhn', sku: 'SP-0010', barcode: '8931234500103', name: 'Củ sạc nhanh Anker 65W GaN', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 890000, costPrice: 540000, stockMain: 60, minStock: 15, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_noi_chao', sku: 'SP-0011', barcode: '8931234500110', name: 'Nồi chiên không dầu Sunhouse 6L', categoryId: 'cat_home', unit: 'Chiếc', sellPrice: 2190000, costPrice: 1480000, stockMain: 21, minStock: 6, supplierId: 'sup_sunhouse', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_am_sieu', sku: 'SP-0012', barcode: '8931234500127', name: 'Ấm siêu tốc Sunhouse 1.8L', categoryId: 'cat_home', unit: 'Chiếc', sellPrice: 420000, costPrice: 245000, stockMain: 75, minStock: 20, supplierId: 'sup_sunhouse', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_noi_com', sku: 'SP-0013', barcode: '8931234500134', name: 'Nồi cơm điện tử Sunhouse 1.8L', categoryId: 'cat_home', unit: 'Chiếc', sellPrice: 1290000, costPrice: 830000, stockMain: 34, minStock: 10, supplierId: 'sup_sunhouse', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_quat_dk', sku: 'SP-0014', barcode: '8931234500141', name: 'Quạt điều hoà Sunhouse 6000D', categoryId: 'cat_home', unit: 'Chiếc', sellPrice: 3490000, costPrice: 2480000, stockMain: 14, minStock: 5, supplierId: 'sup_sunhouse', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_but_thien', sku: 'SP-0015', barcode: '8931234500158', name: 'Bút bi Thiên Long TL-027 (hộp 20)', categoryId: 'cat_office', unit: 'Hộp', sellPrice: 96000, costPrice: 62000, stockMain: 180, minStock: 50, supplierId: 'sup_vpp', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_giay_a4', sku: 'SP-0016', barcode: '8931234500165', name: 'Giấy in A4 Double A 70gsm (ram)', categoryId: 'cat_office', unit: 'Ram', sellPrice: 78000, costPrice: 58000, stockMain: 240, minStock: 60, supplierId: 'sup_vpp', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_bia_ho', sku: 'SP-0017', barcode: '8931234500172', name: 'Bìa hồ sơ Hồng Hà (xấp 10)', categoryId: 'cat_office', unit: 'Xấp', sellPrice: 54000, costPrice: 36000, stockMain: 150, minStock: 40, supplierId: 'sup_vpp', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_kep_bam', sku: 'SP-0018', barcode: '8931234500189', name: 'Kẹp bướm 32mm (hộp 12)', categoryId: 'cat_office', unit: 'Hộp', sellPrice: 42000, costPrice: 26000, stockMain: 96, minStock: 30, supplierId: 'sup_vpp', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_ss_tab', sku: 'SP-0019', barcode: '8931234500196', name: 'Samsung Galaxy Tab S9 FE 128GB', categoryId: 'cat_phone', unit: 'Chiếc', sellPrice: 8990000, costPrice: 7650000, stockMain: 11, minStock: 4, supplierId: 'sup_samsung', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_sdp_anker', sku: 'SP-0020', barcode: '8931234500202', name: 'Pin sạc dự phòng Anker 20000mAh', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 1090000, costPrice: 720000, stockMain: 42, minStock: 12, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_cam_bien', sku: 'SP-0021', barcode: '8931234500219', name: 'Webcam Logitech C920 Pro', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 1690000, costPrice: 1210000, stockMain: 16, minStock: 6, supplierId: 'sup_logitech', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_may_in', sku: 'SP-0022', barcode: '8931234500226', name: 'Máy in Canon LBP2900', categoryId: 'cat_office', unit: 'Chiếc', sellPrice: 3290000, costPrice: 2540000, stockMain: 7, minStock: 3, supplierId: 'sup_vpp', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_may_hut', sku: 'SP-0023', barcode: '8931234500233', name: 'Máy hút bụi cầm tay Sunhouse', categoryId: 'cat_home', unit: 'Chiếc', sellPrice: 1590000, costPrice: 1080000, stockMain: 19, minStock: 6, supplierId: 'sup_sunhouse', allowDiscount: true, status: 'ACTIVE' },
  { id: 'pr_loa_ss', sku: 'SP-0024', barcode: '8931234500240', name: 'Loa Bluetooth Samsung Soundbar', categoryId: 'cat_accessory', unit: 'Chiếc', sellPrice: 4590000, costPrice: 3480000, stockMain: 13, minStock: 5, supplierId: 'sup_samsung', allowDiscount: true, status: 'ACTIVE' },
];

const TODAY = new Date().toISOString();

export const products: Product[] = rawProducts.map(({ stockMain, ...rest }) => ({
  ...rest,
  categoryName: categories.find((c) => c.id === rest.categoryId)?.name ?? 'Khác',
  supplierName: suppliers.find((s) => s.id === rest.supplierId)?.name ?? 'Khác',
  stock: stockMain,
  updatedAt: TODAY,
}));

/** Ton kho cua cac chi nhanh khac (chi nhanh chinh lay tu `products.stock`). */
export const branchStock: Record<string, Record<string, number>> = {
  st_hcm: {
    pr_ss_s24: 6, pr_ss_a55: 15, pr_ip_15: 4, pr_ip_13: 3, pr_ss_buds: 26, pr_mac_air: 2,
    pr_asus_viv: 5, pr_chuot_mx: 18, pr_kb_keychron: 9, pr_sac_anhn: 33, pr_noi_chao: 12,
    pr_am_sieu: 41, pr_noi_com: 20, pr_quat_dk: 8, pr_but_thien: 96, pr_giay_a4: 130,
    pr_bia_ho: 84, pr_kep_bam: 52, pr_ss_tab: 6, pr_sdp_anker: 24, pr_cam_bien: 9,
    pr_may_in: 3, pr_may_hut: 11, pr_loa_ss: 7,
  },
  st_danang: {
    pr_ss_s24: 3, pr_ss_a55: 9, pr_ip_15: 2, pr_ip_13: 2, pr_ss_buds: 14, pr_mac_air: 1,
    pr_asus_viv: 3, pr_chuot_mx: 11, pr_kb_keychron: 6, pr_sac_anhn: 21, pr_noi_chao: 7,
    pr_am_sieu: 26, pr_noi_com: 13, pr_quat_dk: 5, pr_but_thien: 54, pr_giay_a4: 72,
    pr_bia_ho: 46, pr_kep_bam: 30, pr_ss_tab: 4, pr_sdp_anker: 15, pr_cam_bien: 5,
    pr_may_in: 2, pr_may_hut: 6, pr_loa_ss: 4,
  },
};

