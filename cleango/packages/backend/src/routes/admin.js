'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue, Timestamp } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const {
  BOOKING_STATUS,
  WORKER_STATUS,
  WORKER_AVAILABILITY,
  PLATFORM,
} = require('../utils/constants');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const { getTodayRange } = require('../utils/helpers');
const workerAssignmentService = require('../services/workerAssignment');
const notificationsService = require('../services/notifications');

/**
 * GET /admin/stats
 * Dashboard overview: bookings today, revenue, active workers, pending vettings.
 */
router.get('/stats', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { start, end } = getTodayRange();
    const startTs = Timestamp.fromDate(start);
    const endTs = Timestamp.fromDate(end);

    const [
      bookingsTodaySnap,
      activeWorkersSnap,
      pendingVettingSnap,
      revenueSnap,
      totalBookingsSnap,
    ] = await Promise.all([
      db.collection(COLLECTIONS.BOOKINGS)
        .where('createdAt', '>=', startTs)
        .where('createdAt', '<=', endTs)
        .count()
        .get(),

      db.collection(COLLECTIONS.WORKERS)
        .where('status', '==', WORKER_STATUS.APPROVED)
        .where('isActive', '==', true)
        .count()
        .get(),

      db.collection(COLLECTIONS.WORKERS)
        .where('status', 'in', [WORKER_STATUS.PENDING_VETTING, WORKER_STATUS.UNDER_REVIEW])
        .count()
        .get(),

      db.collection(COLLECTIONS.PAYMENTS)
        .where('status', '==', 'success')
        .where('createdAt', '>=', startTs)
        .where('createdAt', '<=', endTs)
        .get(),

      db.collection(COLLECTIONS.BOOKINGS).count().get(),
    ]);

    const todayRevenue = revenueSnap.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    // Workers currently on a job
    const busyWorkersSnap = await db
      .collection(COLLECTIONS.WORKERS)
      .where('availability', '==', WORKER_AVAILABILITY.BUSY)
      .count()
      .get();

    return res.json({
      success: true,
      data: {
        bookingsToday: bookingsTodaySnap.data().count,
        totalBookings: totalBookingsSnap.data().count,
        revenueToday: todayRevenue,
        activeWorkers: activeWorkersSnap.data().count,
        busyWorkers: busyWorkersSnap.data().count,
        pendingVettings: pendingVettingSnap.data().count,
        generatedAt: new Date().toISOString(),
      },
      message: 'Dashboard stats retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/bookings
 * Admin: all bookings with optional filters.
 */
router.get('/bookings', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { status, serviceType, zone, date, workerId, page = 1, limit = 20 } = req.query;

    let query = db.collection(COLLECTIONS.BOOKINGS).orderBy('createdAt', 'desc');

    if (status) query = query.where('status', '==', status);
    if (serviceType) query = query.where('serviceType', '==', serviceType);
    if (workerId) query = query.where('workerId', '==', workerId);
    if (date) query = query.where('scheduledDate', '==', date);

    const snapshot = await query.limit(parseInt(limit)).get();
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      data: { bookings, count: bookings.length, page: parseInt(page) },
      message: 'All bookings retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /admin/assign
 * Admin: manually assign a worker to a booking.
 */
router.post('/assign', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { bookingId, workerId, reason } = validate(schemas.manualAssign, req.body);

    const result = await workerAssignmentService.manuallyAssignWorker(bookingId, workerId, req.uid);

    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorId: req.uid,
      actorRole: req.user.role,
      action: 'booking.worker_manually_assigned',
      targetId: bookingId,
      targetCollection: COLLECTIONS.BOOKINGS,
      after: { workerId, status: result.status },
      note: reason || '',
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: result,
      message: `Worker ${result.workerName} manually assigned to booking.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/workers/performance
 * Admin: worker performance metrics — ratings, completion rates, earnings.
 */
router.get('/workers/performance', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { limit = 50, sortBy = 'rating', order = 'desc' } = req.query;

    const snapshot = await db
      .collection(COLLECTIONS.WORKERS)
      .where('status', '==', WORKER_STATUS.APPROVED)
      .orderBy(sortBy === 'earnings' ? 'totalEarnings' : sortBy === 'jobs' ? 'totalJobsCompleted' : 'rating', order === 'asc' ? 'asc' : 'desc')
      .limit(parseInt(limit))
      .get();

    const workers = snapshot.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: `${d.firstName} ${d.lastName}`,
        phone: d.phone,
        assignedZones: d.assignedZones || [],
        serviceTypes: d.serviceTypes || [],
        rating: d.rating || 0,
        totalReviews: d.totalReviews || 0,
        totalJobsCompleted: d.totalJobsCompleted || 0,
        totalEarnings: d.totalEarnings || 0,
        availability: d.availability,
        status: d.status,
        commissionRate: d.commissionRate || PLATFORM.COMMISSION_PERCENT,
        createdAt: d.createdAt,
      };
    });

    return res.json({
      success: true,
      data: { workers, count: workers.length },
      message: 'Worker performance data retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /admin/zones/coverage
 * Admin: zone statistics — worker counts, booking volumes.
 */
router.get('/zones/coverage', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const zonesSnap = await db.collection(COLLECTIONS.ZONES).where('isActive', '==', true).get();

    const zoneStats = await Promise.all(
      zonesSnap.docs.map(async (doc) => {
        const zone = { id: doc.id, ...doc.data() };

        const [workerCount, bookingCount] = await Promise.all([
          db.collection(COLLECTIONS.WORKERS)
            .where('assignedZones', 'array-contains', zone.key)
            .where('status', '==', WORKER_STATUS.APPROVED)
            .count()
            .get(),
          db.collection(COLLECTIONS.BOOKINGS)
            .where('address.zone', '==', zone.key)
            .count()
            .get(),
        ]);

        return {
          key: zone.key,
          name: zone.name,
          center: zone.center,
          radiusKm: zone.radiusKm,
          isServiceable: zone.isServiceable,
          approvedWorkers: workerCount.data().count,
          totalBookings: bookingCount.data().count,
        };
      })
    );

    return res.json({
      success: true,
      data: { zones: zoneStats, count: zoneStats.length },
      message: 'Zone coverage data retrieved',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
