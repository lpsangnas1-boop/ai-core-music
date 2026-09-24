import { db } from '../database/db.js';
import { randomUUID } from 'node:crypto';
import { getSettings } from './settingsService.js';
import { deviceKey } from '../security.js';
import type { QueueItem, VideoMetadata, RequestHistoryItem } from '../types/shared.js';

export function getQueue(): QueueItem[] {
  const rows = db.prepare(`
    SELECT id, youtube_id as youtubeId, title, channel, thumbnail, duration,
           requester_name as requesterName, requester_device_id as requesterDeviceId,
           status, position, created_at as createdAt, played_at as playedAt, shoutout
    FROM queue
    WHERE status = 'queued'
    ORDER BY position ASC, created_at ASC
  `).all() as any[];

  return rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtubeId,
    title: r.title,
    channel: r.channel,
    thumbnail: r.thumbnail,
    duration: r.duration || 0,
    requesterName: r.requesterName || 'Guest',
    requesterKey: deviceKey(r.requesterDeviceId || ''),
    status: r.status,
    position: r.position,
    createdAt: r.createdAt,
    playedAt: r.playedAt,
    shoutout: r.shoutout || null,
  }));
}

export function canDeviceRequest(deviceId: string): { allowed: boolean; reason?: string; retryAfter?: number } {
  const settings = getSettings();

  if (!settings.requestsEnabled) {
    return { allowed: false, reason: 'Song requests are currently paused by the DJ' };
  }

  if (!deviceId) {
    return { allowed: true };
  }

  // Check active queue count for this device
  const countRow = db.prepare(`
    SELECT COUNT(*) as count FROM queue 
    WHERE requester_device_id = ? AND status = 'queued'
  `).get(deviceId) as { count: number };

  if (countRow.count >= settings.maxRequestsPerDevice) {
    return {
      allowed: false,
      reason: `Queue limit reached! You already have ${countRow.count} song(s) in the queue. Please wait until they play.`,
    };
  }

  // Check cooldown from last request (if cooldown is enabled)
  if (settings.requestCooldownSeconds > 0) {
    const lastRequest = db.prepare(`
      SELECT created_at FROM queue 
      WHERE requester_device_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(deviceId) as { created_at: string } | undefined;

    if (lastRequest && lastRequest.created_at) {
      const lastTime = new Date(lastRequest.created_at).getTime();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTime) / 1000);
      const cooldown = settings.requestCooldownSeconds;

      if (elapsedSeconds < cooldown) {
        const remaining = cooldown - elapsedSeconds;
        return {
          allowed: false,
          reason: `Vui lòng đợi ${remaining}s trước khi order bài tiếp theo.`,
          retryAfter: remaining,
        };
      }
    }
  }

  return { allowed: true };
}

export function isSongInQueueOrPlaying(youtubeId: string, currentPlayingYoutubeId?: string): boolean {
  if (currentPlayingYoutubeId && currentPlayingYoutubeId === youtubeId) {
    return true;
  }

  const existing = db.prepare(`
    SELECT id FROM queue 
    WHERE youtube_id = ? AND status = 'queued'
    LIMIT 1
  `).get(youtubeId);

  return !!existing;
}

export function addQueueItem(
  metadata: VideoMetadata,
  requesterName: string,
  requesterDeviceId: string,
  options?: { isAdmin?: boolean; currentPlayingYoutubeId?: string; shoutout?: string }
): { item: QueueItem; position: number } {
  const isAdmin = options?.isAdmin ?? false;

  // Validate request permissions unless admin
  if (!isAdmin) {
    const check = canDeviceRequest(requesterDeviceId);
    if (!check.allowed) {
      throw new Error(check.reason || 'Request not allowed');
    }

    // Check duplicate
    if (isSongInQueueOrPlaying(metadata.youtubeId, options?.currentPlayingYoutubeId)) {
      throw new Error('This song is already in the queue or currently playing!');
    }
  }

  const maxPosRow = db.prepare(`
    SELECT MAX(position) as maxPos FROM queue WHERE status = 'queued'
  `).get() as { maxPos: number | null };

  const nextPos = (maxPosRow?.maxPos !== null && maxPosRow?.maxPos !== undefined) ? maxPosRow.maxPos + 1 : 0;

  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const cleanRequesterName = (requesterName || 'Guest').trim().slice(0, 50);
  const cleanShoutout = options?.shoutout ? options.shoutout.trim().slice(0, 80) : null;

  db.prepare(`
    INSERT INTO queue (id, youtube_id, title, channel, thumbnail, duration, requester_name, requester_device_id, status, position, created_at, shoutout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?)
  `).run(
    id,
    metadata.youtubeId,
    metadata.title,
    metadata.channel,
    metadata.thumbnail,
    metadata.duration || 0,
    cleanRequesterName,
    requesterDeviceId || 'unknown',
    nextPos,
    createdAt,
    cleanShoutout
  );

  const queue = getQueue();
  const itemPosition = queue.findIndex((q) => q.id === id) + 1;

  const item: QueueItem = {
    id,
    youtubeId: metadata.youtubeId,
    title: metadata.title,
    channel: metadata.channel,
    thumbnail: metadata.thumbnail,
    duration: metadata.duration || 0,
    requesterName: cleanRequesterName,
    requesterKey: deviceKey(requesterDeviceId || 'unknown'),
    status: 'queued',
    position: nextPos,
    createdAt,
    shoutout: cleanShoutout,
  };

  return { item, position: itemPosition > 0 ? itemPosition : nextPos + 1 };
}

export function removeQueueItem(id: string): boolean {
  const item = db.prepare("SELECT * FROM queue WHERE id = ? AND status = 'queued'").get(id) as any;
  if (!item) return false;

  db.prepare("UPDATE queue SET status = 'removed' WHERE id = ?").run(id);

  // Log in history as removed
  db.prepare(`
    INSERT INTO request_history (id, youtube_id, title, channel, thumbnail, duration, requester_name, requester_device_id, status, created_at, played_at, shoutout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'removed', ?, ?, ?)
  `).run(
    randomUUID(),
    item.youtube_id,
    item.title,
    item.channel,
    item.thumbnail,
    item.duration || 0,
    item.requester_name,
    item.requester_device_id,
    item.created_at,
    new Date().toISOString(),
    item.shoutout || null
  );

  // Re-index remaining queue positions
  const queue = getQueue();
  const updatePos = db.prepare('UPDATE queue SET position = ? WHERE id = ?');
  queue.forEach((q, idx) => {
    updatePos.run(idx, q.id);
  });

  return true;
}

export function clearQueue(): boolean {
  const queuedItems = db.prepare("SELECT * FROM queue WHERE status = 'queued'").all() as any[];
  
  const insertHistory = db.prepare(`
    INSERT INTO request_history (id, youtube_id, title, channel, thumbnail, duration, requester_name, requester_device_id, status, created_at, played_at, shoutout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'removed', ?, ?, ?)
  `);

  const removedAt = new Date().toISOString();
  for (const item of queuedItems) {
    insertHistory.run(
      randomUUID(),
      item.youtube_id,
      item.title,
      item.channel,
      item.thumbnail,
      item.duration || 0,
      item.requester_name,
      item.requester_device_id,
      item.created_at,
      removedAt,
      item.shoutout || null
    );
  }

  db.prepare("UPDATE queue SET status = 'removed' WHERE status = 'queued'").run();
  return true;
}

export function playNextQueueItem(id: string): QueueItem[] {
  const queue = getQueue();
  const targetIndex = queue.findIndex((q) => q.id === id);
  if (targetIndex <= 0) return queue;

  const [targetItem] = queue.splice(targetIndex, 1);
  queue.unshift(targetItem);

  const updatePos = db.prepare('UPDATE queue SET position = ? WHERE id = ?');
  queue.forEach((q, idx) => {
    updatePos.run(idx, q.id);
  });

  return getQueue();
}

export function reorderQueue(orderedIds: string[]): QueueItem[] {
  const updatePos = db.prepare('UPDATE queue SET position = ? WHERE id = ?');
  
  orderedIds.forEach((id, index) => {
    updatePos.run(index, id);
  });

  return getQueue();
}

export function markQueueItemPlayed(id: string): void {
  const item = db.prepare('SELECT * FROM queue WHERE id = ?').get(id) as any;
  if (!item) return;

  // If already marked as played, avoid duplicate processing
  if (item.status === 'played') return;

  const now = new Date().toISOString();
  db.prepare("UPDATE queue SET status = 'played', played_at = ? WHERE id = ?").run(now, id);

  // Check if this queue item is already recorded in request_history
  const existing = db.prepare('SELECT id FROM request_history WHERE id = ?').get(id);
  if (existing) return;

  // Record into request_history using item's unique id
  db.prepare(`
    INSERT INTO request_history (id, youtube_id, title, channel, thumbnail, duration, requester_name, requester_device_id, status, created_at, played_at, shoutout)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'played', ?, ?, ?)
  `).run(
    item.id,
    item.youtube_id,
    item.title,
    item.channel,
    item.thumbnail,
    item.duration || 0,
    item.requester_name,
    item.requester_device_id,
    item.created_at,
    now,
    item.shoutout || null
  );
}

export function getRequestHistory(limit = 1000, options?: { includeDeviceId?: boolean }): RequestHistoryItem[] {
  const query = limit > 0
    ? `SELECT id, youtube_id as youtubeId, title, channel, thumbnail, duration,
              requester_name as requesterName, requester_device_id as requesterDeviceId,
              status, created_at as createdAt, played_at as playedAt, shoutout
       FROM request_history
       ORDER BY played_at DESC
       LIMIT ?`
    : `SELECT id, youtube_id as youtubeId, title, channel, thumbnail, duration,
              requester_name as requesterName, requester_device_id as requesterDeviceId,
              status, created_at as createdAt, played_at as playedAt, shoutout
       FROM request_history
       ORDER BY played_at DESC`;

  const rows = (limit > 0 ? db.prepare(query).all(limit) : db.prepare(query).all()) as any[];

  return rows.map((r) => ({
    id: r.id,
    youtubeId: r.youtubeId,
    title: r.title,
    channel: r.channel,
    thumbnail: r.thumbnail,
    duration: r.duration || 0,
    requesterName: r.requesterName || 'Guest',
    ...(options?.includeDeviceId ? { requesterDeviceId: r.requesterDeviceId } : {}),
    status: r.status,
    createdAt: r.createdAt,
    playedAt: r.playedAt,
    shoutout: r.shoutout || null,
  }));
}
