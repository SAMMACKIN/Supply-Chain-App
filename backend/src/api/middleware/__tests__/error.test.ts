import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { errorHandler } from '../error';

// Mock console.error
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    mockRequest = {};
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnThis();
    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('ZodError handling', () => {
    it('should handle Zod validation errors with field details', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          path: ['password'],
          message: 'String must contain at least 8 character(s)',
        },
      ]);

      errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: {
          email: ['Expected string, received number'],
          password: ['String must contain at least 8 character(s)'],
        },
      });
      expect(console.error).toHaveBeenCalledWith('Error:', zodError);
    });

    it('should handle empty Zod errors', () => {
      const zodError = new ZodError([]);

      errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: {},
      });
    });
  });

  describe('Prisma error handling', () => {
    it('should handle P2002 unique constraint violation', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        }
      );

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'A record with this value already exists',
        code: 'P2002',
      });
    });

    it('should handle P2025 record not found', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0',
        }
      );

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Record not found',
        code: 'P2025',
      });
    });

    it('should handle P2003 foreign key constraint violation', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field',
        {
          code: 'P2003',
          clientVersion: '4.0.0',
        }
      );

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid reference: related record not found',
        code: 'P2003',
      });
    });

    it('should handle unknown Prisma errors as generic errors', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unknown error occurred',
        {
          code: 'P9999', // Unknown code
          clientVersion: '4.0.0',
        }
      );

      errorHandler(prismaError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Unknown error occurred',
      });
    });
  });

  describe('Generic error handling', () => {
    it('should handle generic Error instances', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Something went wrong',
      });
      expect(console.error).toHaveBeenCalledWith('Error:', error);
    });

    it('should handle errors without message property', () => {
      const error = { name: 'CustomError' } as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle string errors', () => {
      const error = 'String error message' as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle null errors', () => {
      const error = null as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });

    it('should handle undefined errors', () => {
      const error = undefined as any;

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
      });
    });
  });

  describe('Complex error scenarios', () => {
    it('should handle nested Zod errors', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'object',
          received: 'string',
          path: ['user', 'profile'],
          message: 'Expected object, received string',
        },
        {
          code: 'invalid_type',
          expected: 'number',
          received: 'string',
          path: ['user', 'profile', 'age'],
          message: 'Expected number, received string',
        },
      ]);

      errorHandler(zodError, mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        error: 'Validation failed',
        details: expect.any(Object),
      });
    });

    it('should not call next() function', () => {
      const error = new Error('Test error');

      errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});