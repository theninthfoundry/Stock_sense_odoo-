import { Router, Request, Response } from 'express';
import { getDb } from '../db/database';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = db.prepare('SELECT 1 as healthy').get() as { healthy: number };

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: result.healthy === 1 ? 'connected' : 'unhealthy',
      version: '1.0.0'
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: err.message
    });
  }
});
