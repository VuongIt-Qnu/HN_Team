/** E2E smoke test. Prod: next build && next start -p 3100; dev: BASE_URL=http://localhost:3000. Chay: node scripts/smoke.mjs */
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';
let cookie = '';

async function req(path, opts = {}) {
  // Body la FormData (tai anh) -> de trinh duyet/undici tu sinh boundary, KHONG set Content-Type JSON.
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
    redirect: 'manual',
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* body khong phai JSON (HTML page) */
  }
  return { status: res.status, body, location: res.headers.get('location') };
}

const log = (label, value) => console.log(label.padEnd(34), value);

/** PNG 1x1 (base64) de test luong tai anh hoan thien bang multipart - noi dung file khong duoc server phan tich. */
const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==';

// 1. Chua dang nhap -> 401
log('COD list chua login (401?)', (await req('/api/shipping/cod')).status);

// 2. Dang nhap root
const login = await req('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'root', password: 'hn@123456' }),
});
log('login root', login.status);

// 3. Danh sach COD
const cod = await req('/api/shipping/cod');
log('COD list root', `${cod.status} total=${cod.body?.total}`);

// 4. Don si PENDING -> Duyet (CONFIRMED)
const whs = await req('/api/orders?channel=WHOLESALE&status=PENDING');
log('WHOLESALE PENDING', `${whs.status} total=${whs.body?.total}`);
if (whs.body?.total > 0) {
  const patched = await req(`/api/orders/${whs.body.items[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'CONFIRMED' }),
  });
  log('PATCH -> CONFIRMED', `${patched.status} status=${patched.body?.order?.status}`);
}

// 4b. Them khach hang moi (POST /api/customers) + chong trung so dien thoai
const newCus = await req('/api/customers', {
  method: 'POST',
  body: JSON.stringify({ name: 'KH Smoke Test', phone: '0999 888 777', address: 'Ha Noi', type: 'WHOLESALE' }),
});
log('POST customers', `${newCus.status} code=${newCus.body?.customer?.code ?? newCus.body?.message ?? ''}`);
const dupCus = await req('/api/customers', {
  method: 'POST',
  body: JSON.stringify({ name: 'KH Smoke Test trung SĐT', phone: '0999888777' }),
});
log('POST customers trung SDT (400?)', `${dupCus.status} ${dupCus.body?.message ?? ''}`);

// 4c. Tao bao gia si PENDING: ton kho KHONG giam + thieu khach hang bi chan 400
const prod1 = await req('/api/products?limit=1');
const beforeQty = prod1.body?.items?.[0]?.stock;
const quote = await req('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    channel: 'WHOLESALE',
    status: 'PENDING',
    customerId: newCus.body?.customer?.id ?? 'cus_si01',
    paymentMethod: 'TRANSFER',
    items: [{ productId: prod1.body?.items?.[0]?.id ?? 'pr_ss_s24', quantity: 1, unitPrice: 1000, discount: 0 }],
    discount: 0,
    paidAmount: 0,
    note: 'Smoke test bao gia si',
  }),
});
log('POST bao gia si PENDING', `${quote.status} code=${quote.body?.order?.code ?? quote.body?.message ?? ''}`);
const prod2 = await req('/api/products?limit=1');
log('ton kho sau bao gia (khong giam)', `${beforeQty} -> ${prod2.body?.items?.[0]?.stock}`);
const pendAfter = await req('/api/orders?channel=WHOLESALE&status=PENDING');
log('bao gia xuat hien trong PENDING', pendAfter.body?.items?.some((o) => o.id === quote.body?.order?.id) ?? false);
const noCus = await req('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    channel: 'WHOLESALE',
    status: 'PENDING',
    paymentMethod: 'TRANSFER',
    items: [{ productId: 'pr_ss_s24', quantity: 1, unitPrice: 1000, discount: 0 }],
    discount: 0,
    paidAmount: 0,
  }),
});
log('bao gia thieu khach hang (400?)', `${noCus.status} ${noCus.body?.message ?? ''}`);

// 5. Don le COMPLETED -> RETURNED (hoan kho + phieu chi)
const ret = await req('/api/orders?channel=RETAIL&status=COMPLETED&limit=1');
log('RETAIL COMPLETED', `${ret.status} total=${ret.body?.total}`);
if (ret.body?.total > 0) {
  const patched = await req(`/api/orders/${ret.body.items[0].id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'RETURNED' }),
  });
  log('PATCH -> RETURNED', `${patched.status} status=${patched.body?.order?.status}`);
}

