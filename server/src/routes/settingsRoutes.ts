import { Router, Request, Response } from 'express';
import { getSettings, updateSettings } from '../services/settingsService.js';
import { broadcastSettingsUpdate } from '../socket/socketHandler.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const settingsRouter = Router();

// Public: Get settings
settingsRouter.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: getSettings(),
  });
});

// Admin: Update settings
settingsRouter.patch('/', requireAdmin, (req: Request, res: Response) => {
  const updated = updateSettings(req.body);
  broadcastSettingsUpdate();

  res.json({
    success: true,
    data: updated,
    message: 'Settings updated successfully',
  });
});
