import { Router, Request, Response } from 'express';
import { config } from '../config.js';

export const authRouter = Router();

authRouter.post('/login', (req: Request, res: Response) => {
  const { pin } = req.body;

  if (pin && pin.trim() === config.adminPin) {
    res.json({
      success: true,
      message: 'Admin authenticated successfully',
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid Admin PIN',
    });
  }
});

authRouter.get('/verify', (req: Request, res: Response) => {
  const pinHeader = req.headers['x-admin-pin'];
  if (pinHeader && pinHeader === config.adminPin) {
    res.json({ success: true, isAdmin: true });
  } else {
    res.json({ success: false, isAdmin: false });
  }
});
