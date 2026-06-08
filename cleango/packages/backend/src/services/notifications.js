'use strict';

const sgMail = require('@sendgrid/mail');
const { messaging, db } = require('../config/firebase');
const twilioConfig = require('../config/twilio');
const { COLLECTIONS } = require('../models/schemas');
const { NOTIFICATION_TYPES } = require('../utils/constants');
const { FieldValue } = require('../config/firebase');

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// ─── FCM Push Notifications ───────────────────────────────────────────────────

/**
 * Send FCM push notification to a single device
 * @param {string} fcmToken
 * @param {string} title
 * @param {string} body
 * @param {Object} [data] - Additional key-value data
 * @returns {Promise<boolean>}
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.warn('[Notifications] No FCM token provided, skipping push');
    return false;
  }

  try {
    const message = {
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: {
        notification: {
          channelId: 'cleango_default',
          priority: 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    await messaging.send(message);
    return true;
  } catch (err) {
    // Token invalid/expired
    if (err.code === 'messaging/invalid-registration-token' ||
        err.code === 'messaging/registration-token-not-registered') {
      console.warn(`[Notifications] Invalid FCM token: ${fcmToken.slice(0, 20)}...`);
      // Optionally clear stale token from DB here
      return false;
    }
    console.error('[Notifications] FCM push error:', err.message);
    return false;
  }
}

/**
 * Send FCM push to multiple devices (multicast)
 * @param {string[]} fcmTokens
 * @param {string} title
 * @param {string} body
 * @param {Object} [data]
 * @returns {Promise<{ success: number, failure: number }>}
 */
async function sendMulticastPush(fcmTokens, title, body, data = {}) {
  const validTokens = fcmTokens.filter(Boolean);
  if (validTokens.length === 0) return { success: 0, failure: 0 };

  const message = {
    tokens: validTokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    android: { notification: { channelId: 'cleango_default', priority: 'high', sound: 'default' } },
    apns: { payload: { aps: { sound: 'default', badge: 1 } } },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    return {
      success: response.successCount,
      failure: response.failureCount,
    };
  } catch (err) {
    console.error('[Notifications] Multicast FCM error:', err.message);
    return { success: 0, failure: validTokens.length };
  }
}

// ─── SMS via Twilio ───────────────────────────────────────────────────────────

/**
 * Send SMS via Twilio
 * @param {string} to - Phone in international format (+234...)
 * @param {string} body
 * @returns {Promise<boolean>}
 */
async function sendSMS(to, body) {
  if (!twilioConfig.isEnabled) {
    console.warn('[Notifications] Twilio not configured, skipping SMS to:', to);
    return false;
  }

  try {
    await twilioConfig.client.messages.create({
      body,
      from: twilioConfig.phoneNumber,
      to,
    });
    console.log(`[Notifications] SMS sent to ${to.slice(0, 7)}****`);
    return true;
  } catch (err) {
    console.error('[Notifications] Twilio SMS error:', err.message);
    return false;
  }
}

/**
 * Send WhatsApp message via Twilio
 * @param {string} to - Phone in international format
 * @param {string} body
 * @returns {Promise<boolean>}
 */
async function sendWhatsApp(to, body) {
  if (!twilioConfig.isEnabled) {
    console.warn('[Notifications] Twilio not configured, skipping WhatsApp');
    return false;
  }

  try {
    await twilioConfig.client.messages.create({
      body,
      from: twilioConfig.whatsappNumber,
      to: `whatsapp:${to}`,
    });
    return true;
  } catch (err) {
    console.error('[Notifications] WhatsApp error:', err.message);
    return false;
  }
}

// ─── Email via SendGrid ───────────────────────────────────────────────────────

/**
 * Send email via SendGrid
 * @param {Object} params
 * @param {string} params.to
 * @param {string} params.subject
 * @param {string} params.html
 * @param {string} [params.text]
 * @returns {Promise<boolean>}
 */
