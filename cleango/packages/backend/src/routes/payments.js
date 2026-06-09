'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { paymentLimiter, adminLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const { nairaToKobo, generateTransactionRef } = require('../utils/helpers');
const paystackService = require('../services/paystack');
const escrowService = require('../services/escrow');
const notificationsService = require('../services/notifications');

/**
 * POST /payments/initialize
 * Customer: initialize Paystack transaction for a booking.
 */
router.post('/initialize', verifyToken, paymentLimiter, async (req, res, next) => {
  try {
    const { bookingId, callbackUrl } = validate(schemas.initializePayment, req.body);

    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = { id: bookingDoc.id, ...bookingDoc.data() };

    if (booking.customerId !== req.uid) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (booking.paymentStatus === PAYMENT_STATUS.SUCCESS || booking.paymentStatus === PAYMENT_STATUS.ESCROWED) {
      return res.status(400).json({ success: false, message: 'Booking has already been paid.' });
    }

    if (booking.status === BOOKING_STATUS.CANCELLED) {
      return res.status(400).json({ success: false, message: 'Cannot pay for a cancelled booking.' });
    }

    // Get customer email
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(req.uid).get();
    const user = userDoc.data() || {};
    const email = user.email || req.firebaseUser?.email || `${req.uid}@cleango.ng`;

    const reference = generateTransactionRef('CG-PAY');

    const txn = await paystackService.initializeTransaction({
      email,
      amount: booking.finalAmount,
      reference,
      callbackUrl,
      metadata: {
        bookingId: booking.id,
        bookingRef: booking.bookingRef,
        customerId: req.uid,
        serviceType: booking.serviceType,
      },
    });

    // Persist payment document
    const paymentData = {
      bookingId: booking.id,
      customerId: req.uid,
      workerId: booking.workerId || null,
      amount: booking.finalAmount,
      amountKobo: nairaToKobo(booking.finalAmount),
      currency: 'NGN',
      status: PAYMENT_STATUS.PENDING,
      paystackReference: reference,
      paystackAccessCode: txn.accessCode,
      paystackAuthorizationUrl: txn.authorizationUrl,
      commissionAmount: 0,
      workerPayout: 0,
      isEscrowed: false,
      escrowId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const paymentRef = await db.collection(COLLECTIONS.PAYMENTS).add(paymentData);

    // Update booking with payment reference
    await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
      paymentId: paymentRef.id,
      paymentReference: reference,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      success: true,
      data: {
        paymentId: paymentRef.id,
        authorizationUrl: txn.authorizationUrl,
        accessCode: txn.accessCode,
        reference,
        amount: booking.finalAmount,
        currency: 'NGN',
      },
      message: 'Payment initialized. Redirect customer to authorization URL.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /payments/webhook
 * Paystack webhook endpoint. Requires raw body for HMAC verification.
 * Must use express.raw() body parser — see app.js for route-specific middleware.
 */
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const rawBody = req.rawBody || (Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body));

    if (!paystackService.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { event: eventType, data } = event;

    console.log(`[Webhook] Received Paystack event: ${eventType}`);

    // Acknowledge immediately to avoid timeout
    res.status(200).json({ success: true, message: 'Webhook received.' });

    // Process asynchronously
    setImmediate(async () => {
      try {
        await handlePaystackEvent(eventType, data);
      } catch (err) {
        console.error('[Webhook] Event processing error:', err.message);
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Handle specific Paystack events
 */
async function handlePaystackEvent(eventType, data) {
  if (eventType === 'charge.success') {
    const reference = data.reference;

    // Find payment by reference
    const paymentSnap = await db
      .collection(COLLECTIONS.PAYMENTS)
      .where('paystackReference', '==', reference)
      .limit(1)
      .get();

    if (paymentSnap.empty) {
      console.warn(`[Webhook] No payment found for reference: ${reference}`);
      return;
    }

    const paymentDoc = paymentSnap.docs[0];
    const payment = paymentDoc.data();

    if (payment.status === PAYMENT_STATUS.SUCCESS) {
      // Already processed (duplicate webhook)
      return;
    }

    const { commission, workerPayout } = require('../utils/helpers').calculateCommission(payment.amount);

    // Update payment status
    await db.collection(COLLECTIONS.PAYMENTS).doc(paymentDoc.id).update({
      status: PAYMENT_STATUS.SUCCESS,
      paystackTransactionId: String(data.id),
      commissionAmount: commission,
      workerPayout,
      paystackWebhookData: data,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update booking status
    const bookingRef = db.collection(COLLECTIONS.BOOKINGS).doc(payment.bookingId);
    const bookingDoc = await bookingRef.get();
    const booking = bookingDoc.exists ? { id: bookingDoc.id, ...bookingDoc.data() } : null;

    if (booking) {
      await bookingRef.update({
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.SUCCESS,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Create escrow record
    try {
      await escrowService.holdInEscrow({
        bookingId: payment.bookingId,
        paymentId: paymentDoc.id,
        customerId: payment.customerId,
        workerId: payment.workerId || booking?.workerId || null,
        amount: payment.amount,
      });
    } catch (escrowErr) {
      console.error('[Webhook] Escrow creation failed:', escrowErr.message);
    }

    // Notify customer
    try {
      const userDoc = await db.collection(COLLECTIONS.USERS).doc(payment.customerId).get();
      if (userDoc.exists) {
        const user = { id: userDoc.id, ...userDoc.data() };
        await notificationsService.notifyPaymentSuccess(user, payment.amount, booking?.bookingRef || reference);
        if (booking) {
          await notificationsService.notifyBookingConfirmed(user, { id: payment.bookingId, ...booking });
        }
      }
    } catch (notifErr) {
      console.warn('[Webhook] Customer notification failed:', notifErr.message);
    }

    console.log(`[Webhook] Payment ${reference} processed. Booking ${payment.bookingId} confirmed.`);
  }

  if (eventType === 'transfer.success') {
    console.log(`[Webhook] Transfer success: ${data.reference}`);
    // Update escrow transfer status if needed
    const escrowSnap = await db
      .collection(COLLECTIONS.ESCROW)
      .where('paystackTransferReference', '==', data.reference)
      .limit(1)
      .get();
    if (!escrowSnap.empty) {
      await escrowSnap.docs[0].ref.update({
        transferStatus: 'success',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  if (eventType === 'transfer.failed' || eventType === 'transfer.reversed') {
    console.warn(`[Webhook] Transfer ${eventType}: ${data.reference}`);
    const escrowSnap = await db
      .collection(COLLECTIONS.ESCROW)
      .where('paystackTransferReference', '==', data.reference)
      .limit(1)
      .get();
    if (!escrowSnap.empty) {
      await escrowSnap.docs[0].ref.update({
        transferStatus: eventType === 'transfer.failed' ? 'failed' : 'reversed',
        transferFailureReason: data.reason || '',
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
}

/**
 * POST /payments/payout/:bookingId
 * Admin: manually release escrow for a completed booking.
 */
router.post('/payout/:bookingId', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
    if (!bookingDoc.exists) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingDoc.data();
    if (booking.status !== BOOKING_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        message: `Cannot release payout for booking with status: ${booking.status}. Booking must be completed.`,
      });
    }

    const escrow = await escrowService.getEscrowByBooking(bookingId);
    if (!escrow) {
      return res.status(404).json({ success: false, message: 'No escrow record found for this booking.' });
    }

    const result = await escrowService.releaseEscrow(escrow.id, req.uid);

    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorId: req.uid,
      actorRole: req.user.role,
      action: 'escrow.released',
      targetId: escrow.id,
      targetCollection: COLLECTIONS.ESCROW,
      after: { status: 'released', workerPayout: result.workerPayout },
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: result,
      message: `Payout of ₦${result.workerPayout.toLocaleString()} released to worker.`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /payments/history
 * Customer: payment history.
 */
router.get('/history', verifyToken, async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const snapshot = await db
      .collection(COLLECTIONS.PAYMENTS)
      .where('customerId', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .get();

    const payments = snapshot.docs.map((doc) => {
      const d = doc.data();
      // Omit raw webhook payload from customer-facing response
      const { paystackWebhookData, ...safe } = d;
      return { id: doc.id, ...safe };
    });

    return res.json({
      success: true,
      data: { payments, count: payments.length, page: parseInt(page) },
      message: 'Payment history retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /payments/balance
 * Admin: get Paystack account balance.
 */
router.get('/balance', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const balance = await paystackService.getBalance();
    return res.json({
      success: true,
      data: balance,
      message: 'Paystack balance retrieved',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
