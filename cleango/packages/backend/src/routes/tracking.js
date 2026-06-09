'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { BOOKING_STATUS, WORKER_AVAILABILITY } = require('../utils/constants');
const { verifyToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const notificationsService = require('../services/notifications');

/**
 * POST /tracking/location
 * Worker: update GPS location. Called frequently from mobile app.
 */
router.post('/location', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const body = validate(schemas.updateLocation, req.body);
    const workerId = req.uid;

    // Only workers can post locations
    if (req.user?.role !== 'worker') {
      return res.status(403).json({ success: false, message: 'Only workers can update location.' });
    }

    const locationData = {
      workerId,
      bookingId: body.bookingId,
      lat: body.lat,
      lng: body.lng,
      accuracy: body.accuracy || null,
      heading: body.heading || null,
      speed: body.speed || null,
      timestamp: FieldValue.serverTimestamp(),
    };

    // Upsert worker location document (one per worker)
    await db.collection(COLLECTIONS.WORKER_LOCATIONS).doc(workerId).set(locationData, { merge: true });

    // Also update worker's last known location
    await db.collection(COLLECTIONS.WORKERS).doc(workerId).update({
      lastLocation: { lat: body.lat, lng: body.lng },
      lastLocationAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: { lat: body.lat, lng: body.lng, bookingId: body.bookingId },
      message: 'Location updated',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /tracking/:bookingId
 * Customer: get the assigned worker's current location for an active booking.
 */
router.get('/:bookingId', verifyToken, async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingDoc.data();
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const isCustomer = booking.customerId === req.uid;
    const isAssignedWorker = booking.workerId === req.uid;

    if (!isAdmin && !isCustomer && !isAssignedWorker) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!booking.workerId) {
      return res.status(404).json({ success: false, message: 'No worker assigned to this booking yet.' });
    }

    const activeStatuses = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.WORKER_EN_ROUTE,
      BOOKING_STATUS.IN_PROGRESS,
    ];

    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Tracking not available for booking with status: ${booking.status}`,
      });
    }

    const locationDoc = await db.collection(COLLECTIONS.WORKER_LOCATIONS).doc(booking.workerId).get();
    if (!locationDoc.exists) {
      return res.status(404).json({ success: false, message: 'Worker location not available yet.' });
    }

    const location = locationDoc.data();

    return res.json({
      success: true,
      data: {
        workerId: booking.workerId,
        workerName: booking.workerSnapshot
          ? `${booking.workerSnapshot.firstName} ${booking.workerSnapshot.lastName}`
          : null,
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
        heading: location.heading,
        speed: location.speed,
        lastUpdated: location.timestamp,
        bookingStatus: booking.status,
      },
      message: 'Worker location retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /tracking/status
 * Worker: update job status (en_route → in_progress → completed).
 */
router.post('/status', verifyToken, async (req, res, next) => {
  try {
    const body = validate(schemas.updateJobStatus, req.body);
    const workerId = req.uid;

    if (req.user?.role !== 'worker') {
      return res.status(403).json({ success: false, message: 'Only workers can update job status.' });
    }

    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(body.bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() };

    if (booking.workerId !== workerId) {
      return res.status(403).json({ success: false, message: 'You are not assigned to this booking.' });
    }

    // Validate status transitions
    const validTransitions = {
      [BOOKING_STATUS.CONFIRMED]: [BOOKING_STATUS.WORKER_EN_ROUTE],
      [BOOKING_STATUS.WORKER_EN_ROUTE]: [BOOKING_STATUS.IN_PROGRESS],
      [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_STATUS.COMPLETED],
    };

    const allowed = validTransitions[booking.status] || [];
    if (!allowed.includes(body.status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from '${booking.status}' to '${body.status}'.`,
      });
    }

    const updateData = {
      status: body.status,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (body.status === BOOKING_STATUS.IN_PROGRESS) {
      updateData.startedAt = FieldValue.serverTimestamp();
    }

    if (body.status === BOOKING_STATUS.COMPLETED) {
      updateData.completedAt = FieldValue.serverTimestamp();
      // Free worker availability
      await db.collection(COLLECTIONS.WORKERS).doc(workerId).update({
        availability: WORKER_AVAILABILITY.AVAILABLE,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await db.collection(COLLECTIONS.BOOKINGS).doc(body.bookingId).update(updateData);

    // Notify customer of status change
    try {
      const customerDoc = await db.collection(COLLECTIONS.USERS).doc(booking.customerId).get();
      if (customerDoc.exists) {
        const customer = { id: customerDoc.id, ...customerDoc.data() };

        if (body.status === BOOKING_STATUS.WORKER_EN_ROUTE) {
          await notificationsService.dispatch({
            userId: customer.id,
            type: 'worker_en_route',
            title: 'Worker On The Way',
            body: `Your cleaner is on the way! Booking: ${booking.bookingRef}.`,
            fcmToken: customer.fcmToken,
            phone: customer.phone,
            sendSMS: customer.notificationPreferences?.sms !== false,
            relatedId: booking.id,
            relatedType: 'booking',
          });
        } else if (body.status === BOOKING_STATUS.IN_PROGRESS) {
          await notificationsService.dispatch({
            userId: customer.id,
            type: 'job_started',
            title: 'Cleaning Started',
            body: `Your cleaning job (${booking.bookingRef}) has started.`,
            fcmToken: customer.fcmToken,
            phone: customer.phone,
            sendSMS: false,
            relatedId: booking.id,
            relatedType: 'booking',
          });
        } else if (body.status === BOOKING_STATUS.COMPLETED) {
          await notificationsService.notifyJobCompleted(customer, booking, booking.finalAmount);
        }
      }
    } catch (notifErr) {
      console.warn('[Tracking] Notification failed:', notifErr.message);
    }

    return res.json({
      success: true,
      data: { bookingId: body.bookingId, status: body.status },
      message: `Job status updated to '${body.status}'`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