async function sendEmail({ to, subject, html, text }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('[Notifications] SendGrid not configured, skipping email');
    return false;
  }

  try {
    await sgMail.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@cleango.ng',
        name: process.env.SENDGRID_FROM_NAME || 'CleanGo',
      },
      subject,
      html,
      text: text || subject,
    });
    return true;
  } catch (err) {
    console.error('[Notifications] SendGrid error:', err.message);
    return false;
  }
}

// ─── Firestore Notification Record ───────────────────────────────────────────

/**
 * Persist a notification record to Firestore
 * @param {Object} params
 * @returns {Promise<string>} Notification document ID
 */
async function saveNotification({ userId, type, title, body, data = {}, channels = ['push'], relatedId, relatedType }) {
  const notif = {
    userId,
    type,
    title,
    body,
    data,
    channels,
    isRead: false,
    pushSent: false,
    smsSent: false,
    emailSent: false,
    relatedId: relatedId || null,
    relatedType: relatedType || null,
    createdAt: FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(COLLECTIONS.NOTIFICATIONS).add(notif);
  return ref.id;
}

// ─── High-Level Dispatch ──────────────────────────────────────────────────────

/**
 * Full notification dispatch: FCM + SMS + Firestore record
 * @param {Object} params
 * @param {string} params.userId - Target user/worker UID
 * @param {string} params.type - NOTIFICATION_TYPES key
 * @param {string} params.title
 * @param {string} params.body
 * @param {string} [params.phone] - For SMS
 * @param {string} [params.fcmToken] - For push
 * @param {boolean} [params.sendSMS]
 * @param {boolean} [params.sendWhatsApp]
 * @param {Object} [params.data] - Extra metadata
 * @param {string} [params.relatedId]
 * @param {string} [params.relatedType]
 */
async function dispatch({
  userId,
  type,
  title,
  body,
  phone = null,
  fcmToken = null,
  sendSMS: doSendSMS = false,
  sendWhatsApp: doSendWhatsApp = false,
  data = {},
  relatedId = null,
  relatedType = null,
}) {
  const channels = ['push'];
  if (doSendSMS || doSendWhatsApp) channels.push('sms');

  const notifId = await saveNotification({
    userId, type, title, body, data, channels, relatedId, relatedType,
  });

  const results = { push: false, sms: false, whatsapp: false };

  // Push notification
  if (fcmToken) {
    results.push = await sendPushNotification(fcmToken, title, body, { ...data, notifId });
    if (results.push) {
      await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notifId).update({ pushSent: true });
    }
  }

  // SMS
  if (doSendSMS && phone) {
    results.sms = await sendSMS(phone, `CleanGo: ${body}`);
    if (results.sms) {
      await db.collection(COLLECTIONS.NOTIFICATIONS).doc(notifId).update({ smsSent: true });
    }
  }

  // WhatsApp (optional alternative)
  if (doSendWhatsApp && phone) {
    results.whatsapp = await sendWhatsApp(phone, `*CleanGo*\n${title}\n\n${body}`);
  }

  return { notifId, results };
}

// ─── Pre-built Notification Templates ────────────────────────────────────────

async function notifyBookingConfirmed(user, booking) {
  return dispatch({
    userId: user.id,
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'Booking Confirmed ✓',
    body: `Your ${booking.serviceType.replace(/_/g, ' ')} booking (${booking.bookingRef}) is confirmed for ${booking.scheduledDate} at ${booking.scheduledTime}.`,
    fcmToken: user.fcmToken,
    phone: user.phone,
    sendSMS: user.notificationPreferences?.sms !== false,
    relatedId: booking.id,
    relatedType: 'booking',
  });
}

