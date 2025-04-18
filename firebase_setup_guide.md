# Hướng dẫn thiết lập Firebase Realtime Database

## Bước 1: Tạo tài khoản và dự án Firebase

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn
3. Nhấn nút **"Tạo dự án"** (hoặc **"Add project"**)
4. Nhập tên dự án, ví dụ: "GameBai" và nhấn **"Tiếp tục"**
5. Tắt Google Analytics nếu không cần thiết, hoặc bật và chọn tài khoản Analytics
6. Nhấn **"Tạo dự án"** và đợi vài giây để Firebase thiết lập dự án

## Bước 2: Thiết lập Realtime Database

1. Từ bảng điều khiển Firebase, chọn mục **"Realtime Database"** ở menu bên trái
2. Nhấn nút **"Tạo cơ sở dữ liệu"** (hoặc **"Create database"**)
3. Chọn vị trí máy chủ gần khu vực của bạn nhất (ví dụ: Singapore hoặc Tokyo cho Việt Nam)
4. Nhấn **"Tiếp tục"**
5. Chọn **"Bắt đầu ở chế độ thử nghiệm"** (hoặc **"Start in test mode"**) để dễ dàng phát triển
   - *Lưu ý: Chế độ này cho phép đọc/ghi không hạn chế trong 30 ngày, phù hợp để phát triển ứng dụng*
6. Nhấn **"Bật"** (hoặc **"Enable"**)

## Bước 3: Lấy thông tin cấu hình Firebase

1. Nhấn vào biểu tượng bánh răng cạnh **"Project Overview"** và chọn **"Cài đặt dự án"** (hoặc **"Project settings"**)
2. Cuộn xuống phần **"Your apps"** và nhấn biểu tượng Web (</>) để thêm ứng dụng web
3. Đặt tên cho ứng dụng web (ví dụ: "GameBai Web") và nhấn **"Đăng ký ứng dụng"** (hoặc **"Register app"**)
4. Firebase sẽ hiển thị đoạn mã cấu hình như sau:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

5. Sao chép toàn bộ đoạn mã này

## Bước 4: Cập nhật tệp firebase.js trong ứng dụng của bạn

1. Mở tệp **firebase.js** trong dự án của bạn
2. Thay thế phần cấu hình hiện tại bằng cấu hình Firebase bạn vừa sao chép:

```javascript
// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## Bước 5: Thiết lập quy tắc bảo mật (tùy chọn)

1. Trở lại Firebase Console, chọn **"Realtime Database"**
2. Chuyển sang tab **"Quy tắc"** (hoặc **"Rules"**)
3. Mặc định, quy tắc thử nghiệm cho phép đọc/ghi không hạn chế trong 30 ngày:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Nếu muốn sử dụng lâu dài, bạn nên cập nhật quy tắc bảo mật phù hợp. Ví dụ, khi sử dụng cơ chế phòng:

```json
{
  "rules": {
    "rooms": {
      "$roomId": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

5. Nhấn **"Xuất bản"** (hoặc **"Publish"**) để áp dụng quy tắc

## Bước 6: Kiểm tra kết nối

1. Mở ứng dụng của bạn trong trình duyệt
2. Mở công cụ dành cho nhà phát triển (F12) và chọn tab Console
3. Tạo một phòng mới hoặc thêm điểm để kiểm tra kết nối với Firebase
4. Nếu không có lỗi nào xuất hiện trong Console, kết nối đã thành công
5. Bạn cũng có thể kiểm tra dữ liệu trong Firebase Console, mục **"Realtime Database"** > **"Data"** để xem dữ liệu được đồng bộ hóa

## Khắc phục lỗi "permission_denied"

Nếu bạn gặp lỗi này:
```
Uncaught (in promise) Error: permission_denied at /rooms/hongkim: Client doesn't have permission to access the desired data.
```

Đây là vấn đề về quy tắc bảo mật của Firebase. Hãy làm theo các bước sau:

1. Truy cập Firebase Console
2. Chọn dự án của bạn
3. Chọn **"Realtime Database"** từ menu bên trái
4. Chuyển sang tab **"Quy tắc"** (hoặc **"Rules"**)
5. Thay đổi quy tắc bảo mật thành:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

6. Nhấn **"Xuất bản"** (hoặc **"Publish"**)

Quy tắc này cho phép đọc và ghi không hạn chế đến tất cả dữ liệu trong Realtime Database của bạn. Lưu ý rằng đây là cài đặt cho môi trường phát triển, và không nên sử dụng trong ứng dụng thực tế đang chạy.

Đối với môi trường sản xuất, bạn nên sử dụng quy tắc cụ thể hơn, ví dụ:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true,
      "$roomId": {
        ".read": true,
        ".write": true,
        "games": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

Quy tắc này cho phép truy cập đầy đủ vào tất cả dữ liệu trong nhánh "rooms" và các phòng con của nó.

## Bảo mật khi triển khai lên GitHub Pages

Khi triển khai ứng dụng có Firebase lên GitHub Pages, bạn cần lưu ý vấn đề bảo mật cho thông tin cấu hình Firebase (firebaseConfig). Đây là thông tin nhạy cảm và không nên đưa trực tiếp vào mã nguồn khi đẩy lên GitHub công khai.

### Các giải pháp bảo vệ firebaseConfig:

1. **Sử dụng biến môi trường (không hoạt động với GitHub Pages)**
   - *Lưu ý: Cách này KHÔNG hoạt động với GitHub Pages vì GitHub Pages chỉ có thể phục vụ nội dung tĩnh*
   - Tạo file `.env` để lưu thông tin cấu hình
   - Thêm file `.env` vào `.gitignore`
   - Sử dụng thư viện như `dotenv` để đọc biến môi trường

2. **Sử dụng Quy tắc Bảo mật Firebase**
   - Thiết lập các quy tắc bảo mật chặt chẽ trong Firebase Realtime Database
   - Giới hạn quyền truy cập dựa trên xác thực người dùng
   - Thiết lập giới hạn tên miền trong cài đặt Firebase

3. **Sử dụng Firebase App Check**
   - Cấu hình Firebase App Check để xác minh rằng các yêu cầu đến từ ứng dụng của bạn
   - Điều này giúp ngăn chặn việc sử dụng trái phép cấu hình Firebase của bạn

4. **Xác thực người dùng**
   - Yêu cầu xác thực người dùng trước khi cho phép đọc/ghi dữ liệu
   - Điều này giảm thiểu rủi ro kể cả khi cấu hình bị lộ

5. **Sử dụng GitHub Secrets với GitHub Actions**
   - Lưu trữ cấu hình Firebase dưới dạng GitHub Secrets
   - Sử dụng GitHub Actions để thêm cấu hình vào code khi triển khai
   - Điều này không đưa thông tin nhạy cảm vào mã nguồn

### Ví dụ triển khai an toàn với GitHub Pages:

1. Tạo file cấu hình riêng không được đưa vào git:

```javascript
// firebase-config.js (thêm vào .gitignore)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

2. Tạo file mẫu để push lên GitHub:

```javascript
// firebase-config.example.js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Thay thế bằng API key thực khi triển khai
  authDomain: "example.firebaseapp.com",
  databaseURL: "https://example.firebaseio.com",
  projectId: "example",
  storageBucket: "example.appspot.com",
  messagingSenderId: "000000000000",
  appId: "0:000000000000:web:0000000000000000000000"
};
```

3. Cập nhật tệp README với hướng dẫn:

```markdown
## Triển khai

1. Sao chép `firebase-config.example.js` thành `firebase-config.js`
2. Cập nhật `firebase-config.js` với thông tin Firebase thực của bạn
3. Triển khai code lên máy chủ của bạn
```

### Biện pháp tốt nhất cho GitHub Pages:

Nếu bạn bắt buộc phải sử dụng GitHub Pages, hãy:

1. **Giới hạn quyền truy cập trong Quy tắc Bảo mật Firebase** - Chỉ cho phép các hành động đọc/ghi cụ thể
2. **Giới hạn tên miền được phép** - Cấu hình Firebase để chỉ chấp nhận yêu cầu từ tên miền GitHub Pages của bạn
3. **Xem xét chuyển sang dịch vụ khác** - GitHub Pages không phải là giải pháp lý tưởng cho ứng dụng có cấu hình nhạy cảm

## Thông tin thêm

- **Chính sách giá**: Realtime Database có gói miễn phí (Spark) với giới hạn:
  - Lưu trữ: 1GB
  - Tải xuống: 10GB/tháng
  - Kết nối đồng thời: 100
  - Đủ cho ứng dụng nhỏ và vừa

- **Offline Support**: Realtime Database hỗ trợ chế độ offline, dữ liệu sẽ được đồng bộ khi có kết nối lại

- **Mở rộng**: Nếu cần mở rộng, bạn có thể nâng cấp lên gói Blaze (trả tiền theo sử dụng) 