// 6. Kho: kiem ke + phieu kho
log('inventory/audit', (await req('/api/inventory/audit')).status);
log('inventory/operations', (await req('/api/inventory/operations')).status);

// 7. Thu kho (khong co quyen so quy) - kiem tra dung 3 lop RBAC:
//    - GET session-only (dung cho nguoi xem co trang) -> 200
//    - POST bat buoc MANAGE_CASHBOOK -> 403
//    - Trang /finance/cashbook bi middleware chan (thukho01 khong co route) -> 307 -> /403-forbidden
cookie = '';
await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'thukho01', password: 'hn@123456' }) });
log('GET cashbook as thukho01 (session)', (await req('/api/finance/cashbook')).status);
const cashPost = await req('/api/finance/cashbook', {
  method: 'POST',
  body: JSON.stringify({ type: 'RECEIPT', category: 'SALE', amount: 1000, description: 'test' }),
});
log('POST cashbook as thukho01 (403?)', cashPost.status);
const cashPage = await fetch(BASE + '/finance/cashbook', { headers: { Cookie: cookie }, redirect: 'manual' });
log('page /finance/cashbook thukho01', `${cashPage.status}${cashPage.headers.get('location') ? ` -> ${cashPage.headers.get('location')}` : ''}`);

// 8. NV Ky thuat: xem tuyen + bat buoc anh hoan thien + thu ho + giao thanh cong
cookie = '';
const login3 = await req('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ username: 'kythuat01', password: 'hn@123456' }),
});
log('login kythuat01', login3.status);
const cod2 = await req('/api/shipping/cod');
log('COD list kythuat01', `${cod2.status} total=${cod2.body?.total}`);
const actives = (cod2.body?.items ?? []).filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERING');
const active = actives[0];

if (active) {
  // 8a. Chua co anh hoan thien -> khong duoc chuyen sang COMPLETED (400 + code ORDER_RULE_VIOLATION)
  if ((active.photos?.length ?? 0) === 0) {
    const blocked = await req(`/api/orders/${active.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
    log('COD hoan tat thieu anh (400?)', `${blocked.status} ${blocked.body?.code ?? ''}`);
  }

  // 8b. Chup / chon anh hoan thien -> tai len server (multipart/form-data)
  const form = new FormData();
  form.append('orderId', active.id);
  form.append('files', new Blob([Buffer.from(PNG_1PX_BASE64, 'base64')], { type: 'image/png' }), 'hoan-thien-smoke.png');
  const uploaded = await req('/api/shipping/cod/photos', { method: 'POST', body: form });
  log(
    'COD tai anh hoan thien',
    `${uploaded.status} uploaded=${uploaded.body?.uploaded} anh=${uploaded.body?.order?.photos?.length ?? 0}`,
  );

  const photo = uploaded.body?.order?.photos?.[0];
  if (photo) {
    const img = await fetch(BASE + photo.url, { headers: cookie ? { Cookie: cookie } : {} });
    const size = (await img.arrayBuffer()).byteLength;
    log('  xem lai anh (dang nhap)', `${img.status} ${img.headers.get('content-type')} ${size}b`);
  }

  // 8c. Thu ho COD: du tien + da co anh -> don tu chuyen COMPLETED
  const collect = await req('/api/shipping/cod', {
    method: 'POST',
    body: JSON.stringify({ orderId: active.id, amount: active.codAmount ?? active.total }),
  });
  log('COD collect', `${collect.status} ${collect.body?.order?.status ?? collect.body?.message ?? ''}`);
  if (collect.body?.order?.status !== 'COMPLETED') {
    const done = await req(`/api/orders/${active.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) });
    log('COD giao thanh cong', `${done.status} -> ${done.body?.order?.status}`);
  }

  // 8d. Don khac: thu ho nhung CHUA co anh hoan thien -> giu nguyen trang thai (khong tu hoan tat)
  const second = actives.find((o) => o.id !== active.id);
  if (second) {
    const noPhoto = await req('/api/shipping/cod', {
      method: 'POST',
      body: JSON.stringify({ orderId: second.id, amount: second.codAmount ?? second.total }),
    });
    log('COD thu ho chua co anh', `${noPhoto.status} status=${noPhoto.body?.order?.status ?? ''}`);
  }
}

