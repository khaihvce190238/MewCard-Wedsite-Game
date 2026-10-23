import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import * as c from '../controllers/membershipController.js';

export const userRouter = Router();
userRouter.use(authenticate);
userRouter.post('/', h(c.apply));
userRouter.get('/my', h(c.mine));
userRouter.patch('/:id/cancel', h(c.cancel));

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/', h(c.adminList));
adminRouter.get('/:id', h(c.adminDetail));
adminRouter.patch('/:id/review', h(c.review));
