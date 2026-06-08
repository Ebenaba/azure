'use strict';

const admin = require('firebase-admin');
const path = require('path');

let firebaseApp;

/**
 * Initialise Firebase Admin SDK.
 * Supports both a service-account JSON file path and individual env vars.
 */
function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  let credential;

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    const resolvedPath = path.resolve(process.cwd(), serviceAccountPath);
    try {
      const serviceAccount = require(resolvedPath);
      credential = admin.credential.cert(serviceAccount);
    } catch (err) {
      console.error(`[Firebase] Could not load service account from ${resolvedPath}:`, err.message);
      process.exit(1);
    }
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    credential = admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines that may come from env vars
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
  } else {
    // Fall back to Application Default Credentials (GCP / Cloud Run)
    console.warn('[Firebase] No explicit credential found — using Application Default Credentials');
    credential = admin.credential.applicationDefault();
  }

  firebaseApp = admin.initializeApp({
    credential,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  console.log('[Firebase] Admin SDK initialised');
  return firebaseApp;
}

initFirebase();

const db = admin.firestore();
const auth = admin.auth();
const storage = admin.storage();
const messaging = admin.messaging();

// Firestore settings — use timestamps for createdAt/updatedAt
db.settings({ ignoreUndefinedProperties: true });

module.exports = {
  admin,
  db,
  auth,
  storage,
  messaging,
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};
