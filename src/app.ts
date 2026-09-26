import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { receiptsRouter } from './routes/receipts';
import { deliveriesRouter } from './routes/deliveries';
import { transfersRouter } from './routes/transfers';
import { adjustmentsRouter } from './routes/adjustments';
import { dashboardRouter } from './routes/dashboard';
import { warehousesRouter } from './routes/warehouses';
import { locationsRouter } from './routes/locations';
import { categoriesRouter } from './routes/categories';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();

  // Explicit CORS - never wildcarded per contract
  const allowedOrigins = [
    config.allowedOrigin,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key']
  }));

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Root / Health check
  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // Mount API v1 router according to frozen contract
  const apiV1 = express.Router();
  apiV1.use('/auth', authRouter);
  apiV1.use('/products', productsRouter);
  apiV1.use('/receipts', receiptsRouter);
  apiV1.use('/deliveries', deliveriesRouter);
  apiV1.use('/transfers', transfersRouter);
  apiV1.use('/adjustments', adjustmentsRouter);
  apiV1.use('/dashboard', dashboardRouter);
  apiV1.use('/warehouses', warehousesRouter);
  apiV1.use('/locations', locationsRouter);
  apiV1.use('/categories', categoriesRouter);

  app.use('/api/v1', apiV1);

  // Serve static frontend build if it exists (for single-unit production deployment)
  const candidatePaths = [
    path.resolve(process.cwd(), 'frontend/dist'),
    path.resolve(__dirname, '../frontend/dist'),
    path.resolve(__dirname, '../../frontend/dist'),
    path.resolve(__dirname, '../public')
  ];

  let staticRoot = '';
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      staticRoot = p;
      break;
    }
  }

  if (staticRoot) {
    app.use(express.static(staticRoot));
  }

  // 404 for unmatched API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: 'The requested API endpoint was not found'
        }
      });
      return;
    }

    if (staticRoot) {
      res.sendFile(path.join(staticRoot, 'index.html'));
      return;
    }

    next();
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
