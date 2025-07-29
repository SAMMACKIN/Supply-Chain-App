import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
  code?: string;
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response<ErrorResponse>,
  next: NextFunction
) => {
  console.error('Error:', err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'A record with this value already exists',
        code: err.code,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Record not found',
        code: err.code,
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Invalid reference: related record not found',
        code: err.code,
      });
    }
  }

  // Generic errors
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
};