# 🎧 Office Jukebox — Local Network YouTube Music Queue

**Office Jukebox** là giải pháp music server / DJ station cho văn phòng trong mạng nội bộ (LAN / Wi-Fi).

Một máy tính duy nhất kết nối với loa ngoài làm **DJ Station** (Master YouTube Player). Tất cả đồng nghiệp trong cùng mạng Wi-Fi chỉ cần mở trình duyệt trên điện thoại hoặc laptop để **request bài hát realtime**, không ai cần chạm vào máy tính DJ nữa.

---

## 🚀 Tính năng nổi bật

- **Single Master Player**: Chỉ một YouTube Player duy nhất phát âm thanh tại máy DJ; các thiết bị khách (Guest) chỉ đồng bộ giao diện và gửi request qua Socket.IO.
- **Tự động chuyển bài thông minh**:
  - Khi có bài trong **Queue**, hệ thống ưu tiên phát các bài được request theo thứ tự.
  - Khi **Queue trống**, hệ thống tự động quay về phát **Default Playlist** (nhạc nền chill/lo-fi) không bị gián đoạn.
  - Sau khi bài hát kết thúc (`YT.PlayerState.ENDED`) hoặc bị lỗi bản quyền (`onError`), hệ thống tự động skip sang bài tiếp theo.
- **Mobile-first Guest Experience**: Giao diện dark mode hiện đại, dán link YouTube (hỗ trợ `watch`, `shorts`, `youtu.be`, `music.youtube`), xem trước thông tin bài hát (thumbnail, tựa đề, kênh), nhập tên người gửi và nhận thông báo vị trí trong hàng đợi (`You're #3 in queue`).
- **Chống Spam & Trùng bài (Spam & Duplicate Protection)**:
  - Giới hạn tối đa 2 bài đang chờ/thiết bị (dựa trên anonymous `deviceId`).
  - Cooldown 2 phút giữa các lần request từ cùng một thiết bị.
  - Tự động chặn trùng lặp bài đang phát hoặc đã nằm trong Queue.
- **DJ Master Station Dashboard**:
  - Điều khiển phát/dừng, chuyển bài, thanh tua (seek scrubber), âm lượng và tắt tiếng.
  - Kéo thả / thay đổi thứ tự hàng đợi, ghim bài ưu tiên phát tiếp theo (*Play Next*), xóa bài, xóa toàn bộ.
  - Quản lý Default Playlist: thêm bài từ YouTube, bật/tắt từng bài, xóa bài, chế độ lặp danh sách.
  - Xem lịch sử các bài đã phát (*Request History*).
  - Khóa quyền điều khiển bằng mã PIN bí mật (`ADMIN_PIN`).
- **QR Code & Tự phát hiện IP**: Tự động phát hiện địa chỉ IPv4 nội bộ của máy (ví dụ `http://192.168.1.15:3000`) và tạo mã QR trên màn hình DJ để đồng nghiệp quét nhanh bằng camera điện thoại.
- **Lưu trữ dữ liệu bền vững (Persistence)**: Sử dụng SQLite (WAL mode) lưu trữ toàn bộ Default Playlist, Queue, Settings và Lịch sử. Khởi động lại server không bao giờ bị mất dữ liệu.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, QRCode.react, Canvas Confetti.
- **Backend**: Node.js, Express, TypeScript, Socket.IO.
- **Database**: SQLite (`node:sqlite` native / WAL mode).
- **Player API**: YouTube IFrame Player API.

---

## 📦 Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- **Node.js**: >= 18.0.0 (khuyến nghị Node 20+)
- **npm**: >= 9.0.0

### 2. Cài đặt Dependencies

```bash
git clone <repository-url>
cd teamAI_music
npm install
```

### 3. Cấu hình biến môi trường (Environment Variables)

File `.env` mặc định đã được tạo sẵn tại thư mục gốc:

