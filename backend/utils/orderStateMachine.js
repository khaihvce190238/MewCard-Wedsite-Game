// Máy trạng thái đơn hàng: chỉ cho phép các bước chuyển hợp lệ.
export const ORDER_STATUSES = ['Pending', 'Confirmed', 'Shipping', 'Delivered', 'CancellationRequested', 'CancellationRejected', 'Cancelled'];

const NEXT = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['Shipping', 'Cancelled'],
  Shipping: ['Delivered'],
  Delivered: [],
  CancellationRequested: ['Cancelled', 'CancellationRejected'],
  Cancelled: [],
};
// Sau khi từ chối hủy, đơn đi tiếp theo trạng thái trước lúc yêu cầu hủy.
const AFTER_REJECT = { Pending: ['Confirmed'], Confirmed: ['Shipping'], Shipping: ['Delivered'] };

/** Admin được chuyển từ order.Status sang những trạng thái nào. */
export function allowedNext(order) {
  if (order.Status === 'CancellationRejected') return AFTER_REJECT[order.StatusBeforeCancelRequest] || [];
  return NEXT[order.Status] || [];
}

export const canTransition = (order, to) => allowedNext(order).includes(to);

/** User chỉ được gửi yêu cầu hủy khi đơn chưa giao đi. */
export const canRequestCancel = (order) => ['Pending', 'Confirmed'].includes(order.Status);
