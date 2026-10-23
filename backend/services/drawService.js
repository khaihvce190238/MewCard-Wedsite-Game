import { getPool, exec, withTransaction, withRetry } from '../config/db.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const SESSION_RE = /^[A-Za-z0-9_-]{8,64}$/;
const sessionId = (x) => {
  if (typeof x !== 'string' || !SESSION_RE.test(x)) throw new AppError(400, 'sessionId không hợp lệ');
  return x;
};

async function getActiveTopic(ctx, topicId) {
  const t = (await exec(ctx, 'SELECT TopicID, Name, Description, ImageURL FROM dbo.Topics WHERE TopicID=@id AND IsActive=1', { id: topicId })).recordset[0];
  if (!t) throw new AppError(404, 'Chủ đề không tồn tại hoặc đang bị ẩn');
  return t;
}

async function lockActiveRound(tx, userId, topicId) {
  return (await exec(tx, `
    SELECT TOP 1 RoundID, RoundNumber, SessionId,
           CASE WHEN LastActivityAt < DATEADD(MINUTE, -@m, SYSUTCDATETIME()) THEN 1 ELSE 0 END AS Stale
    FROM dbo.DrawRounds WITH (UPDLOCK, HOLDLOCK)
    WHERE UserID=@u AND TopicID=@t AND Status=N'Active'`, { m: env.drawTimeoutMinutes, u: userId, t: topicId })).recordset[0];
}

const abandon = (tx, roundId) =>
  exec(tx, `UPDATE dbo.DrawRounds SET Status=N'Abandoned', CompletedAt=SYSUTCDATETIME() WHERE RoundID=@id AND Status=N'Active'`, { id: roundId });

/**
 * Cơ chế vòng bỏ dở: vòng Active chỉ được TIẾP TỤC khi cùng sessionId (cùng lượt vào trang) và chưa quá hạn.
 * Ngược lại vòng cũ bị đánh dấu Abandoned, vòng mới được tạo. Không xóa lịch sử.
 */
async function ensureRound(tx, userId, topicId, sid) {
  const cur = await lockActiveRound(tx, userId, topicId);
  if (cur && cur.SessionId === sid && !cur.Stale) return { roundId: cur.RoundID, roundNumber: cur.RoundNumber, isNew: false };
  if (cur) await abandon(tx, cur.RoundID);
  const n = (await exec(tx, `SELECT ISNULL(MAX(RoundNumber),0)+1 AS N FROM dbo.DrawRounds WITH (UPDLOCK, HOLDLOCK) WHERE UserID=@u AND TopicID=@t`, { u: userId, t: topicId })).recordset[0].N;
  const ins = await exec(tx, `INSERT INTO dbo.DrawRounds (UserID, TopicID, RoundNumber, SessionId) OUTPUT INSERTED.RoundID VALUES (@u,@t,@n,@s)`, { u: userId, t: topicId, n, s: sid });
  return { roundId: ins.recordset[0].RoundID, roundNumber: n, isNew: true, abandonedPrevious: Boolean(cur) };
}

const eligibleIds = async (tx, topicId, roundId) =>
  (await exec(tx, `
    SELECT c.CardID FROM dbo.Cards c
    WHERE c.TopicID=@t AND c.IsActive=1
      AND NOT EXISTS (SELECT 1 FROM dbo.DrawHistory h WHERE h.RoundID=@r AND h.CardID=c.CardID)`, { t: topicId, r: roundId })).recordset.map((x) => x.CardID);

const drawnCount = async (tx, roundId) =>
  (await exec(tx, 'SELECT COUNT(*) AS N FROM dbo.DrawHistory WHERE RoundID=@r', { r: roundId })).recordset[0].N;

/** Bắt đầu/vào chủ đề: xử lý vòng bỏ dở, KHÔNG tạo vòng rỗng (vòng mới chỉ tạo ở lần rút đầu tiên). */
export async function startTopic(userId, body) {
  const topicId = v.int(body.topicId, 'topicId');
  const sid = sessionId(body.sessionId);
  return withRetry(() => withTransaction(async (tx) => {
    const topic = await getActiveTopic(tx, topicId);
    const cur = await lockActiveRound(tx, userId, topicId);
    let abandonedPrevious = false;
    let round = null;
    if (cur && (cur.SessionId !== sid || cur.Stale)) { await abandon(tx, cur.RoundID); abandonedPrevious = true; }
    else if (cur) round = { RoundID: cur.RoundID, RoundNumber: cur.RoundNumber };
    const total = (await exec(tx, 'SELECT COUNT(*) AS N FROM dbo.Cards WHERE TopicID=@t AND IsActive=1', { t: topicId })).recordset[0].N;
    let drawn = [];
    if (round) {
      drawn = (await exec(tx, `SELECT DrawID, CardID, CardNameSnapshot, CardDescriptionSnapshot, FrontImageURLSnapshot, BackImageURLSnapshot, DrawnAt
        FROM dbo.DrawHistory WHERE RoundID=@r ORDER BY DrawnAt, DrawID`, { r: round.RoundID })).recordset;
    }
    return {
      topic, abandonedPrevious, round,
      progress: { drawn: drawn.length, remaining: round ? total - drawn.length : total, total: round ? total : total },
      drawn,
      message: total === 0 ? 'Chủ đề này hiện chưa có lá bài nào' : undefined,
    };
  }));
}

