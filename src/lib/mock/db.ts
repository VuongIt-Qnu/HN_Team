import { hashPassword, verifyPassword } from '@/lib/auth/password';
import type {
  CashbookEntry,
  Category,
  Customer,
  DebtRecord,
  Order,
  Product,
  StockAuditSession,
  StockOperation,
  Store,
  Supplier,
  UserRecord,
  UserStatus,
} from '@/types';
import { branchStock, categories, customers, products, stores, suppliers } from './seed-catalog';
import { cashbookEntries, debts } from './seed-finance';
import { orders as seedOrders } from './seed-orders';
import { DEMO_PASSWORD, seedUsers } from './seed-users';
import { stockAudits, stockOperations } from './seed-warehouse';

/**
 * DATA LAYER (Mock / In-memory).
 *
 * Buoc 4 cua workflow: "Tich hop mock data de kiem thu luong giao dich".
 * Toan bo API Route Handler doc/ghi qua lop nay nen khi chuyen sang
 * PostgreSQL + Prisma chi can thay the cac ham list / find / create / update
 * bang Prisma Client (xem prisma/schema.prisma - cau truc truong tuong ung 1-1).
 *
 * Du lieu duoc cache tren `globalThis` de khong mat trang thai khi Next dev HMR.
 */

export interface MockUser extends UserRecord {
  passwordHash: string;
}

export interface MockState {
  stores: Store[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  users: MockUser[];
  orders: Order[];
  stockOperations: StockOperation[];
  stockAudits: StockAuditSession[];
  cashbookEntries: CashbookEntry[];
  debts: DebtRecord[];
  /** stockQty[storeId][productId] = so luong ton. */
  stockQty: Record<string, Record<string, number>>;
  /** Cac don hang da ap dung hieu ung kho/quy (tranh trung khi doi trang thai nhieu lan). */
  appliedOrderIds: string[];
  counters: Record<string, number>;
}

const GLOBAL_KEY = '__HN_GROUP_MOCK_DB__';

function storeNameOf(storeId: string): string {
  return stores.find((s) => s.id === storeId)?.name ?? 'Không xác định';
}

function createState(): MockState {
  const primaryStore = stores[0];
  const stockQty: Record<string, Record<string, number>> = {
    [primaryStore.id]: Object.fromEntries(products.map((p) => [p.id, p.stock])),
  };
  for (const [storeId, map] of Object.entries(branchStock)) {
    stockQty[storeId] = { ...map };
  }

  // Bam 1 lan cho mat khau demo (tat ca tai khoan mau dung chung 1 mat khau).
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const users: MockUser[] = seedUsers.map((seed) => ({
    ...seed,
    storeName: storeNameOf(seed.storeId),
    passwordHash,
  }));

  return {
    stores,
    categories,
    products: products.map((p) => ({ ...p })),
    customers: customers.map((c) => ({ ...c })),
    suppliers: suppliers.map((s) => ({ ...s })),
    users,
    orders: seedOrders.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })),
    stockOperations: stockOperations.map((o) => ({ ...o, items: o.items.map((i) => ({ ...i })) })),
    stockAudits: stockAudits.map((a) => ({ ...a, items: a.items.map((i) => ({ ...i })) })),
    cashbookEntries: [...cashbookEntries],
    debts: [...debts],
    stockQty,
    /** Cac don mau duoi day da co hieu ung kho/quy trong du lieu seed. */
    appliedOrderIds: seedOrders.filter((o) => o.status === 'COMPLETED' || o.status === 'RETURNED').map((o) => o.id),
    counters: { ORD: 13, WHS: 8, AUDIT: 3, CB: 14, USR: 7 },
  };
}

/** Singleton state (an toan voi HMR cua Next dev). */
export function db(): MockState {
  const globalRef = globalThis as typeof globalThis & { [GLOBAL_KEY]?: MockState };
  if (!globalRef[GLOBAL_KEY]) {
    globalRef[GLOBAL_KEY] = createState();
  }
  return globalRef[GLOBAL_KEY] as MockState;
}

/** Sinh so thu tu tiep theo cho tung loai chung tu. */
export function nextSequence(kind: 'ORD' | 'WHS' | 'AUDIT' | 'CB' | 'USR'): number {
  const state = db();
  state.counters[kind] = (state.counters[kind] ?? 0) + 1;
  return state.counters[kind];
}

export function getStore(storeId: string): Store | undefined {
  return db().stores.find((s) => s.id === storeId);
}

/** Ten chi nhanh theo id (dung khi tao chung tu). */
export function storeNameById(storeId: string): string {
  return storeNameOf(storeId);
}

/* ------------------------------------------------------------------ */
/* CATALOG & TON KHO                                                  */
/* ------------------------------------------------------------------ */

/**
 * Danh sach san pham.
 * Soft delete (WAREHOUSE skill §8): mac dinh chi tra ve san pham ACTIVE;
 * truyen `includeInactive: true` chi dung cho man hinh quan ly (yeu cau quyen).
 */
