# Kế hoạch Triển khai: Resolve Asset Manager

Xây dựng một Standalone App (Ứng dụng Độc lập) quản lý thư viện dành cho DaVinci Resolve, hoạt động tương tự như Animation Composer hay mInstaller. Nơi người chơi có thể xem trước (preview) và cài đặt (apply) hiệu ứng trực tiếp.

## User Review Required
> [!WARNING]
> **Lưu ý quan trọng về file `.drp` (DaVinci Resolve Project):** 
> 
> Hệ thống của DaVinci Resolve cho phép cài đặt "im lặng" các file `.drfx` (Bundle) và `.setting` (Macro) chỉ bằng cách copy chúng vào đúng thư mục hệ thống (Templates/Transitions/Titles...). App của chúng ta sẽ làm điều này rất trơn tru (Nút 1-click Install).
> 
> Tuy nhiên, **`.drp`** là file dự án hoàn chỉnh. Không có cách nào dùng code bên ngoài để "ép" Resolve import nhanh 1 timeline từ `.drp` vào project đang mở mà không qua thao tác kéo thả thủ công của người dùng (vì Blackmagic Design khóa API này).
> 
> **=> Đề xuất:** App của chúng ta vẫn sẽ quản lý và hiển thị `.drp`, nhưng thao tác sẽ là: Nhấn nút -> Mở thư mục chứa file `.drp` để người dùng kéo thả trực tiếp vào Resolve. **Về lâu dài (đặc biệt khi bạn muốn đem bán)**, bạn nên đóng gói các hiệu ứng ở dạng Macro (`.setting`) hoặc Bundle (`.drfx`) để mang lại trải nghiệm 1-click tốt nhất cho khách hàng. **Bạn có đồng ý với hướng xử lý này không?**

## Proposed Changes

### 1. Kiến trúc phần mềm (Tech Stack)
- **Framework:** Electron + Vite + React.
  - Electron hoạt động như một ứng dụng Native trên máy Mac của bạn, cho phép ứng dụng đọc ổ cứng để lấy thumbnail/video preview, và copy file vào thư mục mặc định của DaVinci Resolve.
- **Backend & Cloud Storage:** Tích hợp dịch vụ Backend-as-a-Service (BaaS) như Supabase, Firebase hoặc AWS S3.
  - Metadata (Tên hiệu ứng, Tags, Video Preview URL) sẽ được lưu trên Database.
  - Các file gốc (`.drfx`, `.setting`, `.drp`) sẽ được lưu trữ trên Cloud Storage. Ứng dụng sẽ gọi API để lấy dữ liệu về hiển thị và phát video khi cần thiết, không cần mang theo ổ cứng.
- **Giao diện (UI/UX) & CSS:** Vanilla CSS hoàn toàn. Áp dụng phong cách thiết kế **Premium Dark Mode**, viền bóng kính (Glassmorphism), màu sắc có độ tương phản sâu và mượt mà khi hover để người dùng có cảm giác đang sử dụng một công cụ Edit chuyên nghiệp cao cấp.

### 2. Các thành phần (Components)
- **Hệ thống Đồng bộ Cloud (Cloud Sync & File Manager):** App sẽ gọi API lên Backend để lấy danh sách hiệu ứng và hiển thị.
- **Backend IPC (Inter-Process Communication):** Khi bấm "Tải xuống/Cài đặt", Electron sẽ tiến hành download file từ Cloud Storage xuống một thư mục cache tạm trên máy Mac, sau đó tự động sao chép file sang thư mục cài đặt của DaVinci Resolve (`~/Library/Application Support/Blackmagic Design/DaVinci Resolve/Support/Fusion/Templates/...`). Quá trình này sẽ có thanh tiến trình (progress bar) hiển thị.
- **Hệ thống Quét File Local (Tùy chọn thêm):** Vẫn giữ một tính năng nhỏ cho phép bạn quét và đọc các file `.drfx`, `.setting` tự tạo chưa kịp tải lên Cloud.

