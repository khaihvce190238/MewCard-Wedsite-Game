import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedNext, canTransition, canRequestCancel } from '../utils/orderStateMachine.js';
import { buildPaymentUrl, verifySignature, buildSignData, vnpDate, cleanOrderInfo } from '../utils/vnpay.js';

test('state machine: bước chuyển hợp lệ / không hợp lệ', () => {
  assert.ok(canTransition({ Status: 'Pending' }, 'Confirmed'));
  assert.ok(!canTransition({ Status: 'Pending' }, 'Delivered'));
  assert.ok(!canTransition({ Status: 'Delivered' }, 'Cancelled'));
  assert.ok(canTransition({ Status: 'CancellationRequested' }, 'Cancelled'));
  assert.ok(canTransition({ Status: 'CancellationRequested' }, 'CancellationRejected'));
  assert.deepEqual(allowedNext({ Status: 'CancellationRejected', StatusBeforeCancelRequest: 'Confirmed' }), ['Shipping']);
  assert.ok(!canTransition({ Status: 'Cancelled' }, 'Pending'));
});
test('user chỉ hủy được đơn Pending/Confirmed', () => {
  assert.ok(canRequestCancel({ Status: 'Pending' }));
  assert.ok(canRequestCancel({ Status: 'Confirmed' }));
  assert.ok(!canRequestCancel({ Status: 'Shipping' }));
  assert.ok(!canRequestCancel({ Status: 'Delivered' }));
});
test('VNPay: ký rồi xác minh được; sửa dữ liệu thì thất bại', () => {
  const secret = 'TESTSECRET123';
  const params = { vnp_Amount: '8900000', vnp_TxnRef: '12345', vnp_OrderInfo: cleanOrderInfo('Thanh toán đơn #5'), vnp_ResponseCode: '00' };
  const url = new URL(buildPaymentUrl('https://sandbox.example/pay', params, secret));
  const q = Object.fromEntries(url.searchParams.entries());
  assert.ok(verifySignature(q, secret));
  assert.ok(!verifySignature({ ...q, vnp_Amount: '100' }, secret));
  assert.ok(!verifySignature(q, 'WRONG'));
  assert.ok(!verifySignature({ vnp_Amount: '1' }, secret));
});
test('VNPay: sắp xếp tham số + định dạng ngày + làm sạch OrderInfo', () => {
  assert.equal(buildSignData({ b: '2', a: 'x y' }), 'a=x+y&b=2');
  assert.match(vnpDate(), /^\d{14}$/);
  assert.equal(cleanOrderInfo('Thanh toán đơn #5!'), 'Thanh toan don 5');
});
