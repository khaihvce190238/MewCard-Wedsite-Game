<<<<<<< HEAD
# MewCard — Decision Card Game + Card Shop

Website **rút bài để đưa ra gợi ý** (không phải game chiến đấu/gacha) kết hợp **cửa hàng bán bộ bài vật lý**, đăng ký thành viên có xét duyệt và trang quản trị Admin.

> ⚠️ **Tình trạng kiểm chứng** (đọc kỹ ở mục 21): code được viết trong môi trường **không có mạng và không có SQL Server**, nên *chưa* chạy thử end-to-end. Xem danh sách cụ thể đã/chưa kiểm chứng ở cuối tài liệu.

## 1. Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React 19, Vite 8, React Router DOM, Axios, CSS thuần (biến CSS) — dựa trên template `mewcard.zip` |
| Backend | Node.js (ES Modules), Express 4, `mssql`, `jsonwebtoken`, `bcryptjs`, `multer`, `dotenv`, `cors` |
| Database | Microsoft SQL Server — database `DecisionCardDB` |
| Thanh toán | Giả lập (demo) + VNPay sandbox |

## 2. Cấu trúc thư mục

```
decision-card-project/
├─ frontend/                 # template Vite + React (giữ nguyên cấu hình), đã thêm router/axios
│  └─ src/ components/ contexts/ hooks/ layouts/ pages/{auth,game,shop,membership,user,admin}/ routes/ services/ utils/
├─ backend/
│  ├─ config/ (env, db)  routes/  controllers/  services/  middlewares/  utils/  scripts/  tests/
│  ├─ uploads/ (ảnh upload + uploads/seed là ảnh mẫu)
│  └─ server.js, .env.example
├─ database/ schema.sql, seed.sql, reset.sql
└─ README.md
```
Ghi chú kiến trúc: SQL được viết trực tiếp trong `services/` (không tách thêm lớp `repositories/` để dự án gọn). Nghiệp vụ quan trọng nằm ở `drawService`, `orderService`, `paymentService`, `membershipService`. API trả về tên cột **đúng như trong DB** (PascalCase, ví dụ `card.Name`), request body dùng camelCase.

## 3. Yêu cầu môi trường
- Node.js ≥ 20, npm
- SQL Server (Developer/Express/Docker đều được) + một công cụ chạy script (SSMS, Azure Data Studio hoặc `sqlcmd`)
- TCP/IP của SQL Server bật (cổng 1433) và đăng nhập SQL Authentication (user/password)

## 4–5. Tạo database và chạy `schema.sql`
Chạy **theo thứ tự** `schema.sql` → `seed.sql`. Với SSMS/Azure Data Studio: mở file → Execute. Với `sqlcmd`:

```bash
sqlcmd -S localhost -U sa -P "<mat_khau>" -C -I -i database/schema.sql
sqlcmd -S localhost -U sa -P "<mat_khau>" -C -I -i database/seed.sql
```
- `-I` **bắt buộc** (bật QUOTED_IDENTIFIER cho filtered index). `schema.sql` tự tạo DB `DecisionCardDB` nếu chưa có.
- Làm lại từ đầu: chạy `database/reset.sql`, rồi `schema.sql` + `seed.sql`.

## 7. `seed.sql`
Tạo 3 chủ đề, 15 lá bài, 4 sản phẩm (ảnh SVG mẫu ở `backend/uploads/seed/`). Không dùng ID cố định (tra `TopicID` theo tên). **Không chứa tài khoản/mật khẩu** — Admin tạo ở mục 14.

## 8. Cấu hình `backend/.env`
```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
```
Điền tối thiểu: `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` (chuỗi ngẫu nhiên ≥ 16 ký tự), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (≥ 8 ký tự). Tạo secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
**Không commit `.env`** (đã nằm trong `.gitignore`).

