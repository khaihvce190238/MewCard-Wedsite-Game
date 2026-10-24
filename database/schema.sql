/* =====================================================================
   DecisionCardDB - schema.sql
   Chạy MỘT LẦN trên SQL Server (muốn làm lại: chạy reset.sql trước).
   Nếu dùng sqlcmd, thêm cờ -I (QUOTED_IDENTIFIER ON) vì có filtered index:
     sqlcmd -S localhost -U sa -P <mat_khau> -C -I -i database/schema.sql
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
IF DB_ID(N'DecisionCardDB') IS NULL CREATE DATABASE DecisionCardDB;
GO
USE DecisionCardDB;
GO

/* ---------- 1. Users ---------- */
CREATE TABLE dbo.Users (
  UserID       INT IDENTITY(1,1) CONSTRAINT PK_Users PRIMARY KEY,
  FullName     NVARCHAR(100) NOT NULL,
  Email        NVARCHAR(255) NOT NULL,
  PasswordHash NVARCHAR(255) NULL,           -- NULL = tài khoản chỉ đăng nhập bằng Google
  GoogleId     NVARCHAR(64)  NULL,           -- 'sub' của tài khoản Google đã liên kết
  Phone        NVARCHAR(20)  NULL,           -- giả định: để điền sẵn khi checkout
  Address      NVARCHAR(300) NULL,           -- giả định: để điền sẵn khi checkout
  Role         NVARCHAR(10)  NOT NULL CONSTRAINT DF_Users_Role    DEFAULT N'User',
  Status       NVARCHAR(10)  NOT NULL CONSTRAINT DF_Users_Status  DEFAULT N'Active',
  CreatedAt    DATETIME2(0)  NOT NULL CONSTRAINT DF_Users_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Users_Email  UNIQUE (Email),
  CONSTRAINT CK_Users_Role   CHECK (Role   IN (N'User', N'Admin')),
  CONSTRAINT CK_Users_Status CHECK (Status IN (N'Active', N'Locked')),
  CONSTRAINT CK_Users_LoginMethod CHECK (PasswordHash IS NOT NULL OR GoogleId IS NOT NULL)
);
CREATE UNIQUE INDEX UX_Users_GoogleId ON dbo.Users (GoogleId) WHERE GoogleId IS NOT NULL;

/* ---------- 2. Topics ---------- */
CREATE TABLE dbo.Topics (
  TopicID     INT IDENTITY(1,1) CONSTRAINT PK_Topics PRIMARY KEY,
  Name        NVARCHAR(100) NOT NULL,
  Description NVARCHAR(500) NULL,
  ImageURL    NVARCHAR(300) NULL,
  IsActive    BIT NOT NULL CONSTRAINT DF_Topics_Active  DEFAULT 1,
  CreatedAt   DATETIME2(0) NOT NULL CONSTRAINT DF_Topics_Created DEFAULT SYSUTCDATETIME(),
  UpdatedAt   DATETIME2(0) NOT NULL CONSTRAINT DF_Topics_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Topics_Name UNIQUE (Name)
);

/* ---------- 3. Cards (lá bài dùng trong game) ---------- */
CREATE TABLE dbo.Cards (
  CardID        INT IDENTITY(1,1) CONSTRAINT PK_Cards PRIMARY KEY,
  TopicID       INT NOT NULL CONSTRAINT FK_Cards_Topics REFERENCES dbo.Topics(TopicID),
  Name          NVARCHAR(150) NOT NULL,
  Description   NVARCHAR(1000) NULL,
  FrontImageURL NVARCHAR(300) NOT NULL,
  BackImageURL  NVARCHAR(300) NOT NULL,
  IsActive      BIT NOT NULL CONSTRAINT DF_Cards_Active  DEFAULT 1,
  CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Cards_Created DEFAULT SYSUTCDATETIME(),
  UpdatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Cards_Updated DEFAULT SYSUTCDATETIME()
);
CREATE INDEX IX_Cards_Topic_Active ON dbo.Cards (TopicID, IsActive);

/* ---------- 4. DrawRounds ----------
   SessionId + LastActivityAt: hai cột kỹ thuật để phát hiện phiên bỏ dở
   (xem README, mục "Vòng bỏ dở").
   CompletedAt = thời điểm vòng KẾT THÚC (cả Completed lẫn Abandoned). */
