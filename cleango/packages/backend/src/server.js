'use strict';

require('dotenv').config();

const http = require('http');
const app = require('./app');

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

let isShuttingDown = false;

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async (err) => {
    if (err) {
      console.error('[Server] Error closing HTTP server:', err.message);
    } else {
      console.log('[Server] HTTP server closed.');
    }

    // Give in-flight requests a moment to complete
    try {
      // Attempt to close Firestore connection
      const { db } = require('./config/firebase');
      await db.terminate();
      console.log('[Server] Firestore connection closed.');
    } catch (e) {
      console.warn('[Server] Firestore terminate warning:', e.message);
    }

    // Stop cron jobs if running
    try {
      const { stopAllJobs } = require('./jobs/scheduledJobs');
      stopAllJobs();
      console.log('[Server] Scheduled jobs stopped.');
    } catch (e) {
      // Jobs module may not be running
    }

    console.log('[Server] Shutdown complete. Exiting.');
    process.exit(err ? 1 : 0);
  });

  // Force exit after 15 seconds
  setTimeout(() => {
    console.error('[Server] Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 15000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught exception:', err);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled rejection:', reason);
  // Don't exit on unhandled rejection in production — just log
  if (process.env.NODE_ENV !== 'production') {
    shutdown('unhandledRejection');
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`[Server] CleanGo API listening on http://${HOST}:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[Server] API base: http://${HOST}:${PORT}/api/v1`);

  // Start cron jobs after server is ready
  try {
    require('./jobs/scheduledJobs').startAllJobs();
    console.log('[Server] Scheduled jobs started.');
  } catch (err) {
    console.warn('[Server] Scheduled jobs failed to start:', err.message);
  }
});

module.exports = server;