| Biến | Ý nghĩa |
|---|---|
| `PORT`, `FRONTEND_URL` | Cổng backend; origin được CORS cho phép |
| `DB_SERVER/PORT/NAME/USER/PASSWORD/ENCRYPT/TRUST_SERVER_CERTIFICATE` | Kết nối SQL Server (local thường `ENCRYPT=false`, `TRUST_SERVER_CERTIFICATE=true`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Ký JWT |
| `ADMIN_EMAIL/FULLNAME/PASSWORD` | Dùng bởi `npm run seed:admin` |
| `UPLOAD_DIR`, `MAX_UPLOAD_MB` | Thư mục và dung lượng tối đa ảnh upload |
| `DRAW_SESSION_TIMEOUT_MINUTES` | Quá hạn không hoạt động ⇒ vòng rút bị coi là bỏ dở (mặc định 30) |
| `PAYMENT_PENDING_TIMEOUT_MINUTES` | Đơn chưa thanh toán quá hạn ⇒ tự hủy + hoàn kho (mặc định 30) |
| `ENABLE_MOCK_PAYMENT` | `false` để tắt thanh toán giả lập (nên tắt khi triển khai thật) |
| `VNPAY_TMN_CODE/HASH_SECRET/URL/RETURN_URL/IPN_URL` | VNPay sandbox |

## 9–10. Backend
```bash
cd backend
npm install
npm run seed:admin     # tạo/cập nhật Admin từ .env
npm run dev            # hoặc: npm start   → http://localhost:5000
npm test               # test logic thuần (state machine đơn hàng, chữ ký VNPay)
```
Kiểm tra: mở `http://localhost:5000/api/health` → `{"success":true,"data":{"status":"ok","database":"connected"}}`.

## 11–13. Frontend
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000  (tùy chọn, đây là mặc định)
npm run dev              # → http://localhost:5173
npm run build            # build production
```
| | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend / API | http://localhost:5000 / `http://localhost:5000/api` |
| Ảnh upload | `http://localhost:5000/uploads/...` |

## 14. Admin an toàn
- Đăng ký công khai **luôn** tạo `Role = 'User'`; trường `role` gửi lên bị bỏ qua.
- Admin chỉ được tạo bằng `npm run seed:admin` (mật khẩu đọc từ `.env`, được hash bằng bcrypt, không có trong source). Đổi mật khẩu Admin: sửa `ADMIN_PASSWORD` rồi chạy lại lệnh.
- Mỗi request đều đọc lại `Role/Status` từ DB nên **khóa tài khoản có hiệu lực ngay**, kể cả token còn hạn. Admin không thể khóa chính mình hoặc Admin khác.

## 15. Cách dùng game
1. Đăng nhập → **Chơi rút bài** → chọn chủ đề → **Rút bài**.
2. Backend chọn ngẫu nhiên một lá chưa rút trong vòng; client không bao giờ gửi `CardID`.
3. Rút hết bài ⇒ vòng `Completed`; nút đổi thành **Bắt đầu vòng mới** (lá bài xuất hiện lại).
4. **Lịch sử** hiển thị đúng nội dung/ảnh lúc rút (snapshot) dù Admin sửa/ẩn sau đó. **Yêu thích** giữ lá bài đã ẩn, kèm cảnh báo.

### Vòng bỏ dở — cơ chế phát hiện
Không dựa vào `beforeunload`/`sendBeacon`. Cách hoạt động:
- Mỗi lượt vào trang chơi frontend sinh một `sessionId` mới (trong bộ nhớ trang, **không** lưu lại); `DrawRounds` lưu `SessionId` và `LastActivityAt`.
- Khi User vào chủ đề (`POST /api/draw/start`) hoặc rút (`POST /api/draw`), backend khóa vòng `Active` của (User, Topic): nếu **khác `SessionId`** *hoặc* **quá `DRAW_SESSION_TIMEOUT_MINUTES`** ⇒ đánh dấu `Abandoned` rồi tạo vòng mới. Không bao giờ tiếp tục vòng cũ.
- Thoát chủ động: nút "Kết thúc", rời trang, hoặc `pagehide` gọi `POST /api/draw/leave` (best-effort bằng `fetch keepalive`). Nếu request này không đến được (đóng trình duyệt đột ngột), cơ chế `SessionId`/timeout ở trên vẫn xử lý khi User quay lại.
- Chặn nhiều vòng `Active`: filtered unique index `UX_DrawRounds_OneActive (UserID, TopicID) WHERE Status='Active'`. Chặn rút trùng: `UNIQUE (RoundID, CardID)` + transaction + `UPDLOCK/HOLDLOCK` + tự thử lại khi deadlock/trùng khóa.
- Lưu ý: tải lại trang (F5) cũng sinh `sessionId` mới ⇒ bắt đầu vòng mới (đúng yêu cầu "quay lại chủ đề là vòng mới").
- `CompletedAt` được dùng làm thời điểm **kết thúc** cho cả `Completed` lẫn `Abandoned`. Vòng chỉ được tạo ở lần rút đầu tiên nên không sinh vòng rỗng.

## 16. Cách dùng Card Shop
Xem sản phẩm → thêm vào giỏ → Checkout (nhập thông tin nhận hàng, chọn thanh toán) → thanh toán → theo dõi ở **Đơn hàng**. Giá và tổng tiền luôn do backend tính lại.

### Quy tắc tồn kho (nhất quán xuyên suốt)
| Thời điểm | Hành động |
|---|---|
| Tạo đơn | **Trừ kho ngay** (giữ hàng) bằng `UPDATE ... WHERE StockQuantity >= @q` trong transaction ⇒ tồn kho không bao giờ âm; hai người mua cái cuối thì chỉ một người thành công |
| Thanh toán thất bại / đơn quá hạn thanh toán / Admin duyệt hủy | **Hoàn kho đúng 1 lần** (cờ `Orders.StockRestored`) |
| Từ chối yêu cầu hủy | Không hoàn kho, đơn tiếp tục |

Thanh toán là bắt buộc: đơn `Pending` + chưa trả quá `PAYMENT_PENDING_TIMEOUT_MINUTES` sẽ tự hủy và hoàn kho (xử lý "lười" mỗi khi có request liên quan đơn hàng). Admin chỉ **xác nhận** được đơn đã `Paid`.

### Trạng thái đơn
`Pending → Confirmed → Shipping → Delivered`; hủy: User gửi yêu cầu (chỉ khi `Pending/Confirmed`) → `CancellationRequested` → Admin duyệt (`Cancelled`) hoặc từ chối (`CancellationRejected`, đơn đi tiếp theo trạng thái trước đó). Mọi bước chuyển đi qua `utils/orderStateMachine.js` (có test).

### Hoàn tiền
Hệ thống **không tự hoàn tiền**. Đơn đã hủy mà vẫn `Paid` ⇒ Admin hoàn tiền thật bên ngoài (ví dụ cổng VNPay merchant) rồi bấm "Đánh dấu đã hoàn tiền" (bắt buộc xác nhận + ghi chú) để chuyển `Refunded`. Nếu tiền VNPay về *sau khi* đơn đã bị hủy/quá hạn, giao dịch vẫn được ghi nhận `Paid` để Admin biết cần hoàn tiền thủ công.

## 17. Kiểm thử thanh toán giả lập
Checkout → chọn "Thanh toán giả lập" → trang có banner **DEMO** với hai nút *thành công* / *thất bại*.
- Thành công ⇒ giao dịch `Paid`, đơn `PaymentStatus=Paid`.
- Thất bại ⇒ giao dịch `Failed`, đơn `Cancelled`, hoàn kho.
Không dùng cơ chế này cho VNPay (đường API riêng, tách bạch).

## 18. Cấu hình VNPay sandbox
1. Đăng ký tài khoản merchant sandbox của VNPay, lấy **TMN Code** và **Hash Secret**.
2. Điền `backend/.env`: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_URL` (mặc định sandbox), `VNPAY_RETURN_URL=http://localhost:5173/payment/result`.
3. Chạy lại backend. Checkout sẽ mở khóa lựa chọn VNPay (chưa cấu hình ⇒ tùy chọn bị vô hiệu và API trả 503 kèm hướng dẫn; **không** giả vờ thành công).
4. Luồng: tạo đơn → `POST /api/payments/vnpay/create` → chuyển sang VNPay → VNPay quay về `/payment/result?vnp_...` → frontend gọi `GET /api/payments/vnpay/return` → backend **xác minh chữ ký HMAC-SHA512, số tiền, mã giao dịch** rồi mới ghi nhận. Giao dịch lặp không bị ghi nhận hai lần (`UPDATE ... WHERE Status='Pending'`).
5. **IPN** (`GET /api/payments/vnpay/ipn`, trả `RspCode` đúng chuẩn 00/01/02/04/97/99) là nguồn xác nhận chính khi có URL công khai. Khi chạy localhost, VNPay không gọi được IPN nên return URL (đã xác minh chữ ký) là đường dự phòng. Để thử IPN: dùng tunnel (ví dụ ngrok) và khai báo IPN URL trong cổng sandbox của VNPay.
6. Tham số được ký đúng quy ước VNPay 2.1.0 (sắp xếp khóa, `encodeURIComponent` + `+` cho khoảng trắng). `vnp_OrderInfo` được làm sạch (không dấu, không ký tự đặc biệt) để tránh sai khác khi ký. **Hãy đối chiếu với tài liệu VNPay hiện hành khi thử sandbox.**
7. Dùng thẻ test do VNPay cung cấp. Ứng dụng không bao giờ lưu dữ liệu thẻ.

## 19. Lỗi thường gặp
| Triệu chứng | Cách xử lý |
|---|---|
| `Thiếu cấu hình trong backend/.env` | Điền `DB_USER`, `DB_PASSWORD`, `JWT_SECRET` |
| `/api/health` trả 503 | Kiểm tra SQL Server chạy, bật TCP/IP cổng 1433, đúng `DB_SERVER`, user/password; thử `DB_ENCRYPT=false` |
| Lỗi `Cannot open database "DecisionCardDB"` | Chưa chạy `schema.sql` |
| `INSERT failed because ... QUOTED_IDENTIFIER` | Chạy bằng `sqlcmd` thiếu cờ `-I` |
| `Login failed for user` | Bật SQL Server Authentication (mixed mode), kiểm tra mật khẩu |
| Frontend báo `Network Error` | Backend chưa chạy hoặc `VITE_API_URL` sai; kiểm tra `FRONTEND_URL` khớp origin frontend (CORS) |
| Ảnh không hiện | Backend phải chạy (ảnh phục vụ qua `/uploads`) |
| Đăng nhập Admin thất bại | Chạy `npm run seed:admin` sau khi đặt `ADMIN_PASSWORD` |
| Upload bị từ chối | Chỉ nhận JPG/PNG/WEBP/GIF, tối đa `MAX_UPLOAD_MB` (SVG không cho phép upload vì lý do an toàn) |

## 20. Cần làm trước khi triển khai thật
- Đặt `JWT_SECRET` mạnh; dùng HTTPS; `DB_ENCRYPT=true` với chứng chỉ hợp lệ; tài khoản DB quyền tối thiểu (không dùng `sa`).
- Tắt `ENABLE_MOCK_PAYMENT`; chuyển VNPay sang production, cấu hình IPN URL công khai.
- Thay lưu ảnh local bằng lưu trữ cloud; thêm rate limit, helmet, giám sát/log.
- Token JWT hiện lưu ở `localStorage` (đơn giản cho dự án sinh viên); cân nhắc cookie httpOnly khi triển khai thật.
- Xử lý "đơn quá hạn" đang chạy lười theo request; có thể thay bằng tác vụ định kỳ (cron/SQL Agent).

## Phân tích nghiệp vụ & giả định đã chọn
- **Public vs đăng nhập:** danh sách chủ đề/cửa hàng xem công khai; chơi rút bài, giỏ hàng, đơn hàng, thành viên cần đăng nhập. `GET /api/topics/:id/cards` chỉ trả số lượng và ảnh mặt sau (không lộ tên/ảnh mặt trước) để không "spoil" trò chơi.
- **Ảnh:** tên file duy nhất (UUID), không ghi đè, không xóa ảnh cũ ⇒ snapshot luôn trỏ đúng ảnh. Đuôi file lấy từ mimetype đã whitelist, không từ tên file client.
- **Thành viên:** biểu mẫu chỉ có ô ghi chú tùy chọn (`ApplicantNote`); dùng `FullName`/`Email` từ tài khoản. Một User tối đa 1 yêu cầu `Pending` (unique index); đã `Approved` thì không đăng ký lại; bị `Rejected`/`Cancelled` thì được đăng ký lại ngay. Mã thành viên `MEWxxxxxx` sinh khi duyệt. Không có hạng/điểm/giảm giá.
- **Thêm vào schema ngoài danh sách gốc (tối thiểu, có lý do):** `Users.Phone/Address` (điền sẵn checkout); `DrawRounds.SessionId/LastActivityAt` (phát hiện vòng bỏ dở); `Orders.StatusBeforeCancelRequest/CancelReason/AdminNote/StockRestored/UpdatedAt`; `Memberships.ApplicantNote`; `PaymentTransactions.ProviderTransactionNo/ResponseCode` (đối soát, chống lặp).
- **Phân quyền:** mọi API nhạy cảm kiểm tra JWT + đọc lại user từ DB + `Role` ở backend. Truy vấn SQL luôn có tham số. Mật khẩu hash bcrypt, không trả `PasswordHash`.

## API chính
`/api/auth/{register,login,me(GET/PUT),password}` · `/api/topics`, `/api/topics/:id/cards` · `/api/draw`, `/start`, `/leave`, `/history` · `/api/favorites[/:cardId]` · `/api/products[/:id]` · `/api/cart[/items[/:id]]` · `/api/orders`, `/my`, `/my/:id`, `/:id/cancel-request` · `/api/memberships`, `/my`, `/:id/cancel` · `/api/payments/{config,mock,vnpay/create,vnpay/return,vnpay/ipn,order/:id}` · `/api/admin/{dashboard,users,users/:id/status,topics,cards,cards/:id/images,products,orders,orders/:id/status,orders/:id/refund,memberships,memberships/:id,memberships/:id/review}`.
Phản hồi: `{ success, data, message?, pagination? }`; lỗi: `{ success:false, message, errors? }`.

## 21. Đã kiểm chứng gì, chưa kiểm chứng gì
**Đã kiểm tra được (trong môi trường tạo dự án):**
- Toàn bộ file backend qua `node --check` (cú pháp).
- `npm test` (4 test): máy trạng thái đơn hàng và ký/xác minh chữ ký VNPay (ký → xác minh được; sửa dữ liệu → bị từ chối). Test này đã bắt và sửa một lỗi thật (chữ "đ" bị mất trong `OrderInfo`).
- Toàn bộ file frontend `.jsx/.js` parse đúng cú pháp JSX (esbuild); mọi import tương đối trỏ tới file tồn tại, tên import/export khớp.

**CHƯA kiểm chứng (cần bạn chạy và báo lỗi nếu có):**
- `schema.sql`/`seed.sql` chưa được chạy trên SQL Server thật.
- `npm install`, `npm run build`, `npm run dev` chưa chạy (môi trường không có mạng) — chưa có `package-lock.json` cho phần mới thêm.
- Chưa gọi thử bất kỳ API nào end-to-end, chưa mở giao diện trên trình duyệt; các kịch bản đồng thời (rút bài/mua hàng) mới được thiết kế bằng ràng buộc DB + transaction, chưa chạy thử tải.
- VNPay: **chưa có giao dịch sandbox nào được thực hiện** (cần credentials của bạn). Phần ký URL và xác minh chữ ký đã có test, nhưng chưa đối chiếu với máy chủ VNPay thật.
=======
# MewCard-Wedsite-Game
>>>>>>> 2d991b152fe7dffe24677ef4a18b6164b4535f94
