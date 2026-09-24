import { Router, Request, Response } from 'express';
import { getRequestHistory } from '../services/queueService.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const historyRouter = Router();

// Admin: Get request history log
historyRouter.get('/', requireAdmin, (req: Request, res: Response) => {
  const limitParam = parseInt(String(req.query.limit ?? '1000'), 10);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : 1000;
  const history = getRequestHistory(limit, { includeDeviceId: true });

  res.json({
    success: true,
    data: history,
  });
});
