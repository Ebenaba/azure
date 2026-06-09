'use strict';

const express = require('express');
const router = express.Router();
const { auth, db, FieldValue } = require('../config/firebase');
const { COLLECTIONS, UserSchema } = require('../models/schemas');
const { USER_ROLES } = require('../utils/constants');
const { verifyToken } = require('../middleware/auth');
const { authLimiter, otpLimiter } = require('../middleware/rateLimiter');
const { validate, schemas } = require('../utils/validators');

/**
 * POST /auth/verify-otp
 * Exchange Firebase phone auth ID token for user session data.
 * Creates a new user doc if first sign-in.
 */
router.post('/verify-otp', otpLimiter, async (req, res, next) => {
  try {
    const { idToken } = validate(schemas.verifyOTP, req.body);

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Check if user already exists
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      // Update last seen
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        lastSeenAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return res.json({
        success: true,
        data: {
          uid,
          isNewUser: false,
          profileComplete: true,
          user: { id: uid, ...userData },
        },
        message: 'Authentication successful',
      });
    }

    // Check workers collection
    const workerDoc = await db.collection(COLLECTIONS.WORKERS).doc(uid).get();
    if (workerDoc.exists) {
      return res.json({
        success: true,
        data: {
          uid,
          isNewUser: false,
          profileComplete: true,
          role: USER_ROLES.WORKER,
          user: { id: uid, ...workerDoc.data() },
        },
        message: 'Authentication successful',
      });
    }

    // New user — profile setup required
    return res.json({
      success: true,
      data: {
        uid,
        isNewUser: true,
        profileComplete: false,
        phone: decoded.phone_number || null,
      },
      message: 'Phone verified. Please complete your profile.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/google
 * Sign in or register with Google ID token.
 */
router.post('/google', authLimiter, async (req, res, next) => {
  try {
    const { idToken } = validate(schemas.googleSignIn, req.body);

    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    if (userDoc.exists) {
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        lastSeenAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return res.json({
        success: true,
        data: {
          uid,
          isNewUser: false,
          profileComplete: true,
          user: { id: uid, ...userDoc.data() },
        },
        message: 'Google sign-in successful',
      });
    }

    // Create minimal profile from Google data
    const defaults = UserSchema.defaults();
    const newUser = {
      ...defaults,
      uid,
      firstName: decoded.name ? decoded.name.split(' ')[0] : '',
      lastName: decoded.name ? decoded.name.split(' ').slice(1).join(' ') : '',
      email: decoded.email || '',
      photoURL: decoded.picture || null,
      phone: decoded.phone_number || '',
      address: { street: '', zone: '', city: 'Kaduna', state: 'Kaduna State' },
      role: USER_ROLES.CUSTOMER,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.USERS).doc(uid).set(newUser);

    return res.status(201).json({
      success: true,
      data: {
        uid,
        isNewUser: true,
        profileComplete: !!(decoded.name && decoded.email),
        user: { id: uid, ...newUser },
      },
      message: 'Google sign-in successful. Please complete your profile.',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/profile
 * Complete or update user profile after initial sign-in.
 */
router.post('/profile', verifyToken, async (req, res, next) => {
  try {
    const body = validate(schemas.setupProfile, req.body);
    const uid = req.uid;

    const existingUser = await db.collection(COLLECTIONS.USERS).doc(uid).get();

    if (body.role === USER_ROLES.WORKER) {
      // Worker profile is handled via /workers route
      return res.status(400).json({
        success: false,
        message: 'Worker registration must go through /workers endpoint.',
      });
    }

    const defaults = UserSchema.defaults();

    if (existingUser.exists) {
      // Update existing profile
      const updateData = {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        ...(body.email && { email: body.email }),
        address: {
          street: body.address.street,
          zone: body.address.zone,
          city: body.address.city || 'Kaduna',
          state: body.address.state || 'Kaduna State',
          ...(body.address.coordinates && { coordinates: body.address.coordinates }),
        },
        ...(body.fcmToken && { fcmToken: body.fcmToken }),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await db.collection(COLLECTIONS.USERS).doc(uid).update(updateData);
      const updated = await db.collection(COLLECTIONS.USERS).doc(uid).get();
      return res.json({
        success: true,
        data: { id: uid, ...updated.data() },
        message: 'Profile updated successfully',
      });
    }

    // Create new profile
    const userData = {
      ...defaults,
      uid,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      email: body.email || '',
      photoURL: req.firebaseUser?.picture || null,
      role: USER_ROLES.CUSTOMER,
      address: {
        street: body.address.street,
        zone: body.address.zone,
        city: body.address.city || 'Kaduna',
        state: body.address.state || 'Kaduna State',
        ...(body.address.coordinates && { coordinates: body.address.coordinates }),
      },
      ...(body.fcmToken && { fcmToken: body.fcmToken }),
      isVerified: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTIONS.USERS).doc(uid).set(userData);

    return res.status(201).json({
      success: true,
      data: { id: uid, ...userData },
      message: 'Profile created successfully',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /auth/me
 * Get current authenticated user's profile.
 */
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    if (!req.user || req.user._isNew) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found. Please complete setup.',
        data: { isNewUser: true },
      });
    }

    // Update last seen
    const collection = req.user._collection || COLLECTIONS.USERS;
    await db.collection(collection).doc(req.uid).update({
      lastSeenAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: req.user,
      message: 'Profile retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /auth/fcm-token
 * Update FCM device token for push notifications.
 */
router.patch('/fcm-token', verifyToken, async (req, res, next) => {
  try {
    const { fcmToken } = validate(schemas.updateFcmToken, req.body);
    const uid = req.uid;

    // Determine user collection
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(uid).get();
    const collection = userDoc.exists ? COLLECTIONS.USERS : COLLECTIONS.WORKERS;

    await db.collection(collection).doc(uid).update({
      fcmToken,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.json({
      success: true,
      data: { fcmToken },
      message: 'FCM token updated',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
