import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// node:sqlite (used by the server) is available without flags from Node 22.13 / 23.4
function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const ok = major > 23 || (major === 23 && minor >= 4) || (major === 22 && minor >= 13);
  if (!ok) {
    console.error(`❌ Node.js ${process.versions.node} quá cũ. Cần Node.js >= 22.13 (khuyến nghị bản LTS mới nhất).`);
    console.error('   Tải tại: https://nodejs.org');
    process.exit(1);
  }
}

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
  } else {
    console.warn('⚠️  Chưa có file .env — hãy copy .env.example thành .env và đặt ADMIN_PIN.');
  }
}

checkNodeVersion();
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
    console.log('\n🔨 Đang build toàn bộ dự án (Server + Client)...');
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

/** Newest modification time of any file under the given paths. */
function newestMtime(paths) {
  let newest = 0;
  const visit = (p) => {
    if (!fs.existsSync(p)) return;
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(p)) visit(path.join(p, entry));
    } else if (stat.mtimeMs > newest) {
      newest = stat.mtimeMs;
    }
  };
  paths.forEach(visit);
  return newest;
}

async function ensureBuild() {
  const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');
  const clientIndex = path.join(rootDir, 'client', 'dist', 'index.html');

  const hasServer = fs.existsSync(serverScript);
  const hasClient = fs.existsSync(clientIndex);

  // Rebuild when sources are newer than the build (e.g. after git pull)
  const serverStale =
    hasServer && newestMtime([path.join(rootDir, 'server', 'src')]) > fs.statSync(serverScript).mtimeMs;
  const clientStale =
    hasClient &&
    newestMtime([
      path.join(rootDir, 'client', 'src'),
      path.join(rootDir, 'client', 'public'),
      path.join(rootDir, 'client', 'index.html'),
      path.join(rootDir, 'server', 'src', 'types'),
    ]) > fs.statSync(clientIndex).mtimeMs;

  if (!hasServer || !hasClient || serverStale || clientStale) {
    console.log('🔍 Kiểm tra bản build:');
    console.log(`   - Server build: ${!hasServer ? '❌ Thiếu' : serverStale ? '🔄 Cũ hơn mã nguồn' : '✅ Mới nhất'}`);
    console.log(`   - Client build: ${!hasClient ? '❌ Thiếu' : clientStale ? '🔄 Cũ hơn mã nguồn' : '✅ Mới nhất'}`);
    try {
      await runBuild();
    } catch (err) {
      console.error('\n❌ BUILD THẤT BẠI!');
      console.error(err.message);
      process.exit(1);
    }
  }
}

/** Resolve true once GET /api/health answers 200, or false after the timeout. */
function waitForServer(timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const retry = () => {
      if (Date.now() > deadline) return resolve(false);
      setTimeout(attempt, 500);
    };
    const attempt = () => {
      const req = http.get({ host: '127.0.0.1', port: PORT, path: '/api/health', timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode === 200) resolve(true);
        else retry();
      });
      req.on('error', retry);
      req.on('timeout', () => req.destroy());
    };
    attempt();
  });
}

