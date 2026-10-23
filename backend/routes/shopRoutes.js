import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import { uploadSingleImage } from '../middlewares/upload.js';
import * as c from '../controllers/shopController.js';

export const productRouter = Router();
productRouter.get('/', h(c.productList));
productRouter.get('/:id', h(c.productGet));

export const cartRouter = Router();
cartRouter.use(authenticate);
cartRouter.get('/', h(c.cartGet));
cartRouter.post('/items', h(c.cartAdd));
cartRouter.patch('/items/:id', h(c.cartUpdate));
cartRouter.delete('/items/:id', h(c.cartRemove));

export const orderRouter = Router();
orderRouter.use(authenticate);
orderRouter.post('/', h(c.orderCreate));
orderRouter.get('/my', h(c.orderMine));
orderRouter.get('/my/:id', h(c.orderMineOne));
orderRouter.post('/:id/cancel-request', h(c.orderCancelRequest));

export const adminShopRouter = Router();
adminShopRouter.use(requireAdmin);
adminShopRouter.get('/products', h(c.adminProductList));
adminShopRouter.post('/products', uploadSingleImage, h(c.productCreate));
adminShopRouter.put('/products/:id', uploadSingleImage, h(c.productUpdate));
adminShopRouter.patch('/products/:id/status', h(c.productStatus));
adminShopRouter.get('/orders', h(c.adminOrderList));
adminShopRouter.patch('/orders/:id/status', h(c.adminOrderStatus));
adminShopRouter.patch('/orders/:id/refund', h(c.adminOrderRefund));
