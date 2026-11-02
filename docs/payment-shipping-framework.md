# Khung thanh toán + vận chuyển chung (HN_Team)

Mục đích: trước đây hệ thống chỉ có tiền mặt / COD ghi tay, chưa có cổng
thanh toán và chưa tích hợp hãng vận chuyển thật. Khung này tách riêng
phần "hãng nào" ra khỏi luồng đơn hàng, để sau này gắn VNPay, MoMo, GHN,
GHTK... mà không phải sửa route hay màn hình đơn hàng.

## Đã có trong khung này

### Thanh toán — `src/lib/payments/`
- `types.ts`: hợp đồng `PaymentProvider` (tạo payment + xác thực webhook).
- `providers.ts`: registry + `MockPaymentProvider` (không có tiền thật).
- `store.ts`: lưu payment trong bộ nhớ, chỉ cho chuyển trạng thái hợp lệ
  (PENDING → PAID / FAILED / CANCELLED, PAID → REFUNDED).
- `service.ts`: tạo payment, tra cứu, xử lý webhook đã xác thực.

API:
- `POST /api/payments` — tạo payment, cần đăng nhập.
  Body: `{ "orderId": "...", "amount": 250000 }`
- `GET /api/payments?orderId=...` — danh sách payment của 1 đơn.
- `GET /api/payments/[id]` — trạng thái 1 payment.
- `POST /api/payments/webhook` — hãng báo tiền về, không dùng session.
  Body mock: `{ "provider": "mock", "paymentId": "...", "status": "PAID" }`

### Vận chuyển — `src/lib/shipping/`
- `types.ts`: hợp đồng `ShippingProvider` (báo giá, tạo vận đơn, tracking, hủy).
- `providers.ts`: registry + `MockShippingProvider`.
- `store.ts`: lưu vận đơn trong bộ nhớ, chuyển trạng thái theo thứ tự
  CREATED → PICKED_UP → IN_TRANSIT → DELIVERED / FAILED / RETURNED.
- `service.ts`: báo giá, tạo vận đơn, tracking, xử lý webhook đã xác thực.

API:
- `POST /api/shipping/quote` — báo giá.
  Body: `{ "fromProvince": "Hà Nội", "toProvince": "TP. Hồ Chí Minh", "weightKg": 2 }`
- `POST /api/shipping/shipments` — tạo vận đơn, cần sender / receiver đầy đủ.
- `GET /api/shipping/shipments?orderId=...` hoặc `?trackingCode=...`
- `GET /api/shipping/shipments/[id]` — chi tiết vận đơn theo id hoặc mã tracking.
- `POST /api/shipping/webhook` — hãng báo trạng thái giao hàng.
  Body mock: `{ "provider": "mock", "trackingCode": "HN...", "status": "IN_TRANSIT" }`

Bảo mật webhook: nếu đặt `PAYMENT_WEBHOOK_SECRET` /
`SHIPPING_WEBHOOK_SECRET` thì request phải kèm header `x-webhook-secret`
trùng khớp. Adapter thật bắt buộc phải tự xác thực chữ ký của hãng bên
trong `verifyWebhook` — lớp secret ở route chỉ là lớp phụ, không thay thế
chữ ký của hãng.

## Chưa có — nói rõ để khỏi hiểu nhầm

- Chưa gắn hãng thật nào, chưa thu tiền thật, chưa tạo vận đơn thật.
- Giá ship của mock là công thức tạm (20.000 + 5.000/kg + 10.000 nếu khác
  tỉnh), không phải bảng giá thật của hãng.
- Dữ liệu payment / shipment đang ở bộ nhớ trong, tắt server là mất —
  cùng giới hạn như Mock Data Layer hiện tại. Khi chuyển sang Prisma thì
  thay `store.ts` bằng repository, giữ nguyên tên hàm.
- Webhook hiện chỉ đổi trạng thái bản ghi payment / shipment. Bước tự động
  ghi phiếu quỹ và đổi trạng thái đơn hàng sẽ nối vào `repo-cashbook` /
  `repo-orders` ở bước tiếp theo, sau khi chọn hãng thật và chuyển sang
  Prisma, vì hiện đơn hàng và payment đang ở 2 store riêng.
- COD cũ ở `/shipping/cod` vẫn giữ nguyên, không bị thay thế.

## Gắn hãng thật sau này — 4 bước, không sửa route

1. Tạo adapter mới implement đúng interface, ví dụ
   `src/lib/payments/vnpay.ts` implement `PaymentProvider`, hoặc
   `src/lib/shipping/ghn.ts` implement `ShippingProvider`. Trong
   `verifyWebhook` bắt buộc kiểm tra chữ ký / token của hãng.
2. Đăng ký: `registerPaymentProvider('vnpay', new VNPayProvider())` hoặc
   `registerShippingProvider('ghn', new GHNProvider())`.
3. Đặt biến môi trường trên server (xem `.env.payments-shipping.example`):
   `PAYMENT_PROVIDER=vnpay`, `SHIPPING_PROVIDER=ghn` và khóa của hãng.
   Không gửi khóa qua chat, không commit file `.env.local`.
4. Test ở sandbox của hãng trước, kiểm tra: tạo payment → webhook PAID →
   trạng thái đổi đúng; tạo vận đơn → webhook IN_TRANSIT → DELIVERED →
   trạng thái đổi đúng; webhook sai chữ ký bị từ chối và không đổi dữ liệu.

## Cách chạy thử nhanh (chế độ mock)

1. Đăng nhập web app, lấy cookie session.
2. Tạo payment, rồi gọi webhook với status `PAID`, sau đó GET lại payment
   để thấy trạng thái đã đổi.
3. Gọi báo giá ship, tạo vận đơn, rồi gọi webhook vận chuyển với
   `IN_TRANSIT` rồi `DELIVERED` để thấy lịch sử trạng thái tăng dần.