function printBanner({ onlineUrl, tunnelOk }) {
  console.log('\n===============================================================');
  console.log('  🎉 AI CORE MÚ SỊC ĐÃ HOẠT ĐỘNG SẴN SÀNG! 🎧🤖');
  console.log('===============================================================');
  console.log('');

  if (onlineUrl) {
    console.log('  🌐 LINK ONLINE (4G/5G/Wi-Fi):');
    console.log(`     👉 \x1b[32m\x1b[1m${onlineUrl}\x1b[0m 👈`);
    if (!tunnelOk) {
      console.log('     \x1b[33m⚠️  Tunnel chưa xác nhận kết nối — xem log [tunnel] bên trên nếu link không vào được.\x1b[0m');
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

  try {
    spawn('cmd', ['/c', 'start', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' });
  } catch (e) {}
}

let shuttingDown = false;
let serverProcess = null;
let tunnelProcess = null;

/** Run the server and restart it automatically if it crashes. */
function startServer() {
  const serverScript = path.join(rootDir, 'server', 'dist', 'index.js');
  const recentCrashes = [];

  const launch = () => {
    serverProcess = spawn(process.execPath, [serverScript], { cwd: rootDir, stdio: 'inherit' });

    serverProcess.on('error', (err) => {
      console.error('❌ Không thể khởi động server:', err.message);
    });

    serverProcess.on('exit', (code) => {
      if (shuttingDown) return;
      const now = Date.now();
      recentCrashes.push(now);
      while (recentCrashes.length && now - recentCrashes[0] > 60_000) recentCrashes.shift();

      if (recentCrashes.length > 5) {
        console.error('\n❌ Server dừng liên tục (>5 lần/phút). Ngừng tự khởi động lại — kiểm tra log lỗi bên trên.');
        return;
      }
      console.error(`\n⚠️  Server đã dừng (mã ${code}). Tự khởi động lại sau 2 giây...`);
      setTimeout(launch, 2000);
    });
  };

  launch();
}

/**
 * Forward tunnel output with a prefix. The pipes must be read: an unread pipe
 * eventually fills up and blocks the tunnel process.
 */
function pipeTunnelOutput(child, onLine) {
  const handle = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      onLine?.(line);
      if (/error|fail|unable|denied|invalid/i.test(line)) {
        console.log(`\x1b[33m[tunnel]\x1b[0m ${line}`);
      }
    }
  };
  child.stdout?.on('data', handle);
  child.stderr?.on('data', handle);
}

function startTunnel() {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    if (TUNNEL_MODE === 'cloudflare') {
      const onlineUrl = `https://${CUSTOM_DOMAIN}`;
      console.log(`⏳ Đang kết nối Cloudflare Tunnel (${onlineUrl})...`);
      const token = process.env.CLOUDFLARE_TUNNEL_TOKEN;
      const cfArgs = token
        ? ['tunnel', 'run', '--protocol', 'http2', '--token', token]
        : ['tunnel', 'run', '--protocol', 'http2', 'ai-core-music'];
      tunnelProcess = spawn('cloudflared', cfArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      pipeTunnelOutput(tunnelProcess, (line) => {
        if (/Registered tunnel connection/i.test(line)) done({ onlineUrl, tunnelOk: true });
      });
      tunnelProcess.on('error', (err) => {
        console.warn('⚠️ Không thể khởi động cloudflared:', err.message);
        done({ onlineUrl, tunnelOk: false });
      });
      setTimeout(() => done({ onlineUrl, tunnelOk: false }), 15000);
    } else if (TUNNEL_MODE === 'localtunnel') {
      const fallbackUrl = `https://${LT_SUBDOMAIN}.loca.lt`;
      console.log(`⏳ Đang kết nối Localtunnel (subdomain: ${LT_SUBDOMAIN})...`);
      const ltArgs = ['--yes', 'localtunnel', '--port', PORT];
      if (LT_SUBDOMAIN) ltArgs.push('--subdomain', LT_SUBDOMAIN);
      tunnelProcess = spawn('npx', ltArgs, {
        cwd: rootDir,
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      pipeTunnelOutput(tunnelProcess, (line) => {
        const match = line.match(/https:\/\/\S+/);
        if (/your url is/i.test(line) && match) done({ onlineUrl: match[0], tunnelOk: true });
      });
      tunnelProcess.on('error', () => done({ onlineUrl: fallbackUrl, tunnelOk: false }));
      setTimeout(() => done({ onlineUrl: fallbackUrl, tunnelOk: false }), 20000);
    } else if (TUNNEL_MODE === 'ngrok') {
      console.log('⏳ Đang kết nối Ngrok...');
      const ngrokArgs = NGROK_DOMAIN ? ['http', `--url=${NGROK_DOMAIN}`, PORT] : ['http', PORT];
      tunnelProcess = spawn('ngrok', ngrokArgs, { stdio: 'inherit' });
      tunnelProcess.on('error', (err) => {
        console.warn('⚠️ Không thể khởi động ngrok:', err.message);
        done({ onlineUrl: '', tunnelOk: false });
      });
      setTimeout(() => done({ onlineUrl: NGROK_DOMAIN ? `https://${NGROK_DOMAIN}` : '', tunnelOk: true }), 2500);
    } else {
      done({ onlineUrl: '', tunnelOk: true });
    }

    tunnelProcess?.on('exit', (code) => {
      if (!shuttingDown) console.warn(`⚠️ Tunnel đã dừng (mã ${code}). Link online sẽ không truy cập được.`);
      done({ onlineUrl: '', tunnelOk: false });
    });
  });
}

async function startAll() {
  const cleanup = () => {
    shuttingDown = true;
    console.log('\n🛑 Đang tắt hệ thống...');
    try { serverProcess?.kill(); } catch (e) {}
    try { tunnelProcess?.kill(); } catch (e) {}
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('🚀 Đang khởi động Backend Server...');
  startServer();

  const serverUp = await waitForServer();
  if (!serverUp) {
    console.error(`\n❌ Server không phản hồi trên cổng ${PORT}. Kiểm tra lỗi bên trên (cổng bị chiếm, thiếu .env...).`);
  }

  const tunnel = await startTunnel();
  if (serverUp) printBanner(tunnel);
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