export async function drawCard(userId, body) {
  const topicId = v.int(body.topicId, 'topicId');
  const sid = sessionId(body.sessionId);
  return withRetry(() => withTransaction(async (tx) => {
    await getActiveTopic(tx, topicId);
    const round = await ensureRound(tx, userId, topicId, sid);
    const ids = await eligibleIds(tx, topicId, round.roundId);

    if (ids.length === 0) {
      const n = await drawnCount(tx, round.roundId);
      if (n === 0) throw new AppError(409, 'Chủ đề này hiện chưa có lá bài nào để rút'); // rollback: không tạo vòng/kết quả giả
      await exec(tx, `UPDATE dbo.DrawRounds SET Status=N'Completed', CompletedAt=SYSUTCDATETIME() WHERE RoundID=@r`, { r: round.roundId });
      return { card: null, completed: true, round: { RoundID: round.roundId, RoundNumber: round.roundNumber, Status: 'Completed' },
        progress: { drawn: n, remaining: 0, total: n }, message: 'Bạn đã rút hết bài trong vòng này' };
    }

    // Backend chọn ngẫu nhiên; client không gửi CardID.
    const pick = ids[Math.floor(Math.random() * ids.length)];
    // Snapshot được ghi bằng CHÍNH câu INSERT...SELECT từ bảng Cards => nhất quán tuyệt đối với dữ liệu lúc rút.
    const ins = await exec(tx, `
      INSERT INTO dbo.DrawHistory (RoundID, CardID, CardNameSnapshot, CardDescriptionSnapshot, FrontImageURLSnapshot, BackImageURLSnapshot)
      OUTPUT INSERTED.DrawID, INSERTED.CardID, INSERTED.CardNameSnapshot, INSERTED.CardDescriptionSnapshot,
             INSERTED.FrontImageURLSnapshot, INSERTED.BackImageURLSnapshot, INSERTED.DrawnAt
      SELECT @r, CardID, Name, Description, FrontImageURL, BackImageURL
      FROM dbo.Cards WITH (UPDLOCK) WHERE CardID=@c AND TopicID=@t AND IsActive=1`, { r: round.roundId, c: pick, t: topicId });
    if (!ins.recordset.length) {
      const e = new Error('Lá bài vừa bị ẩn, thử lại'); e.retryable = true; throw e; // admin ẩn giữa chừng => chọn lại
    }
    const remaining = ids.length - 1;
    const status = remaining === 0 ? 'Completed' : 'Active';
    await exec(tx, `UPDATE dbo.DrawRounds SET LastActivityAt=SYSUTCDATETIME(),
        Status=@s, CompletedAt=CASE WHEN @s=N'Completed' THEN SYSUTCDATETIME() ELSE NULL END WHERE RoundID=@r`, { s: status, r: round.roundId });
    const drawn = await drawnCount(tx, round.roundId);
    return {
      card: ins.recordset[0], completed: remaining === 0, newRound: round.isNew,
      round: { RoundID: round.roundId, RoundNumber: round.roundNumber, Status: status },
      progress: { drawn, remaining, total: drawn + remaining },
      message: remaining === 0 ? 'Bạn đã rút hết bài trong vòng này' : undefined,
    };
  }));
}

export async function leaveTopic(userId, body) {
  const topicId = v.int(body.topicId, 'topicId');
  const r = await exec(await getPool(), `
    UPDATE dbo.DrawRounds SET Status=N'Abandoned', CompletedAt=SYSUTCDATETIME()
    WHERE UserID=@u AND TopicID=@t AND Status=N'Active'`, { u: userId, t: topicId });
  return { abandoned: r.rowsAffected[0] };
}

export async function history(userId, query) {
  const p = v.paging(query, { defaultSize: 12, maxSize: 50 });
  const params = { u: userId, offset: p.offset, size: p.pageSize };
  let extra = '';
  if (query.topicId) { extra = 'AND r.TopicID=@t'; params.t = v.int(query.topicId, 'topicId'); }
  const pool = await getPool();
  const total = (await exec(pool, `SELECT COUNT(*) AS N FROM dbo.DrawHistory h JOIN dbo.DrawRounds r ON r.RoundID=h.RoundID WHERE r.UserID=@u ${extra}`, params)).recordset[0].N;
  // Chỉ dùng cột snapshot cho nội dung; Cards chỉ để biết lá bài còn hoạt động hay không.
  const rows = (await exec(pool, `
    SELECT h.DrawID, h.RoundID, r.RoundNumber, r.Status AS RoundStatus, r.TopicID, t.Name AS TopicName,
           h.CardID, h.CardNameSnapshot, h.CardDescriptionSnapshot, h.FrontImageURLSnapshot, h.BackImageURLSnapshot, h.DrawnAt,
           c.IsActive AS CardIsActive, CASE WHEN f.CardID IS NULL THEN CAST(0 AS BIT) ELSE CAST(1 AS BIT) END AS IsFavorite
    FROM dbo.DrawHistory h
    JOIN dbo.DrawRounds r ON r.RoundID = h.RoundID
    JOIN dbo.Topics t ON t.TopicID = r.TopicID
    LEFT JOIN dbo.Cards c ON c.CardID = h.CardID
    LEFT JOIN dbo.FavoriteCards f ON f.UserID = r.UserID AND f.CardID = h.CardID
    WHERE r.UserID=@u ${extra}
    ORDER BY h.DrawnAt DESC, h.DrawID DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`, params)).recordset;
  return { rows, meta: v.pageMeta(p, total) };
}
