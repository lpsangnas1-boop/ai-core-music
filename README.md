# 🎧 AI Core music — YouTube Music Queue for Office

**AI Core music** là giải pháp music server / DJ station cho văn phòng thông minh, hỗ trợ cả mạng nội bộ (LAN / Wi-Fi) và truy cập qua Internet (Cloudflare Tunnel, Localtunnel hoặc Ngrok).

Một máy tính duy nhất kết nối với loa ngoài làm **DJ Station**. Tất cả đồng nghiệp (dù dùng Wi-Fi văn phòng hay 4G/5G) chỉ cần mở trình duyệt trên điện thoại hoặc laptop để **request bài hát realtime**, không ai cần chạm vào máy tính DJ.

---

## 🚀 Tính năng nổi bật

- **Một máy phát duy nhất (Single Master Player)**: Chỉ **một** tab/thiết bị được phát nhạc ra loa tại một thời điểm. Máy phát phải xác thực bằng PIN admin; mở máy phát mới (tab `/player` hoặc tab youtube.com có extension) sẽ nhận quyền phát, các tab DJ khác tự chuyển sang chế độ chờ — không bao giờ phát đôi.
- **Tự động chuyển bài thông minh**:
  - Bài trong **Queue** luôn được ưu tiên phát theo thứ tự.
  - Khi **Queue trống**:
    - Trình phát trên web (`/admin`, `/player`) tự phát **Default Playlist** (bật/tắt trong Cài đặt, có tùy chọn lặp lại).
    - Tab youtube.com (extension) để YouTube tự phát bài gợi ý.
  - Khi bài kết thúc hoặc video bị chặn nhúng (`onError`), hệ thống tự chuyển bài tiếp theo.
- **Mobile-first Guest Experience**: Tìm bài theo tên hoặc dán link YouTube (`watch`, `shorts`, `youtu.be`, `music.youtube`), xem trước thông tin bài hát, nhập tên người gửi và nhận vị trí trong hàng đợi.
- **Qua bài 1 chạm**: Ai cũng bấm **Qua bài** để chuyển bài ngay. Hai lần chuyển bài phải cách nhau ít nhất 3 giây (chống bấm đúp làm trôi nhiều bài).
- **Chống Spam & Trùng bài**:
  - Giới hạn số bài đang chờ và cooldown trên mỗi thiết bị.
  - Chặn trùng bài đang phát hoặc đã có trong Queue.
  - Giới hạn tần suất tìm kiếm, reaction và bình luận bay (danmaku).
- **DJ Master Station Dashboard**: Điều khiển phát/dừng, chuyển bài, tua, âm lượng; sắp xếp hàng đợi, *Play Next*, xóa bài; quản lý Default Playlist; xem lịch sử.
- **Bảo mật**: Toàn bộ quyền điều khiển khóa bằng `ADMIN_PIN`, có khóa tạm thời khi nhập sai PIN quá 10 lần / 15 phút.
- **Lưu trữ bền vững**: SQLite (WAL mode) lưu Default Playlist, Queue, Settings và Lịch sử.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, TypeScript, Socket.IO.
- **Database**: SQLite (`node:sqlite` có sẵn trong Node.js, WAL mode).
- **Player API**: YouTube IFrame Player API + Chrome extension cho tab youtube.com.
- **Tunneling**: Cloudflare Tunnel (mặc định), Localtunnel, Ngrok.

---

## 📦 Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- **Node.js >= 22.13** (bắt buộc — `node:sqlite` không có trên Node 18/20). Khuyến nghị bản LTS mới nhất.
- **npm** >= 9

### 2. Cài đặt Dependencies

```bash
git clone https://github.com/lpsangnas1-boop/ai-core-music.git
cd ai-core-music
npm install
```

### 3. Cấu hình biến môi trường

Copy file mẫu rồi chỉnh sửa. File `.env` **không được commit** lên git (đã có trong `.gitignore`).

```bash
cp .env.example .env
```

```env
PORT=8989
HOST=0.0.0.0
ADMIN_PIN=<đặt-PIN-dài-và-khó-đoán>
SERVER_NAME="AI Core music"
REQUESTS_ENABLED=true
REQUEST_COOLDOWN_SECONDS=0
MAX_REQUESTS_PER_DEVICE=20
DATABASE_PATH=data/jukebox.db
TUNNEL_MODE=cloudflare
CUSTOM_DOMAIN=music.lpsang.id.vn
```

> [!IMPORTANT]
> Hãy đặt `ADMIN_PIN` riêng, dài và khó đoán — nhất là khi mở web ra Internet. Nếu bỏ trống, server tự sinh một PIN ngẫu nhiên mỗi lần khởi động và in ra console. Server sẽ cảnh báo nếu PIN quá ngắn hoặc là `123456`.

