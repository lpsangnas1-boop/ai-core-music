# 🎧 AI Core music — YouTube Music Queue for Office

**AI Core music** là giải pháp music server / DJ station cho văn phòng thông minh, hỗ trợ cả mạng nội bộ (LAN / Wi-Fi) và kết nối qua Internet (Ngrok tunnel).

Một máy tính duy nhất kết nối với loa ngoài làm **DJ Station** (Master YouTube Player). Tất cả đồng nghiệp (dù dùng Wi-Fi văn phòng hay 4G/5G) chỉ cần mở trình duyệt trên điện thoại hoặc laptop để **request bài hát realtime**, không ai cần chạm vào máy tính DJ.

---

## 🚀 Tính năng nổi bật

- **Single Master Player**: Chỉ một YouTube Player duy nhất phát âm thanh tại máy DJ; các thiết bị khách (Guest) chỉ đồng bộ giao diện và gửi request qua Socket.IO.
- **Tự động chuyển bài thông minh**:
  - Khi có bài trong **Queue**, hệ thống ưu tiên phát các bài được request theo thứ tự.
  - Khi **Queue trống**, hệ thống tự động quay về phát **Default Playlist** (nhạc nền chill/lo-fi) không bị gián đoạn.
  - Sau khi bài hát kết thúc (`YT.PlayerState.ENDED`) hoặc bị lỗi bản quyền (`onError`), hệ thống tự động skip sang bài tiếp theo.
- **Mobile-first Guest Experience**: Giao diện dark mode hiện đại, dán link YouTube (hỗ trợ `watch`, `shorts`, `youtu.be`, `music.youtube`), xem trước thông tin bài hát (thumbnail, tựa đề, kênh), nhập tên người gửi và nhận thông báo vị trí trong hàng đợi (`You're #3 in queue`).
- **Chống Spam & Trùng bài (Spam & Duplicate Protection)**:
  - Giới hạn số bài đang chờ trên mỗi thiết bị (cấu hình trong `.env`).
  - Cooldown giữa các lần request từ cùng một thiết bị.
  - Tự động chặn trùng lặp bài đang phát hoặc đã nằm trong Queue.
- **DJ Master Station Dashboard**:
  - Điều khiển phát/dừng, chuyển bài, thanh tua (seek scrubber), âm lượng và tắt tiếng.
  - Kéo thả / thay đổi thứ tự hàng đợi, ghim bài ưu tiên phát tiếp theo (*Play Next*), xóa bài, xóa toàn bộ.
  - Quản lý Default Playlist: thêm bài từ YouTube, bật/tắt từng bài, xóa bài, chế độ lặp danh sách.
  - Xem lịch sử các bài đã phát (*Request History*).
  - Khóa quyền điều khiển bằng mã PIN bí mật (`ADMIN_PIN`).
- **Hỗ trợ Ngrok Online Tunnel**: Phát nhạc qua internet cực nhanh, đồng nghiệp dùng 4G/5G hoặc WFH đều request được, không lo Wi-Fi công ty chặn (Client Isolation).
- **Lưu trữ dữ liệu bền vững (Persistence)**: Sử dụng SQLite (WAL mode) lưu trữ toàn bộ Default Playlist, Queue, Settings và Lịch sử. Khởi động lại server không bao giờ bị mất dữ liệu.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Canvas Confetti.
- **Backend**: Node.js, Express, TypeScript, Socket.IO.
- **Database**: SQLite (`node:sqlite` native / WAL mode).
- **Player API**: YouTube IFrame Player API.
- **Tunneling**: Ngrok.

---

## 📦 Cài đặt & Chạy ứng dụng

### 1. Yêu cầu môi trường
- **Node.js**: >= 18.0.0 (khuyến nghị Node 20+)
- **npm**: >= 9.0.0

### 2. Cài đặt Dependencies

