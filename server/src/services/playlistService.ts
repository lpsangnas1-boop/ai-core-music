import { db } from '../database/db.js';
import { randomUUID } from 'node:crypto';
import type { PlaylistItem, VideoMetadata } from '../types/shared.js';

export function getDefaultPlaylist(): PlaylistItem[] {
  const rows = db.prepare(`
    SELECT id, youtube_id as youtubeId, title, channel, thumbnail, duration, position, is_enabled as isEnabled, created_at as createdAt
    FROM default_playlist
    ORDER BY position ASC, created_at ASC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtubeId,
    title: r.title,
    channel: r.channel,
    thumbnail: r.thumbnail,
    duration: r.duration || 0,
    position: r.position,
    isEnabled: Boolean(r.isEnabled),
    createdAt: r.createdAt,
  }));
}

export function addPlaylistSong(metadata: VideoMetadata): PlaylistItem {
  const maxPosRow = db.prepare('SELECT MAX(position) as maxPos FROM default_playlist').get() as { maxPos: number | null };
  const nextPos = (maxPosRow?.maxPos !== null && maxPosRow?.maxPos !== undefined) ? maxPosRow.maxPos + 1 : 0;

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO default_playlist (id, youtube_id, title, channel, thumbnail, duration, position, is_enabled, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    id,
    metadata.youtubeId,
    metadata.title,
    metadata.channel,
    metadata.thumbnail,
    metadata.duration || 0,
    nextPos,
    createdAt
  );

  return {
    id,
    youtubeId: metadata.youtubeId,
    title: metadata.title,
    channel: metadata.channel,
    thumbnail: metadata.thumbnail,
    duration: metadata.duration || 0,
    position: nextPos,
    isEnabled: true,
    createdAt,
  };
}

export function removePlaylistSong(id: string): boolean {
  const result = db.prepare('DELETE FROM default_playlist WHERE id = ?').run(id);
  
  if (result.changes > 0) {
    // Re-index remaining playlist positions
    const playlist = getDefaultPlaylist();
    const updatePos = db.prepare('UPDATE default_playlist SET position = ? WHERE id = ?');
    playlist.forEach((song, idx) => {
      updatePos.run(idx, song.id);
    });
    return true;
  }
  return false;
}

export function togglePlaylistSong(id: string, isEnabled: boolean): boolean {
  const result = db.prepare('UPDATE default_playlist SET is_enabled = ? WHERE id = ?').run(isEnabled ? 1 : 0, id);
  return result.changes > 0;
}

export function reorderPlaylist(orderedIds: string[]): PlaylistItem[] {
  const updatePos = db.prepare('UPDATE default_playlist SET position = ? WHERE id = ?');
  
  orderedIds.forEach((id, index) => {
    updatePos.run(index, id);
  });

  return getDefaultPlaylist();
}
