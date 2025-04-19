# Hướng dẫn triển khai lên GitHub Pages

Tài liệu này hướng dẫn cách triển khai ứng dụng lên GitHub Pages mà vẫn bảo vệ thông tin cấu hình Firebase của bạn.

## Phương pháp 1: Sử dụng repository riêng tư

Đây là phương pháp an toàn nhất để triển khai mà vẫn giữ thông tin cấu hình Firebase riêng tư.

### Bước 1: Tạo repository trên GitHub

1. Đăng nhập vào GitHub
2. Tạo repository **riêng tư** mới (Private repository)
3. Đặt tên cho repository (ví dụ: `gamebai-app`)

### Bước 2: Đẩy code lên GitHub

```bash
# Di chuyển đến thư mục dự án
cd path/to/your/project

# Khởi tạo Git repository (nếu chưa có)
git init

# Thêm tất cả file vào Git, kể cả firebase-config.js vì đây là repo riêng tư
git add .

# Commit
git commit -m "Initial commit"

# Liên kết với repository GitHub
git remote add origin https://github.com/your-username/gamebai-app.git

# Đẩy code lên GitHub
git push -u origin main
```

### Bước 3: Bật GitHub Pages

1. Vào repository trên GitHub
2. Chọn "Settings" > "Pages"
3. Trong phần "Source", chọn "Deploy from a branch"
4. Chọn branch "main" và folder "/" (root)
5. Nhấn "Save"

GitHub sẽ tạo URL cho trang web của bạn, thường có dạng `https://your-username.github.io/gamebai-app/`.

**Lưu ý**: GitHub Pages cho repository riêng tư chỉ khả dụng với các tài khoản GitHub Pro hoặc các tổ chức trả phí.

## Phương pháp 2: Sử dụng repository công khai với cấu hình Firebase riêng

Nếu bạn muốn sử dụng repository công khai (hoặc đang dùng tài khoản GitHub miễn phí), bạn cần một cách khác để bảo vệ cấu hình Firebase.

### Bước 1: Tạo repository công khai trên GitHub

1. Đăng nhập vào GitHub
2. Tạo repository **công khai** mới (Public repository)
3. Đặt tên cho repository (ví dụ: `gamebai-app`)

### Bước 2: Chuẩn bị code cho repository công khai

```bash
# Di chuyển đến thư mục dự án
cd path/to/your/project

# Đảm bảo file .gitignore đã thêm firebase-config.js
# Kiểm tra nội dung .gitignore

# Khởi tạo Git repository (nếu chưa có)
git init

# Thêm tất cả file vào Git (firebase-config.js sẽ bị bỏ qua nhờ .gitignore)
git add .

# Commit
git commit -m "Initial commit"

# Liên kết với repository GitHub
git remote add origin https://github.com/your-username/gamebai-app.git

# Đẩy code lên GitHub
git push -u origin main
```

### Bước 3: Bật GitHub Pages

1. Vào repository trên GitHub
2. Chọn "Settings" > "Pages"
3. Trong phần "Source", chọn "Deploy from a branch"
4. Chọn branch "main" và folder "/" (root)
5. Nhấn "Save"

### Bước 4: Tạo trang hướng dẫn cấu hình

Vì `firebase-config.js` không được đẩy lên GitHub, bạn cần tạo một trang hướng dẫn người dùng cách cấu hình:

1. Chỉnh sửa file `index.html` để thêm đoạn mã kiểm tra và hiển thị hướng dẫn nếu chưa cấu hình Firebase

```html
<script>
    // Kiểm tra xem Firebase đã được cấu hình chưa
    window.addEventListener('load', function() {
        setTimeout(function() {
            if (typeof firebase === 'undefined' || !firebase.apps.length) {
                // Hiển thị modal hướng dẫn
                document.getElementById('configModal').style.display = 'block';
            }
        }, 1000);
    });
</script>

<!-- Modal hướng dẫn cấu hình -->
<div id="configModal" class="modal" style="display: none;">
    <div class="modal-content">
        <h2>Cấu hình Firebase</h2>
        <p>Bạn cần tạo file firebase-config.js để ứng dụng hoạt động. Làm theo các bước sau:</p>
        <ol>
            <li>Tạo file <code>firebase-config.js</code> trong thư mục của trang web</li>
            <li>Sao chép đoạn mã sau vào file:</li>
        </ol>
        <pre><code>// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();</code></pre>
        <p>Thay thế các giá trị placeholders bằng thông tin Firebase của bạn</p>
        <button onclick="document.getElementById('configModal').style.display='none';">Đã hiểu</button>
    </div>
</div>
```

2. Đẩy thay đổi lên GitHub:

```bash
git add index.html
git commit -m "Add Firebase configuration guide"
git push
```

## Phương pháp 3: Sử dụng GitHub Actions để tự động thêm cấu hình Firebase

Đây là phương pháp nâng cao nhất, sử dụng GitHub Secrets để lưu trữ thông tin nhạy cảm.

### Bước 1: Tạo GitHub Secrets

1. Vào repository trên GitHub
2. Chọn "Settings" > "Secrets and variables" > "Actions"
3. Nhấn "New repository secret"
4. Tạo secret mới tên là "FIREBASE_CONFIG" với nội dung là toàn bộ đoạn mã cấu hình Firebase:

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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
```

### Bước 2: Tạo workflow GitHub Actions

1. Tạo thư mục `.github/workflows` trong dự án
2. Tạo file `deploy.yml` trong thư mục đó với nội dung sau:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Create Firebase Config
        run: |
          echo "${{ secrets.FIREBASE_CONFIG }}" > firebase-config.js

      - name: Deploy
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: .
          branch: gh-pages
```

3. Commit và push lên GitHub:

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow for deployment"
git push
```

### Bước 3: Cấu hình GitHub Pages để sử dụng branch gh-pages

1. Vào repository trên GitHub
2. Chọn "Settings" > "Pages"
3. Trong phần "Source", chọn "Deploy from a branch"
4. Chọn branch "gh-pages" và folder "/" (root)
5. Nhấn "Save"

## Kết luận

Trong ba phương pháp trên:
- Phương pháp 1 là an toàn nhất nhưng yêu cầu tài khoản GitHub Pro
- Phương pháp 2 đơn giản nhất nhưng yêu cầu người dùng tự cấu hình
- Phương pháp 3 phức tạp nhất nhưng an toàn và tự động nhất

Chọn phương pháp phù hợp với nhu cầu và khả năng của bạn. 