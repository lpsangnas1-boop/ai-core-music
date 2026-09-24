import { Router, Request, Response } from 'express';
import { checkAdminPin } from '../security.js';
import { requestClientIp } from '../middleware/authMiddleware.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const result = checkAdminPin(req.body?.pin, requestClientIp(req));

  if (result.ok) {
    res.json({ success: true, message: 'Admin authenticated successfully' });
  } else {
    res.status(result.status).json({
      success: false,
      error: result.status === 401 ? 'Mã PIN không chính xác' : result.error,
    });
  }
});

authRouter.get('/verify', (req: Request, res: Response) => {
  const result = checkAdminPin(req.headers['x-admin-pin'], requestClientIp(req));
  if (result.ok) {
    res.json({ success: true, isAdmin: true });
  } else {
    res.status(result.status).json({ success: false, isAdmin: false, error: result.error });
  }
});
