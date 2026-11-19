import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/appError';
import { env } from '../config/env';

interface MongoDuplicateKeyError extends Error {
  code?: number;
  keyValue?: Record<string, unknown>;
}

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Operational AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Malformed JSON payload
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    res.status(400).json({
      success: false,
      message: 'Invalid JSON payload in request body',
    });
    return;
  }

  // Mongoose invalid ObjectId / CastError
  if (err instanceof mongoose.Error.CastError) {
    res.status(400).json({
      success: false,
      message: `Invalid value for ${err.path}: ${err.value}`,
    });
    return;
  }

  // Mongoose schema ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
    return;
  }

  // MongoDB duplicate key error (E11000)
  const mongoErr = err as MongoDuplicateKeyError;
  if (mongoErr.code === 11000) {
    const duplicateFields = mongoErr.keyValue ? Object.keys(mongoErr.keyValue) : [];
    const fieldName = duplicateFields[0] || 'field';
    res.status(409).json({
      success: false,
      message: `A record with this ${fieldName} already exists`,
    });
    return;
  }

  // Unexpected / programming errors
  if (env.nodeEnv !== 'test') {
    console.error('Unhandled Error:', err);
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.nodeEnv === 'development' ? { stack: err.stack } : {}),
  });
};
