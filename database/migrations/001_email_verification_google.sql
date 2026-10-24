/* =====================================================================
   Migration 001 — Xác nhận email khi đăng ký + Đăng nhập Google
   Chạy MỘT LẦN trên database ĐÃ CÓ (an toàn khi chạy lại: có kiểm tra tồn tại).
   Không xóa dữ liệu: tài khoản hiện có giữ nguyên.
   sqlcmd -S localhost -U sa -P <mat_khau> -C -I -i database/migrations/001_email_verification_google.sql
   ===================================================================== */
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO
USE DecisionCardDB;
GO

-- 1) Tài khoản Google không có mật khẩu => PasswordHash cho phép NULL
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.Users') AND name = N'PasswordHash' AND is_nullable = 0)
  ALTER TABLE dbo.Users ALTER COLUMN PasswordHash NVARCHAR(255) NULL;
GO

-- 2) Mã định danh Google ("sub") của tài khoản đã liên kết
IF COL_LENGTH('dbo.Users', 'GoogleId') IS NULL
  ALTER TABLE dbo.Users ADD GoogleId NVARCHAR(64) NULL;
GO

-- 3) Mỗi tài khoản Google chỉ liên kết với một User
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'UX_Users_GoogleId' AND object_id = OBJECT_ID(N'dbo.Users'))
  CREATE UNIQUE INDEX UX_Users_GoogleId ON dbo.Users (GoogleId) WHERE GoogleId IS NOT NULL;
GO

-- 4) Luôn phải có ít nhất một cách đăng nhập (mật khẩu hoặc Google)
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = N'CK_Users_LoginMethod')
  ALTER TABLE dbo.Users ADD CONSTRAINT CK_Users_LoginMethod CHECK (PasswordHash IS NOT NULL OR GoogleId IS NOT NULL);
GO

-- 5) Yêu cầu đăng ký đang chờ xác nhận email (CHƯA phải tài khoản)
IF OBJECT_ID(N'dbo.PendingRegistrations', N'U') IS NULL
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