// 8e. Anh hoan thien bat buoc dang nhap: goi khong cookie -> 401
log('uploads chua login (401?)', (await fetch(BASE + '/api/uploads/orders/khong-ton-tai.png')).status);


// 9. Cac page chinh (voi session kythuat01 dang dung)
for (const page of ['/login', '/shipping/cod', '/dashboard', '/orders/retail', '/orders/wholesale', '/orders/returns', '/finance/cashbook', '/pos']) {
  const res = await fetch(BASE + page, { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
  log(`page ${page}`, res.status + (res.headers.get('location') ? ` -> ${res.headers.get('location')}` : ''));
}

// 10. Bieu do doanh thu: /api/reports/charts chi cho phep ROOT_ADMIN
cookie = '';
await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'quanly01', password: 'hn@123456' }) });
log('charts as quanly01 (403?)', (await req('/api/reports/charts')).status);
const reportsAsManager = await fetch(BASE + '/reports', { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
const managerHtml = await reportsAsManager.text();
log('page /reports quanly01', `${reportsAsManager.status} coBieuDoAdmin=${managerHtml.includes('Thống kê biểu đồ doanh thu')}`);

cookie = '';
await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'root', password: 'hn@123456' }) });
const charts = await req('/api/reports/charts');
const chartData = charts.body?.charts;
const daily = chartData?.dailyByMonth ?? [];
const monthly = chartData?.monthlyByYear ?? [];
log('charts root', `${charts.status} thang=${daily.length} chuoiThang=${monthly.length} nam=${chartData?.year}`);
log('  tong doanh thu', `nam nay=${chartData?.yearTotal} nam ngoai=${chartData?.previousYearTotal}`);
log('  do dai truc X = 31', daily.every((s) => s.values.length === (chartData?.daysInMonth ?? 0)));
const dailySum = daily.reduce((sum, s) => sum + s.values.reduce((a, b) => a + b, 0), 0);
log('  doi chieu ngay/thang', dailySum === chartData?.yearTotal);
const today = new Date();
log('  doanh thu hom nay', daily[today.getMonth()]?.values[today.getDate() - 1] ?? 0);
const reportsAsRoot = await fetch(BASE + '/reports', { headers: cookie ? { Cookie: cookie } : {}, redirect: 'manual' });
const rootHtml = await reportsAsRoot.text();
log('page /reports root', `${reportsAsRoot.status} coBieuDoAdmin=${rootHtml.includes('Thống kê biểu đồ doanh thu')}`);
// Tieu de 2 LineChart chi render SAU khi client fetch du lieu tu /api/reports/charts (da kiem tra o day),
// nen HTML SSR chi assert cac phan static: mo ta khu bieu do + nut In bieu do.
log('  the bieu do (SSR)', `moTa=${rootHtml.includes('Riêng tài khoản Quản trị (Admin)')} inBieuDo=${rootHtml.includes('In biểu đồ')}`);

