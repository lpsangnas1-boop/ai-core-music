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
const NGROK_DOMAIN = process.env.NGROK_DOMAIN || 'duo-stagnant-elbow.ngrok-free.dev';
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN || 'music.lpsang.id.vn';

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
      console.error('\n👉 Hướng dẫn khắc phục nếu gặp lỗi Rollup/Vite trên Windows:');
      console.error('   1. rmdir /s /q node_modules');
      console.error('   2. del package-lock.json');
      console.error('   3. npm cache clean --force');
      console.error('   4. npm install');
      console.error('   5. npm run build\n');
      process.exit(1);
    }
  }
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

  // Start Ngrok Tunnel
  console.log(`⏳ Đang kết nối tên miền Ngrok (${NGROK_DOMAIN})...`);
  const ngrokArgs = NGROK_DOMAIN 
    ? ['http', `--url=${NGROK_DOMAIN}`, PORT] 
    : ['http', PORT];

  const ngrokProcess = spawn('ngrok', ngrokArgs, {
    stdio: 'inherit',
  });

  ngrokProcess.on('error', (err) => {
    console.warn('⚠️ Không thể khởi động ngrok (kiểm tra ngrok đã cài đặt chưa):', err.message);
  });

  // Display banner after short wait
  setTimeout(() => {
    printSuccessBanner();
  }, 2500);

  function cleanup() {
    console.log('\n🛑 Đang tắt hệ thống...');
    try { serverProcess.kill(); } catch (e) {}
    try { ngrokProcess.kill(); } catch (e) {}
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

function printSuccessBanner() {
  console.log('\n===============================================================');
  console.log('  🎉 AI CORE MÚ SỊC ĐÃ HOẠT ĐỘNG SẴN SÀNG! 🎧🤖');
  console.log('===============================================================');
  console.log('');
  if (CUSTOM_DOMAIN) {
    console.log('  🌐 TÊN MIỀN RIÊNG:');
    console.log(`     👉 \x1b[32m\x1b[1mhttps://${CUSTOM_DOMAIN}\x1b[0m 👈`);
  }
  if (NGROK_DOMAIN) {
    console.log('  🌐 TÊN MIỀN NGROK:');
    console.log(`     👉 \x1b[36m\x1b[1mhttps://${NGROK_DOMAIN}\x1b[0m`);
    console.log('     (Gửi link này cho đồng nghiệp dùng 4G/5G/Wi-Fi order nhạc)');
  }
  console.log('');
  console.log('  🏠 LINK WI-FI NỘI BỘ VĂN PHÒNG:');
  console.log(`     👉 http://${getLocalIp()}:${PORT}`);
  console.log('');
  console.log('  💻 LINK TRÊN MÁY TÍNH CỦA BẠN (DJ MASTER):');
  console.log(`     👉 http://localhost:${PORT}`);
  console.log('');
  console.log('  📌 LƯU Ý: Giữ cửa sổ này mở trong suốt lúc phát nhạc.');
  console.log('===============================================================\n');

  // Open browser automatically to DJ Master panel
  try {
    const targetUrl = NGROK_DOMAIN ? `https://${NGROK_DOMAIN}` : `http://localhost:${PORT}`;
    spawn('cmd', ['/c', 'start', targetUrl], { detached: true, stdio: 'ignore' });
  } catch (e) {}
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
