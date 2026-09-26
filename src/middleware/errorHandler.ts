import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.field ? { field: err.field } : {})
      }
    });
    return;
  }

  // Handle SQLite specific constraint errors
  const errMessage = err.message || '';
  if (errMessage.includes('UNIQUE constraint failed')) {
    let field = 'unknown';
    if (errMessage.includes('products.sku')) field = 'sku';
    else if (errMessage.includes('users.email')) field = 'email';
    else if (errMessage.includes('warehouses.code')) field = 'code';
    else if (errMessage.includes('locations.warehouse_id, locations.code')) field = 'code';

    res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message: `A record with this ${field} already exists`,
        field
      }
    });
    return;
  }

  if (errMessage.includes('CHECK constraint failed')) {
    res.status(400).json({
      error: {
        code: 'CONSTRAINT_VIOLATION',
        message: 'Invalid data violates integrity constraints'
      }
    });
    return;
  }

  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred'
    }
  });
}
