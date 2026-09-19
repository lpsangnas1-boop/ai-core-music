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
import { requireAdmin } from '../middleware/authMiddleware.js';
import { config } from '../config.js';

export const queueRouter = Router();

// Public: Search YouTube videos by keyword
queueRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  if (!query.trim()) {
    res.json({ success: true, data: [] });
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

// Public: Get song request history
queueRouter.get('/history', (req: Request, res: Response) => {
  const limitParam = req.query.limit !== undefined ? parseInt(req.query.limit as string, 10) : 1000;
  const limit = isNaN(limitParam) ? 1000 : limitParam;
  res.json({
    success: true,
    data: getRequestHistory(limit),
  });
});

// Public: Check request eligibility for a device
queueRouter.get('/can-request', (req: Request, res: Response) => {
  const deviceId = req.query.deviceId as string;
  const status = canDeviceRequest(deviceId || '');
  res.json({
    success: true,
    data: status,
  });
});

// Public / Admin: Submit a song request
queueRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { url, requesterName, deviceId, shoutout } = req.body;

    if (!url) {
      res.status(400).json({ success: false, error: 'YouTube URL or Video ID is required' });
      return;
    }

    const pinHeader = req.headers['x-admin-pin'] as string;
    const isAdmin = pinHeader === config.adminPin;

    // Fetch video metadata
    const metadata = await fetchYouTubeMetadata(url);

    const currentState = playbackService.getState();
    const currentYoutubeId = currentState.currentSong?.youtubeId;

    // Add to queue
    const { item, position } = addQueueItem(
      metadata,
      requesterName || 'Guest',
      deviceId || 'unknown',
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
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
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