### 4. Chạy trong môi trường Development

Chạy đồng thời Backend (port 8989) và Vite Dev Server (port 5173):

```bash
npm run dev
```

- Guest / Client: `http://localhost:5173`
- DJ Station: `http://localhost:5173/admin`

### 5. Build & Chạy Production

```bash
npm run build
npm start
```

---

## 🌐 Phát Online ra Internet

Dùng tunnel giúp **vượt qua Client Isolation của Wi-Fi công ty** và cho phép mọi người dùng **4G/5G** order bài mà không cần mở cổng router.

### ⚡ Chạy 1-Click

Nhấp đúp **`start-music.bat`** (hoặc `npm run start:online`). Launcher sẽ:
1. Kiểm tra phiên bản Node.js.
2. Build lại nếu chưa có bản build hoặc mã nguồn mới hơn bản build (ví dụ sau `git pull`).
3. Chạy server (tự khởi động lại nếu server bị dừng bất thường).
4. Kết nối tunnel theo `TUNNEL_MODE` và chỉ báo "sẵn sàng" khi server đã phản hồi thật. Lỗi của tunnel được in ra với tiền tố `[tunnel]`.

### ⭐ Cloudflare Named Tunnel (mặc định)

`TUNNEL_MODE=cloudflare` chạy `cloudflared tunnel run ai-core-music` và dùng tên miền `CUSTOM_DOMAIN` (mặc định `music.lpsang.id.vn`). Máy DJ cần cài `cloudflared` và đã cấu hình Named Tunnel `ai-core-music`.

Muốn dùng Quick Tunnel tạm thời (không cần tên miền): `npm run tunnel:cf` rồi gửi link `https://xxxx.trycloudflare.com`.

### Localtunnel

```env
TUNNEL_MODE=localtunnel
LT_SUBDOMAIN=aicoremusic
```