export function listProducts(options: { includeInactive?: boolean } = {}): Product[] {
  return db()
    .products.filter((p) => options.includeInactive || p.status === 'ACTIVE')
    .map((p) => ({ ...p, stock: stockQtyOf(p.id, db().stores[0].id) }));
}

export function findProduct(id: string): Product | undefined {
  return db().products.find((p) => p.id === id);
}

/** Quet ma vach / SKU: mac dinh chi hang ACTIVE (hang ngung kinh doanh khong ban duoc). */
export function findProductByBarcode(code: string, options: { includeInactive?: boolean } = {}): Product | undefined {
  const target = code.trim().toLowerCase();
  return db().products.find(
    (p) =>
      (options.includeInactive || p.status === 'ACTIVE') &&
      (p.barcode.toLowerCase() === target || p.sku.toLowerCase() === target),
  );
}

/**
 * Doi gia ban HIENTAI cua san pham (WAREHOUSE skill §8).
 * Chi cap nhat Product.sellPrice + updatedAt - KHONG dong vao don hang / phieu nhap da co
 * (don hang luu snapshot unitPrice/costPrice tai thoi diem giao dich).
 * Nghiệp vu validate (gia > 0, tim thay SP) thuc hien o Route bang ApiError.
 */
export function updateProductSellPrice(id: string, sellPrice: number): Product | undefined {
  const product = db().products.find((p) => p.id === id);
  if (!product) return undefined;
  product.sellPrice = sellPrice;
  product.updatedAt = new Date().toISOString();
  return product;
}

/**
 * Soft delete san pham (WAREHOUSE skill §5): dat status = INACTIVE,
 * KHONG xoa khoi mang -> don hang / phieu nhap / hoa don lich su van ton tai day du.
 */
export function deactivateProduct(id: string): Product | undefined {
  const product = db().products.find((p) => p.id === id);
  if (!product) return undefined;
  product.status = 'INACTIVE';
  product.updatedAt = new Date().toISOString();
  return product;
}

export function listCategories(): Category[] {
  const state = db();
  return state.categories.map((c) => ({
    ...c,
    /** Dem dung mat hang dang kinh doanh (khop voi danh sach duoc loc ACTIVE). */
    productCount: state.products.filter((p) => p.categoryId === c.id && p.status === 'ACTIVE').length,
  }));
}

export function listCustomers(): Customer[] {
  return db().customers.map((c) => ({ ...c, debt: customerDebtOf(c.id) }));
}

/** Tao khach hang moi (dung cho POS them nhanh + form bao gia si). */
export function createCustomer(input: {
  name: string;
  phone: string;
  address?: string;
  type?: Customer['type'];
  note?: string;
}): Customer {
  const state = db();
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) throw new Error('Vui lòng nhập tên khách hàng.');
  if (!phone) throw new Error('Vui lòng nhập số điện thoại khách hàng.');
  if (!/^[0-9+.\s()-]{8,16}$/.test(phone)) {
    throw new Error('Số điện thoại chưa hợp lệ (8-16 ký tự số).');
  }
  const digits = phone.replace(/\D/g, '');
  const dup = state.customers.find((c) => c.phone.replace(/\D/g, '') === digits);
  if (dup) throw new Error(`Số điện thoại đã dùng cho khách "${dup.name}" (${dup.code}).`);

  const maxSeq = state.customers.reduce((max, c) => {
    const m = /KH-(\d+)/.exec(c.code);
    return m ? Math.max(max, Number.parseInt(m[1], 10)) : max;
  }, 0);
  const customer: Customer = {
    id: `cus_${Date.now().toString(36)}`,
    code: `KH-${`${maxSeq + 1}`.padStart(4, '0')}`,
    name,
    phone,
    address: input.address?.trim() || '—',
    type: input.type ?? 'RETAIL',
    debt: 0,
    points: 0,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  state.customers.unshift(customer);
  return customer;
}

export function findCustomer(id: string): Customer | undefined {
  const customer = db().customers.find((c) => c.id === id);
  return customer ? { ...customer, debt: customerDebtOf(customer.id) } : undefined;
}

export function listSuppliers(): Supplier[] {
  return db().suppliers.map((s) => ({ ...s, debt: supplierDebtOf(s.id) }));
}

export function stockQtyOf(productId: string, storeId: string): number {
  return db().stockQty[storeId]?.[productId] ?? 0;
}

/** Cong/tru ton kho (am = xuat). Tra ve so luong sau khi thay doi. */
export function mutateStock(productId: string, storeId: string, delta: number): number {
  const state = db();
  if (!state.stockQty[storeId]) state.stockQty[storeId] = {};
  const current = state.stockQty[storeId][productId] ?? 0;
  const next = current + delta;
  state.stockQty[storeId][productId] = next;
  return next;
}

export function setStock(productId: string, storeId: string, quantity: number): number {
  const state = db();
  if (!state.stockQty[storeId]) state.stockQty[storeId] = {};
  state.stockQty[storeId][productId] = quantity;
  return quantity;
}