async function notifyWorkerAssigned(user, booking, worker) {
  return dispatch({
    userId: user.id,
    type: NOTIFICATION_TYPES.WORKER_ASSIGNED,
    title: 'Worker Assigned',
    body: `${worker.firstName} ${worker.lastName} has been assigned to your booking ${booking.bookingRef}. They will arrive on ${booking.scheduledDate} at ${booking.scheduledTime}.`,
    fcmToken: user.fcmToken,
    phone: user.phone,
    sendSMS: user.notificationPreferences?.sms !== false,
    data: { workerId: worker.id, workerName: `${worker.firstName} ${worker.lastName}` },
    relatedId: booking.id,
    relatedType: 'booking',
  });
}

async function notifyWorkerNewJob(worker, booking) {
  return dispatch({
    userId: worker.id,
    type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
    title: 'New Job Assigned',
    body: `You have a new ${booking.serviceType.replace(/_/g, ' ')} job on ${booking.scheduledDate} at ${booking.scheduledTime} in ${booking.address.zone}.`,
    fcmToken: worker.fcmToken,
    phone: worker.phone,
    sendSMS: true,
    relatedId: booking.id,
    relatedType: 'booking',
  });
}

async function notifyJobCompleted(user, booking, amountNaira) {
  return dispatch({
    userId: user.id,
    type: NOTIFICATION_TYPES.JOB_COMPLETED,
    title: 'Job Completed',
    body: `Your cleaning job (${booking.bookingRef}) is complete! Please rate your experience. Your payment of ₦${amountNaira.toLocaleString()} is being held securely.`,
    fcmToken: user.fcmToken,
    phone: user.phone,
    sendSMS: user.notificationPreferences?.sms !== false,
    relatedId: booking.id,
    relatedType: 'booking',
  });
}

async function notifyPaymentSuccess(user, amount, bookingRef) {
  return dispatch({
    userId: user.id,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: 'Payment Successful',
    body: `Payment of ₦${amount.toLocaleString()} received for booking ${bookingRef}. Funds are held in escrow until your job is complete.`,
    fcmToken: user.fcmToken,
    phone: user.phone,
    sendSMS: user.notificationPreferences?.sms !== false,
  });
}

async function notifyVettingResult(worker, approved, reason) {
  const type = approved ? NOTIFICATION_TYPES.VETTING_APPROVED : NOTIFICATION_TYPES.VETTING_REJECTED;
  const title = approved ? 'Application Approved!' : 'Application Update';
  const body = approved
    ? 'Congratulations! Your CleanGo worker application has been approved. You can now start accepting jobs.'
    : `Your application was not approved at this time. Reason: ${reason || 'Please contact support.'}`;

  return dispatch({
    userId: worker.id,
    type,
    title,
    body,
    fcmToken: worker.fcmToken,
    phone: worker.phone,
    sendSMS: true,
  });
}

async function notifyEscrowReleased(worker, amount) {
  return dispatch({
    userId: worker.id,
    type: NOTIFICATION_TYPES.ESCROW_RELEASED,
    title: 'Payment Released',
    body: `₦${amount.toLocaleString()} has been transferred to your bank account. Thank you for your service!`,
    fcmToken: worker.fcmToken,
    phone: worker.phone,
    sendSMS: true,
  });
}

async function notifySubscriptionExpiring(user, daysLeft) {
  return dispatch({
    userId: user.id,
    type: NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRING,
    title: 'Subscription Expiring Soon',
    body: `Your CleanGo monthly subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to keep enjoying priority service.`,
    fcmToken: user.fcmToken,
    phone: user.phone,
    sendSMS: user.notificationPreferences?.sms !== false,
  });
}

module.exports = {
  sendPushNotification,
  sendMulticastPush,
  sendSMS,
  sendWhatsApp,
  sendEmail,
  saveNotification,
  dispatch,
  // Templates
  notifyBookingConfirmed,
  notifyWorkerAssigned,
  notifyWorkerNewJob,
  notifyJobCompleted,
  notifyPaymentSuccess,
  notifyVettingResult,
  notifyEscrowReleased,
  notifySubscriptionExpiring,
};
