import { db } from '../database/db.js';
import { config } from '../config.js';

function parseIntSetting(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
import type { JukeboxSettings } from '../types/shared.js';

export function getSettings(): JukeboxSettings {
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.key, row.value);
  }

  return {
    serverName: map.get('serverName') || config.serverName || 'AI Core mú sịc',
    requestsEnabled: map.get('requestsEnabled') !== 'false',
    requestCooldownSeconds: parseIntSetting(map.get('requestCooldownSeconds'), 0),
    maxRequestsPerDevice: parseIntSetting(map.get('maxRequestsPerDevice'), 20),
    loopDefaultPlaylist: map.get('loopDefaultPlaylist') !== 'false',
    showRequesterNames: map.get('showRequesterNames') !== 'false',
    autoPlay: map.get('autoPlay') !== 'false',
    volumeNormalization: map.get('volumeNormalization') !== 'false',
  };
}

const BOOLEAN_KEYS = [
  'requestsEnabled',
  'loopDefaultPlaylist',
  'showRequesterNames',
  'autoPlay',
  'volumeNormalization',
] as const;

const INTEGER_RANGES = {
  requestCooldownSeconds: [0, 3600],
  maxRequestsPerDevice: [1, 100],
} as const;

/** Keep only known settings with valid types/ranges; unknown keys are ignored. */
export function sanitizeSettings(input: unknown): Record<string, string> {
  const clean: Record<string, string> = {};
  if (!input || typeof input !== 'object') return clean;
  const data = input as Record<string, unknown>;

  if (typeof data.serverName === 'string' && data.serverName.trim()) {
    clean.serverName = data.serverName.trim().slice(0, 60);
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof data[key] === 'boolean') clean[key] = String(data[key]);
  }
  for (const [key, [min, max]] of Object.entries(INTEGER_RANGES)) {
    const value = data[key];
    if (typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max) {
      clean[key] = String(value);
    }
  }
  return clean;
}

export function updateSettings(input: unknown): JukeboxSettings {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [key, value] of Object.entries(sanitizeSettings(input))) {
    upsert.run(key, value);
  }

  return getSettings();
}
