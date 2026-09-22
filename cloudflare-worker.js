/**
 * Cloudflare Worker for music.lpsang.id.vn
 * Tự động chuyển hướng sang trang chờ tuyệt đẹp khi máy tính DJ (.bat) chưa bật!
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    try {
      const response = await fetch(request);

      // Nếu Cloudflare Tunnel chưa kết nối (trả về 502, 503, 504 hoặc lỗi 1033)
      if ([502, 503, 504].includes(response.status)) {
        if (url.pathname.startsWith('/api/')) {
          return new Response(JSON.stringify({ status: 'offline', online: false }), {
            status: 503,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'no-store',
            },
          });
        }

        return new Response(OFFLINE_HTML, {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      return response;
    } catch (err) {
      if (url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ status: 'offline', online: false }), {
          status: 503,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }

      return new Response(OFFLINE_HTML, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
  },
};

const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#fffcef">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <title>AI Core music 🎵 • Trạm phát nhạc tạm nghỉ</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=IBM+Plex+Mono:wght@500;600&family=Pacifico&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body { min-height: 100%; }
    body {
      font-family: 'DM Sans', sans-serif;
      background: linear-gradient(135deg, #fffcef 0%, #ffe4e6 45%, #e0e7ff 100%);
      color: #25385b;
      min-height: 100vh; min-height: 100dvh;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: max(16px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
      position: relative; overflow-x: hidden; overflow-y: auto;
      -webkit-font-smoothing: antialiased;
    }
    .bg-blobs { position: fixed; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
    .blob-1 {
      position: absolute; top: -80px; left: -80px; width: 320px; height: 320px;
      background: radial-gradient(circle, rgba(254, 215, 170, 0.6) 0%, rgba(255, 255, 255, 0) 70%);
      border-radius: 50%;
    }
    .blob-2 {
      position: absolute; bottom: -100px; right: -80px; width: 360px; height: 360px;
      background: radial-gradient(circle, rgba(199, 210, 254, 0.7) 0%, rgba(255, 255, 255, 0) 70%);
      border-radius: 50%;
    }
    .container { position: relative; z-index: 10; width: 100%; max-width: 460px; margin: auto 0; }
    .card {
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 2px solid #25385b; border-radius: 26px; padding: 30px 26px 24px;
      text-align: center; box-shadow: 6px 6px 0px #25385b;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .status-badge {
      display: inline-flex; align-items: center; gap: 8px; padding: 5px 14px;
      background: #fff1f2; border: 1.5px solid #25385b; border-radius: 999px;
      font-size: 11px; font-weight: 700; font-family: 'IBM Plex Mono', monospace;
      text-transform: uppercase; letter-spacing: 0.5px; color: #e11d48; margin-bottom: 16px;
      box-shadow: 2px 2px 0px #25385b;
    }
    .status-dot {
      width: 8px; height: 8px; border-radius: 50%; background: #e11d48; position: relative;
    }
    .status-dot::after {
      content: ''; position: absolute; inset: -3px; border-radius: 50%;
      background: #e11d48; opacity: 0.4; animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .logo-box {
      width: 72px; height: 72px; margin: 0 auto 14px; border-radius: 20px; background: #fff;
      border: 2px solid #25385b; display: flex; align-items: center; justify-content: center;
      box-shadow: 3px 3px 0px #25385b; overflow: hidden; padding: 6px; font-size: 34px;
    }
    .logo-img { width: 100%; height: 100%; object-fit: contain; border-radius: 12px; display: block; }
    h1 {
      font-family: 'Space Grotesk', sans-serif; font-size: 25px; font-weight: 700;
      line-height: 1.2; margin-bottom: 4px; color: #25385b;
    }
    .tagline {
      font-family: 'Dancing Script', 'Pacifico', cursive; font-size: 23px; font-weight: 700; color: #3252f4; margin-bottom: 12px; display: block;
    }
    p.desc {
      font-size: 13px; line-height: 1.6; color: #64748b; margin-bottom: 18px; padding: 0 4px;
    }
    .info-box {
      background: #fffcef; border: 1.5px solid #25385b; border-radius: 16px;
      padding: 12px 16px; text-align: left; margin-bottom: 20px; box-shadow: 2px 2px 0px #25385b;
    }
    .info-row {
      display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: #25385b; margin-bottom: 8px;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-icon {
      width: 24px; height: 24px; border-radius: 7px; background: #ffe4e6;
      border: 1px solid #25385b; display: flex; align-items: center; justify-content: center;
      font-size: 12px; flex-shrink: 0;
    }
    .info-row strong { font-weight: 700; }
    .btn-reload {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      width: 100%; background: #3252f4; color: #fff; font-weight: 700; font-size: 14px;
      padding: 13px 20px; border-radius: 16px; text-decoration: none; border: 2px solid #25385b;
      box-shadow: 4px 4px 0px #25385b; cursor: pointer; transition: all 0.12s ease; font-family: inherit;
      touch-action: manipulation;
    }
    .btn-reload:hover {
      transform: translate(2px, 2px); box-shadow: 2px 2px 0px #25385b; background: #2544db;
    }
    .btn-reload:active {
      transform: translate(3px, 3px); box-shadow: 1px 1px 0px #25385b;
    }
    .live-status {
      font-size: 11px; color: #94a3b8; margin-top: 12px; font-family: 'IBM Plex Mono', monospace;
    }
    footer { margin-top: 14px; text-align: center; font-size: 11.5px; color: #84849c; }
    footer a { color: #25385b; font-weight: 700; text-decoration: none; border-bottom: 1.5px dashed #25385b; }

    /* MOBILE RESPONSIVE (< 480px) */
    @media (max-width: 480px) {
      body {
        padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
      }
      .card {
        padding: 22px 16px 18px; border-radius: 22px; box-shadow: 4px 4px 0px #25385b;
      }
      .status-badge {
        font-size: 10px; padding: 4px 11px; margin-bottom: 12px; gap: 6px;
      }
      .status-dot { width: 7px; height: 7px; }
      .logo-box {
        width: 60px; height: 60px; margin-bottom: 10px; border-radius: 16px; padding: 4px; font-size: 28px; box-shadow: 2.5px 2.5px 0px #25385b;
      }
      h1 { font-size: 22px; margin-bottom: 2px; }
      .tagline { font-size: 19px; margin-bottom: 10px; }
      p.desc { font-size: 12px; line-height: 1.5; margin-bottom: 15px; padding: 0; }
      .info-box { padding: 10px 12px; margin-bottom: 15px; border-radius: 14px; }
      .info-row { font-size: 11.5px; gap: 8px; margin-bottom: 6px; }
      .info-icon { width: 20px; height: 20px; font-size: 10.5px; border-radius: 6px; }
      .btn-reload { padding: 11px 16px; font-size: 13px; border-radius: 13px; box-shadow: 3px 3px 0px #25385b; }
      .btn-reload:hover { transform: none; }
      .btn-reload:active { transform: translate(2px, 2px); box-shadow: 1px 1px 0px #25385b; }
      .live-status { font-size: 10.5px; margin-top: 10px; }
      footer { font-size: 10.5px; margin-top: 10px; }
    }

    @media (max-width: 360px) {
      .card { padding: 18px 12px 14px; border-radius: 18px; }
      h1 { font-size: 20px; }
      .tagline { font-size: 17px; }
      .info-row { font-size: 10.5px; gap: 6px; }
    }

    @media (max-height: 640px) {
      body { justify-content: flex-start; }
      .container { margin: 10px 0; }
      .card { padding: 16px 14px 12px; }
      .logo-box { width: 48px; height: 48px; margin-bottom: 6px; font-size: 22px; }
      .status-badge { margin-bottom: 6px; padding: 2px 8px; font-size: 9.5px; }
      h1 { font-size: 18px; }
      .tagline { font-size: 16px; margin-bottom: 6px; }
      p.desc { font-size: 11px; margin-bottom: 8px; line-height: 1.4; }
      .info-box { padding: 6px 10px; margin-bottom: 8px; }
      .info-row { margin-bottom: 3px; font-size: 10.5px; }
      .btn-reload { padding: 8px 12px; font-size: 12px; }
      .live-status { margin-top: 6px; font-size: 9.5px; }
      footer { margin-top: 6px; font-size: 9.5px; }
    }
  </style>
</head>
<body>
  <div class="bg-blobs">
    <div class="blob-1"></div>
    <div class="blob-2"></div>
  </div>

  <div class="container">
    <div class="card">
      <div class="status-badge">
        <span class="status-dot"></span>
        <span>DJ Station Đang Tạm Nghỉ</span>
      </div>

      <div class="logo-box">
        <img src="/logo.png" onerror="this.style.display='none'; document.getElementById('logo-fallback').style.display='block';" alt="AI Core" class="logo-img">
        <span id="logo-fallback" style="display:none;">🎧</span>
      </div>

      <h1>AI Core music</h1>
      <span class="tagline">Trạm phát nhạc & Order bài văn phòng</span>

      <p class="desc">
        Máy tính phát nhạc DJ hiện chưa khởi chạy hoặc văn phòng đang ngoài giờ làm việc. Khi trạm phát nhạc bật, hệ thống sẽ tự động sẵn sàng đón bạn!
      </p>

      <div class="info-box">
        <div class="info-row">
          <div class="info-icon">🕒</div>
          <div>Giờ hoạt động: <strong>Thứ 2 – Thứ 6 (8:30 – 18:00)</strong></div>
        </div>
        <div class="info-row">
          <div class="info-icon">🎵</div>
          <div>YouTube Queue Realtime • Giao diện Recess Sunset</div>
        </div>
        <div class="info-row">
          <div class="info-icon">☕</div>
          <div>Cùng nhau order nhạc, thả biểu cảm & chill làm việc</div>
        </div>
      </div>

      <button class="btn-reload" onclick="checkConnection()">
        <span id="btn-icon">🔄</span>
        <span id="btn-text">Thử kết nối lại ngay</span>
      </button>

      <div class="live-status" id="live-hint">
        Tự động kiểm tra tín hiệu mỗi 10 giây...
      </div>
    </div>

    <footer>
      Hệ thống phát nhạc nội bộ AI Core • Thiết kế bởi <a href="https://lpsang.id.vn/" target="_blank">Le Phuoc Sang</a>
    </footer>
  </div>

  <script>
    async function checkConnection() {
      const btnText = document.getElementById('btn-text');
      const btnIcon = document.getElementById('btn-icon');
      const liveHint = document.getElementById('live-hint');
      
      btnText.textContent = 'Đang kiểm tra trạm phát...';
      btnIcon.textContent = '⏳';

      try {
        const res = await fetch('/api/health?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.status === 'ok') {
          btnText.textContent = 'Đã kết nối! Đang tải nhạc...';
          btnIcon.textContent = '🎉';
          liveHint.textContent = 'Máy chủ DJ đã mở cửa! Đang vào hệ thống...';
          setTimeout(() => {
            window.location.reload();
          }, 800);
          return;
        }
      } catch (e) {}

      setTimeout(() => {
        btnText.textContent = 'Thử kết nối lại ngay';
        btnIcon.textContent = '🔄';
        liveHint.textContent = 'Trạm vẫn chưa bật. Thử lại sau ít phút nhé!';
      }, 1000);
    }

    setInterval(async () => {
      try {
        const res = await fetch('/api/health?t=' + Date.now(), { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data && data.status === 'ok') {
          window.location.reload();
        }
      } catch (e) {}
    }, 10000);
  </script>
</body>
</html>
`;