CREATE TABLE dbo.DrawRounds (
  RoundID        INT IDENTITY(1,1) CONSTRAINT PK_DrawRounds PRIMARY KEY,
  UserID         INT NOT NULL CONSTRAINT FK_DrawRounds_Users  REFERENCES dbo.Users(UserID),
  TopicID        INT NOT NULL CONSTRAINT FK_DrawRounds_Topics REFERENCES dbo.Topics(TopicID),
  RoundNumber    INT NOT NULL,
  Status         NVARCHAR(10) NOT NULL CONSTRAINT DF_DrawRounds_Status DEFAULT N'Active',
  SessionId      NVARCHAR(64) NOT NULL,
  StartedAt      DATETIME2(0) NOT NULL CONSTRAINT DF_DrawRounds_Started DEFAULT SYSUTCDATETIME(),
  LastActivityAt DATETIME2(0) NOT NULL CONSTRAINT DF_DrawRounds_Last    DEFAULT SYSUTCDATETIME(),
  CompletedAt    DATETIME2(0) NULL,
  CONSTRAINT UQ_DrawRounds_UserTopicRound UNIQUE (UserID, TopicID, RoundNumber),
  CONSTRAINT CK_DrawRounds_Status CHECK (Status IN (N'Active', N'Completed', N'Abandoned')),
  CONSTRAINT CK_DrawRounds_End CHECK (
    (Status = N'Active' AND CompletedAt IS NULL) OR (Status <> N'Active' AND CompletedAt IS NOT NULL))
);
-- Mỗi User + Topic chỉ có tối đa 1 vòng Active (chặn race condition ngay ở mức DB)
CREATE UNIQUE INDEX UX_DrawRounds_OneActive ON dbo.DrawRounds (UserID, TopicID) WHERE Status = N'Active';

/* ---------- 5. DrawHistory (snapshot) ---------- */
CREATE TABLE dbo.DrawHistory (
  DrawID                  INT IDENTITY(1,1) CONSTRAINT PK_DrawHistory PRIMARY KEY,
  RoundID                 INT NOT NULL CONSTRAINT FK_DrawHistory_Rounds REFERENCES dbo.DrawRounds(RoundID),
  CardID                  INT NOT NULL CONSTRAINT FK_DrawHistory_Cards  REFERENCES dbo.Cards(CardID),
  CardNameSnapshot        NVARCHAR(150)  NOT NULL,
  CardDescriptionSnapshot NVARCHAR(1000) NULL,
  FrontImageURLSnapshot   NVARCHAR(300)  NOT NULL,
  BackImageURLSnapshot    NVARCHAR(300)  NOT NULL,
  DrawnAt                 DATETIME2(0) NOT NULL CONSTRAINT DF_DrawHistory_Drawn DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_DrawHistory_RoundCard UNIQUE (RoundID, CardID)
);
CREATE INDEX IX_DrawHistory_Round_DrawnAt ON dbo.DrawHistory (RoundID, DrawnAt DESC);

/* ---------- 6. FavoriteCards ---------- */
CREATE TABLE dbo.FavoriteCards (
  UserID    INT NOT NULL CONSTRAINT FK_Fav_Users REFERENCES dbo.Users(UserID),
  CardID    INT NOT NULL CONSTRAINT FK_Fav_Cards REFERENCES dbo.Cards(CardID),
  CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Fav_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT PK_FavoriteCards PRIMARY KEY (UserID, CardID)
);

/* ---------- 7. Products (bộ bài vật lý) ---------- */
CREATE TABLE dbo.Products (
  ProductID     INT IDENTITY(1,1) CONSTRAINT PK_Products PRIMARY KEY,
  TopicID       INT NULL CONSTRAINT FK_Products_Topics REFERENCES dbo.Topics(TopicID),
  Name          NVARCHAR(150) NOT NULL,
  Description   NVARCHAR(1000) NULL,
  Price         DECIMAL(12,2) NOT NULL,
  StockQuantity INT NOT NULL CONSTRAINT DF_Products_Stock  DEFAULT 0,
  ImageURL      NVARCHAR(300) NULL,
  IsActive      BIT NOT NULL CONSTRAINT DF_Products_Active DEFAULT 1,
  CreatedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Products_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Products_Price CHECK (Price >= 0),
  CONSTRAINT CK_Products_Stock CHECK (StockQuantity >= 0)   -- tồn kho không bao giờ âm
);

/* ---------- 8. CartItems ---------- */
CREATE TABLE dbo.CartItems (
  CartItemID INT IDENTITY(1,1) CONSTRAINT PK_CartItems PRIMARY KEY,
  UserID     INT NOT NULL CONSTRAINT FK_Cart_Users    REFERENCES dbo.Users(UserID),
  ProductID  INT NOT NULL CONSTRAINT FK_Cart_Products REFERENCES dbo.Products(ProductID),
  Quantity   INT NOT NULL,
  CONSTRAINT UQ_CartItems_UserProduct UNIQUE (UserID, ProductID),
  CONSTRAINT CK_CartItems_Qty CHECK (Quantity > 0)
);

