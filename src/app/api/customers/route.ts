import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { createCustomer, listCustomers } from '@/lib/mock/db';
import { normalizeVN } from '@/lib/utils';
import type { Customer } from '@/types';

/** GET /api/customers - Tim khach hang cho man hinh POS (F4) va cong no. */
export async function GET(request: Request) {
  try {
    await requireApiSession();
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q')?.trim() ?? '';
    const limit = Number.parseInt(searchParams.get('limit') ?? '20', 10);
    const type = searchParams.get('type')?.trim();

    let items = listCustomers();
    if (type === 'RETAIL' || type === 'WHOLESALE') items = items.filter((c) => c.type === type);
    if (keyword) {
      const normalized = normalizeVN(keyword);
      items = items.filter(
        (customer) =>
          normalizeVN(customer.name).includes(normalized) ||
          customer.phone.replace(/\s/g, '').includes(keyword.replace(/\s/g, '')) ||
          customer.code.toLowerCase().includes(keyword.toLowerCase()),
      );
    }

    return jsonOk({ items: items.slice(0, limit > 0 ? limit : items.length) });
  } catch (error) {
    return jsonError(error);
  }
}

/** POST /api/customers - Them khach hang moi (POS them nhanh + form bao gia si). */
export async function POST(request: Request) {
  try {
    await requireApiSession();
    const body = (await request.json().catch(() => ({}))) as Partial<
      Pick<Customer, 'name' | 'phone' | 'address' | 'type' | 'note'>
    >;

    if (!body.name?.trim()) throw new ApiError(400, 'Vui lòng nhập tên khách hàng.');
    if (!body.phone?.trim()) throw new ApiError(400, 'Vui lòng nhập số điện thoại khách hàng.');

    let customer: Customer;
    try {
      customer = createCustomer({
        name: body.name,
        phone: body.phone,
        address: body.address,
        type: body.type === 'WHOLESALE' ? 'WHOLESALE' : 'RETAIL',
        note: body.note,
      });
    } catch (error) {
      // Loi nghiep vu (trung SĐT, SĐT sai dinh dang...) -> 400 de UI hien thi dung.
      throw new ApiError(400, error instanceof Error ? error.message : 'Không tạo được khách hàng.');
    }
    return jsonOk({ customer }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
