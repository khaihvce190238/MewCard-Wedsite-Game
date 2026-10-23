import { getPool, exec } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

export async function list(userId) {
  // Lá bài bị ẩn vẫn hiện trong danh sách kèm cờ IsActive = 0 (không lỗi, không xóa).
  const r = await exec(await getPool(), `
    SELECT f.CardID, f.CreatedAt AS FavoritedAt, c.Name, c.Description, c.FrontImageURL, c.BackImageURL,
           c.IsActive AS CardIsActive, t.TopicID, t.Name AS TopicName, t.IsActive AS TopicIsActive
    FROM dbo.FavoriteCards f
    JOIN dbo.Cards c ON c.CardID = f.CardID
    JOIN dbo.Topics t ON t.TopicID = c.TopicID
    WHERE f.UserID=@u ORDER BY f.CreatedAt DESC`, { u: userId });
  return r.recordset;
}

export async function add(userId, cardId) {
  const pool = await getPool();
  const c = (await exec(pool, 'SELECT IsActive FROM dbo.Cards WHERE CardID=@id', { id: cardId })).recordset[0];
  if (!c) throw new AppError(404, 'Lá bài không tồn tại');
  if (!c.IsActive) throw new AppError(409, 'Lá bài này hiện không còn khả dụng nên không thể thêm vào yêu thích');
  await exec(pool, `
    IF NOT EXISTS (SELECT 1 FROM dbo.FavoriteCards WHERE UserID=@u AND CardID=@c)
      INSERT INTO dbo.FavoriteCards (UserID, CardID) VALUES (@u, @c)`, { u: userId, c: cardId });
}

export async function remove(userId, cardId) {
  await exec(await getPool(), 'DELETE FROM dbo.FavoriteCards WHERE UserID=@u AND CardID=@c', { u: userId, c: cardId });
}
