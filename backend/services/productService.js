import { getPool, exec, sql } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

const DEFAULT_IMG = '/uploads/seed/default-product.svg';
const D = (x) => [sql.Decimal(12, 2), x];

async function list(query, { adminView }) {
  const p = v.paging(query, { defaultSize: 12, maxSize: 50 });
  const where = [];
  const params = { offset: p.offset, size: p.pageSize };
  if (!adminView) where.push('p.IsActive = 1');
  if (query.q) { where.push('(p.Name LIKE @q OR p.Description LIKE @q)'); params.q = v.likeParam(query.q); }
  if (query.topicId) { where.push('p.TopicID=@topicId'); params.topicId = v.int(query.topicId, 'topicId'); }
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const pool = await getPool();
  const total = (await exec(pool, `SELECT COUNT(*) AS N FROM dbo.Products p ${w}`, params)).recordset[0].N;
  const rows = (await exec(pool, `
    SELECT p.*, t.Name AS TopicName FROM dbo.Products p LEFT JOIN dbo.Topics t ON t.TopicID=p.TopicID ${w}
    ORDER BY p.ProductID DESC OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`, params)).recordset;
  return { rows, meta: v.pageMeta(p, total) };
}
export const listPublic = (q) => list(q, { adminView: false });
export const listAdmin = (q) => list(q, { adminView: true });

export async function getPublic(id) {
  const r = await exec(await getPool(), `SELECT p.*, t.Name AS TopicName FROM dbo.Products p LEFT JOIN dbo.Topics t ON t.TopicID=p.TopicID WHERE p.ProductID=@id AND p.IsActive=1`, { id });
  if (!r.recordset.length) throw new AppError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  return r.recordset[0];
}

async function parse(body) {
  const topicRaw = body.topicId;
  const topicId = topicRaw === undefined || topicRaw === null || topicRaw === '' || topicRaw === 'null' ? null : v.int(topicRaw, 'Chủ đề');
  if (topicId) {
    const t = await exec(await getPool(), 'SELECT 1 FROM dbo.Topics WHERE TopicID=@id', { id: topicId });
    if (!t.recordset.length) throw new AppError(400, 'Chủ đề không tồn tại');
  }
  return {
    topicId,
    name: v.str(body.name, 'Tên sản phẩm', { max: 150 }),
    description: v.str(body.description, 'Mô tả', { optional: true, max: 1000 }),
    price: v.money(body.price, 'Giá'),
    stock: v.int(body.stockQuantity, 'Tồn kho', { min: 0, max: 1000000 }),
  };
}

export async function create(body, imageUrl) {
  const x = await parse(body);
  const r = await exec(await getPool(), `
    INSERT INTO dbo.Products (TopicID, Name, Description, Price, StockQuantity, ImageURL)
    OUTPUT INSERTED.* VALUES (@topicId, @name, @description, @price, @stock, @img)`,
  { topicId: x.topicId, name: x.name, description: x.description, price: D(x.price), stock: x.stock, img: imageUrl || DEFAULT_IMG });
  return r.recordset[0];
}

export async function update(id, body, imageUrl) {
  const x = await parse(body);
  // Giá đổi ở đây KHÔNG ảnh hưởng đơn cũ vì OrderItems đã lưu UnitPrice.
  const r = await exec(await getPool(), `
    UPDATE dbo.Products SET TopicID=@topicId, Name=@name, Description=@description, Price=@price, StockQuantity=@stock,
      ImageURL=COALESCE(@img, ImageURL) OUTPUT INSERTED.* WHERE ProductID=@id`,
  { topicId: x.topicId, name: x.name, description: x.description, price: D(x.price), stock: x.stock, img: imageUrl || null, id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy sản phẩm');
  return r.recordset[0];
}

export async function setStatus(id, isActive) {
  const r = await exec(await getPool(), 'UPDATE dbo.Products SET IsActive=@a OUTPUT INSERTED.* WHERE ProductID=@id', { a: v.bool(isActive, 'isActive'), id });
  if (!r.recordset.length) throw new AppError(404, 'Không tìm thấy sản phẩm');
  return r.recordset[0];
}
