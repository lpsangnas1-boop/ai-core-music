# 🎧 AI Core music — Office Jukebox

Hệ thống phát nhạc YouTube tập thể cho văn phòng phong cách **Recess Sunset**. Một máy tính nối loa ngoài làm **DJ Station**, mọi người trong văn phòng dùng điện thoại hoặc laptop để **tìm & order bài hát realtime**.

---

## ⚡ Bắt đầu nhanh (Quick Start)

### 1. Yêu cầu hệ thống
- **Node.js** >= 22.13 ([Tải tại đây](https://nodejs.org))
- **npm** >= 9

### 2. Tải mã nguồn & Cài đặt
```bash
git clone https://github.com/lpsangnas1-boop/ai-core-music.git
cd ai-core-music
npm install
```

---

## 🚀 Lựa chọn hướng triển khai

Chọn **1 trong 3 hướng** phù hợp với nhu cầu của máy tính:

### 🌟 Hướng 1: Chạy trạm chính (`music.lpsang.id.vn`)
> Dành cho máy chủ DJ chính thức của văn phòng.

1. Tạo file `.env` tại thư mục gốc:
   ```env
   PORT=8989
   ADMIN_PIN=123456
   SERVER_NAME="AI Core music"
   TUNNEL_MODE=cloudflare
   CUSTOM_DOMAIN=music.lpsang.id.vn
   ```
2. Cài đặt `cloudflared` (nếu máy chưa có):
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
3. Nhấp đúp **`start-music.bat`** ➔ Mở trình duyệt vào: **`https://music.lpsang.id.vn`**

---

### 👥 Hướng 2: Chạy trạm riêng cho máy khác / phòng ban khác (`teamedu.lpsang.id.vn`)
> Dành cho máy tính của đồng nghiệp hoặc phòng ban khác muốn chạy một trạm phát nhạc độc lập qua Cloudflare Token (không cần đăng nhập tài khoản Cloudflare).

1. Tạo file `.env` tại thư mục gốc và dán Token riêng:
   ```env
   PORT=8989
   ADMIN_PIN=123456
   SERVER_NAME="TeamEdu music"
   TUNNEL_MODE=cloudflare
   CUSTOM_DOMAIN=teamedu.lpsang.id.vn
   CLOUDFLARE_TUNNEL_TOKEN=eyJhIjoiNTNiNGI5ZDUyN2MzZDM5ZjU1ODg1MTU0Zjk2MjAxZjAiLCJzIjoiaWFhekhtY2FLRERNOUNWZ1NFOU5KSU1NRElGbXlBZ3AvUDIwQmVGY3FjUT0iLCJ0IjoiNzFlMjMzMDEtYjJmMS00ODgxLTlhOGQtZmNiOTcyNTg1ZDgzIn0=
   ```
2. Cài đặt `cloudflared` (nếu máy chưa có):
   ```powershell
   winget install --id Cloudflare.cloudflared
   ```
3. Nhấp đúp **`start-music.bat`** ➔ Mở trình duyệt vào: **`https://teamedu.lpsang.id.vn`**

---

### 🏠 Hướng 3: Chỉ chạy mạng nội bộ LAN / Wi-Fi (Không cần Domain/Internet)
> Dành cho trường hợp chỉ cần mở nhạc trong cùng mạng Wi-Fi văn phòng, không cần public link ra internet.

1. Tạo file `.env` tại thư mục gốc:
   ```env
   PORT=8989
   ADMIN_PIN=123456
   SERVER_NAME="AI Core music"
   TUNNEL_MODE=none
   ```
2. Nhấp đúp **`start-music.bat`**.
3. Cửa sổ dòng lệnh sẽ in ra địa chỉ IP nội bộ (ví dụ: `http://192.168.1.15:8989`). Đồng nghiệp cùng kết nối Wi-Fi chỉ cần mở link này để order nhạc.

---

## 🧼 Hướng dẫn Reset & Cài đặt sạch sẽ (Clean Install)

Nếu máy tính bị xung đột phiên bản, dính cấu hình cũ hoặc muốn **xóa sạch toàn bộ bài hát, hàng chờ và lịch sử cũ**:

Mở Command Prompt (CMD) tại thư mục dự án và chạy:
```cmd
rmdir /s /q node_modules client\dist server\dist data
del package-lock.json
npm cache clean --force
npm install
npm run build
```
Sau đó nhấp đúp **`start-music.bat`** để khởi động lại máy chủ mới tinh.

---

## 🎮 Cách sử dụng

| Vai trò | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| **Khách (Người order nhạc)** | `https://music.lpsang.id.vn`<br>*(hoặc `teamedu...`)* | Tìm bài hát, dán link YouTube, xem hàng chờ realtime, thả biểu cảm / bình luận bay (Danmaku), vote bỏ qua bài. |
| **DJ Station (Máy nối loa)** | `http://localhost:8989/admin` | Đăng nhập bằng `ADMIN_PIN`. Điều khiển Play/Pause/Skip/Volume, sắp xếp hàng chờ, quản lý Playlist phát mặc định. |

---

## 🛡️ Standby Page (Trang chờ thông minh)
Hệ thống tích hợp sẵn mã nguồn Cloudflare Worker (`cloudflare-worker.js`). Khi máy tính DJ tắt file `.bat`, website sẽ tự động hiển thị **trang chờ phong cách hoàng hôn Recess Sunset** thay vì báo lỗi 502/530 thô kệch, và tự động kết nối lại ngay khi máy tính mở nhạc.

---

## 📄 License
ISC License. Built with ❤️ for office team entertainment.
