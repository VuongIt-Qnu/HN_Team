/**
 * Seed du lieu mau cho PostgreSQL (Prisma).
 * Chay: npm run db:seed  (sau khi da chay npm run db:push)
 *
 * Du lieu giu tuong thich nghiep vu voi Mock Data Layer (src/lib/mock/seed-*.ts)
 * de co the doi chieu ket qua khi chuyen tu mock sang CSDL that.
 *
 * Luu y: file nay nam ngoai tsconfig cua app (chi chay bang tsx) nen khong anh huong build Next.
 */
import { PrismaClient, type CashbookCategory, type CashbookMethod, type PermissionCode, type RoleCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'hn@123456';

const STORES = [
  { code: 'CH-HN01', name: 'HN Group - Trụ sở Hà Nội', address: '128 Trần Duy Hưng, Cầu Giấy, Hà Nội', phone: '0243 555 0101', isMain: true },
  { code: 'CH-HCM01', name: 'HN Group - Chi nhánh HCM', address: '45 Nguyễn Thị Minh Khai, Quận 1, TP. HCM', phone: '0283 555 0202', isMain: false },
  { code: 'CH-DN01', name: 'HN Group - Chi nhánh Đà Nẵng', address: '77 Nguyễn Văn Linh, Hải Châu, Đà Nẵng', phone: '0236 555 0303', isMain: false },
];

const CATEGORIES = [
  { code: 'DM-DT', name: 'Điện thoại' },
  { code: 'DM-LT', name: 'Laptop & Máy tính' },
  { code: 'DM-PK', name: 'Phụ kiện' },
  { code: 'DM-GD', name: 'Gia dụng' },
  { code: 'DM-VP', name: 'Văn phòng phẩm' },
];

const PERMISSIONS: Array<{ code: PermissionCode; name: string }> = [
  { code: 'MANAGE_USERS', name: 'Quản lý tài khoản & phân quyền' },
  { code: 'EDIT_SELL_PRICE', name: 'Được sửa giá bán' },
  { code: 'VIEW_COST_PRICE', name: 'Được xem giá vốn / lãi' },
  { code: 'APPROVE_ORDER', name: 'Được duyệt đơn / báo giá sỉ' },
  { code: 'APPROVE_STOCK', name: 'Duyệt phiếu kho & kiểm kê' },
  { code: 'APPROVE_REFUND', name: 'Duyệt hoàn tiền / trả hàng' },
  { code: 'DISCOUNT_OVER_LIMIT', name: 'Chiết khấu vượt hạn mức' },
  { code: 'MANAGE_CASHBOOK', name: 'Quản lý sổ quỹ (thu/chi)' },
  { code: 'MANAGE_DEBT', name: 'Quản lý công nợ' },
  { code: 'EXPORT_REPORT', name: 'Xuất báo cáo' },
  { code: 'DELETE_DATA', name: 'Xóa dữ liệu' },
];

/** Ma tran RBAC: vai tro -> quyen thao tac + URL Route duoc phep. */
const ROLES: Array<{ code: RoleCode; name: string; permissions: PermissionCode[]; routes: string[] }> = [
  { code: 'ROOT_ADMIN', name: 'Giám đốc / Admin', permissions: PERMISSIONS.map((item) => item.code), routes: ['/*'] },
  {
    code: 'STORE_MANAGER',
    name: 'Quản lý cửa hàng',
    permissions: ['EDIT_SELL_PRICE', 'VIEW_COST_PRICE', 'APPROVE_ORDER', 'APPROVE_STOCK', 'APPROVE_REFUND', 'DISCOUNT_OVER_LIMIT', 'EXPORT_REPORT'],
    routes: ['/dashboard', '/pos', '/orders/*', '/inventory/*', '/reports/*'],
  },
  {
    code: 'ACCOUNTANT',
    name: 'Kế toán',
    permissions: ['VIEW_COST_PRICE', 'APPROVE_ORDER', 'APPROVE_REFUND', 'MANAGE_CASHBOOK', 'MANAGE_DEBT', 'EXPORT_REPORT'],
    routes: ['/dashboard', '/finance/*', '/reports/*', '/orders/wholesale'],
  },
  { code: 'WAREHOUSE', name: 'Thủ kho', permissions: ['APPROVE_STOCK'], routes: ['/inventory/*'] },
  { code: 'POS_CASHIER', name: 'NV Bán hàng (POS)', permissions: [], routes: ['/pos', '/orders/retail'] },
  { code: 'TECHNICIAN', name: 'NV Kỹ thuật (Giao hàng – COD)', permissions: [], routes: ['/shipping/cod'] },
];

/** Nguoi dung mac dinh (mat khau chung: DEMO_PASSWORD) */
const USERS: Array<{ username: string; fullName: string; phone: string; email?: string; role: RoleCode; storeIndex: number; discountLimit: number }> = [
  { username: 'root', fullName: 'Nguyễn Đức Hùng (Giám đốc)', phone: '0901 222 333', email: 'hung.nd@hngroup.vn', role: 'ROOT_ADMIN', storeIndex: 0, discountLimit: 100 },
  { username: 'quanly01', fullName: 'Trần Mạnh Quân', phone: '0902 333 444', email: 'quan.tm@hngroup.vn', role: 'STORE_MANAGER', storeIndex: 0, discountLimit: 15 },
  { username: 'ketoan01', fullName: 'Phạm Thị Lan', phone: '0903 444 555', email: 'lan.pt@hngroup.vn', role: 'ACCOUNTANT', storeIndex: 0, discountLimit: 0 },
  { username: 'thukho01', fullName: 'Đỗ Văn Thắng', phone: '0904 555 666', email: 'thang.dv@hngroup.vn', role: 'WAREHOUSE', storeIndex: 0, discountLimit: 0 },
  { username: 'thungan01', fullName: 'Lê Thị Mai', phone: '0905 666 777', email: 'mai.lt@hngroup.vn', role: 'POS_CASHIER', storeIndex: 0, discountLimit: 5 },
  { username: 'kythuat01', fullName: 'Vũ Hồng Nam', phone: '0906 777 888', email: 'nam.vh@hngroup.vn', role: 'TECHNICIAN', storeIndex: 0, discountLimit: 0 },
];

const SUPPLIERS = [
  { code: 'NCC-SS', name: 'Samsung Vina Electronics', phone: '0243 999 1001', address: 'KCN Bắc Thăng Long, Hà Nội', note: 'Công nợ 30 ngày' },
  { code: 'NCC-AP', name: 'Apple Authorized VN', phone: '0283 999 2002', address: 'Quận 1, TP. HCM', note: 'Thanh toán ngay' },
  { code: 'NCC-LG', name: 'Logitech Việt Nam', phone: '0283 999 3003', address: 'Bình Thạnh, TP. HCM' },
  { code: 'NCC-SH', name: 'Sunhouse Việt Nam', phone: '0243 999 4004', address: 'Thanh Trì, Hà Nội' },
  { code: 'NCC-VP', name: 'VPP Hồng Hà', phone: '0243 999 5005', address: 'Hoàn Kiếm, Hà Nội' },
];

interface SeedProduct {
  sku: string;
  barcode: string;
  name: string;
  categoryCode: string;
  supplierCode: string;
  unit: string;
  sellPrice: number;
  costPrice: number;
  quantity: number;
  minStock: number;
}

const PRODUCTS: SeedProduct[] = [
  { sku: 'SP-0001', barcode: '8931234500011', name: 'Samsung Galaxy S24 256GB', categoryCode: 'DM-DT', supplierCode: 'NCC-SS', unit: 'Chiếc', sellPrice: 21990000, costPrice: 19850000, quantity: 12, minStock: 5 },
  { sku: 'SP-0002', barcode: '8931234500028', name: 'Samsung Galaxy A55 5G 128GB', categoryCode: 'DM-DT', supplierCode: 'NCC-SS', unit: 'Chiếc', sellPrice: 9490000, costPrice: 8250000, quantity: 24, minStock: 8 },
  { sku: 'SP-0003', barcode: '8931234500035', name: 'iPhone 15 128GB', categoryCode: 'DM-DT', supplierCode: 'NCC-AP', unit: 'Chiếc', sellPrice: 20490000, costPrice: 18900000, quantity: 9, minStock: 4 },
  { sku: 'SP-0004', barcode: '8931234500059', name: 'Tai nghe Samsung Galaxy Buds FE', categoryCode: 'DM-PK', supplierCode: 'NCC-SS', unit: 'Bộ', sellPrice: 1490000, costPrice: 1050000, quantity: 48, minStock: 10 },
  { sku: 'SP-0005', barcode: '8931234500080', name: 'Chuột không dây Logitech MX Master 3S', categoryCode: 'DM-PK', supplierCode: 'NCC-LG', unit: 'Chiếc', sellPrice: 2390000, costPrice: 1720000, quantity: 32, minStock: 10 },
  { sku: 'SP-0006', barcode: '8931234500110', name: 'Nồi chiên không dầu Sunhouse 6L', categoryCode: 'DM-GD', supplierCode: 'NCC-SH', unit: 'Chiếc', sellPrice: 2190000, costPrice: 1480000, quantity: 21, minStock: 6 },
  { sku: 'SP-0007', barcode: '8931234500165', name: 'Giấy in A4 Double A 70gsm (ram)', categoryCode: 'DM-VP', supplierCode: 'NCC-VP', unit: 'Ram', sellPrice: 78000, costPrice: 58000, quantity: 240, minStock: 60 },
];

const CUSTOMERS = [
  { code: 'KH-0001', name: 'Anh Nguyễn Văn Hùng', phone: '0912 345 678', address: 'Thanh Xuân, Hà Nội', type: 'RETAIL' as const, points: 320 },
  { code: 'KH-0002', name: 'Chị Trần Thu Hà', phone: '0988 111 222', address: 'Hai Bà Trưng, Hà Nội', type: 'RETAIL' as const, points: 145 },
  { code: 'KH-0003', name: 'Công ty TNHH TM Đông Á', phone: '0904 777 888', address: 'Long Biên, Hà Nội', type: 'WHOLESALE' as const, points: 4820 },
  { code: 'KH-0004', name: 'Cửa hàng Điện máy Minh Phát', phone: '0937 456 789', address: 'Hà Đông, Hà Nội', type: 'WHOLESALE' as const, points: 2140 },
];

async function main() {
  console.log('>> Bat dau seed du lieu HN Group v5.0 ...');

  // 1) Chi nhanh
  const stores = [];
  for (const store of STORES) {
    stores.push(await prisma.store.upsert({ where: { code: store.code }, update: store, create: store }));
  }

  // 2) Nhom hang & nha cung cap
  const categoryIds = new Map<string, string>();
  for (const category of CATEGORIES) {
    const saved = await prisma.category.upsert({ where: { code: category.code }, update: category, create: category });
    categoryIds.set(category.code, saved.id);
  }

  const supplierIds = new Map<string, string>();
  for (const supplier of SUPPLIERS) {
    const saved = await prisma.supplier.upsert({ where: { code: supplier.code }, update: supplier, create: supplier });
    supplierIds.set(supplier.code, saved.id);
  }

  // 3) Quyen thao tac & vai tro (ma tran RBAC)
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: permission.code }, update: permission, create: permission });
  }

  const roleIds = new Map<RoleCode, string>();
  for (const role of ROLES) {
    const savedRole = await prisma.role.upsert({
      where: { code: role.code },
      update: { name: role.name },
      create: { code: role.code, name: role.name },
    });
    roleIds.set(role.code, savedRole.id);

    for (const permissionCode of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: savedRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: savedRole.id, permissionId: permission.id },
      });
    }
  }

  // 4) Tai khoan nhan vien + route duoc phep + quyen thao tac
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  for (const user of USERS) {
    const role = ROLES.find((item) => item.code === user.role)!;
    const savedUser = await prisma.user.upsert({
      where: { username: user.username },
      update: { fullName: user.fullName, phone: user.phone, discountLimit: user.discountLimit },
      create: {
        username: user.username,
        passwordHash,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
        roleCode: user.role,
        roleId: roleIds.get(user.role)!,
        storeId: stores[user.storeIndex].id,
        discountLimit: user.discountLimit,
      },
    });

    for (const routePath of role.routes) {
      await prisma.userRouteAccess.upsert({
        where: { userId_routePath: { userId: savedUser.id, routePath } },
        update: {},
        create: { userId: savedUser.id, routePath },
      });
    }

    for (const permissionCode of role.permissions) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permissionCode } });
      await prisma.userPermission.upsert({
        where: { userId_permissionId: { userId: savedUser.id, permissionId: permission.id } },
        update: {},
        create: { userId: savedUser.id, permissionId: permission.id },
      });
    }
  }

  // 5) San pham + ton kho cho tung chi nhanh
  for (const product of PRODUCTS) {
    const savedProduct = await prisma.product.upsert({
      where: { sku: product.sku },
      update: { sellPrice: product.sellPrice, costPrice: product.costPrice },
      create: {
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        unit: product.unit,
        sellPrice: product.sellPrice,
        costPrice: product.costPrice,
        minStock: product.minStock,
        categoryId: categoryIds.get(product.categoryCode)!,
        supplierId: supplierIds.get(product.supplierCode)!,
      },
    });

    for (const [index, store] of stores.entries()) {
      const quantity = index === 0 ? product.quantity : Math.max(1, Math.floor(product.quantity / 2));
      await prisma.inventory.upsert({
        where: { storeId_productId: { storeId: store.id, productId: savedProduct.id } },
        update: { quantity },
        create: { storeId: store.id, productId: savedProduct.id, quantity },
      });
    }
  }

  // 6) Khach hang
  const customerIds = new Map<string, string>();
  for (const customer of CUSTOMERS) {
    const saved = await prisma.customer.upsert({ where: { code: customer.code }, update: customer, create: customer });
    customerIds.set(customer.code, saved.id);
  }

  // 7) Phieu thu/chi mau
  const rootUser = await prisma.user.findUniqueOrThrow({ where: { username: 'root' } });
  const sampleEntries: Array<{
    code: string;
    type: 'RECEIPT' | 'PAYMENT';
    category: CashbookCategory;
    amount: number;
    method: CashbookMethod;
    description: string;
  }> = [
    { code: 'PT-20260922-0001', type: 'RECEIPT', category: 'SALE', amount: 19440000, method: 'CASH', description: 'Thu tiền bán lẻ tại quầy' },
    { code: 'PT-20260922-0002', type: 'RECEIPT', category: 'DEBT_COLLECT', amount: 15000000, method: 'TRANSFER', description: 'Thu hồi công nợ đợt 2' },
    { code: 'PC-20260921-0004', type: 'PAYMENT', category: 'SUPPLIER_PAYMENT', amount: 28000000, method: 'TRANSFER', description: 'Thanh toán tiền hàng đợt 3/9' },
  ];
  for (const entry of sampleEntries) {
    await prisma.cashbookEntry.upsert({
      where: { code: entry.code },
      update: {},
      create: { ...entry, storeId: stores[0].id, createdBy: rootUser.id, status: 'POSTED' },
    });
  }

  // 8) Cong no mau (khach hang + nha cung cap)
  const debtSamples = [
    {
      partnerType: 'CUSTOMER' as const,
      partnerCode: 'KH-0003',
      partnerName: 'Công ty TNHH TM Đông Á',
      phone: '0904 777 888',
      totalDebt: 101500000,
      paidAmount: 15000000,
      status: 'PARTIAL' as const,
      customerId: customerIds.get('KH-0003'),
    },
    {
      partnerType: 'SUPPLIER' as const,
      partnerCode: 'NCC-SS',
      partnerName: 'Samsung Vina Electronics',
      phone: '0243 999 1001',
      totalDebt: 48500000,
      paidAmount: 28000000,
      status: 'PARTIAL' as const,
      supplierId: supplierIds.get('NCC-SS'),
    },
  ];

  for (const debt of debtSamples) {
    const existed = await prisma.debt.findFirst({
      where: { partnerCode: debt.partnerCode, partnerType: debt.partnerType },
    });
    if (!existed) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      await prisma.debt.create({ data: { ...debt, dueDate } });
    }
  }

  console.log('>> Seed hoan tat.');
  console.log('   Tai khoan mau (mat khau chung "%s"): root, quanly01, ketoan01, thukho01, thungan01, kythuat01', DEMO_PASSWORD);
}

main()
  .catch((error) => {
    console.error('Seed that bai:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

