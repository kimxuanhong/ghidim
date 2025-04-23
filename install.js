// Biến lưu trữ sự kiện cài đặt
let deferredPrompt;

// Khởi tạo khi trang được tải
document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra và tạo nút cài đặt
    setupInstallButton();

    // Kiểm tra nếu đã có cài đặt trước đó trên iOS
    checkIOSInstallation();
});

// Kiểm tra trạng thái cài đặt trên iOS
function checkIOSInstallation() {
    // Nếu đang chạy ở chế độ standalone hoặc đã đánh dấu cài đặt
    if (navigator.standalone === true || localStorage.getItem('pwaInstalled') === 'true') {
        console.log('Ứng dụng đã được cài đặt trên iOS');
        hideInstallButton();
    }
    // Nếu đang chạy trên thiết bị iOS nhưng chưa cài đặt
    else if (isIOS() && !localStorage.getItem('pwaInstalled')) {
        console.log('Thiết bị iOS nhưng chưa cài đặt PWA');
        showIOSInstallButton();
    }
}

// Thiết lập nút cài đặt ứng dụng
function setupInstallButton() {
    // Tạo nút cài đặt để sẵn sàng
    createInstallButton();

    // Kiểm tra nếu ứng dụng đã được cài đặt trước đó
    if (isPWAInstalled()) {
        console.log('Ứng dụng đang chạy ở chế độ standalone/PWA');
        // Ẩn nút cài đặt vì app đã được cài đặt
        hideInstallButton();
    }

    // Xử lý cho iOS (không hỗ trợ beforeinstallprompt)
    if (isIOS()) {
        // Hiển thị nút cài đặt cho iOS
        showIOSInstallButton();
    }
}

// Tạo nút cài đặt ứng dụng
function createInstallButton() {
    // Kiểm tra nếu nút đã tồn tại
    if (document.getElementById('installButton')) return;

    const installButton = document.createElement('button');
    installButton.id = 'installButton';
    installButton.className = 'install-btn';
    installButton.innerHTML = '<span>Cài đặt ứng dụng</span>';
    installButton.style.display = 'none';

    // Thêm nút vào đầu container
    const container = document.querySelector('.container');
    container.insertBefore(installButton, container.querySelector('.header'));

    // Thêm sự kiện click
    installButton.addEventListener('click', handleInstallClick);
}

// Xử lý khi nhấn nút cài đặt
async function handleInstallClick() {
    // Nếu là iOS, hiển thị hướng dẫn cài đặt
    if (isIOS()) {
        showIOSInstallInstructions();
        return;
    }

    // Ẩn nút
    hideInstallButton();

    // Hiện hộp thoại cài đặt cho Android/Chrome
    if (deferredPrompt) {
        deferredPrompt.prompt();

        // Đợi người dùng trả lời hộp thoại
        const {outcome} = await deferredPrompt.userChoice;
        console.log(`User ${outcome} the installation`);

        // Reset biến để có thể dùng lại
        deferredPrompt = null;
    }
}

// Ẩn nút cài đặt
function hideInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'none';
    }
}

// Hiện nút cài đặt
function showInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.style.display = 'flex';
    }
}

// Hiển thị nút cài đặt dành riêng cho iOS
function showIOSInstallButton() {
    const installButton = document.getElementById('installButton');
    if (installButton) {
        installButton.innerHTML = '<span>Cài đặt ứng dụng (iOS)</span>';
        installButton.style.display = 'flex';
    }
}

// Kiểm tra nếu ứng dụng đã được cài đặt trước đó
function isPWAInstalled() {
    // Kiểm tra xem app đang chạy ở chế độ standalone (đã cài đặt)
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }

    // Kiểm tra đặc biệt cho iOS
    if (navigator.standalone === true) {
        return true;
    }

    // Kiểm tra localStorage xem app đã được cài đặt trên iOS chưa
    if (localStorage.getItem('pwaInstalled') === 'true') {
        return true;
    }

    // Kiểm tra đối với iOS 16.4+ và Chrome
    if ('getInstalledRelatedApps' in navigator) {
        try {
            return navigator.getInstalledRelatedApps()
                .then(apps => apps.length > 0);
        } catch (error) {
            console.error('Error checking installed apps:', error);
        }
    }

    return false;
}

// Kiểm tra xem có phải thiết bị iOS không
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Xử lý sự kiện beforeinstallprompt (chỉ áp dụng cho Android/Chrome)
window.addEventListener('beforeinstallprompt', (e) => {
    // Ngăn Chrome hiển thị hộp thoại cài đặt tự động
    e.preventDefault();

    // Lưu sự kiện để sử dụng sau
    deferredPrompt = e;

    // Nếu không phải iOS, hiển thị nút cài đặt
    if (!isIOS()) {
        // Tạo nút cài đặt nếu chưa có
        createInstallButton();
        // Hiển thị nút
        showInstallButton();
    }
});

// Xử lý khi app đã được cài đặt
window.addEventListener('appinstalled', (e) => {
    console.log('App đã được cài đặt thành công');

    // Ẩn nút cài đặt
    hideInstallButton();

    // Reset biến deferredPrompt
    deferredPrompt = null;
});

// Hiển thị hướng dẫn cài đặt cho iOS
function showIOSInstallInstructions() {
    // Tạo modal hướng dẫn
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'iosInstallModal';
    modal.style.display = 'block';

    modal.innerHTML = `
        <div class="modal-content">
            <h2>Cài đặt trên iOS</h2>
            <div class="modal-message">
                <p>Để cài đặt ứng dụng lên màn hình chính, hãy làm theo các bước:</p>
                <ol style="text-align: left;">
                    <li>Nhấn vào biểu tượng Chia sẻ <span style="background: #eee; padding: 2px 5px; border-radius: 4px;">&#x2BAD;</span> ở dưới cùng Safari</li>
                    <li>Kéo xuống và chọn <strong>Thêm vào màn hình chính</strong></li>
                    <li>Nhấn <strong>Thêm</strong> ở góc trên bên phải</li>
                </ol>
            </div>
            <div class="modal-buttons">
                <button id="closeIOSGuide" class="secondary-btn">Đóng</button>
                <button id="confirmIOSInstall" class="confirm-btn">Đã cài đặt xong</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Thêm sự kiện đóng modal
    document.getElementById('closeIOSGuide').addEventListener('click', () => {
        modal.style.display = 'none';
        setTimeout(() => {
            modal.remove();
        }, 300);
    });

    // Thêm sự kiện khi người dùng xác nhận đã cài đặt xong
    document.getElementById('confirmIOSInstall').addEventListener('click', () => {
        // Đánh dấu đã cài đặt trong localStorage
        localStorage.setItem('pwaInstalled', 'true');
        // Ẩn nút cài đặt
        hideInstallButton();
        // Đóng modal
        modal.style.display = 'none';
        setTimeout(() => {
            modal.remove();
        }, 300);
    });
} 