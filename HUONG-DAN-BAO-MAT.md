# Hướng dẫn bảo mật — A. Tiểu

Ba việc dưới đây **bắt buộc Founder tự bấm**, lập trình viên không làm thay được
vì cần đăng nhập vào tài khoản Telegram, Netlify và Firebase của quán.

Phần code trong web đã chuẩn bị sẵn để **làm tới đâu an toàn tới đó** — chưa làm
thì app vẫn chạy y như cũ, không gián đoạn việc nhận đơn.

---

## VIỆC 1 — Giấu token Telegram (quan trọng nhất)

**Vấn đề:** 3 token bot đang nằm thẳng trong `index.html`. Ai xem mã nguồn web
hoặc bung file APK ra đều lấy được, rồi **gửi đơn giả vào nhóm Bếp** làm bếp nấu
món ma, hoặc đọc trộm toàn bộ tin nhắn trong các nhóm.

### Bước 1.1 — Đặt token lên Netlify

Vào **app.netlify.com** → chọn site `atieu.com` →
**Project configuration** → **Environment variables** → **Add a variable**

Thêm đúng 3 biến (lấy giá trị token hiện tại trong `index.html`, mục `TG_TOKENS`):

| Key | Value |
|---|---|
| `TG_TOKEN_ORDER` | token của bot dùng cho nhóm Chủ quán + nhóm Bếp |
| `TG_TOKEN_TN` | token của bot nhóm Thu Ngân |
| `TG_TOKEN_SHIP` | token của bot nhóm Shipper |

Lưu xong bấm **Deploys** → **Trigger deploy** → **Deploy site** để Netlify nạp biến mới.

### Bước 1.2 — Kiểm tra máy chủ đã chạy chưa

Đặt thử một đơn. Nếu tin nhắn vẫn về đủ các nhóm là máy chủ trung gian đã hoạt động.

### Bước 1.3 — Thu hồi token cũ (làm SAU khi 1.2 đã chạy tốt)

Token cũ đã nằm trong lịch sử GitHub công khai, **đổi mật khẩu không cứu được**,
bắt buộc phải tạo token mới:

1. Mở Telegram, nhắn cho **@BotFather**
2. Gõ `/mybots` → chọn từng bot → **API Token** → **Revoke current token**
3. BotFather đưa token MỚI → quay lại Netlify sửa lại 3 biến môi trường ở bước 1.1
4. **Trigger deploy** lại

> ⚠️ Làm bước 1.3 xong thì token cũ trong `index.html` chết hẳn. Lúc đó **bắt buộc**
> máy chủ trung gian phải chạy đúng, nếu không đơn sẽ không về nhóm nào cả.
> Vì vậy phải kiểm tra kỹ bước 1.2 trước.

---

## VIỆC 2 — Siết quyền Firebase

**Vấn đề:** hiện ai biết địa chỉ database đều có thể **sửa giá toàn bộ menu**,
xoá sạch đánh giá, và **tải về tên + số điện thoại + địa chỉ của mọi khách hàng**.

### Cách làm

1. Vào **console.firebase.google.com** → chọn dự án `atieu-order`
2. Menu trái → **Realtime Database** → tab **Rules**
3. Xoá hết nội dung cũ, dán toàn bộ nội dung file **`firebase-rules.json`** trong repo này
4. Bấm **Publish**

### Bộ quyền này chặn được gì

| | Trước | Sau |
|---|---|---|
| Tải về **toàn bộ đơn hàng** (tên, SĐT, địa chỉ khách) | ❌ ai cũng tải được | ✅ **chặn** — chỉ đọc được đúng 1 đơn nếu biết chính xác mã đơn |
| Tải toàn bộ database bằng 1 lệnh | ❌ được | ✅ **chặn** |
| Sửa menu / giá | ❌ được | ⚠️ vẫn được |
| Xoá đánh giá | ❌ được | ⚠️ vẫn được |

### Vì sao chưa chặn được hết

App hiện **không có đăng nhập** — cả khách, nhân viên và admin đều truy cập
database bằng cùng một đường. Muốn chặn nốt phần sửa menu thì phải thêm hệ thống
đăng nhập (Firebase Auth) và chuyển toàn bộ thao tác ghi qua máy chủ trung gian.
Đó là một dự án riêng, cần làm cẩn thận vì đụng tới mọi luồng của app.

Sau khi dán bộ quyền trên, **hãy đặt thử 1 đơn để chắc chắn app vẫn chạy bình thường.**
Có trục trặc thì vào lại Rules, dán `{"rules":{".read":true,".write":true}}` để quay
về như cũ ngay lập tức.

---

## VIỆC 3 — Đổi mật khẩu admin

**Vấn đề:** mật khẩu admin nằm thẳng trong `index.html`, dòng có `ADMIN_PW`.
Ai mở mã nguồn web (Ctrl+U) đều thấy → vào được trang quản lý, sửa giá, xem doanh thu.

**Hiện chưa có cách sửa triệt để** nếu không thêm hệ thống đăng nhập thật.
Trước mắt Founder nên:

- Không dùng mật khẩu này cho bất kỳ tài khoản nào khác (Facebook, ngân hàng, email...)
- Coi trang admin là "khoá cửa cho có", đừng lưu thông tin nhạy cảm trong đó
- Kiểm tra tab Doanh thu định kỳ xem có ai sửa giá bậy không

Muốn xử lý dứt điểm thì làm cùng lúc với Firebase Auth ở Việc 2.

---

## Thứ tự nên làm

```
1. Việc 1 bước 1.1 + 1.2   (đặt token lên Netlify, kiểm tra đơn vẫn về)
2. Việc 2                   (dán bộ quyền Firebase, thử đặt đơn)
3. Việc 1 bước 1.3          (thu hồi token cũ - làm cuối cùng)
```

Mỗi bước xong đều **đặt thử 1 đơn** để chắc chắn mọi thứ còn chạy.
