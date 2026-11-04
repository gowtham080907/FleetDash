import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { config } from '../config/env';

interface HttpErrorLike {
  status?: number;
  statusCode?: number;
  type?: string;
  message?: string;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handle JSON parse errors from express.json()
  if (
    err instanceof SyntaxError &&
    ('status' in err || 'statusCode' in err) &&
    (err as HttpErrorLike).status === 400
  ) {
    res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'Malformed JSON payload: request body could not be parsed',
        details: [],
      },
    });
    return;
  }

  // 2. Handle BodyParser payload limit exceeded
  const errorObj = err as HttpErrorLike;
  if (errorObj?.type === 'entity.too.large' || errorObj?.status === 413) {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: `Request payload exceeded body size limit (${config.JSON_BODY_LIMIT})`,
        details: [],
      },
    });
    return;
  }

  // 3. Handle AppError (operational, expected errors)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // 4. Handle unexpected server errors
  const standardError = err instanceof Error ? err : new Error(String(err));
  console.error('[UnhandledError]', standardError);

  const isProduction = config.NODE_ENV === 'production';
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected internal server error occurred'
        : standardError.message || 'An unexpected internal server error occurred',
      details: isProduction ? [] : [{ stack: standardError.stack }],
    },
  });
}
