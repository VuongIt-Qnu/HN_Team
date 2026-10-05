'use client';

import { formatDateTime, formatVND } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, type Order } from '@/types';

/**
 * Hoa don in nhiet (80mm) - duoc render trong Dialog sau khi thanh toan.
 * Class `print-area` dam bao khi bam Ctrl+P chi in phan hoa don nay.
 */
export function ReceiptView({ order }: { order: Order }) {
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="print-area mx-auto w-full max-w-sm space-y-2 bg-white p-4 font-mono text-[12px] text-black">
      <div className="text-center">
        <p className="text-base font-bold uppercase">HN GROUP</p>
        <p>{order.storeName}</p>
        <p className="font-semibold">HOÁ ĐƠN BÁN HÀNG</p>
        <p>Số: {order.code}</p>
      </div>

      <div className="border-y border-dashed border-black/40 py-1">
        <p>Thời gian: {formatDateTime(order.createdAt)}</p>
        <p>Thu ngân: {order.cashierName}</p>
        <p>Khách hàng: {order.customerName}</p>
        {order.customerPhone && <p>Điện thoại: {order.customerPhone}</p>}
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-dashed border-black/40 text-left">
            <th className="py-1">Tên hàng</th>
            <th className="py-1 text-center">SL</th>
            <th className="py-1 text-right">T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => (
            <tr key={item.id}>
              <td className="py-0.5">
                {item.name}
                {item.discount > 0 && <span className="block text-[10px]">(Giảm {formatVND(item.discount)})</span>}
              </td>
              <td className="py-0.5 text-center">{item.quantity}</td>
              <td className="py-0.5 text-right">{formatVND(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-0.5 border-t border-dashed border-black/40 pt-1">
        <Row label={`Tổng số lượng`} value={`${quantity}`} />
        <Row label="Tạm tính" value={formatVND(order.subtotal)} />
        {order.discount > 0 && <Row label="Chiết khấu" value={`-${formatVND(order.discount)}`} />}
        <Row label="TỔNG CỘNG" value={formatVND(order.total)} bold />
        <Row label={`Thanh toán (${PAYMENT_METHOD_LABELS[order.paymentMethod]})`} value={formatVND(order.paidAmount)} />
        {order.changeAmount > 0 && <Row label="Tiền thừa trả khách" value={formatVND(order.changeAmount)} />}
        {order.debtAmount > 0 && <Row label="Ghi nợ" value={formatVND(order.debtAmount)} />}
      </div>

      <div className="border-t border-dashed border-black/40 pt-2 text-center">
        <p>Cảm ơn Quý khách - Hẹn gặp lại!</p>
        <p className="text-[10px]">Hotline: 0243 555 0101 · hngroup.vn</p>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? 'text-[13px] font-bold' : ''}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
