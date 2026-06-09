'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue, auth } = require('../config/firebase');
const { COLLECTIONS, WorkerSchema } = require('../models/schemas');
const { WORKER_STATUS, WORKER_AVAILABILITY, USER_ROLES } = require('../utils/constants');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const notificationsService = require('../services/notifications');

/**
 * GET /workers
 * Admin: list all workers with optional filters.
 */
router.get('/', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { status, zone, availability, page = 1, limit = 20 } = req.query;

    let query = db.collection(COLLECTIONS.WORKERS).orderBy('createdAt', 'desc');

    if (status) query = query.where('status', '==', status);
    if (availability) query = query.where('availability', '==', availability);
    if (zone) query = query.where('assignedZones', 'array-contains', zone);

    const snapshot = await query.limit(parseInt(limit)).get();
    const workers = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Strip sensitive fields for list view
      const { nin, bankAccount, ...safe } = data;
      return { id: doc.id, ...safe };
    });

    return res.json({
      success: true,
      data: { workers, count: workers.length, page: parseInt(page) },
      message: 'Workers retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /workers/pending
 * Admin: workers awaiting vetting. Must be defined BEFORE /:id to avoid shadowing.
 */
router.get('/pending', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.WORKERS)
      .where('status', 'in', [WORKER_STATUS.PENDING_VETTING, WORKER_STATUS.UNDER_REVIEW])
      .orderBy('createdAt', 'asc')
      .get();

    const workers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return res.json({
      success: true,
      data: { workers, count: workers.length },
      message: 'Pending vetting queue retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /workers
 * Admin registers / onboards a new worker.
 */
router.post('/', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const body = validate(schemas.workerApplication, req.body);

    // Check phone not already in use
    const existing = await db
      .collection(COLLECTIONS.WORKERS)
      .where('phone', '==', body.phone)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message: 'A worker with this phone number already exists.',
      });
    }

    let uid;
    try {
      // Create a Firebase Auth user for the worker
      const firebaseUser = await auth.createUser({
        phoneNumber: body.phone,
        displayName: `${body.firstName} ${body.lastName}`,
        email: body.email || undefined,
      });
      uid = firebaseUser.uid;
    } catch (authErr) {
      // If phone already registered in Auth, look up their UID
      if (authErr.code === 'auth/phone-number-already-exists' || authErr.code === 'auth/email-already-exists') {
        return res.status(409).json({
          success: false,
          message: 'A Firebase account with this phone/email already exists.',
          code: authErr.code,
        });
      }
      throw authErr;
    }

    const defaults = WorkerSchema.defaults();
    const workerData = {
      ...defaults,
      uid,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email || '',
      gender: body.gender,
      dateOfBirth: body.dateOfBirth,
      nin: body.nin,
      role: USER_ROLES.WORKER,
      address: body.address,
      preferredZones: body.preferredZones || [],
      assignedZones: [],
      serviceTypes: body.serviceTypes,
      guarantor: body.guarantor,
      emergencyContact: body.emergencyContact,
      bankAccount: body.bankAccount || {},
      documents: {},
      status: WORKER_STATUS.PENDING_VETTING,
      availability: WORKER_AVAILABILITY.OFFLINE,
      registeredBy: req.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.WORKERS).doc(uid).set(workerData);

    // Set custom claim so Auth token carries worker role
    await auth.setCustomUserClaims(uid, { role: USER_ROLES.WORKER });

    return res.status(201).json({
      success: true,
      data: { id: uid, ...workerData },
      message: 'Worker registered successfully. Vetting required.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /workers/:id
 * Admin: get single worker by ID.
 */
router.get('/:id', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTIONS.WORKERS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    return res.json({
      success: true,
      data: { id: doc.id, ...doc.data() },
      message: 'Worker retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /workers/:id
 * Admin: update worker fields (zones, notes, status, commission).
 */
router.patch('/:id', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const body = validate(schemas.adminUpdateWorker, req.body);

    const doc = await db.collection(COLLECTIONS.WORKERS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const updateData = {
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.WORKERS).doc(req.params.id).update(updateData);

    const updated = await db.collection(COLLECTIONS.WORKERS).doc(req.params.id).get();
    return res.json({
      success: true,
      data: { id: req.params.id, ...updated.data() },
      message: 'Worker updated',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /workers/:id/vet
 * Admin: approve or reject a worker's application.
 */
router.post('/:id/vet', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const body = validate(schemas.vetWorker, req.body);
    const workerId = req.params.id;

    const doc = await db.collection(COLLECTIONS.WORKERS).doc(workerId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const worker = { id: doc.id, ...doc.data() };

    const isApproved = body.status === 'approved';
    const newStatus = isApproved ? WORKER_STATUS.APPROVED : WORKER_STATUS.REJECTED;

    const updateData = {
      status: newStatus,
      vetNotes: body.notes || '',
      vettedBy: req.uid,
      vettedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(isApproved && body.assignedZones && { assignedZones: body.assignedZones }),
      ...(!isApproved && { rejectionReason: body.rejectionReason }),
    };

    if (isApproved) {
      updateData.availability = WORKER_AVAILABILITY.AVAILABLE;
      updateData.isActive = true;
    }

    await db.collection(COLLECTIONS.WORKERS).doc(workerId).update(updateData);

    // Audit log
    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorId: req.uid,
      actorRole: req.user.role,
      action: isApproved ? 'worker.approved' : 'worker.rejected',
      targetId: workerId,
      targetCollection: COLLECTIONS.WORKERS,
      after: { status: newStatus },
      note: body.notes || body.rejectionReason || '',
      createdAt: FieldValue.serverTimestamp(),
    });

    // Notify worker
    notificationsService
      .notifyVettingResult(worker, isApproved, body.rejectionReason)
      .catch(() => {});

    return res.json({
      success: true,
      data: { id: workerId, status: newStatus },
      message: `Worker ${isApproved ? 'approved' : 'rejected'} successfully`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /workers/:id
 * Admin: deactivate / soft-delete a worker.
 */
router.delete('/:id', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const workerId = req.params.id;
    const doc = await db.collection(COLLECTIONS.WORKERS).doc(workerId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    await db.collection(COLLECTIONS.WORKERS).doc(workerId).update({
      status: WORKER_STATUS.INACTIVE,
      isActive: false,
      availability: WORKER_AVAILABILITY.OFFLINE,
      deactivatedBy: req.uid,
      deactivatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Disable Firebase Auth account
    try {
      await auth.updateUser(workerId, { disabled: true });
    } catch (authErr) {
      console.warn('[Workers] Could not disable Firebase auth user:', authErr.message);
    }

    await db.collection(COLLECTIONS.AUDIT_LOGS).add({
      actorId: req.uid,
      actorRole: req.user.role,
      action: 'worker.deactivated',
      targetId: workerId,
      targetCollection: COLLECTIONS.WORKERS,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: { id: workerId, status: WORKER_STATUS.INACTIVE },
      message: 'Worker deactivated successfully',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
