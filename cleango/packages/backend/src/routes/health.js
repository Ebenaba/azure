'use strict';

const express = require('express');

const router = express.Router();

/**
 * GET /health
 * Health check endpoint used by Docker HEALTHCHECK and load balancers.
 * Intentionally placed before auth middleware.
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
