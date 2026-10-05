import type { Order, OrderChannel, OrderItem, OrderStatus, PaymentMethod } from '@/types';
import { products, STORE_ID_MAIN, stores } from './seed-catalog';

/**
 * Don hang mau. Du lieu duoc khai bao dang "spec" ngan gon roi build bang ham
 * `buildOrder` de tranh lap lai cong thuc tinh tien (giong logic that o API).
 */

interface OrderSpec {
  id: string;
  code: string;
  channel: OrderChannel;
  status: OrderStatus;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  /** So ngay truoc hom nay (0 = hom nay). */
  daysAgo: number;
  /** Gio tao don (0-23). */
  hour: number;
  minute?: number;
  paymentMethod: PaymentMethod;
  /** [productId, quantity, donGia (mac dinh = gia niem yet), giam gia dong] */
  lines: Array<[string, number, number?, number?]>;
  orderDiscount?: number;
  /** Undefined = thanh toan du. */
  paidAmount?: number;
  note?: string;
  shipperId?: string;
  shipperName?: string;
  deliveryAddress?: string;
  storeId?: string;
}

const CASHIER = { id: 'us_cashier', name: 'Lê Thị Mai' };
const MANAGER = { id: 'us_manager', name: 'Trần Mạnh Quân' };

function buildOrder(spec: OrderSpec): Order {
  const created = new Date();
  created.setDate(created.getDate() - spec.daysAgo);
  created.setHours(spec.hour, spec.minute ?? 0, 0, 0);
  const createdAt = created.toISOString();

  const items: OrderItem[] = spec.lines.map(([productId, quantity, unitPrice, discount], index) => {
    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error(`Seed data loi: khong tim thay san pham ${productId}`);
    const price = unitPrice ?? product.sellPrice;
    const lineDiscount = discount ?? 0;
    return {
      id: `${spec.id}_it${index + 1}`,
      productId: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: product.name,
      unit: product.unit,
      quantity,
      unitPrice: price,
      discount: lineDiscount,
      lineTotal: price * quantity - lineDiscount,
      costPrice: product.costPrice,
      lineProfit: price * quantity - lineDiscount - (product.costPrice ?? 0) * quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const orderDiscount = spec.orderDiscount ?? 0;
  const total = subtotal - orderDiscount;
  const paidAmount = spec.paidAmount === undefined ? total : spec.paidAmount;
  const debtAmount = Math.max(total - paidAmount, 0);
  const changeAmount = paidAmount > total ? paidAmount - total : 0;
  const store = stores.find((s) => s.id === (spec.storeId ?? STORE_ID_MAIN)) ?? stores[0];
  const cashier = spec.channel === 'WHOLESALE' ? MANAGER : CASHIER;

  return {
    id: spec.id,
    code: spec.code,
    channel: spec.channel,
    status: spec.status,
    customerId: spec.customerId,
    customerName: spec.customerName,
    customerPhone: spec.customerPhone,
    storeId: store.id,
    storeName: store.name,
    items,
    subtotal,
    discount: orderDiscount,
    total,
    paidAmount,
    changeAmount,
    debtAmount: spec.channel === 'WHOLESALE' ? debtAmount : 0,
    paymentMethod: spec.paymentMethod,
    cashierId: cashier.id,
    cashierName: cashier.name,
    note: spec.note,
    codAmount: spec.paymentMethod === 'COD' ? debtAmount : undefined,
    shipperId: spec.shipperId,
    shipperName: spec.shipperName,
    deliveryAddress: spec.deliveryAddress,
    createdAt,
    updatedAt: createdAt,
  };
}

const specs: OrderSpec[] = [
  {
    id: 'od_0001', code: 'HD-R-20260922-0001', channel: 'RETAIL', status: 'COMPLETED', daysAgo: 0, hour: 9, minute: 15,
    customerId: 'cus_le01', customerName: 'Anh Nguyễn Văn Hùng', customerPhone: '0912 345 678', paymentMethod: 'CASH',
    lines: [['pr_ss_a55', 1], ['pr_ss_buds', 1], ['pr_sac_anhn', 2, 850000]],
  },
  {
    id: 'od_0002', code: 'HD-R-20260922-0002', channel: 'RETAIL', status: 'COMPLETED', daysAgo: 0, hour: 10, minute: 40,
    customerName: 'Khách lẻ (không định danh)', paymentMethod: 'VIETQR',
    lines: [['pr_giay_a4', 5, 75000], ['pr_but_thien', 2], ['pr_kep_bam', 3]],
    orderDiscount: 10000,
  },
  {
    id: 'od_0003', code: 'HD-R-20260922-0003', channel: 'RETAIL', status: 'DRAFT', daysAgo: 0, hour: 11, minute: 20,
    customerName: 'Khách lẻ (không định danh)', paymentMethod: 'CASH',
    lines: [['pr_chuot_mx', 1], ['pr_kb_keychron', 1, 2590000]],
    note: 'Khách đang cân nhắc, giữ hàng 30 phút',
  },
  {
    id: 'od_0004', code: 'HD-S-20260922-0004', channel: 'WHOLESALE', status: 'PENDING', daysAgo: 0, hour: 8, minute: 30,
    customerId: 'cus_si01', customerName: 'Công ty TNHH TM Đông Á', customerPhone: '0904 777 888',
    paymentMethod: 'TRANSFER', lines: [['pr_ss_s24', 3, 20900000, 300000], ['pr_ss_tab', 2, 8490000]],
    orderDiscount: 500000, paidAmount: 30000000,
    note: 'Báo giá sỉ tháng 9, chờ Quản lý duyệt',
  },
  {
    id: 'od_0005', code: 'HD-S-20260921-0005', channel: 'WHOLESALE', status: 'CONFIRMED', daysAgo: 1, hour: 14, minute: 5,
    customerId: 'cus_si02', customerName: 'Cửa hàng Điện máy Minh Phát', customerPhone: '0937 456 789',
    paymentMethod: 'TRANSFER', lines: [['pr_noi_chao', 6, 1990000], ['pr_noi_com', 8, 1150000], ['pr_quat_dk', 3, 3250000]],
    orderDiscount: 250000, paidAmount: 10000000,
    note: 'Đã xác nhận, giao trong 2 ngày',
  },
  {
    id: 'od_0006', code: 'HD-O-20260921-0006', channel: 'ONLINE', status: 'DELIVERING', daysAgo: 1, hour: 16, minute: 45,
    customerId: 'cus_si02', customerName: 'Cửa hàng Điện máy Minh Phát', customerPhone: '0937 456 789',
    paymentMethod: 'COD', lines: [['pr_am_sieu', 10, 380000], ['pr_may_hut', 4, 1490000]],
    paidAmount: 3000000, shipperId: 'us_technician', shipperName: 'Vũ Hồng Nam',
    deliveryAddress: 'Số 12 Lê Trọng Tấn, Hà Đông, Hà Nội',
    note: 'Kỹ thuật thu hộ phần còn lại + chụp ảnh hoàn thiện',
  },
  {
    id: 'od_0007', code: 'HD-O-20260922-0007', channel: 'ONLINE', status: 'DELIVERING', daysAgo: 0, hour: 7, minute: 50,
    customerId: 'cus_le02', customerName: 'Chị Trần Thu Hà', customerPhone: '0988 111 222',
    paymentMethod: 'COD', lines: [['pr_ss_buds', 1], ['pr_sdp_anker', 1, 990000]],
    shipperId: 'us_technician', shipperName: 'Vũ Hồng Nam', deliveryAddress: '25 Bạch Mai, Hai Bà Trưng, Hà Nội',
  },
  {
    id: 'od_0008', code: 'HD-R-20260920-0008', channel: 'RETAIL', status: 'COMPLETED', daysAgo: 2, hour: 15, minute: 30,
    customerId: 'cus_le02', customerName: 'Chị Trần Thu Hà', customerPhone: '0988 111 222',
    paymentMethod: 'CASH', lines: [['pr_sac_anhn', 2], ['pr_cam_bien', 1, 1590000]], paidAmount: 900000,
    note: 'Khách nợ lại 1.250.000đ, hẹn thanh toán cuối tháng',
  },
  {
    id: 'od_0009', code: 'HD-R-20260919-0009', channel: 'RETAIL', status: 'RETURNED', daysAgo: 3, hour: 10, minute: 10,
    customerId: 'cus_le03', customerName: 'Anh Lê Quang Minh', customerPhone: '0967 333 444',
    paymentMethod: 'CASH', lines: [['pr_loa_ss', 1]],
    note: 'Khách trả hàng do lỗi loa, đã hoàn tiền qua Sổ quỹ',
  },
  {
    id: 'od_0010', code: 'HD-O-20260918-0010', channel: 'ONLINE', status: 'COMPLETED', daysAgo: 4, hour: 9, minute: 25,
    customerId: 'cus_vp01', customerName: 'Trường THCS Ngôi Sao', customerPhone: '0243 777 666',
    paymentMethod: 'TRANSFER', lines: [['pr_giay_a4', 40, 72000], ['pr_bia_ho', 25, 50000], ['pr_may_in', 2, 3190000]],
    orderDiscount: 150000,
  },
  {
    id: 'od_0011', code: 'HD-R-20260917-0011', channel: 'RETAIL', status: 'COMPLETED', daysAgo: 5, hour: 18, minute: 5,
    customerName: 'Khách lẻ (không định danh)', paymentMethod: 'CASH',
    lines: [['pr_ip_13', 1], ['pr_sac_anhn', 1]],
  },
  {
    id: 'od_0012', code: 'HD-R-20260916-0012', channel: 'RETAIL', status: 'CANCELLED', daysAgo: 6, hour: 11, minute: 45,
    customerName: 'Khách lẻ (không định danh)', paymentMethod: 'CASH',
    lines: [['pr_ip_15', 1]], note: 'Khách đổi ý, chuyển sang đơn khác',
  },
  {
    id: 'od_0013', code: 'HD-R-20260916-0013', channel: 'RETAIL', status: 'COMPLETED', daysAgo: 6, hour: 16, minute: 20,
    customerId: 'cus_le01', customerName: 'Anh Nguyễn Văn Hùng', customerPhone: '0912 345 678',
    paymentMethod: 'VIETQR', lines: [['pr_kb_keychron', 1], ['pr_chuot_mx', 1, 2290000], ['pr_sac_anhn', 1]],
  },
];

export const orders: Order[] = specs.map(buildOrder);