## Verification Plan

### Automated Tests
App sẽ có tính minh bạch cao, quá trình copy file hệ thống sẽ được log (lưu vết) rõ ràng:
1. `npm run dev` để khởi chạy Electron ở chế độ Development.
2. Kiểm tra tính năng đồng bộ danh sách (Fetch API) từ Database mốc.
3. Test việc tự động sao chép (mock copy) file giả lập khi download, đảm bảo đưa đúng vào thư mục của OS Mac.

### Manual Verification
1. Sau khi code và chạy ứng dụng, sẽ tải mẫu một file đoạn mã `.setting` lên Cloud.
2. Mở ứng dụng, thao tác xem giao diện có đẹp và mượt như mong đợi. Video Preview (được phát stream từ cloud) tải mượt không.
3. Bấm "Tải xuống & Cài đặt". Xem thanh trạng thái tải.
4. Mở DaVinci Resolve lên, vào bảng Effects kiểm tra xem file đã xuất hiện ở đúng thư mục chưa mà không cần thao tác copy bằng tay.

## 4. Hoàn thiện & Thương mại hóa (Tương lai)
- Đóng gói thành file `.dmg` cho Mac.
- Tích hợp tính năng mã hóa thư viện và License Key (khi bán).

## 5. Mở rộng Admin Board (Trang Quản Trị Hệ Thống)
**Yêu cầu:** Cho phép Admin (Chủ sở hữu) đăng tải trực tiếp file và thông tin hiệu ứng (Asset) từ bên trong giao diện ứng dụng Electron mà không cần truy cập trang web Supabase.
**Database Schema Cập Nhật:**
Cần chạy mã SQL để thêm các cột mới vào bảng `public.assets`:
- `description (text)`: Mô tả chi tiết chức năng/điểm nổi bật của hiệu ứng.
- `youtube_url (text)`: Link video hướng dẫn sử dụng chi tiết (không nằm ở Thumbnail).
**UI/UX Mới:**
- Cổng vào bí mật: Một nút `Admin Upload` nhỏ giấu trong menu `Settings`.
- Form Modal Upload:
  - Text input: Tên hiệu ứng, Link Video YouTube Tutorial (Hướng dẫn sử dụng dài).
  - Select list: Danh mục (Transitions, titles...), Loại File.
  - Text area: Mô tả cách dùng.
  - File picker (Kéo/thả): Tải lên file gốc (`.drfx` / `.setting`), tải lên ảnh Thumbnail, tải lên Video Preview MP4 ngắn.

## 6. Hệ thống Quản trị & Bảo mật (Admin Control)

Nhằm bảo vệ kho dữ liệu (chống User up rác/xóa nhầm) nhưng vẫn đảm bảo Chủ App quản lý linh hoạt, các quy tắc sau sẽ được áp dụng:

### 6.1 Khóa tính năng Admin (Dev Mode)
- Nút `Admin Upload`, `Edit` và `Delete` mặc định sẽ **BỊ ẨN** với người dùng cuối.
- **Mở khóa Secret Passcode:** Trong cửa sổ `Settings`, tạo một Input nhập "Developer Passcode". Nếu nhập đúng mã bí mật (VD: `resolveadmin`), ứng dụng sẽ kích hoạt trạng thái Master và hiển thị nút Quản trị.

### 6.2 Xóa Tài Nguyên (Delete)
- Khi ở chế độ Admin, cửa sổ Detail (xem video youtube) sẽ có thêm nút màu đỏ `[Delete Asset]`.
- Nút này sẽ gọi lệnh SDK Supabase để xóa Asset khỏi Database, đồng thời dọn rác file `.drfx` trên Cloud Storage.

### 6.3 Sửa nội dung (Edit)
- Gắn thêm nút `[Edit Asset]`.
- Mở lại Form `AdminUploadModal` với dữ liệu cũ (Title, Description, Youtube Link, File Type). Phát ra lệnh Update thay vì Insert.
