import { Router, Request, Response } from 'express';
import {
  getQueue,
  getRequestHistory,
  addQueueItem,
  removeQueueItem,
  clearQueue,
  playNextQueueItem,
  reorderQueue,
  canDeviceRequest,
} from '../services/queueService.js';
import { fetchYouTubeMetadata, searchYouTube } from '../services/metadataService.js';
import { playbackService } from '../services/playbackService.js';
import { broadcastQueueUpdate, broadcastNewRequest } from '../socket/socketHandler.js';
import { requireAdmin, requestClientIp } from '../middleware/authMiddleware.js';
import { checkAdminPin, createRateLimiter } from '../security.js';

// Searches scrape youtube.com; cap per client IP so one visitor cannot get the server blocked.
const searchLimiter = createRateLimiter(60_000, 60);

export const queueRouter = Router();

// Public: Search YouTube videos by keyword
queueRouter.get('/search', async (req: Request, res: Response) => {
  const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
  if (!query.trim()) {
    res.json({ success: true, data: [] });
    return;
  }
  const limit = searchLimiter.hit(requestClientIp(req));
  if (!limit.allowed) {
    res.status(429).json({ success: false, error: `Tìm kiếm quá nhanh, thử lại sau ${limit.retryAfterSec}s` });
    return;
  }
  const results = await searchYouTube(query);
  res.json({ success: true, data: results });
});

// Public: Get current queue
queueRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getQueue(),
  });
});

// Public: Get song request history (without device ids)
queueRouter.get('/history', (req: Request, res: Response) => {
  const limitParam = parseInt(String(req.query.limit ?? '1000'), 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 1000;
  res.json({
    success: true,
    data: getRequestHistory(limit),
  });
});

// Public: Check request eligibility for a device
queueRouter.get('/can-request', (req: Request, res: Response) => {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
  const status = canDeviceRequest(deviceId);
  res.json({
    success: true,
    data: status,
  });
});

// Public / Admin: Submit a song request
queueRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { url, requesterName, deviceId, shoutout } = req.body ?? {};

    if (typeof url !== 'string' || !url) {
      res.status(400).json({ success: false, error: 'YouTube URL or Video ID is required' });
      return;
    }

    // A PIN is optional here. A wrong/stale PIN (or a locked-out IP) never blocks ordering:
    // the request is handled as a normal guest and the client is told to drop the PIN.
    const pinHeader = req.headers['x-admin-pin'];
    let isAdmin = false;
    let adminPinRejected = false;
    if (typeof pinHeader === 'string' && pinHeader) {
      isAdmin = checkAdminPin(pinHeader, requestClientIp(req)).ok;
      adminPinRejected = !isAdmin;
    }

    // Fetch video metadata
    const metadata = await fetchYouTubeMetadata(url);

    const currentState = playbackService.getState();
    const currentYoutubeId = currentState.currentSong?.youtubeId;

    // Add to queue
    const { item, position } = addQueueItem(
      metadata,
      typeof requesterName === 'string' ? requesterName : 'Guest',
      typeof deviceId === 'string' && deviceId ? deviceId.slice(0, 100) : 'unknown',
      {
        isAdmin,
        currentPlayingYoutubeId: currentYoutubeId,
        shoutout: typeof shoutout === 'string' ? shoutout : undefined,
      }
    );

    // If player is completely idle with no song playing at all, start immediately
    if (!currentState.currentSong || currentState.status === 'idle') {
      playbackService.resolveNextSong();
    }

    // Realtime broadcasts
    broadcastQueueUpdate();
    broadcastNewRequest(item.title, item.requesterName, position);

    res.status(201).json({
      success: true,
      data: {
        item,
        position,
        message: `Song added! You're #${position} in the queue.`,
      },
      ...(adminPinRejected ? { adminPinRejected: true } : {}),
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to add song to queue',
    });
  }
});

// Admin: Remove a specific queue item
queueRouter.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const removed = removeQueueItem(id);

  if (removed) {
    broadcastQueueUpdate();
    res.json({ success: true, message: 'Song removed from queue' });
  } else {
    res.status(404).json({ success: false, error: 'Queue item not found' });
  }
});

// Admin: Play next (move to front of queue)
queueRouter.post('/:id/play-next', requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const updatedQueue = playNextQueueItem(id);
  broadcastQueueUpdate();
  res.json({ success: true, data: updatedQueue });
});

// Admin: Reorder queue
queueRouter.patch('/reorder', requireAdmin, (req: Request, res: Response) => {
  const orderedIds = req.body?.orderedIds;
  if (!Array.isArray(orderedIds) || !orderedIds.every((id) => typeof id === 'string')) {
    res.status(400).json({ success: false, error: 'orderedIds must be an array of IDs' });
    return;
  }
  const updatedQueue = reorderQueue(orderedIds);
  broadcastQueueUpdate();
  res.json({ success: true, data: updatedQueue });
});

// Admin: Clear entire queue
queueRouter.delete('/', requireAdmin, (_req: Request, res: Response) => {
  clearQueue();
  broadcastQueueUpdate();
  res.json({ success: true, message: 'Queue cleared' });
});
