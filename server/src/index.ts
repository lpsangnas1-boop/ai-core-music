import express, { Request, Response } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import { config } from './config.js';
import { initDatabase } from './database/db.js';
import { seedDefaults } from './database/seed.js';
import { initSocketIO } from './socket/socketHandler.js';
import { getNetworkInfo } from './services/networkService.js';

import { playerRouter } from './routes/playerRoutes.js';
import { queueRouter } from './routes/queueRoutes.js';
import { playlistRouter } from './routes/playlistRoutes.js';
import { settingsRouter } from './routes/settingsRoutes.js';
import { metadataRouter } from './routes/metadataRoutes.js';
import { networkRouter } from './routes/networkRoutes.js';
import { historyRouter } from './routes/historyRoutes.js';
import { authRouter } from './routes/authRoutes.js';

// Initialize Database & Seed data
initDatabase();
seedDefaults();

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

initSocketIO(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/player', playerRouter);
app.use('/api/queue', queueRouter);
app.use('/api/playlist', playlistRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/metadata', metadataRouter);
app.use('/api/network', networkRouter);
app.use('/api/history', historyRouter);
app.use('/api/admin', authRouter);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve Client static build in production
if (fs.existsSync(config.clientDistPath)) {
  console.log(`[Static] Serving frontend from ${config.clientDistPath}`);
  app.use(express.static(config.clientDistPath));

  app.get('*', (req: Request, res: Response) => {
    // Avoid intercepting /api or /socket.io requests
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      res.status(404).json({ error: 'Endpoint not found' });
      return;
    }
    res.sendFile(path.join(config.clientDistPath, 'index.html'));
  });
} else {
  // In dev mode when client dist not yet built
  app.get('/', (_req: Request, res: Response) => {
    const net = getNetworkInfo();
    res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Office Jukebox API Server</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1>🎧 Office Jukebox Backend is Running!</h1>
          <p>Listening on <code>0.0.0.0:${config.port}</code></p>
          <p>Local LAN IP: <strong><a href="${net.url}" style="color: #10b981;">${net.url}</a></strong></p>
          <p style="color: #94a3b8;">For development frontend, open <code>http://localhost:5173</code> (Vite Dev Server)</p>
          <p style="color: #94a3b8;">For production, run <code>npm run build</code></p>
        </body>
      </html>
    `);
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: any) => {
  console.error('[Server Error]', err);
  // Malformed JSON bodies are client errors; never leak internal error details.
  const status = err?.type === 'entity.parse.failed' ? 400 : 500;
  res.status(status).json({
    success: false,
    error: status === 400 ? 'Invalid request body' : 'Internal server error',
  });
});

// Start listening on 0.0.0.0
server.listen(config.port, config.host, () => {
  const net = getNetworkInfo();
  console.log('\n==================================================');
  console.log(`  🎧  OFFICE JUKEBOX SERVER IS LIVE!`);
  console.log('==================================================');
  console.log(`  Host bound:     ${config.host}`);
  console.log(`  Local Access:   http://localhost:${config.port}`);
  console.log(`  LAN Access:     ${net.url}`);
  console.log(`  Admin Panel:    ${net.url}/admin`);
  if (config.adminPinIsGenerated) {
    console.log(`  Admin PIN:      ${config.adminPin}  (tự sinh - hãy đặt ADMIN_PIN trong .env)`);
  } else {
    console.log('  Admin PIN:      (đã đặt trong .env)');
  }
  console.log('==================================================\n');
  if (config.adminPinIsWeak) {
    console.warn('  ⚠️  ADMIN_PIN đang quá yếu hoặc là mặc định. Hãy đổi sang PIN dài, khó đoán trong .env!\n');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Gracefully shutting down...');
  server.close(() => {
    console.log('[Server] Closed all connections.');
    process.exit(0);
  });
});
