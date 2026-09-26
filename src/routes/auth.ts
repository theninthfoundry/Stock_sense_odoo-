import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { authenticate } from '../middleware/auth';
import { authLoginLimiter, otpLimiter } from '../middleware/rateLimit';

export const authRouter = Router();

authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', authLoginLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/request', otpLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.requestOtp(req.body.email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.post('/otp/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AuthService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', authenticate, (req: Request, res: Response) => {
  res.status(200).json({ user: req.user });
});
