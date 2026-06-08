'use strict';

/**
 * Global error handler middleware.
 * Must have 4 parameters to be recognised by Express as an error handler.
 */
function errorHandler(err, req, res, next) {
  // Already responded
  if (res.headersSent) {
    return next(err);
  }

  // Default values
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let code = err.code || null;

  // Joi / validation errors
  if (err.isValidation || err.name === 'ValidationError') {
    statusCode = 422;
    message = err.message;
    code = 'VALIDATION_ERROR';
  }

  // Firebase Auth errors
  if (err.code && String(err.code).startsWith('auth/')) {
    statusCode = 401;
    code = err.code;
  }

  // Firestore / Firebase errors
  if (err.code && String(err.code).startsWith('firestore/')) {
    statusCode = 500;
    message = 'Database error';
    code = err.code;
  }

  // Paystack errors
  if (err.paystackData) {
    statusCode = err.statusCode || 402;
    code = 'PAYSTACK_ERROR';
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 413;
    message = 'File too large. Maximum size is 5MB.';
    code = 'FILE_TOO_LARGE';
  }

  // Not found
  if (err.name === 'NotFoundError') {
    statusCode = 404;
  }

  // Log error
  const isProduction = process.env.NODE_ENV === 'production';
  if (statusCode >= 500) {
    console.error('[Error Handler]', {
      statusCode,
      message,
      code,
      path: req.path,
      method: req.method,
      uid: req.uid || 'anonymous',
      stack: isProduction ? undefined : err.stack,
    });
  } else if (process.env.NODE_ENV === 'development') {
    console.warn('[Error Handler]', { statusCode, message, path: req.path });
  }

  const response = {
    success: false,
    message,
    ...(code && { code }),
    ...(err.isValidation && err.details && {
      details: err.details.map((d) => ({ field: d.context?.key, message: d.message })),
    }),
  };

  // Include stack in development
  if (!isProduction && statusCode >= 500) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
}

/**
 * 404 handler — must be registered after all routes
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Factory to create a typed error
 */
function createError(message, statusCode = 500, code = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (code) err.code = code;
  return err;
}

module.exports = { errorHandler, notFoundHandler, createError };
