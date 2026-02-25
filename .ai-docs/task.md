# Kế hoạch & Tiến độ: Resolve Asset Manager

## 1. Thiết lập dự án & Kiến trúc (Foundation)
- [x] Khởi tạo dự án Electron + Vite (React/TypeScript).
- [x] Cấu hình Vanilla CSS, xây dựng Design System (Premium Dark Mode, Glassmorphism, Animation mượt mà).
- [x] Thiết lập Node.js IPC (Inter-Process Communication) để Electron có quyền đọc/ghi/tải file trên hệ điều hành Mac.
- [x] Thiết lập Backend/Cloud Storage (Supabase/Firebase/S3) để lưu trữ metadata và file online.
## 2. Giao diện người dùng (UI/UX)
- [x] Xây dựng Layout chính: Sidebar (Danh mục Trái), Main Grid (Danh sách tài nguyên).
- [x] Thiết kế Card hiển thị: Ảnh thumbnail + Video preview khi hover chuột.
- [x] Form Cài đặt (Settings): Nơi người dùng chỉ định thư mục chứa thư viện gốc và đường dẫn DaVinci Resolve.

## 3. Logic Lõi (Core App Logic)
- [x] Xây dựng hệ thống đồng bộ dữ liệu: Fetch API lấy danh sách hiệu ứng từ Cloud và hiển thị lên giao diện.
- [x] Tính năng "Tải xuống & Cài đặt" (Download & Apply):
  - Tải file (`.drfx`, `.setting`) từ Cloud server về máy local (vào thư mục tạm hoặc thư viện cache).
  - Tự động copy file đã tải vào `~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Fusion/Templates/`.
  - Hỗ trợ tiến trình tải (Progress bar) và báo trạng thái thành công/lỗi.
- [ ] Xử lý file `.drp` (Tải xuống, mở folder hoặc gợi ý người dùng tự import).

## 4. Hoàn thiện & Thương mại hóa (Tương lai)
- [ ] Đóng gói thành file `.dmg` cho Mac.
- [ ] Tích hợp tính năng mã hóa thư viện và License Key (khi bán).

## 5. Mở rộng Admin Board (Trang Quản Trị Hệ Thống)
- [x] Nâng cấp Database: Thêm cột `description` và `youtube_url` vào bảng `assets`.
- [x] Giao diện Admin Upload Form: Nơi kéo thả file `.drfx`, ảnh thumbnail, video `.mp4`.
- [x] Giao diện Asset Detail Modal: Hiển thị Video Youtube thay cho luồng stream nặng, kèm theo chi tiết mô tả và nút Install.
