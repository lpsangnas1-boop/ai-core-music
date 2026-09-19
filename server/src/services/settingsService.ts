import { db } from '../database/db.js';
import { config } from '../config.js';
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
    requestCooldownSeconds: parseInt(map.get('requestCooldownSeconds') || '0', 10),
    maxRequestsPerDevice: parseInt(map.get('maxRequestsPerDevice') || '20', 10),
    loopDefaultPlaylist: map.get('loopDefaultPlaylist') !== 'false',
    showRequesterNames: map.get('showRequesterNames') !== 'false',
    autoPlay: map.get('autoPlay') !== 'false',
    volumeNormalization: map.get('volumeNormalization') !== 'false',
  };
}

export function updateSettings(partial: Partial<JukeboxSettings>): JukeboxSettings {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [key, value] of Object.entries(partial)) {
    if (value !== undefined) {
      upsert.run(key, String(value));
    }
  }

  return getSettings();
}