// 11. QUAN LY SAN PHAM (WAREHOUSE PRODUCT MANAGEMENT SKILL):
//     doi gia (admin), phan quyen 403, don cu giu gia, soft delete, lich su bao toan.
// (cookie hien tai = root tu section 10)
const KP_ID = 'pr_kb_keychron';
const KP_BARCODE = '8931234500097';

const plist = await req('/api/products?includeInactive=true&limit=100');
const prodKb = (plist.body?.items ?? []).find((p) => p.id === KP_ID);
const oldPrice = prodKb?.sellPrice ?? 0;
log('tim SP de test', `${KP_ID}: gia=${oldPrice} trang thai=${prodKb?.status ?? '?'}`);

// Snapshot don cu chua SP (od_0013 COMPLETED) TRUOC khi doi gia (Test 3 cua skill)
const orderSnap = await req('/api/orders/od_0013');
const lineBefore = orderSnap.body?.order?.items?.find((i) => i.productId === KP_ID);
log('gia trong don cu od_0013', `${lineBefore?.unitPrice}`);

// 11a. Doi gia ban: ADMIN (root) -> 200 + gia moi (Test 1 cua skill)
const newPrice = oldPrice + 100000;
const chg = await req(`/api/products/${KP_ID}/selling-price`, {
  method: 'PATCH',
  body: JSON.stringify({ sellPrice: newPrice }),
});
log('doi gia ban (root 200?)', `${chg.status} gia=${chg.body?.product?.sellPrice ?? chg.body?.message ?? ''}`);

// 11b. Validation gia ban (skill §10): 0 / am / null -> 400
for (const bad of [0, -100000, null]) {
  const badRes = await req(`/api/products/${KP_ID}/selling-price`, {
    method: 'PATCH',
    body: JSON.stringify({ sellPrice: bad }),
  });
  log(`gia ban = ${String(bad)} (400?)`, badRes.status);
}
log('doi gia SP khong ton tai (404?)', (await req('/api/products/pr_khong_ton_tai/selling-price', {
  method: 'PATCH',
  body: JSON.stringify({ sellPrice: 1000 }),
})).status);

// 11c. Don cu KHONG doi gia sau khi doi gia ban (Test 3 cua skill)
const orderAfter = await req('/api/orders/od_0013');
const lineAfter = orderAfter.body?.order?.items?.find((i) => i.productId === KP_ID);
log('don cu od_0013 giu nguyen gia', `${lineBefore?.unitPrice} -> ${lineAfter?.unitPrice} (khong doi=${lineBefore?.unitPrice === lineAfter?.unitPrice})`);

// 11d. USER thuong (thungan01, POS_CASHIER) -> 403 (Test 2 & 6 cua skill)
cookie = '';
await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'thungan01', password: 'hn@123456' }) });
log('thungan01 doi gia ban (403?)', (await req(`/api/products/${KP_ID}/selling-price`, {
  method: 'PATCH',
  body: JSON.stringify({ sellPrice: 9999999 }),
})).status);
log('thungan01 deactivate (403?)', (await req(`/api/products/${KP_ID}/deactivate`, { method: 'PATCH' })).status);
log('thungan01 xem hang inactive (403?)', (await req('/api/products?includeInactive=true&limit=1')).status);
// 11e. Back to root: gia khong bi USER doi, SP van nhu truoc do (hoat dong ne ban chua deactivate)
cookie = '';
await req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: 'root', password: 'hn@123456' }) });
const intact = await req('/api/products?includeInactive=true&limit=100');
const intactRow = (intact.body?.items ?? []).find((p) => p.id === KP_ID);
log('gia khong bi USER doi', `gia=${intactRow?.sellPrice} (bang ${newPrice}=${intactRow?.sellPrice === newPrice})`);
const preStatus = intactRow?.status;

