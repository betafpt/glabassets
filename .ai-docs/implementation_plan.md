# Tích hợp Upload tự động lên Synology NAS

Ứng dụng sẽ tự động tải file lên Synology NAS thay vì Supabase Storage khi Admin thêm tài nguyên.

## User Review Required
> [!IMPORTANT]
> - Yêu cầu bảo mật: Tài khoản và mật khẩu Synology NAS sẽ được lưu ở file `.env.local` (trên máy tính của bạn) để bảo mật, không hardcode vào phần mềm.
> - Yêu cầu hạ tầng: NAS của bạn cần phải cài đặt cấu hình cho phép truy cập File Station API và có đường dẫn public gốc (Public URL) để người dùng có thể tải file về từ xa.

## Proposed Changes

### [IPC Handler trong Main Process]
Sẽ thiết lập một handler có tên `upload-to-nas` trong tiến trình Main.
Tiến trình này sẽ có nhiệm vụ:
1. Đọc đường dẫn file từ máy tính local (`file.path`).
2. Tự động Login vào NAS bằng API `/webapi/auth.cgi` để lấy `_sid`.
3. Tải file lên NAS qua `SYNO.FileStation.Upload`.
4. Trả về cho giao diện (Renderer) đường dẫn tĩnh cuối cùng (`Public URL` + `/Thư_mục/` + `Tên_file`).

#### [MODIFY] `src/main/index.ts`
- Bổ sung module `axios` hoặc dùng `net.request` có sẵn để thao tác với REST API của Synology.
- Viết block `ipcMain.handle('upload-to-nas', async (event, data) => {...})`

### [Thay đổi giao diện Renderer]
Cập nhật lại phương thức Tải file từ Supabase sang NAS.

#### [MODIFY] `src/renderer/src/components/AdminUploadModal.tsx`
- Sửa hàm `uploadFile`: Thay vì gọi `supabase.storage.upload(...)`, sẽ gọi `window.electron.ipcRenderer.invoke('upload-to-nas', { filePath: file.path, folder: 'assets' })`.
- Giữ nguyên các thao tác Update thông tin text (Tên, Thể loại...) lên Supabase Database.

#### [MODIFY] `.env.local` (File trên máy bạn)
Cần bổ sung các biến cấu hình sau vào file của bạn:
```env
# URL truy cập API của NAS (VD: http://192.168.1.100:5000)
VITE_SYNOLOGY_URL=
VITE_SYNOLOGY_USER=
VITE_SYNOLOGY_PASS=
# Thư mục chứa tài nguyên trên NAS (VD: /volume1/glab_assets)
VITE_SYNOLOGY_FOLDER=
# Tên miền public để phần mềm lấy link tải về (VD: https://data.glab.vn/glab_assets)
VITE_SYNOLOGY_PUBLIC_URL=
```

## Verification Plan
### Manual Verification
- Cấu hình file `.env.local` với thông tin NAS thực tế.
- Mở App, ấn "Upload Asset", chọn file `.drfx` và thử upload.
- Kiểm tra lại File Station trên NAS xem file đã vào đúng thư mục chưa.
- Kiểm tra Database Supabase xem link tài nguyên lưu lại có đúng dạng `VITE_SYNOLOGY_PUBLIC_URL/Tên_file.drfx` không.
