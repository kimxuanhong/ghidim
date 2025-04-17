# Ứng dụng Ghi Điểm Bài

Ứng dụng web đơn giản để ghi điểm cho trò chơi bài 4 người chơi. Dữ liệu được lưu trữ trong localStorage của trình duyệt.

## Tính năng

- Bảng điểm cho 4 người chơi
- Thêm điểm mới cho mỗi vòng
- Chỉnh sửa điểm đã nhập
- Tính tổng điểm tự động
- Lưu trữ dữ liệu trong trình duyệt
- Giao diện bàn phím số để nhập điểm
- Thiết kế responsive

## Cách sử dụng

1. Nhấn nút "Thêm điểm mới" để bắt đầu nhập điểm cho một vòng mới
2. Sử dụng bàn phím số để nhập điểm cho từng người chơi
3. Nhấn "Xác nhận" để lưu điểm
4. Để chỉnh sửa điểm, nhấp vào dòng cần sửa trong bảng
5. Tổng điểm sẽ tự động cập nhật

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

## Công nghệ sử dụng

- HTML5
- CSS3
- JavaScript (Vanilla)
- LocalStorage API

## Cấu trúc thư mục

```
├── index.html
├── styles.css
├── script.js
└── README.md
``` 