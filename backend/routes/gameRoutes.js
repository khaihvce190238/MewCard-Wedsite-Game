import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import * as c from '../controllers/gameController.js';

export const drawRouter = Router();
drawRouter.use(authenticate);
drawRouter.post('/', h(c.drawOne));
drawRouter.post('/start', h(c.start));
drawRouter.post('/leave', h(c.leave));
drawRouter.get('/history', h(c.history));

export const favoriteRouter = Router();
favoriteRouter.use(authenticate);
favoriteRouter.get('/', h(c.favList));
favoriteRouter.post('/:cardId', h(c.favAdd));
favoriteRouter.delete('/:cardId', h(c.favRemove));