```env
PORT=3000
HOST=0.0.0.0
ADMIN_PIN=123456
SERVER_NAME="Office Jukebox"
REQUESTS_ENABLED=true
REQUEST_COOLDOWN_SECONDS=120
MAX_REQUESTS_PER_DEVICE=2
DATABASE_PATH=../data/jukebox.db
```

### 4. Chạy trong môi trường Development

Chạy đồng thời Backend (port 3000) và Vite Dev Server (port 5173):

```bash
npm run dev
```

- Guest / Client: `http://localhost:5173`
- DJ Station: `http://localhost:5173/admin`

### 5. Chạy trong môi trường Production (Khuyến nghị cho văn phòng)

Build toàn bộ frontend & backend sau đó khởi chạy trên 1 cổng duy nhất (`3000`):

```bash
npm run build
npm start
```

---

## 📶 Hướng dẫn truy cập qua mạng LAN / Wi-Fi

1. Đảm bảo máy tính DJ và điện thoại/laptop của đồng nghiệp **kết nối chung một mạng Wi-Fi hoặc mạng LAN văn phòng**.
2. Khởi động server bằng lệnh `npm start`.
3. Server sẽ in ra thông tin truy cập trên màn hình terminal:
   ```text
   ==================================================
     🎧  OFFICE JUKEBOX SERVER IS LIVE!
   ==================================================
     Host bound:     0.0.0.0
     Local Access:   http://localhost:3000
     LAN Access:     http://192.168.1.15:3000
     Admin Panel:    http://192.168.1.15:3000/admin
     Admin PIN:      123456
   ==================================================
   ```
4. **Mở trên điện thoại**: Quét mã QR hiển thị ở góc trên cùng của web hoặc gõ trực tiếp `http://<IP-MÁY-DJ>:3000` (ví dụ `http://192.168.1.15:3000`).

---

## 🛡️ Cấu hình Windows Firewall (Tường lửa Windows)

Nếu đồng nghiệp không truy cập được vào địa chỉ IP của bạn, hãy mở cổng 3000 trên Windows Defender Firewall:

### Cách 1: Chạy PowerShell (Run as Administrator)

