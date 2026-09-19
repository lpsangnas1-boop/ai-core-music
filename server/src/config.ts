import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env from root or current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config(); // fallback to local

export const config = {
  port: parseInt(process.env.PORT || '8989', 10),
  host: process.env.HOST || '0.0.0.0',
  adminPin: process.env.ADMIN_PIN || '123456',
  serverName: process.env.SERVER_NAME || 'AI Core mú sịc',
  requestsEnabled: process.env.REQUESTS_ENABLED !== 'false',
  requestCooldownSeconds: parseInt(process.env.REQUEST_COOLDOWN_SECONDS || '0', 10),
  maxRequestsPerDevice: parseInt(process.env.MAX_REQUESTS_PER_DEVICE || '20', 10),
  dbPath: process.env.DATABASE_PATH
    ? path.resolve(rootDir, process.env.DATABASE_PATH)
    : path.resolve(rootDir, 'data/jukebox.db'),
  clientDistPath: path.resolve(rootDir, 'client/dist'),
  rootDir,
};
