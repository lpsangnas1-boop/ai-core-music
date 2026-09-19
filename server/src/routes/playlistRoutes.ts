import { Router, Request, Response } from 'express';
import {
  getDefaultPlaylist,
  addPlaylistSong,
  removePlaylistSong,
  togglePlaylistSong,
  reorderPlaylist,
} from '../services/playlistService.js';
import { fetchYouTubeMetadata } from '../services/metadataService.js';
import { broadcastPlaylistUpdate } from '../socket/socketHandler.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const playlistRouter = Router();

// Public: Get default playlist
playlistRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getDefaultPlaylist(),
  });
});

// Admin: Add song to default playlist
playlistRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, error: 'YouTube URL or Video ID is required' });
      return;
    }

    const metadata = await fetchYouTubeMetadata(url);
    const item = addPlaylistSong(metadata);
    broadcastPlaylistUpdate();

    res.status(201).json({
      success: true,
      data: item,
      message: 'Song added to default playlist',
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Failed to add song to default playlist',
    });
  }
});

// Admin: Remove song from default playlist
playlistRouter.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const removed = removePlaylistSong(id);

  if (removed) {
    broadcastPlaylistUpdate();
    res.json({ success: true, message: 'Song removed from default playlist' });
  } else {
    res.status(404).json({ success: false, error: 'Playlist item not found' });
  }
});

// Admin: Toggle song active status
playlistRouter.patch('/:id/toggle', requireAdmin, (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { isEnabled } = req.body;

  if (typeof isEnabled !== 'boolean') {
    res.status(400).json({ success: false, error: 'isEnabled must be a boolean' });
    return;
  }

  const success = togglePlaylistSong(id, isEnabled);
  if (success) {
    broadcastPlaylistUpdate();
    res.json({ success: true, message: 'Song updated' });
  } else {
    res.status(404).json({ success: false, error: 'Playlist item not found' });
  }
});

// Admin: Reorder default playlist
playlistRouter.patch('/reorder', requireAdmin, (req: Request, res: Response) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) {
    res.status(400).json({ success: false, error: 'orderedIds must be an array of IDs' });
    return;
  }

  const updatedPlaylist = reorderPlaylist(orderedIds);
  broadcastPlaylistUpdate();
  res.json({ success: true, data: updatedPlaylist });
});
