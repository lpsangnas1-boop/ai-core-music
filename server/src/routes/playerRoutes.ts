import { Router, Request, Response } from 'express';
import { playbackService } from '../services/playbackService.js';
import { requireAdmin } from '../middleware/authMiddleware.js';
import { fetchYouTubeMetadata } from '../services/metadataService.js';
import { deviceKey } from '../security.js';

export const playerRouter = Router();

// Public: Get current player state
playerRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: playbackService.getState(),
  });
});

// Admin: Start Jukebox (user interaction requirement)
playerRouter.post('/start', requireAdmin, (_req: Request, res: Response) => {
  const state = playbackService.startJukebox();
  res.json({ success: true, data: state });
});

// Admin: Play
playerRouter.post('/play', requireAdmin, (_req: Request, res: Response) => {
  const state = playbackService.play();
  res.json({ success: true, data: state });
});

// Admin: Pause
playerRouter.post('/pause', requireAdmin, (_req: Request, res: Response) => {
  const state = playbackService.pause();
  res.json({ success: true, data: state });
});

// Admin: Next / Skip song (guests use vote-skip)
// Anyone can skip with one click. Skips closer than 3s apart are ignored so a double click
// (or a script) cannot skip several songs at once and drain the queue.
const SKIP_COOLDOWN_MS = 3000;
let lastSkipAt = 0;

playerRouter.post('/next', (_req: Request, res: Response) => {
  const now = Date.now();
  if (now - lastSkipAt < SKIP_COOLDOWN_MS) {
    res.status(429).json({ success: false, error: 'Vừa chuyển bài xong, đợi vài giây rồi bấm lại nhé!' });
    return;
  }
  lastSkipAt = now;
  const state = playbackService.next();
  res.json({ success: true, data: state });
});

// Public: Get current vote skip state
playerRouter.get('/vote-skip', (req: Request, res: Response) => {
  const deviceId = typeof req.query.deviceId === 'string' ? req.query.deviceId : '';
  const voteState = playbackService.getVoteSkipState();
  res.json({
    success: true,
    data: {
      ...voteState,
      userVoted: deviceId ? voteState.voters.includes(deviceKey(deviceId)) : false,
    },
  });
});

// Public: Vote to skip current song
playerRouter.post('/vote-skip', (req: Request, res: Response) => {
  const deviceId = req.body?.deviceId;
  if (typeof deviceId !== 'string' || !deviceId || deviceId.length > 100) {
    res.status(400).json({ success: false, error: 'deviceId is required' });
    return;
  }
  const result = playbackService.voteSkip(deviceId);
  res.json({
    success: true,
    data: {
      ...result.voteState,
      skipped: result.skipped,
      userVoted: result.voteState.voters.includes(deviceKey(deviceId)),
    },
  });
});

// Admin: Previous
playerRouter.post('/previous', requireAdmin, (_req: Request, res: Response) => {
  const state = playbackService.previous();
  res.json({ success: true, data: state });
});

// Admin: Seek
playerRouter.post('/seek', requireAdmin, (req: Request, res: Response) => {
  const time = req.body?.time;
  if (typeof time !== 'number' || !Number.isFinite(time) || time < 0) {
    res.status(400).json({ success: false, error: 'Invalid time value' });
    return;
  }
  const state = playbackService.seek(time);
  res.json({ success: true, data: state });
});

// Admin: Volume
playerRouter.post('/volume', requireAdmin, (req: Request, res: Response) => {
  const { volume, isMuted } = req.body;
  if (typeof volume === 'number') {
    playbackService.setVolume(volume);
  }
  if (typeof isMuted === 'boolean') {
    playbackService.setMuted(isMuted);
  }
  res.json({ success: true, data: playbackService.getState() });
});

// Admin: Play custom song immediately
playerRouter.post('/play-now', requireAdmin, async (req: Request, res: Response) => {
  try {
    const url = req.body?.url;
    if (typeof url !== 'string' || !url) {
      res.status(400).json({ success: false, error: 'URL is required' });
      return;
    }
    const metadata = await fetchYouTubeMetadata(url);
    const state = playbackService.playSongImmediately(metadata, false, 'DJ / Admin');
    res.json({ success: true, data: state });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to play song' });
  }
});
