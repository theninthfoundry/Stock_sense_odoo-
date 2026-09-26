import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database';
import { config } from '../config';
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError
} from '../utils/errors';
import { User, UserRole } from '../types';

export class AuthService {
  public static async signup(params: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    warehouse_id?: string;
  }) {
    const { name, email, password, role = 'inventory_manager', warehouse_id } = params;

    if (!name || name.trim().length === 0) {
      throw new ValidationError('Name is required', 'name');
    }
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required', 'email');
    }
    if (!password || password.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long', 'password');
    }

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      throw new ConflictError('A user with this email address already exists', 'email');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, warehouse_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(userId, name.trim(), email.toLowerCase().trim(), passwordHash, role, warehouse_id || null);

    const user = db.prepare('SELECT id, name, email, role, warehouse_id, created_at FROM users WHERE id = ?').get(userId) as Omit<User, 'password_hash'>;

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any
    });

    return { user, token };
  }

  public static async login(params: { email: string; password: string }) {
    const { email, password } = params;
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim()) as User | undefined;
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn as any
    });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token };
  }

  public static async requestOtp(email: string) {
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required', 'email');
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (!user) {
      throw new NotFoundError('User account not found for this email address', 'email');
    }

    // Rate-limit rule: max 3 requests / 15 min per account
    const recentRequests = db
      .prepare(`
        SELECT COUNT(*) as count FROM otp_requests
        WHERE email = ? AND created_at > datetime('now', '-15 minutes')
      `)
      .get(normalizedEmail) as { count: number };

    if (recentRequests.count >= 3) {
      throw new ValidationError('Maximum OTP requests exceeded (limit: 3 per 15 minutes). Please wait before retrying', 'email');
    }

    // Generate cryptographically secure 6-digit OTP
    const otpCode = Math.floor(100000 + crypto.randomInt(900000)).toString();
    const codeHash = await bcrypt.hash(otpCode, 8);
    const otpId = crypto.randomUUID();

    // 5-minute expiry
    db.prepare(`
      INSERT INTO otp_requests (id, email, code_hash, expires_at, used, created_at)
      VALUES (?, ?, ?, datetime('now', '+5 minutes'), 0, datetime('now'))
    `).run(otpId, normalizedEmail, codeHash);

    // Return the otpCode in response for testing/development environments
    return {
      message: 'OTP has been generated and sent (valid for 5 minutes)',
      otpCode: config.isProduction ? undefined : otpCode
    };
  }

  public static async resetPassword(params: { email: string; otp: string; newPassword: string }) {
    const { email, otp, newPassword } = params;

    if (!email || !otp || !newPassword) {
      throw new ValidationError('Email, OTP code, and new password are required');
    }

    if (newPassword.length < 6) {
      throw new ValidationError('Password must be at least 6 characters long', 'newPassword');
    }

    const db = getDb();
    const normalizedEmail = email.toLowerCase().trim();

    // Find latest valid, non-expired, unused OTP request
    const pendingOtps = db
      .prepare(`
        SELECT id, code_hash, expires_at FROM otp_requests
        WHERE email = ? AND used = 0 AND expires_at > datetime('now')
        ORDER BY created_at DESC LIMIT 5
      `)
      .all(normalizedEmail) as Array<{ id: string; code_hash: string; expires_at: string }>;

    if (pendingOtps.length === 0) {
      throw new ValidationError('No active or valid OTP found. Please request a new one', 'otp');
    }

    let matchedOtpId: string | null = null;
    for (const record of pendingOtps) {
      const isMatch = await bcrypt.compare(otp.trim(), record.code_hash);
      if (isMatch) {
        matchedOtpId = record.id;
        break;
      }
    }

    if (!matchedOtpId) {
      throw new ValidationError('Invalid or expired OTP code', 'otp');
    }

    // Mark as used (single use)
    db.prepare('UPDATE otp_requests SET used = 1 WHERE id = ?').run(matchedOtpId);

    // Update password
    const newHash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(newHash, normalizedEmail);

    return { message: 'Password has been successfully updated. You can now log in.' };
  }
}
