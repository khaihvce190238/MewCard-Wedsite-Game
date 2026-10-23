import sql from 'mssql';
import { env } from './env.js';

let poolPromise = null;

export function getPool() {
  if (!poolPromise) {
    const pool = new sql.ConnectionPool({
      server: env.db.server,
      port: env.db.port,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      options: { encrypt: env.db.encrypt, trustServerCertificate: env.db.trustServerCertificate },
      pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    });
    pool.on('error', (err) => console.error('[mssql pool error]', err.message));
    poolPromise = pool.connect().catch((err) => {
      poolPromise = null; // cho phép thử kết nối lại lần sau
      throw err;
    });
  }
  return poolPromise;
}

/** Chạy câu lệnh có tham số. ctx = pool hoặc transaction. Tham số: giá trị thường hoặc [sql.Type, value]. */
export function exec(ctx, text, params = {}) {
  const req = new sql.Request(ctx);
  for (const [name, v] of Object.entries(params)) {
    if (Array.isArray(v)) req.input(name, v[0], v[1] ?? null);
    else req.input(name, v === undefined ? null : v);
  }
  return req.query(text);
}

/** Chạy fn(tx) trong một transaction; tự commit/rollback. */
export async function withTransaction(fn) {
  const tx = new sql.Transaction(await getPool());
  await tx.begin();
  try {
    const result = await fn(tx);
    await tx.commit();
    return result;
  } catch (err) {
    try { await tx.rollback(); } catch { /* đã rollback */ }
    throw err;
  }
}

/** Thử lại khi deadlock (1205) hoặc vi phạm unique do tranh chấp (2627/2601). */
export async function withRetry(fn, attempts = 3) {
  let last;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (err) {
      const n = err?.number ?? err?.originalError?.info?.number;
      if (err?.retryable || n === 1205 || n === 2627 || n === 2601) { last = err; continue; }
      throw err;
    }
  }
  throw last;
}

export { sql };