```bash
git clone https://github.com/lpsangnas1-boop/ai-core-music.git
cd ai-core-music
npm install
```

### 3. Cấu hình biến môi trường (Environment Variables)

File `.env` mặc định tại thư mục gốc:

```env
PORT=8989
HOST=0.0.0.0
ADMIN_PIN=123456
SERVER_NAME="AI Core music"
REQUESTS_ENABLED=true
REQUEST_COOLDOWN_SECONDS=0
MAX_REQUESTS_PER_DEVICE=20
DATABASE_PATH=data/jukebox.db
```

### 4. Chạy trong môi trường Development

Chạy đồng thời Backend (port 8989) và Vite Dev Server (port 5173):

```bash
npm run dev
```

- Guest / Client: `http://localhost:5173`
- DJ Station: `http://localhost:5173/admin`

### 5. Build & Chạy Production

Build toàn bộ frontend & backend sau đó khởi chạy:

```bash
npm run build
npm start
```

---

## 🌐 Hướng dẫn cấu hình & Chạy Online qua Ngrok (Khuyên dùng)

> [!TIP]
> **Vì sao nên dùng Ngrok?**
> - **Vượt qua giới hạn Wi-Fi văn phòng**: Khắc phục triệt để tính năng *Client Isolation / AP Isolation* của router công ty (chặn các thiết bị nội bộ kết nối trực tiếp với nhau).
> - **Dùng 4G/5G thoải mái**: Đồng nghiệp không bắt buộc phải kết nối chung Wi-Fi; dùng 4G, mạng khác hoặc làm việc từ xa (WFH) đều order bài được.
> - **Bảo mật HTTPS**: Ngrok cung cấp link HTTPS an toàn, có hỗ trợ WebSocket cho Socket.IO hoạt động realtime.
> - **Không cần mở cổng Router (Port Forwarding)** hay can thiệp vào tường lửa văn phòng.

### 🛠️ Các bước thiết lập Ngrok (Chỉ làm 1 lần đầu)