/** Cong no khach hang = tong no con lai cua cac phieu cong no + no tren don hang. */
export function customerDebtOf(customerId: string): number {
  const state = db();
  const fromDebts = state.debts
    .filter((d) => d.partnerType === 'CUSTOMER' && d.partnerId === customerId)
    .reduce((sum, d) => sum + Math.max(d.totalDebt - d.paidAmount, 0), 0);
  const fromOrders = state.orders
    .filter((o) => o.customerId === customerId && o.debtAmount > 0 && o.status !== 'CANCELLED' && o.status !== 'RETURNED')
    .reduce((sum, o) => sum + o.debtAmount, 0);
  return fromDebts + fromOrders;
}

export function supplierDebtOf(supplierId: string): number {
  return db()
    .debts.filter((d) => d.partnerType === 'SUPPLIER' && d.partnerId === supplierId)
    .reduce((sum, d) => sum + Math.max(d.totalDebt - d.paidAmount, 0), 0);
}

/* ------------------------------------------------------------------ */
/* USERS                                                              */
/* ------------------------------------------------------------------ */

export function toUserRecord(user: MockUser): UserRecord {
  const { passwordHash: _passwordHash, ...record } = user;
  return record;
}

export function listUsers(): UserRecord[] {
  return db().users.map(toUserRecord);
}

/**
 * Danh sach NV Ky thuat con hoat dong (de thu ngan chon nguoi phu trach khi len don COD).
 * Tra ve ban ghi user day du nhung khong kem thong tin nhay cam (passwordHash).
 */
export function listTechnicians(): Pick<
  UserRecord,
  'id' | 'username' | 'fullName' | 'phone' | 'role' | 'storeId' | 'storeName' | 'status'
>[] {
  return db()
    .users.filter((user) => user.role === 'TECHNICIAN' && user.status === 'ACTIVE')
    .map(({ id, username, fullName, phone, role, storeId, storeName, status }) => ({
      id,
      username,
      fullName,
      phone,
      role,
      storeId,
      storeName,
      status,
    }));
}

export function findUserById(id: string): MockUser | undefined {
  return db().users.find((u) => u.id === id);
}

export function findUserByUsername(username: string): MockUser | undefined {
  const target = username.trim().toLowerCase();
  return db().users.find((u) => u.username.toLowerCase() === target);
}

export function authenticateUser(username: string, password: string): UserRecord | null {
  const user = findUserByUsername(username);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  if (user.status !== 'ACTIVE') return null;
  user.lastLoginAt = new Date().toISOString();
  return toUserRecord(user);
}

export interface CreateUserInput {
  username: string;
  password: string;
  fullName: string;
  phone: string;
  email?: string;
  role: UserRecord['role'];
  storeId: string;
  status?: UserStatus;
  allowedRoutes: string[];
  permissions: UserRecord['permissions'];
  discountLimit?: number;
}

export function createUser(input: CreateUserInput): UserRecord {
  const state = db();
  if (findUserByUsername(input.username)) {
    throw new Error(`Tên đăng nhập "${input.username}" đã tồn tại.`);
  }
  const user: MockUser = {
    id: `us_${nextSequence('USR')}_${Date.now().toString(36)}`,
    username: input.username.trim(),
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    email: input.email?.trim(),
    role: input.role,
    storeId: input.storeId,
    storeName: storeNameOf(input.storeId),
    status: input.status ?? 'ACTIVE',
    allowedRoutes: input.allowedRoutes,
    permissions: input.permissions,
    discountLimit: input.discountLimit ?? 10,
    createdAt: new Date().toISOString(),
    passwordHash: hashPassword(input.password),
  };
  state.users.push(user);
  return toUserRecord(user);
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & { password?: string };

export function updateUser(id: string, patch: UpdateUserInput): UserRecord {
  const state = db();
  const user = state.users.find((u) => u.id === id);
  if (!user) throw new Error('Không tìm thấy tài khoản cần cập nhật.');

  if (patch.username && patch.username.toLowerCase() !== user.username.toLowerCase()) {
    if (findUserByUsername(patch.username)) {
      throw new Error(`Tên đăng nhập "${patch.username}" đã tồn tại.`);
    }
    user.username = patch.username.trim();
  }
  if (patch.fullName !== undefined) user.fullName = patch.fullName.trim();
  if (patch.phone !== undefined) user.phone = patch.phone.trim();
  if (patch.email !== undefined) user.email = patch.email?.trim();
  if (patch.role !== undefined) user.role = patch.role;
  if (patch.storeId !== undefined) {
    user.storeId = patch.storeId;
    user.storeName = storeNameOf(patch.storeId);
  }
  if (patch.status !== undefined) user.status = patch.status;
  if (patch.allowedRoutes !== undefined) user.allowedRoutes = patch.allowedRoutes;
  if (patch.permissions !== undefined) user.permissions = patch.permissions;
  if (patch.discountLimit !== undefined) user.discountLimit = patch.discountLimit;
  if (patch.password) user.passwordHash = hashPassword(patch.password);

  return toUserRecord(user);
}

export function lockUser(id: string): UserRecord {
  return updateUser(id, { status: 'LOCKED' });
}
