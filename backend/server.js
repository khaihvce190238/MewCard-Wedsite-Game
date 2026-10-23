import express from 'express';
import cors from 'cors';
import { env, assertEnv } from './config/env.js';
import { getPool } from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import { publicRouter as contentPublic, adminRouter as contentAdmin } from './routes/contentRoutes.js';
import { drawRouter, favoriteRouter } from './routes/gameRoutes.js';
import { userRouter as membershipUser, adminRouter as membershipAdmin } from './routes/membershipRoutes.js';
import { productRouter, cartRouter, orderRouter, adminShopRouter } from './routes/shopRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

assertEnv();
const app = express();
app.set('trust proxy', false);
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use('/uploads', express.static(env.uploadDir, { fallthrough: true, index: false, setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff') }));

app.get('/api/health', async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ success: true, data: { status: 'ok', database: 'connected' } });
  } catch {
    res.status(503).json({ success: false, message: 'Không kết nối được SQL Server' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api', contentPublic);
app.use('/api/draw', drawRouter);
app.use('/api/favorites', favoriteRouter);
app.use('/api/products', productRouter);
app.use('/api/cart', cartRouter);
app.use('/api/orders', orderRouter);
app.use('/api/memberships', membershipUser);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin/memberships', membershipAdmin);
app.use('/api/admin', contentAdmin);
app.use('/api/admin', adminShopRouter);
app.use('/api/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, async () => {
  console.log(`Backend chạy tại http://localhost:${env.port}`);
  try { await getPool(); console.log('Đã kết nối SQL Server'); } catch (e) { console.error('Chưa kết nối được SQL Server:', e.message); }
});