```powershell
New-NetFirewallRule -DisplayName "Office Jukebox (Port 3000)" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

### Cách 2: Qua giao diện Windows Defender Firewall
1. Mở **Windows Defender Firewall with Advanced Security**.
2. Chọn **Inbound Rules** -> **New Rule...**
3. Chọn **Port** -> Next -> Chọn **TCP**, nhập **3000** vào Specific local ports.
4. Chọn **Allow the connection** -> Next -> Tích đủ Domain, Private, Public -> Đặt tên `Office Jukebox` -> Finish.

---

## 🔑 Hướng dẫn quản trị DJ Station (`/admin`)

1. Truy cập đường dẫn `/admin` trên máy tính kết nối loa.
2. Nhập mã PIN (mặc định: `123456`).
3. Nhấn **START JUKEBOX** để mở quyền autoplay của trình duyệt.
4. Máy tính DJ sẽ bắt đầu phát Default Playlist hoặc các bài do mọi người vừa request.

---

## 📡 Danh sách API REST & Socket.IO Events

### REST API

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| `GET` | `/api/network` | Public | Lấy địa chỉ IP LAN và URL kết nối |
| `GET` | `/api/metadata?url=...` | Public | Lấy tiêu đề, thumbnail, tác giả từ link YouTube |
| `GET` | `/api/player` | Public | Lấy trạng thái bài đang phát, âm lượng, thời gian |
| `POST` | `/api/player/start` | Admin | Khởi chạy session Jukebox |
| `POST` | `/api/player/play` | Admin | Tiếp tục phát |
| `POST` | `/api/player/pause` | Admin | Tạm dừng |
| `POST` | `/api/player/next` | Admin | Bỏ qua bài hiện tại / Chuyển bài |
| `POST` | `/api/player/previous` | Admin | Quay lại bài trước |
| `POST` | `/api/player/seek` | Admin | Tua đến giây chỉ định |
| `POST` | `/api/player/volume` | Admin | Đổi âm lượng / Mute |
| `GET` | `/api/queue` | Public | Lấy danh sách hàng đợi |
| `GET` | `/api/queue/can-request?deviceId=...` | Public | Kiểm tra điều kiện cooldown và giới hạn số bài |
| `POST` | `/api/queue` | Public | Thêm bài mới vào hàng đợi |
| `DELETE` | `/api/queue/:id` | Admin | Xóa bài khỏi hàng đợi |
| `POST` | `/api/queue/:id/play-next` | Admin | Ưu tiên phát bài tiếp theo |
| `PATCH` | `/api/queue/reorder` | Admin | Sắp xếp lại thứ tự hàng đợi |
| `DELETE` | `/api/queue` | Admin | Xóa toàn bộ hàng đợi |
| `GET` | `/api/playlist` | Public | Lấy danh sách Default Playlist |
| `POST` | `/api/playlist` | Admin | Thêm bài vào Default Playlist |
| `DELETE` | `/api/playlist/:id` | Admin | Xóa bài khỏi Default Playlist |
| `PATCH` | `/api/playlist/:id/toggle` | Admin | Bật/tắt bài trong playlist |
| `GET` | `/api/settings` | Public | Lấy cài đặt Jukebox |
| `PATCH` | `/api/settings` | Admin | Cập nhật cài đặt (tên, cooldown, số bài tối đa...) |
| `GET` | `/api/history` | Admin | Xem lịch sử các bài đã phát |

### Socket.IO Events

- **Server Emits**:
  - `player:state`: Đồng bộ realtime trạng thái bài đang phát, timeline, âm lượng.
  - `queue:update`: Cập nhật realtime danh sách hàng đợi khi có người thêm/xóa.
  - `playlist:update`: Cập nhật playlist mặc định.
  - `settings:update`: Cập nhật cấu hình server.
  - `notification:new_request`: Bắn thông báo toast khi có bài mới kèm tên người request.
  - `player:command`: Gửi lệnh điều khiển trực tiếp tới Master Player trên máy DJ.
- **Client (Master Player) Emits**:
  - `player:report_state`: Báo cáo tiến độ playback định kỳ mỗi giây.
  - `player:song_ended`: Báo kết thúc bài để server tự động chuyển bài tiếp theo.
  - `player:song_error`: Báo lỗi video để server tự động skip không bị kẹt player.

---

## 📌 Lưu ý kỹ thuật & Giới hạn đã biết (Known Limitations)

1. **Autoplay Policy**: Trình duyệt hiện đại yêu cầu người dùng phải tương tác (click) một lần trên máy DJ trước khi YouTube Player có thể tự phát âm thanh. Giao diện đã có nút **START JUKEBOX** để giải quyết vấn đề này.
2. **Video Embedding Restrictions**: Một số ít video YouTube bị chủ sở hữu tắt tính năng "Cho phép nhúng (Embedding)". Khi gặp video này, Master Player sẽ bắt sự kiện `onError` và tự động skip sang bài kế tiếp mà không bị gián đoạn.
3. **Mạng LAN / Wi-Fi Isolation**: Ở một số mạng Wi-Fi công ty có bật tính năng "Client Isolation" (không cho phép các thiết bị Wi-Fi nói chuyện với nhau), hãy yêu cầu IT hỗ trợ tắt Client Isolation hoặc cắm dây LAN cho máy DJ.

---

## 🔮 Hướng phát triển tiếp theo (Next Improvements)

- [ ] Tích hợp YouTube Data API v3 search để tìm kiếm bài hát trực tiếp bằng từ khóa không cần mở YouTube copy link.
- [ ] Tính năng Upvote / Downvote bài trong queue để văn phòng cùng bình chọn bài được phát sớm hơn.
- [ ] Thống kê Top bài hát được yêu thích nhất và Top người request nhiều nhất tuần/tháng.
- [ ] Phím tắt bàn phím (Media keys) cho máy DJ.

---

## 📄 License
ISC License. Built for internal team entertainment.
