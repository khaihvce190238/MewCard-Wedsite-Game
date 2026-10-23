import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import * as c from '../controllers/authController.js';

const r = Router();
r.post('/register', h(c.register));
r.post('/login', h(c.login));
r.get('/me', authenticate, h(c.me));
r.put('/me', authenticate, h(c.updateMe));
r.put('/password', authenticate, h(c.changePassword));
export default r;
