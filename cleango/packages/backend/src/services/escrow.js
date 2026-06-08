'use strict';

const { db } = require('../config/firebase');
const { FieldValue, Timestamp } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { BOOKING_STATUS, PAYMENT_STATUS } = require('../utils/constants');
const { addHours, calculateCommission } = require('../utils/helpers');
const paystackService = require('./paystack');
const notificationsService = require('./notifications');

/**
 * Hold funds in escrow after successful payment
 * @param {Object} params
 * @param {string} params.bookingId
 * @param {string} params.paymentId
 * @param {string} params.customerId
 * @param {string} params.workerId
 * @param {number} params.amount - Naira
 * @param {number} [params.commissionPercent]
 * @returns {Promise<string>} Escrow document ID
 */
async function holdInEscrow({ bookingId, paymentId, customerId, workerId, amount, commissionPercent }) {
  const { commission, workerPayout } = calculateCommission(amount, commissionPercent);
  const autoReleaseHours = parseInt(process.env.ESCROW_AUTO_RELEASE_HOURS) || 48;
  const releaseAfter = addHours(new Date(), autoReleaseHours);

  const escrowData = {
    bookingId,
    paymentId,
    customerId,
    workerId: workerId || null,
    amount,
    commissionAmount: commission,
    workerPayout,
    status: 'held',
    heldAt: FieldValue.serverTimestamp(),
    releaseAfter: Timestamp.fromDate(releaseAfter),
    releasedAt: null,
    releasedBy: null,
    paystackTransferCode: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(COLLECTIONS.ESCROW).add(escrowData);

  // Update payment document
  await db.collection(COLLECTIONS.PAYMENTS).doc(paymentId).update({
    isEscrowed: true,
    escrowId: ref.id,
    escrowedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update booking
  await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
    escrowId: ref.id,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Escrow] Held ₦${amount} for booking ${bookingId}. Auto-release at ${releaseAfter.toISOString()}`);
  return ref.id;
}

/**
 * Release escrow to worker after job completion
 * @param {string} escrowId
 * @param {string} releasedBy - Admin UID or 'auto'
 * @returns {Promise<Object>}
 */
async function releaseEscrow(escrowId, releasedBy = 'auto') {
  const escrowRef = db.collection(COLLECTIONS.ESCROW).doc(escrowId);
  const escrowDoc = await escrowRef.get();

  if (!escrowDoc.exists) {
    throw Object.assign(new Error('Escrow record not found'), { statusCode: 404 });
  }

  const escrow = escrowDoc.data();

  if (escrow.status !== 'held') {
    throw Object.assign(
      new Error(`Cannot release escrow with status: ${escrow.status}`),
      { statusCode: 400 }
    );
  }

  if (!escrow.workerId) {
    throw Object.assign(new Error('No worker assigned to this escrow'), { statusCode: 400 });
  }

  // Get worker's Paystack recipient code
  const workerDoc = await db.collection(COLLECTIONS.WORKERS).doc(escrow.workerId).get();
  if (!workerDoc.exists) {
    throw Object.assign(new Error('Worker not found'), { statusCode: 404 });
  }

  const worker = workerDoc.data();
  const recipientCode = worker.bankAccount?.paystackRecipientCode;

  if (!recipientCode) {
    throw Object.assign(
      new Error('Worker does not have a Paystack recipient code set. Please configure bank account.'),
      { statusCode: 400 }
    );
  }

  // Initiate Paystack transfer
  const { transferCode, reference } = await paystackService.initiateTransfer({
    recipientCode,
    amount: escrow.workerPayout,
    reason: `CleanGo job payout - Booking ${escrow.bookingId}`,
    reference: `ESC-${escrowId.slice(0, 8)}`,
  });

  // Update escrow status
  await escrowRef.update({
    status: 'released',
    releasedAt: FieldValue.serverTimestamp(),
    releasedBy,
    paystackTransferCode: transferCode,
    paystackTransferReference: reference,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update payment status
  await db.collection(COLLECTIONS.PAYMENTS).doc(escrow.paymentId).update({
    status: PAYMENT_STATUS.RELEASED,
    paystackTransferCode: transferCode,
    releasedAt: FieldValue.serverTimestamp(),
    releasedBy,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Update worker earnings
  await db.collection(COLLECTIONS.WORKERS).doc(escrow.workerId).update({
    totalEarnings: FieldValue.increment(escrow.workerPayout),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify worker
  try {
    const workerData = { id: escrow.workerId, ...worker };
    await notificationsService.notifyEscrowReleased(workerData, escrow.workerPayout);
  } catch (notifErr) {
    console.warn('[Escrow] Notification failed:', notifErr.message);
  }

  console.log(`[Escrow] Released ₦${escrow.workerPayout} to worker ${escrow.workerId}. Transfer: ${transferCode}`);

  return {
    escrowId,
    workerPayout: escrow.workerPayout,
    commission: escrow.commissionAmount,
    transferCode,
    status: 'released',
  };
}

/**
 * Refund escrow to customer (e.g. cancellation, dispute resolved in customer's favour)
 * @param {string} escrowId
 * @param {string} reason
 * @param {string} refundedBy - Admin UID
 * @returns {Promise<Object>}
 */
async function refundEscrow(escrowId, reason, refundedBy) {
  const escrowRef = db.collection(COLLECTIONS.ESCROW).doc(escrowId);
  const escrowDoc = await escrowRef.get();

  if (!escrowDoc.exists) {
    throw Object.assign(new Error('Escrow record not found'), { statusCode: 404 });
  }

  const escrow = escrowDoc.data();
  if (escrow.status !== 'held' && escrow.status !== 'disputed') {
    throw Object.assign(
      new Error(`Cannot refund escrow with status: ${escrow.status}`),
      { statusCode: 400 }
    );
  }

  // Get the original transaction from payment
  const paymentDoc = await db.collection(COLLECTIONS.PAYMENTS).doc(escrow.paymentId).get();
  if (!paymentDoc.exists) {
    throw Object.assign(new Error('Payment not found'), { statusCode: 404 });
  }

  const payment = paymentDoc.data();
  let refundData = {};

  if (payment.paystackTransactionId) {
    try {
      const refund = await paystackService.createRefund({
        transactionId: payment.paystackTransactionId,
        reason,
      });
      refundData = { paystackRefundId: refund.id, refundStatus: refund.status };
    } catch (err) {
      console.error('[Escrow] Paystack refund error:', err.message);
      // Continue — mark as refunded even if Paystack call fails (manual follow-up)
    }
  }

  await escrowRef.update({
    status: 'refunded',
    refundedAt: FieldValue.serverTimestamp(),
    refundedBy,
    refundReason: reason,
    ...refundData,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(COLLECTIONS.PAYMENTS).doc(escrow.paymentId).update({
    status: PAYMENT_STATUS.REFUNDED,
    refundReason: reason,
    refundedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[Escrow] Refunded ₦${escrow.amount} for booking ${escrow.bookingId}`);

  return { escrowId, amount: escrow.amount, status: 'refunded' };
}

/**
 * Flag escrow as disputed
 * @param {string} escrowId
 * @param {string} complaintId
 * @returns {Promise<void>}
 */
async function disputeEscrow(escrowId, complaintId) {
  await db.collection(COLLECTIONS.ESCROW).doc(escrowId).update({
    status: 'disputed',
    complaintId,
    disputedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Auto-release all escrows that have passed their release time and have completed bookings
 * Called by scheduled job
 * @returns {Promise<{ released: number, failed: number }>}
 */
async function autoReleaseExpiredEscrows() {
  const now = Timestamp.now();
  let released = 0;
  let failed = 0;

  const query = await db
    .collection(COLLECTIONS.ESCROW)
    .where('status', '==', 'held')
    .where('releaseAfter', '<=', now)
    .limit(50)
    .get();

  for (const doc of query.docs) {
    const escrow = doc.data();

    // Only release if booking is completed
    const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(escrow.bookingId).get();
    if (!bookingDoc.exists) continue;
    const booking = bookingDoc.data();
    if (booking.status !== BOOKING_STATUS.COMPLETED) continue;

    try {
      await releaseEscrow(doc.id, 'auto');
      released++;
    } catch (err) {
      console.error(`[Escrow] Auto-release failed for escrow ${doc.id}:`, err.message);
      failed++;
    }
  }

  console.log(`[Escrow] Auto-release complete: ${released} released, ${failed} failed`);
  return { released, failed };
}

/**
 * Get escrow by booking ID
 * @param {string} bookingId
 * @returns {Promise<Object|null>}
 */
async function getEscrowByBooking(bookingId) {
  const query = await db
    .collection(COLLECTIONS.ESCROW)
    .where('bookingId', '==', bookingId)
    .limit(1)
    .get();

  if (query.empty) return null;
  const doc = query.docs[0];
  return { id: doc.id, ...doc.data() };
}

module.exports = {
  holdInEscrow,
  releaseEscrow,
  refundEscrow,
  disputeEscrow,
  autoReleaseExpiredEscrows,
  getEscrowByBooking,
};
