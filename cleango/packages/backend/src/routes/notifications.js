'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { generalLimiter, adminLimiter } = require('../middleware/rateLimiter');
const notificationsService = require('../services/notifications');

/**
 * GET /notifications
 * Customer/Worker: list own notifications, newest first.
 */
router.get('/', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const { page = 1, limit = 30, unreadOnly } = req.query;

    let query = db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', req.uid)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));

    if (unreadOnly === 'true') {
      query = db
        .collection(COLLECTIONS.NOTIFICATIONS)
        .where('userId', '==', req.uid)
        .where('isRead', '==', false)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(limit));
    }

    const snapshot = await query.get();
    const notifications = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Count unread separately
    const unreadSnap = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', req.uid)
      .where('isRead', '==', false)
      .count()
      .get();

    const unreadCount = unreadSnap.data().count;

    return res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        unreadCount,
        page: parseInt(page),
      },
      message: 'Notifications retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/:id/read
 * Mark a single notification as read.
 */
router.patch('/:id/read', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (doc.data().userId !== req.uid) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).update({
      isRead: true,
      readAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: { id: req.params.id, isRead: true },
      message: 'Notification marked as read',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /notifications/read-all
 * Mark all of the current user's notifications as read.
 */
router.patch('/read-all', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const snapshot = await db
      .collection(COLLECTIONS.NOTIFICATIONS)
      .where('userId', '==', req.uid)
      .where('isRead', '==', false)
      .get();

    if (snapshot.empty) {
      return res.json({
        success: true,
        data: { updated: 0 },
        message: 'No unread notifications to mark.',
      });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        isRead: true,
        readAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();

    return res.json({
      success: true,
      data: { updated: snapshot.size },
      message: `${snapshot.size} notification(s) marked as read`,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /notifications/:id
 * Delete a notification. User can only delete their own.
 */
router.delete('/:id', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    if (!isAdmin && doc.data().userId !== req.uid) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await db.collection(COLLECTIONS.NOTIFICATIONS).doc(req.params.id).delete();

    return res.json({
      success: true,
      data: { id: req.params.id },
      message: 'Notification deleted',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /notifications/broadcast
 * Admin: broadcast a push notification to a set of users or all users.
 * Body: { title, body, userIds?: string[], role?: 'customer'|'worker', data?: {} }
 */
router.post('/broadcast', verifyToken, requireAdmin, adminLimiter, async (req, res, next) => {
  try {
    const { title, body, userIds, role, data = {} } = req.body;

    if (!title || !body) {
      return res.status(422).json({ success: false, message: 'title and body are required.' });
    }

    let fcmTokens = [];
    let targetUsers = [];

    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Specific users
      const userDocs = await Promise.all([
        ...userIds.map((uid) => db.collection(COLLECTIONS.USERS).doc(uid).get()),
        ...userIds.map((uid) => db.collection(COLLECTIONS.WORKERS).doc(uid).get()),
      ]);
      targetUsers = userDocs.filter((d) => d.exists).map((d) => ({ id: d.id, ...d.data() }));
    } else if (role) {
      // All users of a given role
      const collection = role === 'worker' ? COLLECTIONS.WORKERS : COLLECTIONS.USERS;
      const snap = await db.collection(collection).where('isActive', '==', true).get();
      targetUsers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      // All active users
      const [usersSnap, workersSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).where('isActive', '==', true).get(),
        db.collection(COLLECTIONS.WORKERS).where('isActive', '==', true).get(),
      ]);
      targetUsers = [
        ...usersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        ...workersSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
      ];
    }

    fcmTokens = targetUsers.map((u) => u.fcmToken).filter(Boolean);

    // Save notification records in Firestore for each user
    const batch = db.batch();
    for (const user of targetUsers) {
      const notifRef = db.collection(COLLECTIONS.NOTIFICATIONS).doc();
      batch.set(notifRef, {
        userId: user.id,
        type: 'broadcast',
        title,
        body,
        data,
        isRead: false,
        pushSent: false,
        smsSent: false,
        emailSent: false,
        channels: ['push'],
        isBroadcast: true,
        sentBy: req.uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    // Send FCM multicast
    const pushResult = fcmTokens.length > 0
      ? await notificationsService.sendMulticastPush(fcmTokens, title, body, data)
      : { success: 0, failure: 0 };

    return res.json({
      success: true,
      data: {
        targetCount: targetUsers.length,
        fcmTokenCount: fcmTokens.length,
        pushDelivered: pushResult.success,
        pushFailed: pushResult.failure,
      },
      message: `Broadcast sent to ${targetUsers.length} user(s)`,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