// 11f. Tao 1 phieu nhap lich su cho SP neu con hoat dong (de kiem tra bao toan sau deactivate)
let histOpCode = null;
if (preStatus === 'ACTIVE') {
  const imp = await req('/api/inventory/operations', {
    method: 'POST',
    body: JSON.stringify({ type: 'IMPORT', items: [{ productId: KP_ID, quantity: 2, costPrice: 1000 }], reason: 'Smoke test lich su nhap hang' }),
  });
  histOpCode = imp.body?.operation?.code;
  log('IMPORT tao lich su nhap', `${imp.status} ${histOpCode ?? imp.body?.message ?? ''}`);
}

// 11g. Admin deactivate (Test 4 cua skill)
const deact = await req(`/api/products/${KP_ID}/deactivate`, { method: 'PATCH' });
log('deactivate (root 200?)', `${deact.status} trang thai=${deact.body?.product?.status ?? deact.body?.message ?? ''}`);

// 11h. Mac dinh an khoi danh sach; admin van thay voi includeInactive=true (§8)
const listDefault = await req('/api/products?limit=100');
log('an khoi GET /api/products mac dinh', `${!(listDefault.body?.items ?? []).some((p) => p.id === KP_ID)}`);
const listAll = await req('/api/products?includeInactive=true&limit=100');
log('admin thay voi includeInactive=true', `${(listAll.body?.items ?? []).find((p) => p.id === KP_ID)?.status}`);
const bcInactive = await req(`/api/products?barcode=${KP_BARCODE}`);
log('barcode hang inactive -> khong tim thay', (bcInactive.body?.items?.length ?? -1));
const stockDefault = await req('/api/inventory/stock?search=Keychron');
log('an khoi bang ton kho mac dinh', (stockDefault.body?.items?.length ?? -1));
const stockAll = await req('/api/inventory/stock?includeInactive=true');
log('admin thay ton kho hang inactive', `${(stockAll.body?.items ?? []).filter((i) => i.productId === KP_ID).length > 0}`);

// 11i. Lich su bao toan sau deactivate (Test 5 cua skill)
const histOrder = await req('/api/orders/od_0013');
const histLine = histOrder.body?.order?.items?.find((i) => i.productId === KP_ID);
log('don lich su od_0013 van ton tai', `${histOrder.status} gia_dong=${histLine?.unitPrice}`);
const histOps = await req('/api/inventory/operations?q=Keychron');
log('phieu nhap lich su van ton tai', `${histOps.body?.total}`);
const allOps = await req('/api/inventory/operations');
log('tong so phieu kho (khong bi cascade xoa)', allOps.body?.total);

// 11j. Backend chan nhap/ban hang da ngung kinh doanh
const sellInactive = await req('/api/orders', {
  method: 'POST',
  body: JSON.stringify({
    channel: 'RETAIL',
    paymentMethod: 'CASH',
    items: [{ productId: KP_ID, quantity: 1, unitPrice: 3000000, discount: 0 }],
    discount: 0,
    paidAmount: 3000000,
  }),
});
log('ban hang inactive (400?)', `${sellInactive.status} ${sellInactive.body?.message ?? ''}`);
const importInactive = await req('/api/inventory/operations', {
  method: 'POST',
  body: JSON.stringify({ type: 'IMPORT', items: [{ productId: KP_ID, quantity: 1 }], reason: 'Thu chan hang inactive' }),
});
log('nhap hang inactive (400?)', `${importInactive.status} ${importInactive.body?.message ?? ''}`);

// 11k. Deactivate SP khong ton tai -> 404 (skill §10)
log('deactivate SP khong ton tai (404?)', (await req('/api/products/pr_khong_ton_tai/deactivate', { method: 'PATCH' })).status);

// 11l. Deactivate idempotent: goi lai van 200 (an toan khi smoke chay nhieu lan)
log('deactivate lai (200?)', (await req(`/api/products/${KP_ID}/deactivate`, { method: 'PATCH' })).status);

