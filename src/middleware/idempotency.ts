import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/database';

export function handleIdempotency(req: Request, res: Response, next: NextFunction): void {
  const idempotencyKey = req.header('X-Idempotency-Key');
  if (!idempotencyKey) {
    return next();
  }

  req.idempotencyKey = idempotencyKey;
  const db = getDb();
  const userId = req.user?.id || 'anonymous';
  const endpoint = `${req.method} ${req.originalUrl || req.url}`;

  // Check if we already processed this exact key
  const existing = db
    .prepare('SELECT response_code, response_body FROM idempotency_logs WHERE idempotency_key = ? AND endpoint = ?')
    .get(idempotencyKey, endpoint) as { response_code: number; response_body: string } | undefined;

  if (existing) {
    try {
      const parsedBody = JSON.parse(existing.response_body);
      res.setHeader('X-Cache-Lookup', 'HIT');
      res.status(existing.response_code).json(parsedBody);
      return;
    } catch {
      res.status(existing.response_code).send(existing.response_body);
      return;
    }
  }

  // Intercept the response to store it in idempotency_logs
  const originalJson = res.json.bind(res);
  res.json = (body: any): Response => {
    // Only save successful or client responses (2xx / 4xx) to prevent caching 500 server crashes
    if (res.statusCode >= 200 && res.statusCode < 500) {
      try {
        db.prepare(
          "INSERT OR IGNORE INTO idempotency_logs (idempotency_key, endpoint, user_id, response_code, response_body, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
        ).run(idempotencyKey, endpoint, userId, res.statusCode, JSON.stringify(body));
      } catch (e) {
        console.error('Failed to save idempotency log:', e);
      }
    }
    return originalJson(body);
  };

  next();
}