#### Bước 1: Đăng ký tài khoản Ngrok miễn phí
1. Truy cập [https://ngrok.com](https://ngrok.com) và bấm **Sign Up Free** (có thể đăng nhập nhanh bằng tài khoản Google hoặc GitHub).

#### Bước 2: Cài đặt Ngrok trên máy tính DJ (Windows)
Bạn có thể cài đặt bằng một trong hai cách:
- **Cách A (Nhanh nhất qua PowerShell)**:
  ```powershell
  winget install ngrok
  ```
- **Cách B (Tải file nén thủ công)**:
  1. Vào [https://ngrok.com/download](https://ngrok.com/download) và tải file ZIP cho Windows.
  2. Giải nén được file `ngrok.exe`.
  3. Copy file `ngrok.exe` vào thư mục dự án hoặc thêm vào biến môi trường `PATH` của máy tính.

#### Bước 3: Kích hoạt Authtoken
1. Đăng nhập vào Ngrok Dashboard, vào trang [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).
2. Sao chép mã token và chạy lệnh sau trong PowerShell / Terminal:
   ```bash
   ngrok config add-authtoken <YOUR_AUTHTOKEN>
   ```

#### Bước 4: Lấy Static Domain miễn phí (Khuyến nghị để cố định link)
Mỗi tài khoản Ngrok miễn phí được tặng **1 domain cố định vĩnh viễn**:
1. Trên dashboard Ngrok, vào menu **Cloud Edge** ➔ **Domains**.
2. Nhấn **Create Domain** (hoặc copy tên miền đã được cấp sẵn, ví dụ: `duo-stagnant-elbow.ngrok-free.dev` hoặc `your-subdomain.ngrok-free.app`).
3. Mở file [scripts/launcher.js](file:///scripts/launcher.js), điền domain của bạn vào dòng:
   ```javascript
   const NGROK_DOMAIN = 'ten-mien-cua-ban.ngrok-free.dev';
   ```

---

### 🚀 Cách khởi chạy cùng Ngrok

#### Cách 1: 1-Click tự động (Khuyên dùng)
Nhấp đúp chuột vào file **`start-music.bat`** tại thư mục gốc (hoặc chạy lệnh terminal):
```bash
npm run start:online
```
Hệ thống sẽ tự động:
1. Chạy server Node.js (cổng `8989`).
2. Mở tunnel Ngrok với domain cố định của bạn.
3. In link công khai ra màn hình và tự động mở trình duyệt vào trang DJ!

#### Cách 2: Chạy thủ công bằng 2 terminal
Nếu muốn kiểm soát độc lập từng tiến trình:
- **Terminal 1** (Chạy server):
  ```bash
  npm start
  ```
- **Terminal 2** (Mở tunnel Ngrok trỏ về port 8989):
  ```bash
  # Nếu có Static Domain cố định:
  ngrok http --url=ten-mien-cua-ban.ngrok-free.app 8989

  # Hoặc nếu dùng domain ngẫu nhiên:
  ngrok http 8989
  ```
- Copy đường dẫn `https://xxxx.ngrok-free.app` hiển thị ở dòng **Forwarding** và gửi cho đồng nghiệp.

---

## 📶 Hướng dẫn truy cập qua mạng LAN / Wi-Fi nội bộ

Nếu bạn không sử dụng Ngrok và muốn chạy trực tiếp trong mạng nội bộ:

1. Đảm bảo máy tính DJ và điện thoại của mọi người **kết nối chung một mạng Wi-Fi**.
2. Khởi động server:
   ```bash
   npm start
   ```
3. Server sẽ in thông tin truy cập ra màn hình terminal:
   ```text
   ==================================================
     🎧  AI CORE MUSIC SERVER IS LIVE!
   ==================================================
     Host bound:     0.0.0.0
     Local Access:   http://localhost:8989
     LAN Access:     http://192.168.1.15:8989
     Admin Panel:    http://192.168.1.15:8989/admin
     Admin PIN:      123456
   ==================================================
   ```
4. Gửi link `http://<IP-MÁY-DJ>:8989` (ví dụ `http://192.168.1.15:8989`) cho mọi người mở trên trình duyệt điện thoại.

---

## 🛡️ Cấu hình Windows Firewall (Khi dùng mạng LAN)

Nếu đồng nghiệp không truy cập được vào địa chỉ IP nội bộ của bạn, hãy mở cổng `8989` trên Windows Defender Firewall:

### Cách 1: Chạy PowerShell (Run as Administrator)

```powershell
New-NetFirewallRule -DisplayName "AI Core music (Port 8989)" -Direction Inbound -LocalPort 8989 -Protocol TCP -Action Allow
```

### Cách 2: Qua giao diện Windows Defender Firewall
1. Mở **Windows Defender Firewall with Advanced Security**.
2. Chọn **Inbound Rules** -> **New Rule...**
3. Chọn **Port** -> Next -> Chọn **TCP**, nhập **8989** vào Specific local ports.
4. Chọn **Allow the connection** -> Next -> Tích đủ Domain, Private, Public -> Đặt tên `AI Core music` -> Finish.

---

## 🔑 Hướng dẫn quản trị DJ Station (`/admin`)

1. Truy cập đường dẫn `/admin` trên máy tính kết nối loa (ví dụ: `http://localhost:8989/admin`).
2. Nhập mã PIN (mặc định: `123456`).
3. Nhấn **START JUKEBOX** để mở quyền autoplay âm thanh của trình duyệt.
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
3. **Mạng LAN / Wi-Fi Isolation**: Ở các mạng Wi-Fi công ty có Client Isolation, hãy sử dụng giải pháp **Ngrok** như hướng dẫn ở trên để bỏ qua hoàn toàn giới hạn này.

---

## 📄 License
ISC License. Built for team entertainment.
