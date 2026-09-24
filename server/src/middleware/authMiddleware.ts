import type { Request, Response, NextFunction } from 'express';
import { checkAdminPin, getClientIp } from '../security.js';

export function requestClientIp(req: Request): string {
  return getClientIp(req.socket.remoteAddress, req.headers);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const pinHeader = req.headers['x-admin-pin'];
  const providedPin = typeof pinHeader === 'string' ? pinHeader : req.body?.adminPin;

  const result = checkAdminPin(providedPin, requestClientIp(req));
  if (!result.ok) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  next();
}