/* ---------- 9. Orders ----------
   Quy tắc tồn kho (ghi trong README): TRỪ kho khi tạo đơn (giữ hàng);
   HOÀN kho khi đơn thành Cancelled hoặc thanh toán Failed.
   StockRestored chống hoàn kho 2 lần. */
CREATE TABLE dbo.Orders (
  OrderID         INT IDENTITY(1,1) CONSTRAINT PK_Orders PRIMARY KEY,
  UserID          INT NOT NULL CONSTRAINT FK_Orders_Users REFERENCES dbo.Users(UserID),
  TotalAmount     DECIMAL(12,2) NOT NULL,
  Status          NVARCHAR(25) NOT NULL CONSTRAINT DF_Orders_Status    DEFAULT N'Pending',
  PaymentMethod   NVARCHAR(10) NOT NULL,
  PaymentStatus   NVARCHAR(10) NOT NULL CONSTRAINT DF_Orders_PayStatus DEFAULT N'Unpaid',
  ShippingName    NVARCHAR(100) NOT NULL,   -- snapshot người nhận
  ShippingPhone   NVARCHAR(20)  NOT NULL,
  ShippingAddress NVARCHAR(300) NOT NULL,
  StatusBeforeCancelRequest NVARCHAR(25) NULL,  -- quay về đâu nếu Admin từ chối hủy
  CancelReason    NVARCHAR(500) NULL,
  AdminNote       NVARCHAR(500) NULL,
  StockRestored   BIT NOT NULL CONSTRAINT DF_Orders_StockRestored DEFAULT 0,
  CreatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Orders_Created DEFAULT SYSUTCDATETIME(),
  UpdatedAt       DATETIME2(0) NOT NULL CONSTRAINT DF_Orders_Updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Orders_Total  CHECK (TotalAmount >= 0),
  CONSTRAINT CK_Orders_Status CHECK (Status IN (N'Pending', N'Confirmed', N'Shipping', N'Delivered',
      N'CancellationRequested', N'CancellationRejected', N'Cancelled')),
  CONSTRAINT CK_Orders_PayMethod CHECK (PaymentMethod IN (N'Mock', N'VNPay')),
  CONSTRAINT CK_Orders_PayStatus CHECK (PaymentStatus IN (N'Unpaid', N'Pending', N'Paid', N'Failed', N'Refunded'))
);
CREATE INDEX IX_Orders_User_Created ON dbo.Orders (UserID, CreatedAt DESC);
CREATE INDEX IX_Orders_Status ON dbo.Orders (Status);

/* ---------- 10. OrderItems ---------- */
CREATE TABLE dbo.OrderItems (
  OrderItemID INT IDENTITY(1,1) CONSTRAINT PK_OrderItems PRIMARY KEY,
  OrderID     INT NOT NULL CONSTRAINT FK_OrderItems_Orders   REFERENCES dbo.Orders(OrderID),
  ProductID   INT NOT NULL CONSTRAINT FK_OrderItems_Products REFERENCES dbo.Products(ProductID),
  Quantity    INT NOT NULL,
  UnitPrice   DECIMAL(12,2) NOT NULL,          -- giá tại thời điểm mua
  CONSTRAINT CK_OrderItems_Qty   CHECK (Quantity > 0),
  CONSTRAINT CK_OrderItems_Price CHECK (UnitPrice >= 0)
);
CREATE INDEX IX_OrderItems_Order ON dbo.OrderItems (OrderID);

/* ---------- 11. Memberships ---------- */
CREATE TABLE dbo.Memberships (
  MembershipID  INT IDENTITY(1,1) CONSTRAINT PK_Memberships PRIMARY KEY,
  UserID        INT NOT NULL CONSTRAINT FK_Memberships_User REFERENCES dbo.Users(UserID),
  MemberCode    NVARCHAR(20) NULL,
  Status        NVARCHAR(10) NOT NULL CONSTRAINT DF_Memberships_Status  DEFAULT N'Pending',
  ApplicantNote NVARCHAR(500) NULL,            -- giả định: ô ghi chú tùy chọn duy nhất của biểu mẫu
  AppliedAt     DATETIME2(0) NOT NULL CONSTRAINT DF_Memberships_Applied DEFAULT SYSUTCDATETIME(),
  ReviewedAt    DATETIME2(0) NULL,
  ReviewedBy    INT NULL CONSTRAINT FK_Memberships_Reviewer REFERENCES dbo.Users(UserID),
  AdminNote     NVARCHAR(500) NULL,
  CONSTRAINT CK_Memberships_Status CHECK (Status IN (N'Pending', N'Approved', N'Rejected', N'Cancelled')),
  CONSTRAINT CK_Memberships_Review CHECK (
    Status IN (N'Pending', N'Cancelled') OR (ReviewedAt IS NOT NULL AND ReviewedBy IS NOT NULL))
);
-- Mỗi User tối đa 1 yêu cầu Pending; MemberCode duy nhất khi có giá trị
CREATE UNIQUE INDEX UX_Memberships_OnePending ON dbo.Memberships (UserID) WHERE Status = N'Pending';
CREATE UNIQUE INDEX UX_Memberships_MemberCode ON dbo.Memberships (MemberCode) WHERE MemberCode IS NOT NULL;
CREATE INDEX IX_Memberships_Status ON dbo.Memberships (Status, AppliedAt DESC);

