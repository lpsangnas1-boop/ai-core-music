import type { Request, Response, NextFunction } from 'express';
import { config } from '../config.js';

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pinHeader = req.headers['x-admin-pin'];
  const pinQuery = req.query.adminPin;
  const pinBody = req.body?.adminPin;

  const providedPin = pinHeader || pinQuery || pinBody;

  if (!providedPin || providedPin !== config.adminPin) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Admin PIN',
    });
    return;
  }

  next();
}
