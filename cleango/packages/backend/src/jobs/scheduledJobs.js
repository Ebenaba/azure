'use strict';

const cron = require('node-cron');
const { db, FieldValue, Timestamp } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { WORKER_STATUS, PLATFORM } = require('../utils/constants');
const { addDays } = require('../utils/helpers');
const escrowService = require('../services/escrow');
const notificationsService = require('../services/notifications');

const registeredJobs = [];

/**
 * Wrap a job function with error handling and logging.
 */
function safeJob(name, fn) {
  return async () => {
    console.log(`[Job:${name}] Starting at ${new Date().toISOString()}`);
    try {
      const result = await fn();
      console.log(`[Job:${name}] Completed.`, result || '');
    } catch (err) {
      console.error(`[Job:${name}] Failed:`, err.message);
    }
  };
}

// ─── Job: Auto-release expired escrows ───────────────────────────────────────
// Runs every hour
async function autoReleaseEscrowsJob() {
  const result = await escrowService.autoReleaseExpiredEscrows();
  return result;
}

// ─── Job: Subscription renewal check ─────────────────────────────────────────
// Daily at 08:00 — find subscriptions expiring in 1/7/30 days and notify
async function subscriptionRenewalCheck() {
  const now = new Date();
  const checkWindows = [1, 7, 30];
  let notified = 0;

  for (const daysLeft of checkWindows) {
    const targetDate = addDays(now, daysLeft);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await db
      .collection(COLLECTIONS.SUBSCRIPTIONS)
      .where('status', '==', 'active')
      .where('expiresAt', '>=', Timestamp.fromDate(startOfDay))
      .where('expiresAt', '<=', Timestamp.fromDate(endOfDay))
      .get();

    for (const doc of snapshot.docs) {
      const sub = doc.data();
      try {
        const userDoc = await db.collection(COLLECTIONS.USERS).doc(sub.userId).get();
        if (userDoc.exists) {
          const user = { id: userDoc.id, ...userDoc.data() };
          await notificationsService.notifySubscriptionExpiring(user, daysLeft);
          notified++;
        }
      } catch (err) {
        console.warn(`[Job:SubscriptionRenewal] Failed to notify user ${sub.userId}:`, err.message);
      }
    }
  }

  return { notified };
}

// ─── Job: Document expiry alerts ─────────────────────────────────────────────
// Daily at 08:00 — notify workers whose police report / NIN expires soon
async function documentExpiryAlerts() {
  const now = new Date();
  const alertDays = [30, 7, 1];
  let notified = 0;

  for (const daysLeft of alertDays) {
    const targetDate = addDays(now, daysLeft);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const snapshot = await db
      .collection(COLLECTIONS.WORKERS)
      .where('status', '==', WORKER_STATUS.APPROVED)
      .where('documents.policeReportExpiry', '>=', Timestamp.fromDate(startOfDay))
      .where('documents.policeReportExpiry', '<=', Timestamp.fromDate(endOfDay))
      .get();

    for (const doc of snapshot.docs) {
      const worker = { id: doc.id, ...doc.data() };
      try {
        await notificationsService.dispatch({
          userId: worker.id,
          type: 'document_expiring',
          title: 'Document Expiry Alert',
          body: `Your police clearance certificate expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Please renew to continue working.`,
          fcmToken: worker.fcmToken,
          phone: worker.phone,
          sendSMS: true,
        });
        notified++;
      } catch (err) {
        console.warn(`[Job:DocExpiry] Failed to notify worker ${worker.id}:`, err.message);
      }
    }
  }

  return { notified };
}

// ─── Job: Flag workers below minimum rating ───────────────────────────────────
// Daily — mark workers who fall below minimum acceptable rating
async function flagLowRatedWorkers() {
  const minRating = PLATFORM.MIN_RATING_TO_STAY_ACTIVE;
  let flagged = 0;

  const snapshot = await db
    .collection(COLLECTIONS.WORKERS)
    .where('status', '==', WORKER_STATUS.APPROVED)
    .where('totalReviews', '>=', 5) // Only flag after sufficient reviews
    .where('rating', '<', minRating)
    .get();

  const batch = db.batch();
  for (const doc of snapshot.docs) {
    const worker = doc.data();
    // Only flag if not already flagged
    if (!worker.isFlaggedLowRating) {
      batch.update(doc.ref, {
        isFlaggedLowRating: true,
        flaggedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Log audit entry
      db.collection(COLLECTIONS.AUDIT_LOGS).add({
        actorId: 'system',
        actorRole: 'system',
        action: 'worker.flagged_low_rating',
        targetId: doc.id,
        targetCollection: COLLECTIONS.WORKERS,
        after: { rating: worker.rating, isFlaggedLowRating: true },
        note: `Auto-flagged: rating ${worker.rating} is below minimum ${minRating}`,
        createdAt: FieldValue.serverTimestamp(),
      }).catch(() => {});

      // Notify worker
      notificationsService.dispatch({
        userId: doc.id,
        type: 'rating_warning',
        title: 'Rating Alert',
        body: `Your rating (${worker.rating}/5) has fallen below our minimum standard of ${minRating}/5. Please improve service quality to avoid suspension.`,
        fcmToken: worker.fcmToken,
        phone: worker.phone,
        sendSMS: true,
      }).catch(() => {});

      flagged++;
    }
  }

  if (flagged > 0) await batch.commit();
  return { flagged };
}

// ─── Job Registration & Lifecycle ────────────────────────────────────────────

function startAllJobs() {
  // Every hour: auto-release expired escrows
  const escrowJob = cron.schedule('0 * * * *', safeJob('AutoReleaseEscrows', autoReleaseEscrowsJob), {
    scheduled: true,
    timezone: 'Africa/Lagos',
  });
  registeredJobs.push(escrowJob);

  // Daily at 08:00 AM: subscription renewal check + document expiry alerts
  const dailyMorningJob = cron.schedule(
    '0 8 * * *',
    safeJob('DailyMorning', async () => {
      const subResult = await subscriptionRenewalCheck();
      const docResult = await documentExpiryAlerts();
      return { subscriptions: subResult, documents: docResult };
    }),
    { scheduled: true, timezone: 'Africa/Lagos' }
  );
  registeredJobs.push(dailyMorningJob);

  // Daily at 02:00 AM: flag low-rated workers
  const ratingJob = cron.schedule(
    '0 2 * * *',
    safeJob('FlagLowRatedWorkers', flagLowRatedWorkers),
    { scheduled: true, timezone: 'Africa/Lagos' }
  );
  registeredJobs.push(ratingJob);

  console.log(`[Jobs] ${registeredJobs.length} scheduled jobs registered.`);
}

function stopAllJobs() {
  registeredJobs.forEach((job) => {
    try {
      job.stop();
    } catch (e) {
      // ignore
    }
  });
  registeredJobs.length = 0;
  console.log('[Jobs] All scheduled jobs stopped.');
}

module.exports = {
  startAllJobs,
  stopAllJobs,
  // Export individual job runners for manual invocation / testing
  autoReleaseEscrowsJob,
  subscriptionRenewalCheck,
  documentExpiryAlerts,
  flagLowRatedWorkers,
};
