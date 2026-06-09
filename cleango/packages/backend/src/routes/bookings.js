'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue, storage } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { BOOKING_STATUS, PAYMENT_STATUS, SERVICE_PRICING, PLATFORM } = require('../utils/constants');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const { generateBookingRef, calculateQuote } = require('../utils/helpers');
const prayerTimeService = require('../services/prayerTime');
const workerAssignmentService = require('../services/workerAssignment');
const notificationsService = require('../services/notifications');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
  },
});

/**
 * GET /bookings
 * Customer's booking history (or admin views all via /admin/bookings).
 */
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const uid = req.uid;

    let query = db
      .collection(COLLECTIONS.BOOKINGS)
      .where('customerId', '==', uid)
      .orderBy('createdAt', 'desc');

    if (status) query = query.where('status', '==', status);

    const snapshot = await query.limit(parseInt(limit)).get();
    const bookings = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      data: { bookings, count: bookings.length, page: parseInt(page) },
      message: 'Bookings retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /bookings
 * Create a new booking. Checks prayer times, calculates quote, attempts worker assignment.
 */
router.post('/', verifyToken, async (req, res, next) => {
  try {
    const body = validate(schemas.createBooking, req.body);
    const uid = req.uid;

    // Ensure user has a complete profile
    if (!req.user || req.user._isNew) {
      return res.status(403).json({ success: false, message: 'Please complete your profile first.' });
    }

    // Validate advance booking window
    const scheduledDateTime = new Date(`${body.scheduledDate}T${body.scheduledTime}:00`);
    const now = new Date();
    const diffHours = (scheduledDateTime - now) / (1000 * 60 * 60);

    if (diffHours < PLATFORM.MIN_BOOKING_HOURS_ADVANCE) {
      return res.status(400).json({
        success: false,
        message: `Bookings must be placed at least ${PLATFORM.MIN_BOOKING_HOURS_ADVANCE} hours in advance.`,
      });
    }

    if (diffHours > PLATFORM.MAX_BOOKING_DAYS_ADVANCE * 24) {
      return res.status(400).json({
        success: false,
        message: `Bookings cannot be made more than ${PLATFORM.MAX_BOOKING_DAYS_ADVANCE} days in advance.`,
      });
    }

    // Prayer time conflict check
    const prayerConflict = await prayerTimeService.checkSlotConflict(
      body.scheduledDate,
      body.scheduledTime,
      60 // assume 60-minute buffer for prayer times
    );

    if (prayerConflict.hasConflict) {
      return res.status(400).json({
        success: false,
        message: `Scheduled time conflicts with ${prayerConflict.prayerName} prayer (${prayerConflict.prayerTime}). Please choose a different time.`,
        data: { conflict: prayerConflict },
      });
    }

    // Calculate quote
    const serviceInfo = SERVICE_PRICING[body.serviceType];
    if (!serviceInfo) {
      return res.status(400).json({ success: false, message: 'Unknown service type.' });
    }

    const quoteAmount = calculateQuote
      ? calculateQuote(body)
      : serviceInfo.minPrice;

    let discountAmount = 0;
    let finalAmount = quoteAmount;

    // Promo code check (basic)
    if (body.promoCode) {
      const promoSnap = await db
        .collection(COLLECTIONS.PROMO_CODES)
        .where('code', '==', body.promoCode.toUpperCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!promoSnap.empty) {
        const promo = promoSnap.docs[0].data();
        if (promo.discountType === 'percent') {
          discountAmount = Math.round((quoteAmount * promo.discountValue) / 100);
        } else {
          discountAmount = promo.discountValue;
        }
        finalAmount = Math.max(0, quoteAmount - discountAmount);
      }
    }

    const bookingRef = generateBookingRef ? generateBookingRef() : `CG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const bookingData = {
      bookingRef,
      customerId: uid,
      workerId: null,
      serviceType: body.serviceType,
      status: BOOKING_STATUS.PENDING,
      address: body.address,
      scheduledDate: body.scheduledDate,
      scheduledTime: body.scheduledTime,
      propertyType: body.propertyType,
      bedrooms: body.bedrooms || null,
      bathrooms: body.bathrooms || null,
      squareMeters: body.squareMeters || null,
      addOns: body.addOns || [],
      specialInstructions: body.specialInstructions || '',
      preferredWorkerGender: body.preferredWorkerGender || 'any',
      quoteAmount,
      finalAmount,
      discountAmount,
      promoCode: body.promoCode || null,
      paymentStatus: PAYMENT_STATUS.PENDING,
      paymentId: null,
      escrowId: null,
      isRecurring: body.isRecurring || false,
      recurringFrequency: body.recurringFrequency || null,
      hasReview: false,
      reviewId: null,
      completionPhotos: [],
      workerSnapshot: null,
      startedAt: null,
      completedAt: null,
      cancellationReason: null,
      cancelledBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTIONS.BOOKINGS).add(bookingData);

    // Attempt auto-assignment (fire-and-forget)
    workerAssignmentService
      .assignWorker(docRef.id, { ...bookingData, id: docRef.id })
      .catch((err) => console.warn('[Booking] Auto-assign failed:', err.message));

    // Notify customer
    notificationsService
      .notifyBookingCreated({ id: uid, ...req.user }, { id: docRef.id, ...bookingData })
      .catch(() => {});

    return res.status(201).json({
      success: true,
      data: { id: docRef.id, ...bookingData, bookingRef },
      message: 'Booking created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /bookings/:id
 * Get a single booking by ID. Customer can only view their own; worker their assigned one.
 */
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTIONS.BOOKINGS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = { id: doc.id, ...doc.data() };
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const isCustomer = booking.customerId === req.uid;
    const isAssignedWorker = booking.workerId === req.uid;

    if (!isAdmin && !isCustomer && !isAssignedWorker) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({ success: true, data: booking, message: 'Booking retrieved' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /bookings/:id
 * Update booking (reschedule, status update by worker/admin).
 */
router.patch('/:id', verifyToken, async (req, res, next) => {
  try {
    const body = validate(schemas.updateBooking, req.body);
    const bookingId = req.params.id;

    const doc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = doc.data();
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const isCustomer = booking.customerId === req.uid;
    const isAssignedWorker = booking.workerId === req.uid;

    if (!isAdmin && !isCustomer && !isAssignedWorker) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Customers can only reschedule or cancel pending bookings
    if (!isAdmin) {
      const allowedStatuses = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];
      if (!allowedStatuses.includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot update booking in status: ${booking.status}`,
        });
      }
    }

    const updateData = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update(updateData);

    const updated = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    return res.json({
      success: true,
      data: { id: bookingId, ...updated.data() },
      message: 'Booking updated',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /bookings/:id
 * Cancel a booking. Only allowed for pending/confirmed bookings.
 */
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const { reason } = validate(schemas.cancelBooking, req.body);
    const bookingId = req.params.id;

    const doc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = doc.data();
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const isCustomer = booking.customerId === req.uid;

    if (!isAdmin && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const cancellableStatuses = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];
    if (!cancellableStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking with status: ${booking.status}`,
      });
    }

    await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
      status: BOOKING_STATUS.CANCELLED,
      cancellationReason: reason,
      cancelledBy: isAdmin ? 'admin' : 'customer',
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify customer
    notificationsService
      .notifyBookingCancelled({ id: booking.customerId }, { id: bookingId, ...booking }, reason)
      .catch(() => {});

    return res.json({
      success: true,
      data: { id: bookingId, status: BOOKING_STATUS.CANCELLED },
      message: 'Booking cancelled',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /bookings/:id/photos
 * Worker uploads completion photos. Max 5, stored in Firebase Storage.
 */
router.post(
  '/:id/photos',
  verifyToken,
  uploadLimiter,
  upload.array('photos', 5),
  async (req, res, next) => {
    try {
      const bookingId = req.params.id;

      const doc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
      if (!doc.exists) {
        return res.status(404).json({ success: false, message: 'Booking not found.' });
      }

      const booking = doc.data();
      const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
      const isAssignedWorker = booking.workerId === req.uid;

      if (!isAdmin && !isAssignedWorker) {
        return res.status(403).json({ success: false, message: 'Only the assigned worker can upload completion photos.' });
      }

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No photos uploaded.' });
      }

      const bucket = storage.bucket();
      const uploadedUrls = [];

      for (const file of req.files) {
        const fileName = `bookings/${bookingId}/completion/${uuidv4()}${path.extname(file.originalname)}`;
        const fileUpload = bucket.file(fileName);

        await fileUpload.save(file.buffer, {
          metadata: {
            contentType: file.mimetype,
            metadata: { uploadedBy: req.uid, bookingId },
          },
        });

        await fileUpload.makePublic();
        const url = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        uploadedUrls.push(url);
      }

      await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
        completionPhotos: FieldValue.arrayUnion(...uploadedUrls),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return res.json({
        success: true,
        data: { photos: uploadedUrls },
        message: `${uploadedUrls.length} photo(s) uploaded`,
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
