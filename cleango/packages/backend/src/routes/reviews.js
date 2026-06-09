'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS, ReviewSchema } = require('../models/schemas');
const { BOOKING_STATUS, PLATFORM } = require('../utils/constants');
const { verifyToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const notificationsService = require('../services/notifications');

/**
 * POST /reviews
 * Customer: submit a review for a completed booking.
 */
router.post('/', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const body = validate(schemas.submitReview, req.body);
    const customerId = req.uid;

    // Verify the booking exists and is completed
    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(body.bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() };

    if (booking.customerId !== customerId) {
      return res.status(403).json({ success: false, message: 'You can only review your own bookings.' });
    }

    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed bookings.',
      });
    }

    if (booking.hasReview) {
      return res.status(409).json({
        success: false,
        message: 'A review has already been submitted for this booking.',
      });
    }

    // Check review window (48 hours after completion)
    if (booking.completedAt) {
      const completedAt = booking.completedAt.toDate ? booking.completedAt.toDate() : new Date(booking.completedAt);
      const windowMs = PLATFORM.REVIEW_WINDOW_HOURS * 60 * 60 * 1000;
      if (Date.now() - completedAt.getTime() > windowMs) {
        return res.status(400).json({
          success: false,
          message: `Review window has closed. Reviews must be submitted within ${PLATFORM.REVIEW_WINDOW_HOURS} hours of job completion.`,
        });
      }
    }

    // Verify worker matches booking
    if (booking.workerId !== body.workerId) {
      return res.status(400).json({
        success: false,
        message: 'Worker ID does not match the assigned worker for this booking.',
      });
    }

    const defaults = ReviewSchema.defaults();
    const reviewData = {
      ...defaults,
      bookingId: body.bookingId,
      customerId,
      workerId: body.workerId,
      rating: body.rating,
      comment: body.comment || '',
      categories: body.categories || null,
      isAnonymous: body.isAnonymous || false,
      wouldRecommend: body.wouldRecommend ?? null,
      isVisible: true,
      createdAt: FieldValue.serverTimestamp(),
    };

    const reviewRef = await db.collection(COLLECTIONS.REVIEWS).add(reviewData);

    // Mark booking as reviewed
    await db.collection(COLLECTIONS.BOOKINGS).doc(body.bookingId).update({
      hasReview: true,
      reviewId: reviewRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update worker's rating (running average)
    const workerDoc = await db.collection(COLLECTIONS.WORKERS).doc(body.workerId).get();
    if (workerDoc.exists) {
      const worker = workerDoc.data();
      const currentRating = worker.rating || 0;
      const totalReviews = worker.totalReviews || 0;
      const newTotal = totalReviews + 1;
      const newRating = ((currentRating * totalReviews) + body.rating) / newTotal;

      await db.collection(COLLECTIONS.WORKERS).doc(body.workerId).update({
        rating: Math.round(newRating * 10) / 10, // 1 decimal place
        totalReviews: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Notify worker of new review
      const workerData = { id: workerDoc.id, ...worker };
      notificationsService.dispatch({
        userId: body.workerId,
        type: 'new_review',
        title: 'New Review Received',
        body: `You received a ${body.rating}-star review for your recent job.`,
        fcmToken: workerData.fcmToken,
        relatedId: reviewRef.id,
        relatedType: 'review',
      }).catch(() => {});
    }

    return res.status(201).json({
      success: true,
      data: { id: reviewRef.id, ...reviewData },
      message: 'Review submitted successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reviews/worker/:workerId
 * Public: get all visible reviews for a worker.
 */
router.get('/worker/:workerId', async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const snapshot = await db
      .collection(COLLECTIONS.REVIEWS)
      .where('workerId', '==', workerId)
      .where('isVisible', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const reviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        rating: data.rating,
        comment: data.isAnonymous ? '' : data.comment,
        categories: data.categories,
        wouldRecommend: data.wouldRecommend,
        isAnonymous: data.isAnonymous,
        createdAt: data.createdAt,
        // Don't expose customerId for anonymous reviews
        ...(data.isAnonymous ? {} : { customerId: data.customerId }),
      };
    });

    // Compute average rating
    const avgRating = reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

    return res.json({
      success: true,
      data: {
        workerId,
        reviews,
        count: reviews.length,
        averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        page: parseInt(page),
      },
      message: 'Worker reviews retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /reviews/booking/:bookingId
 * Customer/Worker/Admin: get the review for a specific booking.
 */
router.get('/booking/:bookingId', verifyToken, async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Verify access to this booking
    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingDoc.data();
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const isCustomer = booking.customerId === req.uid;
    const isWorker = booking.workerId === req.uid;

    if (!isAdmin && !isCustomer && !isWorker) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const snapshot = await db
      .collection(COLLECTIONS.REVIEWS)
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: 'No review found for this booking.' });
    }

    const doc = snapshot.docs[0];
    return res.json({
      success: true,
      data: { id: doc.id, ...doc.data() },
      message: 'Review retrieved',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
