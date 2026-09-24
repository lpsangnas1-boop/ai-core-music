import { Router, Request, Response } from 'express';
import { fetchYouTubeMetadata, extractYouTubeId } from '../services/metadataService.js';
import { requestClientIp } from '../middleware/authMiddleware.js';
import { createRateLimiter } from '../security.js';

const metadataLimiter = createRateLimiter(60_000, 60);

export const metadataRouter = Router();

// Public: Fetch preview metadata for YouTube URL
metadataRouter.get('/', async (req: Request, res: Response) => {
  try {
    const url = typeof req.query.url === 'string' ? req.query.url : '';

    if (!url) {
      res.status(400).json({ success: false, error: 'URL query parameter is required' });
      return;
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube URL or Video ID' });
      return;
    }

    const limit = metadataLimiter.hit(requestClientIp(req));
    if (!limit.allowed) {
      res.status(429).json({ success: false, error: `Thao tác quá nhanh, thử lại sau ${limit.retryAfterSec}s` });
      return;
    }

    const metadata = await fetchYouTubeMetadata(videoId);

    res.json({
      success: true,
      data: metadata,
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to fetch YouTube metadata',
    });
  }
});
