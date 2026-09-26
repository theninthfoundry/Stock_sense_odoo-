import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = 'Too many requests, please try again later' } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const route = req.baseUrl + req.path;
    const key = `${ip}:${route}`;
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetAt <= now) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `${message}. Retry in ${retryAfterSec}s`
        }
      });
      return;
    }

    entry.count += 1;
    next();
  };
}

// 10 login attempts per minute per IP
export const authLoginLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many login attempts'
});

// 5 OTP requests per minute per IP
export const otpLimiter = rateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many OTP requests'
});
