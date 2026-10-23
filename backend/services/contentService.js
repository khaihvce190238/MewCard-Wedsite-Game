import { getPool, exec, sql } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const DEFAULT_FRONT = '/uploads/seed/default-front.svg';
const DEFAULT_BACK = '/uploads/seed/default-back.svg';

/* ---------------- Public ---------------- */
export async function listPublicTopics() {
  const r = await exec(await getPool(), `
    SELECT t.TopicID, t.Name, t.Description, t.ImageURL,
           (SELECT COUNT(*) FROM dbo.Cards c WHERE c.TopicID = t.TopicID AND c.IsActive = 1) AS CardCount
    FROM dbo.Topics t WHERE t.IsActive = 1 ORDER BY t.Name`);
  return r.recordset;
}

/** Không lộ tên/ảnh mặt trước của lá bài để không "spoil" trò chơi: chỉ trả số lượng và mặt sau. */
export async function getPublicTopicCards(topicId) {
  const pool = await getPool();
  const t = (await exec(pool, 'SELECT TopicID, Name, Description, ImageURL FROM dbo.Topics WHERE TopicID=@id AND IsActive=1', { id: topicId })).recordset[0];
  if (!t) throw new AppError(404, 'Chủ đề không tồn tại hoặc đang bị ẩn');
  const cards = (await exec(pool, 'SELECT CardID, BackImageURL FROM dbo.Cards WHERE TopicID=@id AND IsActive=1 ORDER BY CardID', { id: topicId })).recordset;
  return { topic: t, cardCount: cards.length, cards };
}

/* ---------------- Admin: Topics ---------------- */
export async function adminListTopics(query) {
  const where = [];
  const params = {};
  if (query.q) { where.push('(t.Name LIKE @q OR t.Description LIKE @q)'); params.q = v.likeParam(query.q); }
  const r = await exec(await getPool(), `
    SELECT t.*, (SELECT COUNT(*) FROM dbo.Cards c WHERE c.TopicID = t.TopicID) AS CardCount,
           (SELECT COUNT(*) FROM dbo.Cards c WHERE c.TopicID = t.TopicID AND c.IsActive = 1) AS ActiveCardCount
    FROM dbo.Topics t ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY t.TopicID DESC`, params);
  return r.recordset;
}

export async function createTopic(body, imageUrl) {
  const name = v.str(body.name, 'Tên chủ đề', { max: 100 });
  const description = v.str(body.description, 'Mô tả', { optional: true, max: 500 });
  const r = await exec(await getPool(),
    `INSERT INTO dbo.Topics (Name, Description, ImageURL) OUTPUT INSERTED.* VALUES (@name, @description, @img)`,
    { name, description, img: imageUrl || null });
  return r.recordset[0];
}

export async function updateTopic(id, body, imageUrl) {
  const name = v.str(body.name, 'Tên chủ đề', { max: 100 });
  const description = v.str(body.description, 'Mô tả', { optional: true, max: 500 });
  const r = await exec(await getPool(), `
    UPDATE dbo.Topics SET Name=@name, Description=@description, ImageURL=COALESCE(@img, ImageURL), UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.* WHERE TopicID=@id`, { name, description, img: imageUrl || null, id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy chủ đề');
  return r.recordset[0];
}

export async function setTopicStatus(id, isActive) {
  const r = await exec(await getPool(),
    'UPDATE dbo.Topics SET IsActive=@a, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE TopicID=@id',
    { a: v.bool(isActive, 'isActive'), id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy chủ đề');
  return r.recordset[0];
}

/* ---------------- Admin: Cards ---------------- */
export async function adminListCards(query) {
  const p = v.paging(query, { defaultSize: 12, maxSize: 100 });
  const where = [];
  const params = { offset: p.offset, size: p.pageSize };
  if (query.topicId) { where.push('c.TopicID = @topicId'); params.topicId = v.int(query.topicId, 'topicId'); }
  if (query.q) { where.push('(c.Name LIKE @q OR c.Description LIKE @q)'); params.q = v.likeParam(query.q); }
  if (query.isActive !== undefined && query.isActive !== '') { where.push('c.IsActive = @isActive'); params.isActive = v.bool(query.isActive, 'isActive'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pool = await getPool();
  const total = (await exec(pool, `SELECT COUNT(*) AS N FROM dbo.Cards c ${w}`, params)).recordset[0].N;
  const rows = (await exec(pool, `
    SELECT c.*, t.Name AS TopicName FROM dbo.Cards c JOIN dbo.Topics t ON t.TopicID = c.TopicID ${w}
    ORDER BY c.CardID DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`, params)).recordset;
  return { rows, meta: v.pageMeta(p, total) };
}

async function assertTopicExists(topicId) {
  const r = await exec(await getPool(), 'SELECT 1 FROM dbo.Topics WHERE TopicID=@id', { id: topicId });
  if (!r.recordset.length) throw new AppError(400, 'Chủ đề không tồn tại');
}

export async function createCard(body, front, back) {
  const topicId = v.int(body.topicId, 'Chủ đề');
  const name = v.str(body.name, 'Tên lá bài', { max: 150 });
  const description = v.str(body.description, 'Mô tả', { optional: true, max: 1000 });
  await assertTopicExists(topicId);
  const r = await exec(await getPool(), `
    INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL)
    OUTPUT INSERTED.* VALUES (@topicId, @name, @description, @front, @back)`,
  { topicId, name, description, front: front || DEFAULT_FRONT, back: back || DEFAULT_BACK });
  return r.recordset[0];
}

/** Sửa tên/mô tả KHÔNG ảnh hưởng DrawHistory vì lịch sử đã lưu snapshot riêng. */
export async function updateCard(id, body, front, back) {
  const topicId = v.int(body.topicId, 'Chủ đề');
  const name = v.str(body.name, 'Tên lá bài', { max: 150 });
  const description = v.str(body.description, 'Mô tả', { optional: true, max: 1000 });
  await assertTopicExists(topicId);
  const r = await exec(await getPool(), `
    UPDATE dbo.Cards SET TopicID=@topicId, Name=@name, Description=@description,
      FrontImageURL=COALESCE(@front, FrontImageURL), BackImageURL=COALESCE(@back, BackImageURL), UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.* WHERE CardID=@id`, { topicId, name, description, front: front || null, back: back || null, id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy lá bài');
  return r.recordset[0];
}

export async function setCardStatus(id, isActive) {
  const r = await exec(await getPool(),
    'UPDATE dbo.Cards SET IsActive=@a, UpdatedAt=SYSUTCDATETIME() OUTPUT INSERTED.* WHERE CardID=@id',
    { a: v.bool(isActive, 'isActive'), id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy lá bài');
  return r.recordset[0];
}

export async function updateCardImages(id, front, back) {
  if (!front && !back) throw new AppError(400, 'Cần gửi ít nhất một ảnh (front hoặc back)');
  const r = await exec(await getPool(), `
    UPDATE dbo.Cards SET FrontImageURL=COALESCE(@front, FrontImageURL), BackImageURL=COALESCE(@back, BackImageURL), UpdatedAt=SYSUTCDATETIME()
    OUTPUT INSERTED.* WHERE CardID=@id`, { front: front || null, back: back || null, id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy lá bài');
  return r.recordset[0];
}

export { sql };