Link: `https://aicoremusic.loca.lt`. Lần đầu mở, Localtunnel yêu cầu nhập *Tunnel Password* (IP công khai của máy DJ) — lấy tại [https://localtunnel.me/mytunnelpassword](https://localtunnel.me/mytunnelpassword).

### Ngrok

```env
TUNNEL_MODE=ngrok
NGROK_DOMAIN=
```

Cần tài khoản Ngrok (`ngrok config add-authtoken <TOKEN>`). Gói Free giới hạn số request mỗi tháng.

`TUNNEL_MODE=none` để chỉ chạy trong mạng LAN.

---

## 📶 Truy cập qua mạng LAN / Wi-Fi nội bộ

1. Máy DJ và điện thoại của mọi người **kết nối chung một mạng Wi-Fi**.
2. Khởi động server bằng `npm start`. Terminal sẽ in:
   ```text
   ==================================================
     🎧  OFFICE JUKEBOX SERVER IS LIVE!
   ==================================================
     Host bound:     0.0.0.0
     Local Access:   http://localhost:8989
     LAN Access:     http://192.168.1.15:8989
     Admin Panel:    http://192.168.1.15:8989/admin
     Admin PIN:      (đã đặt trong .env)
   ==================================================
   ```
3. Gửi link `http://<IP-MÁY-DJ>:8989` cho mọi người.

### 🛡️ Windows Firewall

Nếu đồng nghiệp không truy cập được IP nội bộ, mở cổng `8989` (PowerShell chạy Administrator):

```powershell
New-NetFirewallRule -DisplayName "AI Core music (Port 8989)" -Direction Inbound -LocalPort 8989 -Protocol TCP -Action Allow
```

---

## 🔑 DJ Station (`/admin`) & máy phát

1. Mở `/admin` trên máy tính nối loa (ví dụ `http://localhost:8989/admin`) và nhập `ADMIN_PIN`.
2. Nhấn **Khởi động Jukebox** để mở quyền autoplay âm thanh của trình duyệt.
3. Chọn **một** trong các cách phát nhạc:
   - **Tab `/admin`**: trình phát ẩn ngay trong dashboard.
   - **Tab `/player`**: tab trình phát riêng (yêu cầu PIN). Mở tab này sẽ nhận quyền phát từ tab `/admin`.
   - **Tab youtube.com + extension**: `chrome://extensions` → bật *Developer mode* → *Load unpacked* → chọn thư mục `youtube-extension`. Bấm biểu tượng extension, nhập **Server URL** và **mã PIN DJ**, rồi mở youtube.com. Khi hết hàng đợi, YouTube sẽ tự phát bài gợi ý.
4. Tab nào không phải máy phát chính sẽ hiện thông báo *"Tab này đang chờ"* kèm nút **Phát nhạc tại tab này** để chuyển quyền phát.

Nếu bạn đổi `ADMIN_PIN`, các trình duyệt đang lưu PIN cũ sẽ tự đăng xuất và hỏi lại PIN.

---

## 📡 REST API & Socket.IO Events

### REST API

Các endpoint Admin cần header `x-admin-pin`.

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `POST` | `/api/admin/login` | Public | Kiểm tra PIN (khóa tạm sau 10 lần sai / 15 phút) |
| `GET` | `/api/network` | Public | Địa chỉ IP LAN và URL kết nối |
| `GET` | `/api/metadata?url=...` | Public | Tiêu đề, thumbnail, kênh từ link YouTube |
| `GET` | `/api/player` | Public | Trạng thái bài đang phát |
| `POST` | `/api/player/start` | Admin | Khởi chạy Jukebox |
| `POST` | `/api/player/play` · `/pause` | Admin | Phát tiếp / tạm dừng |
| `POST` | `/api/player/next` | Public | Chuyển bài ngay (cách nhau tối thiểu 3 giây) |
| `POST` | `/api/player/previous` | Admin | Bài trước trong Default Playlist |
| `POST` | `/api/player/seek` · `/volume` | Admin | Tua / âm lượng, tắt tiếng |
| `POST` | `/api/player/play-now` | Admin | Phát ngay một link YouTube |
| `GET` | `/api/queue` | Public | Hàng đợi (không kèm deviceId) |
| `GET` | `/api/queue/search?q=...` | Public | Tìm bài trên YouTube (giới hạn tần suất) |
| `GET` | `/api/queue/history` | Public | Lịch sử order (không kèm deviceId) |
| `GET` | `/api/queue/can-request?deviceId=...` | Public | Kiểm tra cooldown và giới hạn số bài |
| `POST` | `/api/queue` | Public | Thêm bài vào hàng đợi |
| `DELETE` | `/api/queue/:id` | Admin | Xóa bài khỏi hàng đợi |
| `POST` | `/api/queue/:id/play-next` | Admin | Ưu tiên phát tiếp theo |
| `PATCH` | `/api/queue/reorder` | Admin | Sắp xếp lại hàng đợi |
| `DELETE` | `/api/queue` | Admin | Xóa toàn bộ hàng đợi |
| `GET` | `/api/playlist` | Public | Default Playlist |
| `POST` | `/api/playlist` | Admin | Thêm bài vào Default Playlist |
| `DELETE` | `/api/playlist/:id` | Admin | Xóa bài khỏi Default Playlist |
| `PATCH` | `/api/playlist/:id/toggle` · `/reorder` | Admin | Bật/tắt, sắp xếp bài |
| `GET` | `/api/settings` | Public | Cài đặt Jukebox |
| `PATCH` | `/api/settings` | Admin | Cập nhật cài đặt (chỉ nhận key hợp lệ) |
| `GET` | `/api/history` | Admin | Lịch sử đầy đủ (kèm deviceId) |

### Socket.IO Events

- **Server gửi**: `player:state`, `player:command` (`load_song`, `play`, `pause`, `seek`, `volume`, `stop`, `skip`, `queue_empty`), `player:vote_update`, `master:status`, `queue:update`, `playlist:update`, `settings:update`, `notification:new_request`, `notification:song_error`, `reaction:new`, `danmaku:new`.
- **Máy phát gửi** (chỉ được chấp nhận từ máy phát chính đã xác thực):
  - `master:register { pin, kind: 'embedded' | 'youtube-tab', takeover }` (có ack) / `master:release`
  - `player:report_state`, `player:song_ended`, `player:song_error`, `player:sync_from_youtube`
- **Khách gửi**: `reaction:send` (chỉ emoji hợp lệ), `danmaku:send` (có giới hạn tần suất).

---

## 📌 Lưu ý kỹ thuật & Giới hạn đã biết

1. **Autoplay Policy**: Trình duyệt yêu cầu tương tác một lần trên máy DJ trước khi phát âm thanh. Nếu trình duyệt chặn, dashboard hiện nút *"bấm để bật âm thanh"*.
2. **Video bị chặn nhúng**: Một số video tắt "Cho phép nhúng"; trình phát web sẽ tự bỏ qua. Dùng tab youtube.com (extension) nếu muốn phát cả những video này.
3. **Wi-Fi Isolation**: Ở mạng có Client Isolation, dùng tunnel như hướng dẫn ở trên.

---

## 📄 License
ISC License. Built for team entertainment.
