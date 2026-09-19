import { Router, Request, Response } from 'express';
import { getNetworkInfo } from '../services/networkService.js';

export const networkRouter = Router();

// Public: Get server LAN address for QR code and client connection
networkRouter.get('/', (_req: Request, res: Response) => {
  const info = getNetworkInfo();
  res.json({
    success: true,
    data: info,
  });
});
