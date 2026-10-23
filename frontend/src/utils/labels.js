export const ORDER_STATUS = {
  Pending: 'Chờ xử lý', Confirmed: 'Đã xác nhận', Shipping: 'Đang giao', Delivered: 'Đã giao',
  CancellationRequested: 'Chờ duyệt hủy', CancellationRejected: 'Từ chối hủy', Cancelled: 'Đã hủy',
};
export const PAYMENT_STATUS = { Unpaid: 'Chưa thanh toán', Pending: 'Đang chờ thanh toán', Paid: 'Đã thanh toán', Failed: 'Thất bại', Refunded: 'Đã hoàn tiền' };
export const PAYMENT_METHOD = { Mock: 'Thanh toán giả lập', VNPay: 'VNPay (sandbox)' };
export const MEMBER_STATUS = { Pending: 'Chờ duyệt', Approved: 'Đã duyệt', Rejected: 'Bị từ chối', Cancelled: 'Đã hủy' };
export const badgeTone = (s) =>
  ({ Paid: 'ok', Approved: 'ok', Delivered: 'ok', Confirmed: 'ok', Active: 'ok', Shipping: 'info',
    Pending: 'warn', CancellationRequested: 'warn', Unpaid: 'warn',
    Failed: 'bad', Rejected: 'bad', Cancelled: 'bad', CancellationRejected: 'bad', Locked: 'bad', Refunded: 'info' }[s] || 'info');
