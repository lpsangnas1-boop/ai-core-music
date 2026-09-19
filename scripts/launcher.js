import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const NGROK_DOMAIN = 'duo-stagnant-elbow.ngrok-free.dev';
const CUSTOM_DOMAIN = 'music.lpsang.id.vn';

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

console.clear();
console.log('===============================================================');
console.log('  🤖 AI Core mú sịc - ĐANG KHỞI ĐỘNG HỆ THỐNG...');
console.log('===============================================================\n');

// 1. Start Node.js Server
const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');

if (!fs.existsSync(serverScript)) {
  console.error('❌ Chưa tìm thấy server build. Đang tự động build lại dự án...');
  const buildProcess = spawn('npm', ['run', 'build'], { cwd: rootDir, shell: true, stdio: 'inherit' });
  buildProcess.on('exit', () => startAll());
} else {
  startAll();
}

function startAll() {
  const serverProcess = spawn('node', [serverScript], {
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  // 2. Start Ngrok Tunnel with your permanent static domain
  console.log('⏳ Đang kết nối tên miền cố định với Ngrok...');
  const ngrokProcess = spawn('ngrok', ['http', `--url=${NGROK_DOMAIN}`, '8989'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  ngrokProcess.on('error', (err) => {
    console.warn('⚠️ Lỗi khởi động ngrok:', err.message);
  });

  // Give 1.5s for ngrok to initialize and display success banner
  setTimeout(() => {
    printSuccessBanner();
  }, 1500);

  function cleanup() {
    try { serverProcess.kill(); } catch (e) {}
    try { ngrokProcess.kill(); } catch (e) {}
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);
}

function printSuccessBanner() {
  console.clear();
  console.log('===============================================================');
  console.log('  🎉 AI CORE MÚ SỊC ĐÃ HOẠT ĐỘNG SẴN SÀNG! 🎧🤖');
  console.log('===============================================================');
  console.log('');
  console.log('  🌐 TÊN MIỀN RIÊNG CỦA BẠN (CỐ ĐỊNH VĨNH VIỄN):');
  console.log(`     👉 \x1b[32m\x1b[1mhttps://${CUSTOM_DOMAIN}\x1b[0m 👈`);
  console.log(`     hoặc: \x1b[36m\x1b[1mhttps://${NGROK_DOMAIN}\x1b[0m`);
  console.log('     (Gửi link này cho đồng nghiệp dùng 4G/5G/Wi-Fi order nhạc)');
  console.log('');
  console.log('  🏠 LINK WI-FI NỘI BỘ VĂN PHÒNG:');
  console.log(`     👉 http://${getLocalIp()}:8989`);
  console.log('');
  console.log('  💻 LINK TRÊN MÁY TÍNH CỦA BẠN (DJ MASTER):');
  console.log('     👉 http://localhost:8989');
  console.log('');
  console.log('  📌 LƯU Ý: Giữ cửa sổ này mở trong suốt lúc phát nhạc.');
  console.log('===============================================================\n');

  // Open browser automatically
  try {
    spawn('cmd', ['/c', 'start', `https://${NGROK_DOMAIN}`], { detached: true });
  } catch (e) {}
}
