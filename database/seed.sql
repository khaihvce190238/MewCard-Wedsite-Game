/* seed.sql - dữ liệu mẫu. Chạy SAU schema.sql. Không dùng ID cố định: TopicID được tra theo Name.
   Admin KHÔNG nằm ở đây: dùng `npm run seed:admin` (backend), mật khẩu đọc từ .env. */
USE DecisionCardDB;
GO
SET NOCOUNT ON;
GO
INSERT INTO dbo.Topics (Name, Description, ImageURL) VALUES (N'Món ăn', N'Không biết ăn gì? Để lá bài chọn giúp bạn.', N'/uploads/seed/food-back.svg');
INSERT INTO dbo.Topics (Name, Description, ImageURL) VALUES (N'Hoạt động cuối tuần', N'Cuối tuần này làm gì cho đáng nhớ?', N'/uploads/seed/weekend-back.svg');
INSERT INTO dbo.Topics (Name, Description, ImageURL) VALUES (N'Địa điểm đi chơi', N'Hôm nay đi đâu đây?', N'/uploads/seed/place-back.svg');
GO
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Phở bò', N'Một tô phở nóng hổi với nước dùng đậm đà.', N'/uploads/seed/food-1-front.svg', N'/uploads/seed/food-back.svg' FROM dbo.Topics WHERE Name = N'Món ăn';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Cơm tấm sườn', N'Sườn nướng thơm lừng, ăn kèm bì chả.', N'/uploads/seed/food-2-front.svg', N'/uploads/seed/food-back.svg' FROM dbo.Topics WHERE Name = N'Món ăn';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Bún chả', N'Bún, chả nướng và nước chấm chua ngọt.', N'/uploads/seed/food-3-front.svg', N'/uploads/seed/food-back.svg' FROM dbo.Topics WHERE Name = N'Món ăn';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Bánh mì', N'Nhanh gọn, đủ vị, ăn ở đâu cũng được.', N'/uploads/seed/food-4-front.svg', N'/uploads/seed/food-back.svg' FROM dbo.Topics WHERE Name = N'Món ăn';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Lẩu thái', N'Cay chua, hợp đi ăn cùng nhóm bạn.', N'/uploads/seed/food-5-front.svg', N'/uploads/seed/food-back.svg' FROM dbo.Topics WHERE Name = N'Món ăn';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Xem phim', N'Chọn một bộ phim bạn chưa xem và thư giãn.', N'/uploads/seed/weekend-1-front.svg', N'/uploads/seed/weekend-back.svg' FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Đạp xe', N'Một vòng quanh công viên gần nhà.', N'/uploads/seed/weekend-2-front.svg', N'/uploads/seed/weekend-back.svg' FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Dọn góc làm việc', N'Sắp xếp lại bàn học, tâm trí cũng nhẹ hơn.', N'/uploads/seed/weekend-3-front.svg', N'/uploads/seed/weekend-back.svg' FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Nấu một món mới', N'Thử công thức bạn lưu mãi chưa làm.', N'/uploads/seed/weekend-4-front.svg', N'/uploads/seed/weekend-back.svg' FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Gặp bạn cũ', N'Nhắn cho người bạn lâu rồi chưa gặp.', N'/uploads/seed/weekend-5-front.svg', N'/uploads/seed/weekend-back.svg' FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Quán cà phê yên tĩnh', N'Mang theo sách hoặc laptop.', N'/uploads/seed/place-1-front.svg', N'/uploads/seed/place-back.svg' FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Công viên', N'Đi dạo, hít thở không khí trong lành.', N'/uploads/seed/place-2-front.svg', N'/uploads/seed/place-back.svg' FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Hiệu sách', N'Lang thang giữa các kệ sách.', N'/uploads/seed/place-3-front.svg', N'/uploads/seed/place-back.svg' FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Bảo tàng', N'Học điều mới trong một buổi chiều.', N'/uploads/seed/place-4-front.svg', N'/uploads/seed/place-back.svg' FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi';
INSERT INTO dbo.Cards (TopicID, Name, Description, FrontImageURL, BackImageURL) SELECT TopicID, N'Chợ đêm', N'Ăn vặt và ngắm phố.', N'/uploads/seed/place-5-front.svg', N'/uploads/seed/place-back.svg' FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi';
GO
INSERT INTO dbo.Products (TopicID, Name, Description, Price, StockQuantity, ImageURL) VALUES ((SELECT TopicID FROM dbo.Topics WHERE Name = N'Món ăn'), N'Bộ bài Món ăn', N'Bộ bài in giấy cao cấp, 52 lá món ăn.', 89000, 50, N'/uploads/seed/product-food.svg');
INSERT INTO dbo.Products (TopicID, Name, Description, Price, StockQuantity, ImageURL) VALUES ((SELECT TopicID FROM dbo.Topics WHERE Name = N'Hoạt động cuối tuần'), N'Bộ bài Hoạt động cuối tuần', N'Bộ bài gợi ý hoạt động, 40 lá.', 79000, 30, N'/uploads/seed/product-weekend.svg');
INSERT INTO dbo.Products (TopicID, Name, Description, Price, StockQuantity, ImageURL) VALUES ((SELECT TopicID FROM dbo.Topics WHERE Name = N'Địa điểm đi chơi'), N'Bộ bài Địa điểm đi chơi', N'Bộ bài khám phá địa điểm, 40 lá.', 79000, 3, N'/uploads/seed/product-place.svg');
INSERT INTO dbo.Products (TopicID, Name, Description, Price, StockQuantity, ImageURL) VALUES (NULL, N'Hộp quà MewCard', N'Hộp quà gồm 3 bộ bài và túi vải (không gắn chủ đề).', 249000, 10, N'/uploads/seed/product-gift.svg');
GO
