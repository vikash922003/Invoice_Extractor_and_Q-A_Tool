import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('[Error Logger]', {
    path: req.path,
    method: req.method,
    message: err.message,
    name: err.name
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error_code: 'VALIDATION_ERROR',
      message: 'Request payload validation failed',
      details: err.issues
    });
  }

  if (err instanceof multer.MulterError || (err.message && err.message.includes('Unsupported file type'))) {
    let message = err.message;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Uploaded file exceeds the maximum allowed file size of 10MB';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Maximum of 20 files can be uploaded per batch';
    }
    return res.status(400).json({
      success: false,
      error_code: 'FILE_UPLOAD_ERROR',
      message
    });
  }

  const statusCode = err.statusCode || (err.message && err.message.includes('Unsupported') ? 400 : 500);
  return res.status(statusCode).json({
    success: false,
    error_code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'An unexpected internal error occurred'
  });
}
