import { ApiError, jsonError, jsonOk, requireApiSession } from '@/lib/api-guard';
import { addOrderPhotos, findOrder, removeOrderPhoto } from '@/lib/mock/repo-orders';
import { deleteStoredPhoto, saveOrderPhotos } from '@/lib/photo-storage';
import { MAX_PHOTOS_PER_REQUEST } from '@/lib/photo-limits';
import { serializeOrder } from '@/lib/serializers';
import type { RoleCode, SessionUser } from '@/types';

/** Vai tro duoc phep day / xoa anh hoan thien. */
const UPLOAD_ROLES: RoleCode[] = ['TECHNICIAN', 'ROOT_ADMIN', 'STORE_MANAGER'];

function assertUploadRole(session: SessionUser, action: string) {
  if (!UPLOAD_ROLES.includes(session.role)) {
    throw new ApiError(403, `Chỉ nhân viên kỹ thuật hoặc quản lý được ${action} ảnh hoàn thiện.`);
  }
}

/** Ky thuat chi thao tac tren don duoc gan cho minh; quan ly / admin thao tac moi don. */
function assertCanTouchOrder(session: SessionUser, orderId: string) {
  const order = findOrder(orderId);
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn hàng.');
  if (session.role === 'TECHNICIAN' && order.shipperId !== session.id) {
    throw new ApiError(403, 'Bạn chỉ cập nhật ảnh cho đơn được gán cho mình.');
  }
  return order;
}

/**
 * POST /api/shipping/cod/photos - Ky thuat chup / chon anh hoan thien va day len website.
 * Body: multipart/form-data gom `orderId`, `files` (nhieu anh) va `note` (tuy chon).
 * File duoc ghi xuong dia (uploads/orders/<orderId>/...) va luu metadata vao don hang.
 */
export async function POST(request: Request) {
  try {
    const session = await requireApiSession();
    assertUploadRole(session, 'tải');

    const form = await request.formData().catch(() => null);
    if (!form) throw new ApiError(400, 'Dữ liệu tải lên không hợp lệ (cần multipart/form-data).');

    const orderId = String(form.get('orderId') ?? '').trim();
    if (!orderId) throw new ApiError(400, 'Thiếu mã đơn hàng.');
    const note = String(form.get('note') ?? '').trim() || undefined;

    const order = assertCanTouchOrder(session, orderId);
    if (order.status === 'CANCELLED' || order.status === 'RETURNED') {
      throw new ApiError(400, 'Đơn đã huỷ hoặc đã trả hàng nên không thể tải ảnh hoàn thiện.');
    }

    const files = form.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);
    if (files.length === 0) throw new ApiError(400, 'Chưa chọn ảnh nào để tải lên.');
    if (files.length > MAX_PHOTOS_PER_REQUEST) {
      throw new ApiError(400, `Mỗi lần chỉ tải tối đa ${MAX_PHOTOS_PER_REQUEST} ảnh.`);
    }

    const { photos, skipped } = await saveOrderPhotos({
      orderId,
      files,
      uploadedById: session.id,
      uploadedByName: session.fullName,
      note,
    });

    if (photos.length === 0) {
      throw new ApiError(400, `Không có ảnh hợp lệ để lưu. ${skipped.join('; ')}`);
    }

    const updated = addOrderPhotos(orderId, photos);
    return jsonOk({
      order: serializeOrder(session, updated),
      uploaded: photos.length,
      skipped,
      message: `Đã lưu ${photos.length} ảnh hoàn thiện cho đơn ${updated.code}.`,
    });
  } catch (error) {
    return jsonError(error);
  }
}

/** DELETE /api/shipping/cod/photos?orderId=...&photoId=... - Xoa 1 anh (chup lai khi anh bi loi). */
export async function DELETE(request: Request) {
  try {
    const session = await requireApiSession();
    assertUploadRole(session, 'xoá');

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId')?.trim() ?? '';
    const photoId = searchParams.get('photoId')?.trim() ?? '';
    if (!orderId || !photoId) throw new ApiError(400, 'Thiếu mã đơn hàng hoặc mã ảnh.');

    assertCanTouchOrder(session, orderId);
    const removed = removeOrderPhoto(orderId, photoId);
    if (!removed) throw new ApiError(404, 'Không tìm thấy ảnh cần xoá.');

    await deleteStoredPhoto(removed.path);
    const order = assertCanTouchOrder(session, orderId);
    return jsonOk({ order: serializeOrder(session, order), message: 'Đã xoá ảnh hoàn thiện.' });
  } catch (error) {
    return jsonError(error);
  }
}
