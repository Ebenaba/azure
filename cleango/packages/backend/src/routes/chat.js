'use strict';

const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { BOOKING_STATUS } = require('../utils/constants');
const { verifyToken } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');
const notificationsService = require('../services/notifications');

/**
 * Verify that the requesting user has access to a booking's chat.
 */
async function verifyBookingAccess(bookingId, uid, userRole) {
  const bookingDoc = await db.collection(COLLECTIONS.BOOKINGS).doc(bookingId).get();
  if (!bookingDoc.exists) {
    const err = new Error('Booking not found.');
    err.statusCode = 404;
    throw err;
  }

  const booking = { id: bookingDoc.id, ...bookingDoc.data() };
  const isAdmin = ['admin', 'super_admin'].includes(userRole);
  const isCustomer = booking.customerId === uid;
  const isWorker = booking.workerId === uid;

  if (!isAdmin && !isCustomer && !isWorker) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return booking;
}

/**
 * Ensure a chat room document exists for this booking.
 */
async function ensureChatRoom(bookingId, booking) {
  const chatRef = db.collection(COLLECTIONS.CHATS).doc(bookingId);
  const chatDoc = await chatRef.get();

  if (!chatDoc.exists) {
    await chatRef.set({
      bookingId,
      customerId: booking.customerId,
      workerId: booking.workerId || null,
      participants: [booking.customerId, booking.workerId].filter(Boolean),
      lastMessage: null,
      lastMessageAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  return chatRef;
}

/**
 * GET /chat/:bookingId
 * Get message history for a booking's chat room.
 * Real-time updates are handled client-side via Firestore listeners.
 */
router.get('/:bookingId', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { limit = 50, before } = req.query;

    const booking = await verifyBookingAccess(bookingId, req.uid, req.user?.role);

    let query = db
      .collection(COLLECTIONS.CHATS)
      .doc(bookingId)
      .collection(COLLECTIONS.CHAT_MESSAGES)
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit));

    // Cursor-based pagination
    if (before) {
      const cursorDoc = await db
        .collection(COLLECTIONS.CHATS)
        .doc(bookingId)
        .collection(COLLECTIONS.CHAT_MESSAGES)
        .doc(before)
        .get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    // Reverse to return chronological order
    const messages = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .reverse();

    return res.json({
      success: true,
      data: {
        bookingId,
        messages,
        count: messages.length,
        participants: {
          customerId: booking.customerId,
          workerId: booking.workerId,
        },
      },
      message: 'Chat history retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /chat/:bookingId
 * Send a message in a booking's chat room.
 * Persists to Firestore; client listeners pick up real-time updates.
 */
router.post('/:bookingId', verifyToken, generalLimiter, async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const body = validate(schemas.sendMessage, req.body);

    const booking = await verifyBookingAccess(bookingId, req.uid, req.user?.role);

    // Only allow chat on active bookings
    const activeStatuses = [
      BOOKING_STATUS.CONFIRMED,
      BOOKING_STATUS.WORKER_EN_ROUTE,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED, // allow post-completion messages briefly
    ];

    if (!activeStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Chat is not available for bookings with status: ${booking.status}`,
      });
    }

    const chatRef = await ensureChatRoom(bookingId, booking);

    const senderRole = req.user?.role || 'customer';

    const messageData = {
      bookingId,
      senderId: req.uid,
      senderRole,
      message: body.message,
      messageType: body.messageType || 'text',
      imageUrl: body.imageUrl || null,
      location: body.location || null,
      isRead: false,
      readBy: [],
      createdAt: FieldValue.serverTimestamp(),
    };

    const messageRef = await chatRef.collection(COLLECTIONS.CHAT_MESSAGES).add(messageData);

    // Update chat room's last message metadata
    await chatRef.update({
      lastMessage: body.message.slice(0, 100),
      lastMessageAt: FieldValue.serverTimestamp(),
      lastMessageBy: req.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Notify the other party
    try {
      const recipientId = senderRole === 'customer' ? booking.workerId : booking.customerId;
      if (recipientId && recipientId !== req.uid) {
        const collection = senderRole === 'customer' ? COLLECTIONS.WORKERS : COLLECTIONS.USERS;
        const recipientDoc = await db.collection(collection).doc(recipientId).get();
        if (recipientDoc.exists) {
          const recipient = recipientDoc.data();
          await notificationsService.dispatch({
            userId: recipientId,
            type: 'chat_message',
            title: 'New Message',
            body: body.message.slice(0, 80),
            fcmToken: recipient.fcmToken,
            relatedId: bookingId,
            relatedType: 'booking',
            data: { bookingId, messageId: messageRef.id },
          });
        }
      }
    } catch (notifErr) {
      console.warn('[Chat] Notification failed:', notifErr.message);
    }

    return res.status(201).json({
      success: true,
      data: { id: messageRef.id, ...messageData },
      message: 'Message sent',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