/* ---------- 12. PaymentTransactions ----------
   ProviderTransactionNo (vnp_TransactionNo) + ResponseCode: tối thiểu cần để đối soát
   và chống xử lý lặp callback. Chống lặp chính: UPDATE ... WHERE Status = 'Pending'. */
CREATE TABLE dbo.PaymentTransactions (
  PaymentTransactionID  INT IDENTITY(1,1) CONSTRAINT PK_PaymentTransactions PRIMARY KEY,
  OrderID               INT NOT NULL CONSTRAINT FK_PayTx_Orders REFERENCES dbo.Orders(OrderID),
  Provider              NVARCHAR(10) NOT NULL,
  TransactionReference  NVARCHAR(64) NOT NULL,
  ProviderTransactionNo NVARCHAR(64) NULL,
  ResponseCode          NVARCHAR(10) NULL,
  Amount                DECIMAL(12,2) NOT NULL,
  Status                NVARCHAR(10) NOT NULL CONSTRAINT DF_PayTx_Status  DEFAULT N'Pending',
  CreatedAt             DATETIME2(0) NOT NULL CONSTRAINT DF_PayTx_Created DEFAULT SYSUTCDATETIME(),
  UpdatedAt             DATETIME2(0) NOT NULL CONSTRAINT DF_PayTx_Updated DEFAULT SYSUTCDATETIME(),
  PaidAt                DATETIME2(0) NULL,
  CONSTRAINT UQ_PayTx_Reference UNIQUE (TransactionReference),
  CONSTRAINT CK_PayTx_Provider CHECK (Provider IN (N'Mock', N'VNPay')),
  CONSTRAINT CK_PayTx_Status   CHECK (Status IN (N'Pending', N'Paid', N'Failed')),
  CONSTRAINT CK_PayTx_Amount   CHECK (Amount >= 0)
);
CREATE UNIQUE INDEX UX_PayTx_ProviderNo ON dbo.PaymentTransactions (Provider, ProviderTransactionNo)
  WHERE ProviderTransactionNo IS NOT NULL;
CREATE INDEX IX_PayTx_Order ON dbo.PaymentTransactions (OrderID);

/* ---------- 13. PendingRegistrations (đăng ký chờ xác nhận email — CHƯA phải tài khoản) ---------- */
CREATE TABLE dbo.PendingRegistrations (
  PendingID    INT IDENTITY(1,1) CONSTRAINT PK_PendingRegistrations PRIMARY KEY,
  Email        NVARCHAR(255) NOT NULL,
  FullName     NVARCHAR(100) NOT NULL,
  PasswordHash NVARCHAR(255) NOT NULL,          -- đã hash bcrypt, không lưu mật khẩu rõ
  CodeHash     NVARCHAR(128) NOT NULL,          -- HMAC-SHA256 của mã 6 số, không lưu mã rõ
  ExpiresAt    DATETIME2(0) NOT NULL,           -- hạn của mã hiện tại
  Attempts     INT NOT NULL CONSTRAINT DF_Pending_Attempts DEFAULT 0,   -- số lần nhập sai mã hiện tại
  SendCount    INT NOT NULL CONSTRAINT DF_Pending_SendCount DEFAULT 1,  -- số lần gửi mã trong 1 giờ
  LastSentAt   DATETIME2(0) NOT NULL CONSTRAINT DF_Pending_LastSent DEFAULT SYSUTCDATETIME(),
  CreatedAt    DATETIME2(0) NOT NULL CONSTRAINT DF_Pending_Created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_Pending_Email UNIQUE (Email),
  CONSTRAINT CK_Pending_Counts CHECK (Attempts >= 0 AND SendCount >= 1)
);
GO
