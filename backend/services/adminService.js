import { getPool, exec } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

export async function dashboard() {
  const pool = await getPool();
  const one = async (sqlText) => (await exec(pool, sqlText)).recordset[0];
  const counts = await one(`SELECT
    (SELECT COUNT(*) FROM dbo.Users WHERE Role=N'User') AS Users,
    (SELECT COUNT(*) FROM dbo.Topics) AS Topics,
    (SELECT COUNT(*) FROM dbo.Cards) AS Cards,
    (SELECT COUNT(*) FROM dbo.Products) AS Products,
    (SELECT COUNT(*) FROM dbo.DrawHistory) AS Draws,
    (SELECT COUNT(*) FROM dbo.Orders) AS Orders,
    (SELECT COUNT(*) FROM dbo.Orders WHERE Status=N'CancellationRequested') AS CancelRequests,
    (SELECT COUNT(*) FROM dbo.Memberships WHERE Status=N'Pending') AS PendingMemberships,
    (SELECT COUNT(*) FROM dbo.Memberships WHERE Status=N'Approved') AS Members,
    (SELECT ISNULL(SUM(TotalAmount),0) FROM dbo.Orders WHERE PaymentStatus=N'Paid' AND Status<>N'Cancelled') AS Revenue`);
  const ordersByStatus = (await exec(pool, 'SELECT Status, COUNT(*) AS N FROM dbo.Orders GROUP BY Status')).recordset;
  const lowStock = (await exec(pool, 'SELECT TOP 5 ProductID, Name, StockQuantity FROM dbo.Products WHERE IsActive=1 AND StockQuantity<=5 ORDER BY StockQuantity')).recordset;
  const recentOrders = (await exec(pool, `SELECT TOP 5 o.OrderID, o.TotalAmount, o.Status, o.PaymentStatus, o.CreatedAt, u.FullName
    FROM dbo.Orders o JOIN dbo.Users u ON u.UserID=o.UserID ORDER BY o.CreatedAt DESC, o.OrderID DESC`)).recordset;
  const topCards = (await exec(pool, `SELECT TOP 5 CardNameSnapshot AS Name, COUNT(*) AS Draws FROM dbo.DrawHistory GROUP BY CardNameSnapshot ORDER BY COUNT(*) DESC`)).recordset;
  return { counts, ordersByStatus, lowStock, recentOrders, topCards };
}

export async function listUsers(query) {
  const p = v.paging(query);
  const where = [];
  const params = { o: p.offset, s: p.pageSize };
  if (query.q) { where.push('(FullName LIKE @q OR Email LIKE @q)'); params.q = v.likeParam(query.q); }
  if (query.role) { where.push('Role=@role'); params.role = v.oneOf(query.role, ['User', 'Admin'], 'role'); }
  if (query.status) { where.push('Status=@status'); params.status = v.oneOf(query.status, ['Active', 'Locked'], 'status'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pool = await getPool();
  const total = (await exec(pool, `SELECT COUNT(*) AS N FROM dbo.Users ${w}`, params)).recordset[0].N;
  const rows = (await exec(pool, `SELECT UserID, FullName, Email, Phone, Role, Status, CreatedAt FROM dbo.Users ${w}
    ORDER BY UserID DESC OFFSET @o ROWS FETCH NEXT @s ROWS ONLY`, params)).recordset; // không bao giờ chọn PasswordHash
  return { rows, meta: v.pageMeta(p, total) };
}

export async function setUserStatus(adminId, id, status) {
  const st = v.oneOf(status, ['Active', 'Locked'], 'Trạng thái');
  if (id === adminId) throw new AppError(400, 'Bạn không thể tự khóa tài khoản của mình');
  const r = await exec(await getPool(), `UPDATE dbo.Users SET Status=@st OUTPUT INSERTED.UserID, INSERTED.FullName, INSERTED.Email, INSERTED.Role, INSERTED.Status
    WHERE UserID=@id AND Role<>N'Admin'`, { st, id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy người dùng (hoặc là tài khoản Admin, không được khóa)');
  return r.recordset[0];
}
