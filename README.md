# Ghi Điểm Ván Bài

Ứng dụng web đơn giản để ghi điểm cho trò chơi bài 4 người chơi. Dữ liệu được lưu trữ trong Firebase Realtime Database và đồng bộ hóa thời gian thực giữa các thiết bị.

## Tính năng

- Bảng điểm cho 4 người chơi
- Thêm điểm mới cho mỗi vòng
- Chỉnh sửa điểm đã nhập
- Tính tổng điểm tự động
- Lưu trữ dữ liệu trong Firebase Realtime Database
- Đồng bộ hóa thời gian thực giữa các thiết bị
- Hỗ trợ nhiều phòng (rooms) để quản lý điểm theo nhóm
- Hiệu ứng ăn mừng cho người thắng cuộc
- Giao diện bàn phím số để nhập điểm
- Thiết kế responsive
- Tính năng PWA để cài đặt như ứng dụng trên điện thoại

## Cài đặt Firebase

1. Tạo tài khoản và dự án Firebase tại [console.firebase.google.com](https://console.firebase.google.com)
2. Thiết lập Realtime Database cho dự án
3. Sao chép file `firebase-config.example.js` thành `firebase-config.js`
4. Cập nhật `firebase-config.js` với thông tin cấu hình Firebase của bạn
5. **Quan trọng:** Đảm bảo không đưa `firebase-config.js` lên hệ thống quản lý mã nguồn công khai

Xem hướng dẫn chi tiết tại tệp `firebase_setup_guide.md`.

## Cách sử dụng

1. Mở trang web và chọn "Tạo Ván Mới"
2. Nhập tên 4 người chơi và mã phòng (tùy chọn)
3. Nhấn nút "Thêm điểm mới" để bắt đầu nhập điểm cho một vòng
4. Sử dụng bàn phím số để nhập điểm cho từng người chơi
5. Nhấn "Xác nhận" để lưu điểm
6. Để chỉnh sửa điểm, nhấp vào dòng cần sửa trong bảng
7. Khi kết thúc ván, nhấn "Kết thúc ván" và xác nhận

## Cấu trúc thư mục

```
├── index.html          # Trang danh sách ván chơi
├── scoring.html        # Trang ghi điểm
├── styles.css          # CSS chung
├── script.js           # Logic cho trang chính
├── scoring.js          # Logic cho trang ghi điểm
├── firebase.js         # Xử lý kết nối với Firebase
├── firebase-config.js  # Cấu hình Firebase (không đưa lên GitHub)
├── firebase-config.example.js # Cấu hình mẫu
├── manifest.json       # Cấu hình PWA
├── sw.js               # Service Worker cho PWA
└── README.md
```

## Bảo mật khi triển khai

Khi triển khai ứng dụng này lên GitHub Pages hoặc dịch vụ khác, đảm bảo:

1. Thêm `firebase-config.js` vào `.gitignore` để không đưa lên GitHub
2. Sử dụng quy tắc bảo mật Firebase để giới hạn quyền truy cập
3. Cấu hình giới hạn tên miền trong Firebase Console

Xem chi tiết về bảo mật trong `firebase_setup_guide.md`.

## Công nghệ sử dụng

- HTML5, CSS3, JavaScript (Vanilla)
- Firebase Realtime Database
- Service Workers và PWA
- LocalStorage (dự phòng khi mất kết nối)

## Cách deploy lên GitHub Pages

1. Tạo repository mới trên GitHub
2. Push code lên repository:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/username/repository-name.git
git push -u origin main
```

3. Vào Settings của repository
4. Scroll xuống phần "GitHub Pages"
5. Trong Source, chọn branch "main"
6. Chọn folder "/ (root)"
7. Nhấn Save

Sau khi deploy, ứng dụng sẽ có địa chỉ dạng: `https://username.github.io/repository-name` 