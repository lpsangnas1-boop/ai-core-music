import { db } from './db.js';
import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

export function seedDefaults() {
  // Seed default settings if not exists
  const defaultSettings: Record<string, string> = {
    serverName: config.serverName,
    requestsEnabled: String(config.requestsEnabled),
    requestCooldownSeconds: String(config.requestCooldownSeconds),
    maxRequestsPerDevice: String(config.maxRequestsPerDevice),
    loopDefaultPlaylist: 'true',
    showRequesterNames: 'true',
    autoPlay: 'true',
  };

  const checkSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSettingStmt = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');

  for (const [key, value] of Object.entries(defaultSettings)) {
    const existing = checkSettingStmt.get(key);
    if (!existing) {
      insertSettingStmt.run(key, value);
    }
  }

  // Seed default playlist if empty
  const playlistCount = (db.prepare('SELECT COUNT(*) as count FROM default_playlist').get() as { count: number }).count;

  if (playlistCount === 0) {
    const defaultSongs = [
      {
        youtubeId: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio - beats to relax/study to',
        channel: 'Lofi Girl',
        thumbnail: 'https://img.youtube.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        duration: 0,
      },
      {
        youtubeId: 'JGwWNGJdvx8',
        title: 'Ed Sheeran - Shape of You',
        channel: 'Ed Sheeran',
        thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/hqdefault.jpg',
        duration: 263,
      },
      {
        youtubeId: 'fJ9rUzIMcZQ',
        title: 'Queen – Bohemian Rhapsody',
        channel: 'Queen Official',
        thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
        duration: 359,
      },
      {
        youtubeId: 'PMivT7MJ41M',
        title: "Bruno Mars - That's What I Like",
        channel: 'Bruno Mars',
        thumbnail: 'https://img.youtube.com/vi/PMivT7MJ41M/hqdefault.jpg',
        duration: 210,
      },
      {
        youtubeId: 'k2qgadSvNyU',
        title: 'Dua Lipa - New Rules',
        channel: 'Dua Lipa',
        thumbnail: 'https://img.youtube.com/vi/k2qgadSvNyU/hqdefault.jpg',
        duration: 225,
      }
    ];

    const insertSongStmt = db.prepare(`
      INSERT INTO default_playlist (id, youtube_id, title, channel, thumbnail, duration, position, is_enabled)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    defaultSongs.forEach((song, index) => {
      insertSongStmt.run(
        randomUUID(),
        song.youtubeId,
        song.title,
        song.channel,
        song.thumbnail,
        song.duration,
        index
      );
    });

    console.log(`[Seed] Seeded ${defaultSongs.length} default chill songs into playlist`);
  }
}
