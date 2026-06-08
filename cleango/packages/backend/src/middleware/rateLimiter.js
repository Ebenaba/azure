'use strict';

const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

/**
 * Standard rate limiter for general API endpoints
 */
const generalLimiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1',
});

/**
 * Strict limiter for auth endpoints (prevent brute force)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please wait 15 minutes.',
    code: 'AUTH_RATE_LIMIT',
  },
});

/**
 * Very strict limiter for OTP/SMS endpoints
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many OTP requests. Please wait 1 hour.',
    code: 'OTP_RATE_LIMIT',
  },
});

/**
 * Payment endpoint limiter
 */
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many payment requests. Please slow down.',
    code: 'PAYMENT_RATE_LIMIT',
  },
});

/**
 * Admin endpoints — more permissive
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Admin rate limit exceeded.',
    code: 'ADMIN_RATE_LIMIT',
  },
});

/**
 * Upload endpoint limiter
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many file uploads. Please wait.',
    code: 'UPLOAD_RATE_LIMIT',
  },
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  paymentLimiter,
  adminLimiter,
  uploadLimiter,
};
