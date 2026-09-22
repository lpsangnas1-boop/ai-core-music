import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const PORT = process.env.PORT || '8989';
const TUNNEL_MODE = (process.env.TUNNEL_MODE || 'cloudflare').toLowerCase();
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || 'music.lpsang.id.vn';
const LT_SUBDOMAIN = process.env.LT_SUBDOMAIN || 'aicoremusic';
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || '';

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

function runBuild() {
  return new Promise((resolve, reject) => {
    console.log('\n🔨 Đang tự động build toàn bộ dự án (Server + Client)...');
    const buildProcess = spawn('npm', ['run', 'build'], {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit',
    });
    buildProcess.on('error', reject);
    buildProcess.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Quá trình build thất bại với mã lỗi ${code}`));
    });
  });
}

async function ensureBuild() {
  const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');
  const clientIndex = path.join(rootDir, 'client', 'dist', 'index.html');

  const hasServer = fs.existsSync(serverScript);
  const hasClient = fs.existsSync(clientIndex);

  if (!hasServer || !hasClient) {
    console.log('🔍 Kiểm tra bản build:');
    console.log(`   - Server build: ${hasServer ? '✅ Đã có' : '❌ Thiếu'}`);
    console.log(`   - Client build: ${hasClient ? '✅ Đã có' : '❌ Thiếu'}`);
    try {
      await runBuild();
    } catch (err) {
      console.error('\n❌ BUILD THẤT BẠI!');
      console.error(err.message);
      process.exit(1);
    }
  }
}

let bannerPrinted = false;
function printSuccessBanner(info = {}) {
  if (bannerPrinted) return;
  bannerPrinted = true;

  console.log('\n===============================================================');
  console.log('  🎉 AI CORE MÚ SỊC ĐÃ HOẠT ĐỘNG SẴN SÀNG! 🎧🤖');
  console.log('===============================================================');
  console.log('');

  if (info.onlineUrl) {
    console.log('  🌐 TÊN MIỀN CHÍNH THỨC (CLOUDFLARE HTTPS VĨNH VIỄN):');
    console.log(`     👉 \x1b[32m\x1b[1m${info.onlineUrl}\x1b[0m 👈`);
    console.log('     (Gửi link này cho đồng nghiệp dùng 4G/5G/Wi-Fi để order bài)');

    if (info.tunnelPassword) {
      console.log('');
      console.log('  🔑 MẬT KHẨU TUNNEL:');
      console.log(`     👉 \x1b[33m\x1b[1m${info.tunnelPassword}\x1b[0m 👈`);
    }
  }

  console.log('');
  console.log('  🏠 LINK WI-FI NỘI BỘ VĂN PHÒNG (Dùng cùng Wi-Fi):');
  console.log(`     👉 http://${getLocalIp()}:${PORT}`);
  console.log('');
  console.log('  💻 LINK TRÊN MÁY TÍNH CỦA BẠN (DJ MASTER):');
  console.log(`     👉 http://localhost:${PORT}`);
  console.log('');
  console.log('  📌 LƯU Ý: Giữ cửa sổ này mở trong suốt lúc phát nhạc.');
  console.log('===============================================================\n');

  // Open browser to DJ master panel
  try {
    spawn('cmd', ['/c', 'start', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' });
  } catch (e) {}
}

async function startAll() {
  const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');

  console.log('🚀 Đang khởi động Backend Server...');
  const serverProcess = spawn('node', [serverScript], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Không thể khởi động server:', err.message);
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\n❌ Server đã dừng với mã lỗi: ${code}`);
    }
  });

  let tunnelProcess = null;

  // 1. Cloudflare mode (Default - Named Tunnel ai-core-music)
  if (TUNNEL_MODE === 'cloudflare') {
    console.log(`⏳ Đang kết nối Cloudflare Tunnel (https://${CUSTOM_DOMAIN})...`);
    tunnelProcess = spawn('cloudflared', ['tunnel', 'run', 'ai-core-music'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    tunnelProcess.on('error', (err) => {
      console.warn('⚠️ Không thể khởi động cloudflared tunnel:', err.message);
    });

    // Show banner after brief connection delay
    setTimeout(() => {
      printSuccessBanner({ onlineUrl: `https://${CUSTOM_DOMAIN}`, mode: 'cloudflare' });
    }, 2500);

  // 2. Localtunnel mode
  } else if (TUNNEL_MODE === 'localtunnel') {
    console.log(`⏳ Đang kết nối Localtunnel (subdomain: ${LT_SUBDOMAIN})...`);
    const ltArgs = ['--yes', 'localtunnel', '--port', PORT];
    if (LT_SUBDOMAIN) ltArgs.push('--subdomain', LT_SUBDOMAIN);

    tunnelProcess = spawn('npx', ltArgs, {
      cwd: rootDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    setTimeout(() => {
      printSuccessBanner({ onlineUrl: `https://${LT_SUBDOMAIN}.loca.lt`, mode: 'localtunnel' });
    }, 3500);

  // 3. Ngrok mode
  } else if (TUNNEL_MODE === 'ngrok') {
    console.log(`⏳ Đang kết nối Ngrok...`);
    const ngrokArgs = NGROK_DOMAIN ? ['http', `--url=${NGROK_DOMAIN}`, PORT] : ['http', PORT];
    tunnelProcess = spawn('ngrok', ngrokArgs, { stdio: 'inherit' });
    setTimeout(() => {
      printSuccessBanner({ onlineUrl: NGROK_DOMAIN ? `https://${NGROK_DOMAIN}` : '', mode: 'ngrok' });
    }, 2500);

  // 4. LAN mode only
  } else {
    setTimeout(() => {
      printSuccessBanner({ mode: 'lan' });
    }, 1500);
  }

  function cleanup() {
    console.log('\n🛑 Đang tắt hệ thống...');
    try { serverProcess.kill(); } catch (e) {}
    try { if (tunnelProcess) tunnelProcess.kill(); } catch (e) {}
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

async function main() {
  console.clear();
  console.log('===============================================================');
  console.log('  🤖 AI Core mú sịc - ĐANG KHỞI ĐỘNG HỆ THỐNG...');
  console.log('===============================================================\n');
  await ensureBuild();
  await startAll();
}

main().catch((err) => {
  console.error('❌ Lỗi khởi động:', err);
  process.exit(1);
});
