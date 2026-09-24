import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(config.dbPath);

// Enable WAL mode for better concurrency and performance
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
} catch (e) {
  console.warn('Could not set WAL mode on SQLite:', e);
}

export function initDatabase() {
  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Default playlist table
  db.exec(`
    CREATE TABLE IF NOT EXISTS default_playlist (
      id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      position INTEGER NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Active queue table
  db.exec(`
    CREATE TABLE IF NOT EXISTS queue (
      id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      requester_name TEXT NOT NULL,
      requester_device_id TEXT NOT NULL,
      status TEXT DEFAULT 'queued',
      position INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      played_at TEXT
    );
  `);

  // Request history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS request_history (
      id TEXT PRIMARY KEY,
      youtube_id TEXT NOT NULL,
      title TEXT NOT NULL,
      channel TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      duration INTEGER DEFAULT 0,
      requester_name TEXT NOT NULL,
      requester_device_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      played_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for fast queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_queue_status_position ON queue(status, position);
    CREATE INDEX IF NOT EXISTS idx_queue_device ON queue(requester_device_id, status);
    CREATE INDEX IF NOT EXISTS idx_playlist_position ON default_playlist(position);
  `);

  // Safe column migration for shoutout
  try {
    db.exec('ALTER TABLE queue ADD COLUMN shoutout TEXT;');
  } catch (e) {
    // Column already exists
  }
  try {
    db.exec('ALTER TABLE request_history ADD COLUMN shoutout TEXT;');
  } catch (e) {
    // Column already exists
  }

  // Older versions stored 'YYYY-MM-DD HH:MM:SS' (UTC, no zone) for removed entries.
  // Normalize to ISO-8601 so sorting and browser parsing are correct.
  db.exec(`
    UPDATE request_history
    SET played_at = replace(played_at, ' ', 'T') || '.000Z'
    WHERE played_at GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]:[0-9][0-9]';
  `);

  console.log(`[Database] SQLite initialized at ${config.dbPath}`);
}
