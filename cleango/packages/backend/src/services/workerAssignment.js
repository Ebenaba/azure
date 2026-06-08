'use strict';

const { db } = require('../config/firebase');
const { FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { WORKER_STATUS, WORKER_AVAILABILITY, BOOKING_STATUS } = require('../utils/constants');
const { haversineDistance } = require('../utils/helpers');
const notificationsService = require('./notifications');

/**
 * Score a worker for a specific booking.
 * Higher is better.
 * Factors:
 *   1. Zone match (primary zone: +100, adjacent zone: +50)
 *   2. Rating (0-5 → 0-50 points)
 *   3. Jobs completed (experience: max 20 points)
 *   4. Distance (inverse: closer = higher score)
 *   5. Gender match preference (+30 if matches)
 *   6. Service type match (+20)
 */
function scoreWorker(worker, booking, workerLocation) {
  let score = 0;

  // Zone match
  if (worker.assignedZones && booking.address?.zone) {
    if (worker.assignedZones.includes(booking.address.zone)) {
      score += 100;
    } else {
      // Partial score for adjacent zones (any assigned zone)
      score += 30;
    }
  }

  // Rating score (0-5 → 0-50)
  score += (worker.rating || 0) * 10;

  // Experience
  const jobsCompleted = worker.totalJobsCompleted || 0;
  score += Math.min(jobsCompleted, 100) * 0.2; // Max 20 points

  // Distance if coordinates available
  if (workerLocation && booking.address?.coordinates) {
    const dist = haversineDistance(
      workerLocation.lat,
      workerLocation.lng,
      booking.address.coordinates.lat,
      booking.address.coordinates.lng
    );
    // Max 30 points for distance (< 1km = 30 pts, decays linearly to 0 at 15km)
    const distScore = Math.max(0, 30 - (dist / 15) * 30);
    score += distScore;
  }

  // Gender preference
  if (booking.preferredWorkerGender && booking.preferredWorkerGender !== 'any') {
    if (worker.gender === booking.preferredWorkerGender) {
      score += 30;
    } else {
      score -= 20; // Penalty for mismatch when preference set
    }
  }

  // Service type expertise
  if (worker.serviceTypes && worker.serviceTypes.includes(booking.serviceType)) {
    score += 20;
  }

  return score;
}

/**
 * Find the best available worker for a booking using the scoring algorithm
 * @param {Object} booking - Booking document data
 * @param {string[]} [excludeWorkerIds] - Workers to skip
 * @returns {Promise<{ worker: Object, score: number } | null>}
 */
async function findBestWorker(booking, excludeWorkerIds = []) {
  // Query available approved workers in the target zone first
  const baseQuery = db.collection(COLLECTIONS.WORKERS)
    .where('status', '==', WORKER_STATUS.APPROVED)
    .where('availability', '==', WORKER_AVAILABILITY.AVAILABLE)
    .where('isActive', '==', true);

  // Zone-specific query
  let snapshot;
  if (booking.address?.zone) {
    try {
      snapshot = await baseQuery
        .where('assignedZones', 'array-contains', booking.address.zone)
        .limit(20)
        .get();
    } catch (e) {
      // Fallback: no compound index — fetch all available workers
      snapshot = await baseQuery.limit(50).get();
    }
  } else {
    snapshot = await baseQuery.limit(50).get();
  }

  if (snapshot.empty) {
    // Try any available worker without zone filter
    const fallbackSnap = await baseQuery.limit(30).get();
    if (fallbackSnap.empty) return null;
    snapshot = fallbackSnap;
  }

  const workers = snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((w) => !excludeWorkerIds.includes(w.id));

  if (workers.length === 0) return null;

  // Get worker locations (optional — best effort)
  const locationMap = new Map();
  try {
    const locSnap = await db.collection(COLLECTIONS.WORKER_LOCATIONS)
      .where('workerId', 'in', workers.slice(0, 10).map((w) => w.id))
      .get();
    locSnap.docs.forEach((doc) => {
      const d = doc.data();
      locationMap.set(d.workerId, { lat: d.lat, lng: d.lng });
    });
  } catch (e) {
    // Location fetch not critical
  }

  // Check for schedule conflicts (worker already has a booking at this time)
  const scheduledDate = booking.scheduledDate;
  const scheduledTime = booking.scheduledTime;
  const conflictSnap = await db.collection(COLLECTIONS.BOOKINGS)
    .where('scheduledDate', '==', scheduledDate)
    .where('status', 'in', [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.WORKER_EN_ROUTE, BOOKING_STATUS.IN_PROGRESS])
    .get();

  const busyWorkerIds = new Set(
    conflictSnap.docs
      .map((d) => d.data().workerId)
      .filter(Boolean)
  );

  // Score and rank
  const scored = workers
    .filter((w) => !busyWorkerIds.has(w.id))
    .map((worker) => ({
      worker,
      score: scoreWorker(worker, booking, locationMap.get(worker.id) || null),
    }))
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return null;

  return scored[0];
}

/**
 * Auto-assign the best worker to a booking
 * @param {string} bookingId
 * @param {string[]} [excludeWorkerIds]
 * @returns {Promise<{ workerId: string, workerName: string } | null>}
 */
async function autoAssignWorker(bookingId, excludeWorkerIds = []) {
  const bookingRef = db.collection(COLLECTIONS.BOOKINGS).doc(bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  }

  const booking = { id: bookingDoc.id, ...bookingDoc.data() };
  const result = await findBestWorker(booking, excludeWorkerIds);

  if (!result) {
    console.warn(`[WorkerAssignment] No available worker found for booking ${bookingId}`);
    return null;
  }

  const { worker } = result;

  // Assign worker to booking
  await bookingRef.update({
    workerId: worker.id,
    status: BOOKING_STATUS.CONFIRMED,
    workerSnapshot: {
      firstName: worker.firstName,
      lastName: worker.lastName,
      phone: worker.phone,
      rating: worker.rating,
      photoURL: worker.documents?.profilePhoto || null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Mark worker as busy
  await db.collection(COLLECTIONS.WORKERS).doc(worker.id).update({
    availability: WORKER_AVAILABILITY.BUSY,
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`[WorkerAssignment] Assigned worker ${worker.id} (score: ${result.score}) to booking ${bookingId}`);

  // Notify worker
  try {
    await notificationsService.notifyWorkerNewJob(worker, booking);
  } catch (e) {
    console.warn('[WorkerAssignment] Worker notification failed:', e.message);
  }

  return { workerId: worker.id, workerName: `${worker.firstName} ${worker.lastName}` };
}

/**
 * Manually assign a specific worker to a booking (admin action)
 * @param {string} bookingId
 * @param {string} workerId
 * @param {string} [assignedBy] - Admin UID
 * @returns {Promise<Object>}
 */
async function manuallyAssignWorker(bookingId, workerId, assignedBy) {
  const [bookingDoc, workerDoc] = await Promise.all([
    db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get(),
    db.collection(COLLECTIONS.WORKERS).doc(workerId).get(),
  ]);

  if (!bookingDoc.exists) throw Object.assign(new Error('Booking not found'), { statusCode: 404 });
  if (!workerDoc.exists) throw Object.assign(new Error('Worker not found'), { statusCode: 404 });

  const booking = { id: bookingDoc.id, ...bookingDoc.data() };
  const worker = { id: workerDoc.id, ...workerDoc.data() };

  if (worker.status !== WORKER_STATUS.APPROVED) {
    throw Object.assign(new Error(`Worker is not approved. Status: ${worker.status}`), { statusCode: 400 });
  }

  // Free previous worker if any
  if (booking.workerId && booking.workerId !== workerId) {
    await db.collection(COLLECTIONS.WORKERS).doc(booking.workerId).update({
      availability: WORKER_AVAILABILITY.AVAILABLE,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).update({
    workerId,
    status: BOOKING_STATUS.CONFIRMED,
    assignedBy: assignedBy || 'admin',
    workerSnapshot: {
      firstName: worker.firstName,
      lastName: worker.lastName,
      phone: worker.phone,
      rating: worker.rating,
      photoURL: worker.documents?.profilePhoto || null,
    },
    updatedAt: FieldValue.serverTimestamp(),
  });

  await db.collection(COLLECTIONS.WORKERS).doc(workerId).update({
    availability: WORKER_AVAILABILITY.BUSY,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify worker
  try {
    await notificationsService.notifyWorkerNewJob(worker, booking);
  } catch (e) {
    console.warn('[WorkerAssignment] Worker notification failed:', e.message);
  }

  console.log(`[WorkerAssignment] Manual assignment: worker ${workerId} → booking ${bookingId} by admin ${assignedBy}`);

  return { workerId, workerName: `${worker.firstName} ${worker.lastName}`, status: BOOKING_STATUS.CONFIRMED };
}

/**
 * Release a worker back to availability after a job is completed or cancelled
 * @param {string} workerId
 */
async function releaseWorker(workerId) {
  await db.collection(COLLECTIONS.WORKERS).doc(workerId).update({
    availability: WORKER_AVAILABILITY.AVAILABLE,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get workers available in a specific zone
 * @param {string} zone
 * @returns {Promise<Object[]>}
 */
async function getAvailableWorkersInZone(zone) {
  const snap = await db.collection(COLLECTIONS.WORKERS)
    .where('status', '==', WORKER_STATUS.APPROVED)
    .where('availability', '==', WORKER_AVAILABILITY.AVAILABLE)
    .where('assignedZones', 'array-contains', zone)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  findBestWorker,
  autoAssignWorker,
  manuallyAssignWorker,
  releaseWorker,
  getAvailableWorkersInZone,
  scoreWorker,
};
