import { getPool, exec } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as v from '../utils/validate.js';

export async function getCart(userId) {
  const rows = (await exec(await getPool(), `
    SELECT c.CartItemID, c.ProductID, c.Quantity, p.Name, p.Price, p.ImageURL, p.StockQuantity, p.IsActive
    FROM dbo.CartItems c JOIN dbo.Products p ON p.ProductID=c.ProductID
    WHERE c.UserID=@u ORDER BY c.CartItemID`, { u: userId })).recordset;
  let totalCents = 0;
  const items = rows.map((r) => {
    const lineCents = Math.round(r.Price * 100) * r.Quantity; // backend tính lại, không tin client
    const available = r.IsActive && r.Quantity <= r.StockQuantity;
    if (available) totalCents += lineCents;
    return { ...r, LineTotal: lineCents / 100, Available: available,
      Problem: !r.IsActive ? 'Sản phẩm đã ngừng bán' : r.Quantity > r.StockQuantity ? `Chỉ còn ${r.StockQuantity} sản phẩm` : null };
  });
  return { items, totalAmount: totalCents / 100, itemCount: items.reduce((s, i) => s + i.Quantity, 0), hasProblem: items.some((i) => !i.Available) };
}

export async function addItem(userId, body) {
  const productId = v.int(body.productId, 'Sản phẩm');
  const qty = v.int(body.quantity ?? 1, 'Số lượng', { max: 99 });
  const pool = await getPool();
  const p = (await exec(pool, 'SELECT IsActive, StockQuantity FROM dbo.Products WHERE ProductID=@id', { id: productId })).recordset[0];
  if (!p || !p.IsActive) throw new AppError(404, 'Sản phẩm không tồn tại hoặc đã ngừng bán');
  const cur = (await exec(pool, 'SELECT Quantity FROM dbo.CartItems WHERE UserID=@u AND ProductID=@p', { u: userId, p: productId })).recordset[0];
  const next = (cur?.Quantity || 0) + qty;
  if (next > p.StockQuantity) throw new AppError(409, `Chỉ còn ${p.StockQuantity} sản phẩm trong kho`);
  if (next > 99) throw new AppError(400, 'Tối đa 99 sản phẩm mỗi mặt hàng');
  if (cur) await exec(pool, 'UPDATE dbo.CartItems SET Quantity=@q WHERE UserID=@u AND ProductID=@p', { q: next, u: userId, p: productId });
  else await exec(pool, 'INSERT INTO dbo.CartItems (UserID, ProductID, Quantity) VALUES (@u,@p,@q)', { u: userId, p: productId, q: next });
  return getCart(userId);
}

export async function updateItem(userId, itemId, body) {
  const qty = v.int(body.quantity, 'Số lượng', { max: 99 });
  const pool = await getPool();
  const it = (await exec(pool, `SELECT c.CartItemID, p.IsActive, p.StockQuantity FROM dbo.CartItems c JOIN dbo.Products p ON p.ProductID=c.ProductID
    WHERE c.CartItemID=@id AND c.UserID=@u`, { id: itemId, u: userId })).recordset[0];
  if (!it) throw new AppError(404, 'Không tìm thấy sản phẩm trong giỏ');
  if (!it.IsActive) throw new AppError(409, 'Sản phẩm đã ngừng bán');
  if (qty > it.StockQuantity) throw new AppError(409, `Chỉ còn ${it.StockQuantity} sản phẩm trong kho`);
  await exec(pool, 'UPDATE dbo.CartItems SET Quantity=@q WHERE CartItemID=@id', { q: qty, id: itemId });
  return getCart(userId);
}

export async function removeItem(userId, itemId) {
  await exec(await getPool(), 'DELETE FROM dbo.CartItems WHERE CartItemID=@id AND UserID=@u', { id: itemId, u: userId });
  return getCart(userId);
}
