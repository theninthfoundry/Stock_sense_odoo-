import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'stocksense_super_secret_jwt_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'stocksense.db'),
  allowedOrigin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production'
};
