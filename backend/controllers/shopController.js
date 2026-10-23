import * as products from '../services/productService.js';
import * as cart from '../services/cartService.js';
import * as orders from '../services/orderService.js';
import { fileUrl } from '../middlewares/upload.js';
import { ok, created } from '../utils/response.js';
import { int } from '../utils/validate.js';

const id = (req, p = 'id') => int(req.params[p], 'ID');
const page = (res, { rows, meta }) => ok(res, rows, meta);

export const productList = async (req, res) => page(res, await products.listPublic(req.query));
export const productGet = async (req, res) => ok(res, await products.getPublic(id(req)));
export const adminProductList = async (req, res) => page(res, await products.listAdmin(req.query));
export const productCreate = async (req, res) => created(res, await products.create(req.body, fileUrl(req.file)), { message: 'Đã thêm sản phẩm' });
export const productUpdate = async (req, res) => ok(res, await products.update(id(req), req.body, fileUrl(req.file)), { message: 'Đã cập nhật sản phẩm' });
export const productStatus = async (req, res) => ok(res, await products.setStatus(id(req), req.body.isActive), { message: 'Đã cập nhật trạng thái' });

export const cartGet = async (req, res) => ok(res, await cart.getCart(req.user.UserID));
export const cartAdd = async (req, res) => created(res, await cart.addItem(req.user.UserID, req.body), { message: 'Đã thêm vào giỏ hàng' });
export const cartUpdate = async (req, res) => ok(res, await cart.updateItem(req.user.UserID, id(req), req.body));
export const cartRemove = async (req, res) => ok(res, await cart.removeItem(req.user.UserID, id(req)), { message: 'Đã xóa khỏi giỏ hàng' });

export const orderCreate = async (req, res) => created(res, await orders.createOrder(req.user.UserID, req.body), { message: 'Đặt hàng thành công' });
export const orderMine = async (req, res) => page(res, await orders.myOrders(req.user.UserID, req.query));
export const orderMineOne = async (req, res) => ok(res, await orders.myOrder(req.user.UserID, id(req)));
export const orderCancelRequest = async (req, res) => ok(res, await orders.requestCancel(req.user.UserID, id(req), req.body), { message: 'Đã gửi yêu cầu hủy đơn, vui lòng chờ Admin xét duyệt' });
export const adminOrderList = async (req, res) => page(res, await orders.adminList(req.query));
export const adminOrderStatus = async (req, res) => ok(res, await orders.adminUpdateStatus(id(req), req.body), { message: 'Đã cập nhật đơn hàng' });
export const adminOrderRefund = async (req, res) => ok(res, await orders.adminMarkRefunded(id(req), req.body), { message: 'Đã đánh dấu hoàn tiền' });
