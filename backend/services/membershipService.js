import { getPool, exec, withTransaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

/**
 * Chính sách (ghi trong README):
 *  - Một User chỉ có tối đa 1 yêu cầu Pending (ràng buộc bởi filtered unique index).
 *  - Đã Approved thì không đăng ký lại.
 *  - Bị Rejected hoặc tự Cancelled thì được đăng ký lại ngay.
 */
export async function apply(userId, body) {
  const note = v.str(body.note, 'Ghi chú', { optional: true, max: 500 });
  const pool = await getPool();
  const ex = (await exec(pool, `SELECT Status FROM dbo.Memberships WHERE UserID=@u AND Status IN (N'Pending', N'Approved')`, { u: userId })).recordset[0];
  if (ex?.Status === 'Approved') throw new AppError(409, 'Bạn đã là thành viên');
  if (ex?.Status === 'Pending') throw new AppError(409, 'Bạn đã có yêu cầu đang chờ duyệt');
  // Nếu 2 request đồng thời, unique index sẽ chặn bản thứ hai (lỗi 2627 -> 409).
  const r = await exec(pool, `INSERT INTO dbo.Memberships (UserID, ApplicantNote) OUTPUT INSERTED.* VALUES (@u, @note)`, { u: userId, note });
  return r.recordset[0];
}

export async function myMemberships(userId) {
  const r = await exec(await getPool(), `
    SELECT m.*, a.FullName AS ReviewedByName FROM dbo.Memberships m
    LEFT JOIN dbo.Users a ON a.UserID = m.ReviewedBy
    WHERE m.UserID=@u ORDER BY m.AppliedAt DESC, m.MembershipID DESC`, { u: userId });
  const rows = r.recordset;
  const current = rows[0] || null;
  return { current, canApply: !current || ['Rejected', 'Cancelled'].includes(current.Status), history: rows };
}

export async function cancelMine(userId, id) {
  const r = await exec(await getPool(), `
    UPDATE dbo.Memberships SET Status=N'Cancelled' OUTPUT INSERTED.*
    WHERE MembershipID=@id AND UserID=@u AND Status=N'Pending'`, { id, u: userId });
  if (!r.recordset.length) throw new AppError(409, 'Chỉ có thể hủy yêu cầu đang chờ duyệt của chính bạn');
  return r.recordset[0];
}

export async function adminList(query) {
  const p = v.paging(query);
  const where = [];
  const params = { offset: p.offset, size: p.pageSize };
  if (query.status) { where.push('m.Status=@status'); params.status = v.oneOf(query.status, ['Pending', 'Approved', 'Rejected', 'Cancelled'], 'status'); }
  if (query.q) { where.push('(u.FullName LIKE @q OR u.Email LIKE @q OR m.MemberCode LIKE @q)'); params.q = v.likeParam(query.q); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pool = await getPool();
  const from = 'FROM dbo.Memberships m JOIN dbo.Users u ON u.UserID=m.UserID';
  const total = (await exec(pool, `SELECT COUNT(*) AS N ${from} ${w}`, params)).recordset[0].N;
  const rows = (await exec(pool, `
    SELECT m.*, u.FullName, u.Email ${from} ${w}
    ORDER BY CASE WHEN m.Status=N'Pending' THEN 0 ELSE 1 END, m.AppliedAt DESC
    OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`, params)).recordset;
  return { rows, meta: v.pageMeta(p, total) };
}

export async function adminDetail(id) {
  const r = await exec(await getPool(), `
    SELECT m.*, u.FullName, u.Email, u.Phone, u.CreatedAt AS UserCreatedAt, a.FullName AS ReviewedByName
    FROM dbo.Memberships m JOIN dbo.Users u ON u.UserID=m.UserID LEFT JOIN dbo.Users a ON a.UserID=m.ReviewedBy
    WHERE m.MembershipID=@id`, { id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy yêu cầu');
  return r.recordset[0];
}

export async function review(adminId, id, body) {
  const decision = v.oneOf(body.decision, ['Approved', 'Rejected'], 'decision');
  const note = v.str(body.adminNote, 'Lý do/ghi chú', { optional: decision === 'Approved', max: 500 });
  return withTransaction(async (tx) => {
    // Điều kiện Status='Pending' trong WHERE => hai Admin duyệt cùng lúc thì chỉ một người thành công.
    const r = await exec(tx, `
      UPDATE dbo.Memberships SET Status=@d, ReviewedAt=SYSUTCDATETIME(), ReviewedBy=@a, AdminNote=@note,
        MemberCode = CASE WHEN @d=N'Approved' THEN N'MEW' + RIGHT(N'000000' + CAST(MembershipID AS NVARCHAR(10)), 6) ELSE NULL END
      OUTPUT INSERTED.*
      WHERE MembershipID=@id AND Status=N'Pending'`, { d: decision, a: adminId, note, id });
    if (!r.recordset.length) throw new AppError(409, 'Yêu cầu không tồn tại hoặc đã được xử lý');
    return r.recordset[0];
  });
}
