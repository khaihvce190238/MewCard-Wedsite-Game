import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { requireAdmin } from '../middlewares/auth.js';
import { uploadCardImages, uploadSingleImage } from '../middlewares/upload.js';
import * as c from '../controllers/contentController.js';

export const publicRouter = Router();
publicRouter.get('/topics', h(c.publicTopics));
publicRouter.get('/topics/:id/cards', h(c.publicTopicCards));

export const adminRouter = Router();
adminRouter.use(requireAdmin);
adminRouter.get('/topics', h(c.adminTopics));
adminRouter.post('/topics', uploadSingleImage, h(c.createTopic));
adminRouter.put('/topics/:id', uploadSingleImage, h(c.updateTopic));
adminRouter.patch('/topics/:id/status', h(c.topicStatus));
adminRouter.get('/cards', h(c.adminCards));
adminRouter.post('/cards', uploadCardImages, h(c.createCard));
adminRouter.put('/cards/:id', uploadCardImages, h(c.updateCard));
adminRouter.patch('/cards/:id/status', h(c.cardStatus));
adminRouter.post('/cards/:id/images', uploadCardImages, h(c.cardImages));
