export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public field?: string;

  constructor(statusCode: number, code: string, message: string, field?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.field = field;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(400, 'VALIDATION_ERROR', message, field);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden: insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', field?: string) {
    super(404, 'NOT_FOUND', message, field);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, field?: string) {
    super(409, 'CONFLICT', message, field);
  }
}

export class InsufficientStockError extends AppError {
  constructor(availableQty: number, field: string = 'quantity') {
    super(400, 'INSUFFICIENT_STOCK', `Quantity exceeds available stock (${availableQty} on hand)`, field);
  }
}
