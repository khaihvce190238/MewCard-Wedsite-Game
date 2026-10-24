/* Xóa toàn bộ bảng của DecisionCardDB (CHỈ dùng khi dev). Sau đó chạy lại schema.sql + seed.sql */
USE DecisionCardDB;
GO
DROP TABLE IF EXISTS dbo.PendingRegistrations, dbo.PaymentTransactions, dbo.OrderItems, dbo.Orders, dbo.CartItems, dbo.Products,
  dbo.FavoriteCards, dbo.DrawHistory, dbo.DrawRounds, dbo.Cards, dbo.Topics, dbo.Memberships, dbo.Users;
GO
