'use strict';

const { auth, db } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { USER_ROLES, WORKER_STATUS } = require('../utils/constants');

/**
 * Verify Firebase ID token and attach user to req.user
 */
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No authorization token provided' });
    }

    const idToken = authHeader.split('Bearer ')[1];
    if (!idToken) {
      return res.status(401).json({ success: false, message: 'Invalid authorization header format' });
    }

    const decodedToken = await auth.verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    req.uid = decodedToken.uid;

    // Optionally load full user profile from Firestore
    const userDoc = await db.collection(COLLECTIONS.USERS).doc(decodedToken.uid).get();
    if (userDoc.exists) {
      req.user = { id: userDoc.id, ...userDoc.data() };
    } else {
      // Check workers collection
      const workerDoc = await db.collection(COLLECTIONS.WORKERS).doc(decodedToken.uid).get();
      if (workerDoc.exists) {
        req.user = { id: workerDoc.id, ...workerDoc.data(), _collection: COLLECTIONS.WORKERS };
      } else {
        // First-time user not yet profiled
        req.user = {
          id: decodedToken.uid,
          uid: decodedToken.uid,
          email: decodedToken.email,
          phone: decodedToken.phone_number,
          role: null,
          _isNew: true,
        };
      }
    }

    next();
  } catch (err) {
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ success: false, message: 'Token expired. Please sign in again.' });
    }
    if (err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    console.error('[Auth Middleware] Token verification error:', err.message);
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
}

/**
 * Optional auth — attach user if token provided but don't fail if not
 */
async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    req.uid = null;
    return next();
  }
  return verifyToken(req, res, next);
}

/**
 * Role-based access control factory
 * Usage: requireRole('admin') or requireRole(['admin', 'super_admin'])
 */
function requireRole(...roles) {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }
    next();
  };
}

/**
 * Require customer role
 */
const requireCustomer = requireRole(USER_ROLES.CUSTOMER);

/**
 * Require worker role AND approved status
 */
async function requireActiveWorker(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  if (req.user.role !== USER_ROLES.WORKER) {
    return res.status(403).json({ success: false, message: 'Worker access only' });
  }
  if (req.user.status !== WORKER_STATUS.APPROVED) {
    return res.status(403).json({
      success: false,
      message: `Worker account not approved. Current status: ${req.user.status}`,
    });
  }
  if (!req.user.isActive) {
    return res.status(403).json({ success: false, message: 'Worker account is inactive' });
  }
  next();
}

/**
 * Require admin or super_admin role
 */
const requireAdmin = requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN);

/**
 * Require super admin only
 */
const requireSuperAdmin = requireRole(USER_ROLES.SUPER_ADMIN);

/**
 * Ensure the authenticated user can only access their own resource
 * unless they are an admin.
 * Usage: requireOwnerOrAdmin('userId') — checks req.params.userId === req.uid
 */
function requireOwnerOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(req.user.role);
    const isOwner = req.params[paramName] === req.uid || req.params[paramName] === req.user.id;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  };
}

/**
 * Check that worker's profile is complete before allowing job operations
 */
async function requireCompleteWorkerProfile(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const worker = req.user;
  const missingFields = [];
  if (!worker.bankAccount?.paystackRecipientCode) missingFields.push('bankAccount');
  if (!worker.documents?.profilePhoto) missingFields.push('profilePhoto');
  if (missingFields.length > 0) {
    return res.status(403).json({
      success: false,
      message: 'Please complete your worker profile before accepting jobs',
      missingFields,
    });
  }
  next();
}

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requireCustomer,
  requireActiveWorker,
  requireAdmin,
  requireSuperAdmin,
  requireOwnerOrAdmin,
  requireCompleteWorkerProfile,
};
