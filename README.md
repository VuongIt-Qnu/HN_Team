# HN Group — Web App Quản lý Bán hàng, Kho hàng & Công nợ (v5.0)

Chuyển đổi hệ thống Desktop v4.5 sang **Web Single Page Application (Next.js 14 App Router)**, hỗ trợ phân quyền chi tiết theo vai trò (RBAC), màn hình **POS tốc độ cao**, quản lý **kho**, **sổ quỹ – công nợ** và **báo cáo**.

Dự án code theo đúng 2 tài liệu chuẩn trong repo:

- `vibe-coding-skill.md` — quy chuẩn kỹ thuật, ma trận RBAC, cấu trúc thư mục (đã copy thành `.cursorrules` và `CLAUDE.md`).
- `vibe-coding-workflow.md` — quy trình 5 bước + 4 Master Prompts.

---

## 1. Công nghệ sử dụng

| Lớp | Công nghệ |
| :--- | :--- |
| Frontend | Next.js 14 (App Router), TypeScript strict, Tailwind CSS, Shadcn-style UI, Lucide Icons |
| State | Zustand (giỏ hàng POS + Toaster), TanStack Query v5 (server state) |
| Backend | Next.js Route Handlers (`src/app/api/**`) + API Guard (JWT + permission) |
| Xác thực | JWT HS256 (`jose`) trong cookie `httpOnly`, mật khẩu băm bằng Bcrypt |
| CSDL | **Mock Data Layer** in-memory (chạy ngay, không cần cài đặt) + **Prisma schema PostgreSQL** sẵn sàng chuyển đổi |
| Bảo mật | Middleware Route Guard (Edge) + `requireApiPermission` + loại bỏ trường giá vốn theo quyền |

---

## 2. Chạy nhanh (Local)

```powershell
# 1. Cài dependency
& "C:\Program Files\nodejs\npm.cmd" install

# 2. Tạo file biến môi trường (JWT_SECRET, UPLOAD_DIR...)
Copy-Item .env.example .env.local

# 3. Chạy dev server
& "C:\Program Files\nodejs\npm.cmd" run dev
# http://localhost:3000  ->  tự chuyển về /login
```

Kiểm tra chất lượng mã:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run typecheck   # tsc --noEmit
& "C:\Program Files\nodejs\npm.cmd" run build       # next build

