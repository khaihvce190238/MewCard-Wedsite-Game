import { Router } from 'express';
import { asyncHandler as h } from '../utils/asyncHandler.js';
import { authenticate } from '../middlewares/auth.js';
import { rateLimit } from '../middlewares/rateLimit.js';
import * as c from '../controllers/authController.js';

const r = Router();
const min15 = 15 * 60 * 1000;
r.post('/register', rateLimit({ windowMs: min15, max: 20 }), h(c.register));
r.post('/register/verify', rateLimit({ windowMs: min15, max: 40 }), h(c.verifyRegistration));
r.post('/register/resend', rateLimit({ windowMs: min15, max: 20 }), h(c.resendCode));
r.post('/login', rateLimit({ windowMs: min15, max: 40 }), h(c.login));
r.post('/google', rateLimit({ windowMs: min15, max: 60 }), h(c.googleLogin));
r.get('/me', authenticate, h(c.me));
r.put('/me', authenticate, h(c.updateMe));
r.put('/password', authenticate, h(c.changePassword));
export default r;
