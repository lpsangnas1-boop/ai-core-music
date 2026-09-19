import { Router, Request, Response } from 'express';
import { getRequestHistory } from '../services/queueService.js';
import { requireAdmin } from '../middleware/authMiddleware.js';

export const historyRouter = Router();

// Admin: Get request history log
historyRouter.get('/', requireAdmin, (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string || '1000', 10);
  const history = getRequestHistory(limit);

  res.json({
    success: true,
    data: history,
  });
});
