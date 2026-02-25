# Cài đặt Cơ sở Dữ liệu Supabase

Để Ứng dụng quản lý hiệu ứng Resolve có thể tải và hiển thị danh sách các file `.setting` hoặc `.drfx` mà bạn upload, chúng ta cần tạo một Bảng (Table) lưu trữ dữ liệu.

## Ưu điểm
Thay vì bạn phải bấm tạo thủ công từng cột (title, category...), bạn chỉ cần làm **2 bước copy-paste** cực kỳ đơn giản sau đây trong trang Supabase:

---

## Bước 1: Tạo Bảng Danh sách Hiệu ứng (Table: `assets`)

1. Bên trong giao diện [Supabase Dashboard](https://supabase.com/dashboard/projects), nhìn menu cột Cột Trái, chọn biểu tượng **SQL Editor** (Ký hiệu `< / >`).
2. Nhấn nút **New Query** (hoặc mở một file query trắng).
3. **Copy và Paste đoạn mã dưới đây** vào và nhấn **Run** (chạy):

```sql
-- Tạo bảng 'assets' để lưu trữ danh sách các hiệu ứng
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  title text NOT NULL,
  category text NOT NULL, -- 'transitions', 'titles', 'effects'
  type text NOT NULL, -- '.drfx', '.setting', '.drp'
  file_url text NOT NULL,
  thumbnail_url text,
  video_preview_url text,
  size_bytes bigint,
  tags text[]
);

-- Tắt bảo mật hàng (RLS) tạm thời để App Dễ dàng Đọc dữ liệu (Vì đây là kho tải công cộng của bạn)
ALTER TABLE public.assets DISABLE ROW LEVEL SECURITY;

-- Nhét thử 3 Hiệu ứng mẫu (Mock Data) vào để lát mình xem trên App hiện lên không
INSERT INTO public.assets (title, category, type, file_url, video_preview_url)
VALUES 
  ('Awesome Blur Transition', 'transitions', '.drfx', 'mock_file_link', 'https://demo-video-link.mp4'),
  ('Cinematic Title 01', 'titles', '.setting', 'mock_file_link2', 'https://demo-title.mp4'),
  ('Retro Color Grading', 'effects', '.drfx', 'mock_file_link3', 'https://demo-color.mp4');
```

---

## Bước 2: Tạo Bucket Lưu Trữ (Storage: File gốc & Video)

Để bạn có nơi Upload file từ máy tính lên trên mạng:
1. Nhìn sang cột Menu bên trái của Supabase, chọn mục **Storage** (Biểu tượng cái Hộp/Thùng).
2. Chọn **New Bucket** (Tạo thùng chứa mới).
3. Đặt tên Bucket là: `resolve-assets`
4. **Cực kỳ quan trọng:** Đánh dấu (Tick) vào ô `Public bucket`. Nếu không tick, ứng dụng sẽ không thể lấy video preview và file ra để cho khách tải được.
5. Cuối cùng bấm **Save**.

---

## Bước 3: Nâng cấp Bảng Tính [Cập nhật Admin Mới]

**Đoạn lệnh dưới đây dùng để Thêm 2 cột mới (Mô tả dài, Link YouTube) vào kho dữ liệu:**
1. Trở lại biểu tượng **SQL Editor** (Ký hiệu `< / >`).
2. Nhấn nút **New Query** và dán đoạn mã sau vào rồi nhấn **Run (Chạy)**:

```sql
ALTER TABLE public.assets 
ADD COLUMN description text,
ADD COLUMN youtube_url text;
```

---
*👉 Sau khi chạy mã thành công, quay lại Chat và gõ OK để mình làm form Admin Upload nhé.*
