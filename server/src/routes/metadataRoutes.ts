import { Router, Request, Response } from 'express';
import { fetchYouTubeMetadata, extractYouTubeId } from '../services/metadataService.js';

export const metadataRouter = Router();

// Public: Fetch preview metadata for YouTube URL
metadataRouter.get('/', async (req: Request, res: Response) => {
  try {
    const url = req.query.url as string;

    if (!url) {
      res.status(400).json({ success: false, error: 'URL query parameter is required' });
      return;
    }

    const videoId = extractYouTubeId(url);
    if (!videoId) {
      res.status(400).json({ success: false, error: 'Invalid YouTube URL or Video ID' });
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