# 4. Chạy bản production + smoke test API/nghiệp vụ (bao gồm luồng ảnh hoàn thiện COD)
& "C:\Program Files\nodejs\npm.cmd" run start -- -p 3100
& "C:\Program Files\nodejs\node.exe" scripts/smoke.mjs
# Test trên dev server: $env:BASE_URL='http://localhost:3000'; node scripts/smoke.mjs
```

> **Ảnh hoàn thiện (NV Kỹ thuật)**: file ảnh được ghi thật xuống đĩa tại `uploads/orders/<orderId>/`
> (đổi thư mục gốc bằng biến môi trường `UPLOAD_DIR`), xem lại qua `/api/uploads/[...path]` nên
> không cần dịch vụ lưu trữ ngoài. Thư mục `uploads/` chỉ chứa file do người dùng tải lên.

### Tài khoản mẫu (mật khẩu chung: `hn@123456`)

| Username | Vai trò | Quyền nổi bật | Route vào được |
| :--- | :--- | :--- | :--- |
| `root` | ROOT_ADMIN | Toàn quyền, quản lý tài khoản | `/*` |
| `quanly01` | STORE_MANAGER | Sửa giá, xem giá vốn, duyệt đơn/phiếu kho | `/dashboard`, `/pos`, `/orders/*`, `/inventory/*`, `/reports/*` |
| `ketoan01` | ACCOUNTANT | Sổ quỹ, công nợ, giá vốn, duyệt hoàn tiền | `/dashboard`, `/finance/*`, `/reports/*`, `/orders/wholesale` |
| `thukho01` | WAREHOUSE | Lập/duyệt phiếu kho — **ẩn giá vốn** | `/inventory/*` |
| `thungan01` | POS_CASHIER | Bán lẻ — **khóa sửa giá**, hạn mức chiết khấu 5% | `/pos`, `/orders/retail`, `/inventory/stock` |
| `kythuat01` | TECHNICIAN | Cập nhật thu hộ COD đơn được gán + **chụp ảnh hoàn thiện** | `/shipping/cod` |

> Thử truy cập sai quyền (ví dụ `thukho01` vào `/finance/cashbook`) → Middleware chuyển hướng về `/403-forbidden?from=/finance/cashbook`.

---

## 3. Bản đồ màn hình (50 giao diện v4.5 → 14 route web)

| Route | Phân hệ | Ghi chú kỹ thuật |
| :--- | :--- | :--- |
| `/login` | Xác thực | JWT cookie httpOnly, chọn nhanh tài khoản mẫu |
| `/403-forbidden` | Chặn truy cập trái phép | Hiện route bị chặn + vai trò hiện tại |
| `/dashboard` | Bảng điều khiển | Doanh thu 7 ngày, tồn quỹ, công nợ, hàng sắp hết |
| `/pos` | **POS Fullscreen** | Đa đơn (Multi-tab), autofocus quét mã vạch, F2/F3/F4/F12/ESC, in hoá đơn 80mm, Offline-First |
| `/orders/retail` | Đơn bán lẻ | Lọc theo trạng thái/ngày, xem chi tiết, chuyển trạng thái theo quyền |
| `/orders/wholesale` | Báo giá & đơn sỉ | Nút **[+ Tạo báo giá / Đơn sỉ]** + thêm KH ngay trong form; hàng `PENDING` ưu tiên duyệt, hiển thị công nợ còn lại |
| `/orders/returns` | Trả hàng / hoàn tiền | Sinh phiếu chi hoàn tiền (chờ duyệt) trong sổ quỹ |
| `/shipping/cod` | Kỹ thuật & giao hàng COD (mobile) | Gọi khách, mở bản đồ, ghi nhận thu hộ, **chụp ảnh hoàn thiện** |
| `/inventory/stock` | Tồn kho | Cột giá vốn/giá trị tồn chỉ hiện khi có `VIEW_COST_PRICE` |
| `/inventory/operations` | Phiếu Nhập/Xuất/Chuyển/Điều chỉnh | Lập phiếu + duyệt/thực hiện (cập nhật tồn kho tự động) |
| `/inventory/audit` | Kiểm kê | Phiên kiểm kê + duyệt điều chỉnh lệch kho |
| `/finance/cashbook` | Sổ quỹ | 4 thẻ số dư, phiếu thu/chi, duyệt phiếu chờ |
| `/finance/debts` | Công nợ | Tabs KH/NCC, quá hạn, ghi nhận thanh toán (sinh phiếu quỹ) |
| `/reports` | Báo cáo | Doanh thu/ngày, top sản phẩm, theo chi nhánh, xuất CSV; **2 biểu đồ doanh thu chỉ hiện với tài khoản Admin** |
| `/admin/users` | Tài khoản & Phân quyền | Modal tick từng URL Route + quyền thao tác, khóa/mở tài khoản |

---

## 4. Cấu trúc thư mục

```text
src/
├── app/
│   ├── (auth)/login                  # Đăng nhập
│   ├── (dashboard)/                  # Layout Admin (Sidebar + Topbar), POS fullscreen
│   │   ├── admin/users  pos  orders/*  shipping/cod
│   │   ├── inventory/{stock,operations,audit}
│   │   ├── finance/{cashbook,debts}   reports   dashboard
│   ├── 403-forbidden                 # Trang chặn quyền
│   └── api/                          # Route Handlers (auth, users, products, orders, ...)
├── components/
│   ├── ui/                           # Shadcn-style primitives
│   ├── features/                     # pos, admin, inventory, finance, orders, dashboard, shipping
│   └── shared/                       # Sidebar, Topbar, AppShell, EmptyState, PageHeader, LineChart (SVG), badges, session context
├── hooks/                            # use-hotkeys, use-pos-checkout
├── lib/
│   ├── api-guard.ts                  # requireApiSession / requireApiPermission / stripCostFields
│   ├── auth/                         # jwt.ts (jose), password.ts (bcrypt), session.ts (cookie)
│   ├── mock/                         # Data layer in-memory + seed + repositories
│   ├── rbac.ts                       # canAccessRoute / hasPermission / resolveHomeRoute
│   ├── constants.ts                  # APP_ROUTES + ma trận route mặc định theo vai trò
│   ├── order-rules.ts                # Quy tắc nghiệp vụ dùng chung (OrderRuleError, bắt buộc ảnh hoàn thiện)
│   ├── photo-limits.ts               # Giới hạn ảnh dùng chung client + server (8MB, 6 ảnh/lần)
│   ├── photo-storage.ts              # Lưu/xoá file ảnh hoàn thiện trong uploads/ (server-only)
│   └── serializers.ts                # Ẩn giá vốn/lợi nhuận theo quyền
├── middleware.ts                     # Route Guard (Edge)
└── types/                            # rbac, catalog, order, inventory, finance
prisma/
├── schema.prisma                     # PostgreSQL schema đầy đủ (FK, Index barcode, Enum)
└── seed.ts                           # Seed dữ liệu mẫu
```

## 5. Quy tắc nghiệp vụ đã cài đặt

- **Khóa sửa giá**: tài khoản không có `EDIT_SELL_PRICE` bị ép giá theo giá niêm yết (UI ẩn ô nhập, API ghi đè lại giá).
- **Đổi giá bán (ADMIN/QL)**: màn `/inventory/stock` có cột **Trạng thái** và nút **Đổi giá** (cần quyền `EDIT_SELL_PRICE`) — server chỉ cập nhật `Product.sellPrice`, **đơn hàng cũ giữ nguyên** giá tại thời điểm bán (validate: chỉ nhận số > 0, trả 400/404/403 đúng chuẩn).
- **Ngừng kinh doanh (Soft Delete)**: nút trên `/inventory/stock` với xác nhận, quyền `DELETE_DATA` — sản phẩm INACTIVE không còn hiển thị trong kho đang kinh doanh / POS / phiếu kho, **không được nhập/bán mới**, nhưng lịch sử nhập, đơn hàng, hoá đơn vẫn còn nguyên vẹn (không hard delete).
- **Chiết khấu vượt hạn mức**: vượt `discountLimit` mà không có `DISCOUNT_OVER_LIMIT` → UI cảnh báo, API trả lỗi 400.
- **Ẩn giá vốn**: mọi API đi qua `stripCostFields` / `serializeOrder` / `serializeReport` để xoá `costPrice`, `lineProfit`, `stockValue`, `profit`, `inventoryValue` với tài khoản không có `VIEW_COST_PRICE`.
- **Thủ kho ẩn giá vốn**: vai trò `WAREHOUSE` không được cấp `VIEW_COST_PRICE` theo đúng ma trận RBAC.
- **Khách lẻ phải trả đủ**: ghi nợ chỉ thực hiện khi đã định danh khách hàng.
- **Tạo báo giá & đơn sỉ**: nút **[+ Tạo báo giá / Đơn sỉ]** trên `/orders/wholesale` — lưu `DRAFT` (nháp) hoặc `PENDING` (gửi duyệt); **chưa trừ kho, chưa ghi sổ quỹ** cho tới khi phiếu được duyệt và hoàn tất. Bắt buộc chọn khách hàng đã định danh, mã phiếu `HD-S-…` tự sinh.
- **Thêm khách hàng mới**: nút **[+ Khách hàng]** tại ô khách của POS (`F4`) và trong form báo giá — bắt buộc tên + số điện thoại, mã `KH-XXXX` tự sinh, server chặn trùng SĐT (lỗi 400 nêu mã KH cũ).
- **Trả hàng**: hoàn tồn kho + sinh phiếu chi hoàn tiền ở trạng thái `WAITING_APPROVAL` trong sổ quỹ.
- **Duyệt phiếu kho / kiểm kê**: cần quyền `APPROVE_STOCK`; phiếu chỉ cập nhật tồn kho khi chuyển sang `DONE`.
- **COD / Kỹ thuật**: `kythuat01` chỉ thấy đơn được gán cho mình; thu đủ tiền → sinh phiếu thu sổ quỹ. Đơn COD **bắt buộc có ≥ 1 ảnh hoàn thiện** (chụp tại nơi giao, lưu file thật trong `uploads/orders/<orderId>/`) mới chuyển được sang `COMPLETED` — API chặn bằng `OrderRuleError` (HTTP 400) và nút "Giao thành công" bị khoá khi thiếu ảnh.
- **Đôn đốc công nợ**: quá hạn thanh toán → trạng thái tự chuyển `OVERDUE` (badge đỏ ở `/finance/debts`).
- **Biểu đồ doanh thu (chỉ Admin)**: khối "Thống kê biểu đồ doanh thu" trên `/reports` chỉ render với `ROOT_ADMIN`; API `/api/reports/charts` cũng trả 403 với vai trò khác. Biểu đồ vẽ bằng SVG thuần (không thêm thư viện), nút "In biểu đồ" chỉ in khu vực biểu đồ kèm khối "Ngày … / Người lập (Ký, họ tên)".

## 6. Phím tắt màn hình POS

| Phím | Chức năng |
| :--- | :--- |
| `F2` | Mở tab đơn mới (Multi-tab Orders) |
| `F3` | Focus ô tìm kiếm / quét mã vạch |
| `F4` | Focus ô tìm khách hàng |
| `F12` hoặc `Enter` | Thanh toán & in hoá đơn |
| `ESC` | Huỷ giỏ hàng hiện tại |

Giỏ hàng POS được lưu vào `localStorage` (key `hn-pos-cart-v1`) nên **mất mạng vẫn giữ nguyên**; khi có mạng chỉ cần bấm `F12` để thanh toán. Hoá đơn in theo khổ 80mm (chỉ phần `.print-area` được in, phần còn lại tự ẩn).

## 7. Chuyển sang PostgreSQL + Prisma (tuỳ chọn)

```powershell
# Cài Prisma + generate client + tạo bảng + seed dữ liệu mẫu
& "C:\Program Files\nodejs\npm.cmd" run db:setup
```

Sau đó thay các hàm trong `src/lib/mock/repo-*.ts` bằng Prisma Client — cấu trúc trường đã tương ứng 1-1 với `prisma/schema.prisma` (đủ FK, Enum và Index cho `barcode`, `orders.status`, `orders.createdAt`...). Giai đoạn hiện tại ứng dụng chạy hoàn toàn bằng Mock Data Layer nên demo được **toàn bộ luồng nghiệp vụ mà không cần database**.

## 8. Bản đồ API nội bộ

| Endpoint | Method | Quyền yêu cầu |
| :--- | :--- | :--- |
| `/api/auth/login`, `/api/auth/logout`, `/api/auth/me` | POST/GET | Công khai / phiên đăng nhập |
| `/api/users`, `/api/users/[id]` | GET/POST/PATCH/DELETE | `MANAGE_USERS` |
| `/api/catalog`, `/api/products`, `/api/customers` | GET | Phiên đăng nhập (đã lọc giá vốn) — `GET /api/products` mặc định chỉ SP đang kinh doanh (`ACTIVE`); `?includeInactive=true` cần `DELETE_DATA` |
| `/api/products/[id]/selling-price` | PATCH | `EDIT_SELL_PRICE` — **đổi giá bán hiện tại** (validate > 0, ẩn `costPrice` theo quyền; đơn hàng cũ giữ nguyên giá) |
| `/api/products/[id]/deactivate` | PATCH | `DELETE_DATA` — **ngừng kinh doanh** (soft delete, lịch sử nhập/bán/hoá đơn được giữ nguyên) |
| `/api/customers` | POST | Phiên đăng nhập — **thêm khách hàng mới** (bắt buộc tên + SĐT, mã KH tự sinh, chặn trùng SĐT) |
| `/api/orders`, `/api/orders/[id]` | GET/POST/PATCH | Phiên đăng nhập, duyệt đơn cần `APPROVE_ORDER` |
| `/api/shipping/cod` | GET/POST | Kỹ thuật / Quản lý / Admin |
| `/api/shipping/cod/photos` | POST/DELETE | Kỹ thuật (đơn của mình) / Quản lý / Admin — tải & xoá ảnh hoàn thiện (multipart) |
| `/api/uploads/[...path]` | GET | Phiên đăng nhập — phục vụ file ảnh hoàn thiện đã lưu trên server |
| `/api/inventory/stock` | GET | Phiên đăng nhập (lọc `costPrice`, `stockValue`) — `includeInactive=true` cần `DELETE_DATA` |
| `/api/inventory/operations`, `/api/inventory/operations/[id]` | GET/POST/PATCH | Duyệt/thực hiện cần `APPROVE_STOCK` |
| `/api/inventory/audit`, `/api/inventory/audit/[id]` | GET/POST/PATCH | Duyệt cần `APPROVE_STOCK` |
| `/api/finance/cashbook` | GET/POST | `MANAGE_CASHBOOK` (POST) |
| `/api/finance/debts` | GET/POST | `MANAGE_DEBT` (POST) |
| `/api/reports/overview` | GET | Phiên đăng nhập (lọc lợi nhuận theo quyền) |
| `/api/reports/charts` | GET | **Chỉ `ROOT_ADMIN`** — dữ liệu 2 biểu đồ doanh thu (ngày trong tháng / tháng trong năm) |

## 9. Checklist đối chiếu với `vibe-coding-workflow.md`

| Bước | Nội dung | Trạng thái |
| :--- | :--- | :--- |
| 1 | Init skeleton Next.js 14 + Shadcn UI + Layout Sidebar/Topbar | ✅ |
| 2 | `/admin/users`: tạo tài khoản, tick từng URL Route, tick quyền thao tác (sửa giá, xem giá vốn, duyệt đơn) | ✅ |
| 3 | Middleware Route Guard (chưa đăng nhập → `/login`, sai quyền → `/403-forbidden`) + dựng đủ khung 13 trang | ✅ |
| 4 | Chi tiết phân hệ POS, Kho, Sổ quỹ/Công nợ, Đơn hàng, COD + mock data kiểm thử | ✅ |
| 5 | Phím tắt F2/F3/F4/F12/ESC + Offline-First giỏ hàng + in hoá đơn | ✅ |
| 6 | Thống kê biểu đồ doanh thu (SVG thuần) riêng cho Admin trên `/reports` + in khu vực biểu đồ | ✅ |
| Prompt 4 | `prisma/schema.prisma` PostgreSQL đầy đủ FK/Index/Enum + `prisma/seed.ts` | ✅ |

