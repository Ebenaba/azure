'use strict';

/**
 * Firestore Collection Schemas (JSDoc type definitions)
 * These are used for documentation, validation, and seed data structure.
 * Firestore is schema-less — these define the expected shape of each document.
 */

// ─── Collection Names ─────────────────────────────────────────────────────────
const COLLECTIONS = {
  USERS: 'users',
  WORKERS: 'workers',
  BOOKINGS: 'bookings',
  SERVICES: 'services',
  REVIEWS: 'reviews',
  PAYMENTS: 'payments',
  NOTIFICATIONS: 'notifications',
  ZONES: 'zones',
  COMPLAINTS: 'complaints',
  AUDIT_LOGS: 'auditLogs',
  CHATS: 'chats',
  CHAT_MESSAGES: 'messages', // subcollection of chats
  SUBSCRIPTIONS: 'subscriptions',
  PRAYER_TIMES: 'prayerTimes',
  WORKER_LOCATIONS: 'workerLocations',
  ESCROW: 'escrow',
  PROMO_CODES: 'promoCodes',
};

/**
 * @typedef {Object} UserSchema
 * @property {string} uid - Firebase Auth UID
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} phone - International format (+234...)
 * @property {string} [email]
 * @property {string} role - 'customer' | 'admin' | 'super_admin'
 * @property {Object} address
 * @property {string} address.street
 * @property {string} address.zone
 * @property {string} address.city
 * @property {string} address.state
 * @property {{lat: number, lng: number}} [address.coordinates]
 * @property {string} [fcmToken] - Firebase Cloud Messaging token
 * @property {string} [photoURL]
 * @property {boolean} isVerified
 * @property {boolean} isActive
 * @property {number} totalBookings
 * @property {number} totalSpent - Naira
 * @property {string} [activeSubscriptionId]
 * @property {string[]} preferredWorkerIds
 * @property {string[]} blockedWorkerIds
 * @property {Object} notificationPreferences
 * @property {boolean} notificationPreferences.sms
 * @property {boolean} notificationPreferences.push
 * @property {boolean} notificationPreferences.email
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 * @property {FirebaseFirestore.Timestamp} [lastSeenAt]
 */

const UserSchema = {
  collection: COLLECTIONS.USERS,
  fields: {
    uid: 'string',
    firstName: 'string',
    lastName: 'string',
    phone: 'string',
    email: 'string|optional',
    role: 'enum:customer,admin,super_admin',
    address: {
      street: 'string',
      zone: 'string',
      city: 'string',
      state: 'string',
      coordinates: { lat: 'number|optional', lng: 'number|optional' },
    },
    fcmToken: 'string|optional',
    photoURL: 'string|optional',
    isVerified: 'boolean',
    isActive: 'boolean',
    totalBookings: 'number',
    totalSpent: 'number',
    activeSubscriptionId: 'string|optional',
    preferredWorkerIds: 'array',
    blockedWorkerIds: 'array',
    notificationPreferences: {
      sms: 'boolean',
      push: 'boolean',
      email: 'boolean',
    },
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
    lastSeenAt: 'timestamp|optional',
  },
  defaults: () => ({
    role: 'customer',
    isVerified: false,
    isActive: true,
    totalBookings: 0,
    totalSpent: 0,
    preferredWorkerIds: [],
    blockedWorkerIds: [],
    notificationPreferences: { sms: true, push: true, email: true },
  }),
};

/**
 * @typedef {Object} WorkerSchema
 * @property {string} uid - Firebase Auth UID
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} phone
 * @property {string} [email]
 * @property {string} gender - 'male' | 'female'
 * @property {string} dateOfBirth - ISO date
 * @property {string} nin - National Identification Number
 * @property {string} status - 'pending_vetting' | 'under_review' | 'approved' | 'rejected' | 'suspended' | 'inactive'
 * @property {string} availability - 'available' | 'busy' | 'offline' | 'on_break'
 * @property {string[]} assignedZones - Zone keys
 * @property {string[]} serviceTypes - Service type keys
 * @property {Object} address
 * @property {Object} guarantor
 * @property {Object} emergencyContact
 * @property {Object} documents
 * @property {string} [documents.ninPhoto] - Storage URL
 * @property {string} [documents.guarantorLetter] - Storage URL
 * @property {string} [documents.policeReport] - Storage URL
 * @property {string} [documents.profilePhoto] - Storage URL
 * @property {FirebaseFirestore.Timestamp} [documents.policeReportExpiry]
 * @property {Object} bankAccount
 * @property {string} bankAccount.accountNumber
 * @property {string} bankAccount.bankCode
 * @property {string} bankAccount.accountName
 * @property {string} [bankAccount.paystackRecipientCode]
 * @property {number} rating - Average rating (0-5)
 * @property {number} totalReviews
 * @property {number} totalJobsCompleted
 * @property {number} totalEarnings - Naira
 * @property {number} commissionRate - Percentage (default 15)
 * @property {{lat: number, lng: number}} [lastLocation]
 * @property {FirebaseFirestore.Timestamp} [lastLocationAt]
 * @property {string} [fcmToken]
 * @property {string} [vetNotes] - Admin notes during vetting
 * @property {string} [rejectionReason]
 * @property {string} [vettedBy] - Admin UID
 * @property {FirebaseFirestore.Timestamp} [vettedAt]
 * @property {boolean} isActive
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const WorkerSchema = {
  collection: COLLECTIONS.WORKERS,
  fields: {
    uid: 'string',
    firstName: 'string',
    lastName: 'string',
    phone: 'string',
    email: 'string|optional',
    gender: 'enum:male,female',
    dateOfBirth: 'string',
    nin: 'string',
    status: 'enum:pending_vetting,under_review,approved,rejected,suspended,inactive',
    availability: 'enum:available,busy,offline,on_break',
    assignedZones: 'array',
    serviceTypes: 'array',
    address: { street: 'string', zone: 'string', city: 'string' },
    guarantor: { name: 'string', phone: 'string', relationship: 'string', address: 'string' },
    emergencyContact: { name: 'string', phone: 'string', relationship: 'string' },
    documents: {
      ninPhoto: 'string|optional',
      guarantorLetter: 'string|optional',
      policeReport: 'string|optional',
      profilePhoto: 'string|optional',
      policeReportExpiry: 'timestamp|optional',
    },
    bankAccount: {
      accountNumber: 'string',
      bankCode: 'string',
      accountName: 'string',
      paystackRecipientCode: 'string|optional',
    },
    rating: 'number',
    totalReviews: 'number',
    totalJobsCompleted: 'number',
    totalEarnings: 'number',
    commissionRate: 'number',
    lastLocation: 'object|optional',
    lastLocationAt: 'timestamp|optional',
    fcmToken: 'string|optional',
    vetNotes: 'string|optional',
    rejectionReason: 'string|optional',
    vettedBy: 'string|optional',
    vettedAt: 'timestamp|optional',
    isActive: 'boolean',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  defaults: () => ({
    status: 'pending_vetting',
    availability: 'offline',
    assignedZones: [],
    serviceTypes: [],
    documents: {},
    rating: 0,
    totalReviews: 0,
    totalJobsCompleted: 0,
    totalEarnings: 0,
    commissionRate: 15,
    isActive: true,
  }),
};

/**
 * @typedef {Object} BookingSchema
 * @property {string} bookingRef - Unique ref like CG-20240801-ABCDEF
 * @property {string} customerId - User UID
 * @property {string} [workerId] - Assigned worker UID
 * @property {string} serviceType
 * @property {string} status
 * @property {Object} address
 * @property {string} scheduledDate - YYYY-MM-DD
 * @property {string} scheduledTime - HH:MM
 * @property {FirebaseFirestore.Timestamp} [startedAt]
 * @property {FirebaseFirestore.Timestamp} [completedAt]
 * @property {string} propertyType
 * @property {number} [bedrooms]
 * @property {number} [bathrooms]
 * @property {number} [squareMeters]
 * @property {string[]} addOns
 * @property {string} [specialInstructions]
 * @property {string} preferredWorkerGender
 * @property {number} quoteAmount - Naira
 * @property {number} finalAmount - Naira (after discounts)
 * @property {number} discountAmount - Naira
 * @property {string} [promoCode]
 * @property {string} paymentStatus
 * @property {string} [paymentId]
 * @property {string} [escrowId]
 * @property {boolean} isRecurring
 * @property {string} [recurringFrequency]
 * @property {string} [subscriptionId]
 * @property {string} [cancellationReason]
 * @property {string} [cancelledBy] - 'customer' | 'worker' | 'admin'
 * @property {boolean} hasReview
 * @property {string} [reviewId]
 * @property {string[]} completionPhotos
 * @property {Object} [workerSnapshot] - Denormalized worker info at booking time
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const BookingSchema = {
  collection: COLLECTIONS.BOOKINGS,
  fields: {
    bookingRef: 'string',
    customerId: 'string',
    workerId: 'string|optional',
    serviceType: 'string',
    status: 'string',
    address: { street: 'string', zone: 'string', city: 'string', coordinates: 'object|optional' },
    scheduledDate: 'string',
    scheduledTime: 'string',
    startedAt: 'timestamp|optional',
    completedAt: 'timestamp|optional',
    propertyType: 'string',
    bedrooms: 'number|optional',
    bathrooms: 'number|optional',
    squareMeters: 'number|optional',
    addOns: 'array',
    specialInstructions: 'string|optional',
    preferredWorkerGender: 'string',
    quoteAmount: 'number',
    finalAmount: 'number',
    discountAmount: 'number',
    promoCode: 'string|optional',
    paymentStatus: 'string',
    paymentId: 'string|optional',
    escrowId: 'string|optional',
    isRecurring: 'boolean',
    recurringFrequency: 'string|optional',
    subscriptionId: 'string|optional',
    cancellationReason: 'string|optional',
    cancelledBy: 'string|optional',
    hasReview: 'boolean',
    reviewId: 'string|optional',
    completionPhotos: 'array',
    workerSnapshot: 'object|optional',
    createdAt: 'timestamp',
    updatedAt: 'timestamp',
  },
  defaults: () => ({
    addOns: [],
    preferredWorkerGender: 'any',
    discountAmount: 0,
    paymentStatus: 'pending',
    isRecurring: false,
    hasReview: false,
    completionPhotos: [],
  }),
};

/**
 * @typedef {Object} ServiceSchema
 * @property {string} key - Unique identifier
 * @property {string} label
 * @property {string} description
 * @property {number} minPrice - Naira
 * @property {number} [maxPrice] - Naira
 * @property {{min: number, max: number}} [estimatedHours]
 * @property {string} [unit] - 'per_kg' | 'per_item'
 * @property {boolean} requiresQuote
 * @property {boolean} isActive
 * @property {string[]} availableAddOns
 * @property {string} [imageUrl]
 * @property {number} sortOrder
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const ServiceSchema = {
  collection: COLLECTIONS.SERVICES,
  defaults: () => ({
    requiresQuote: false,
    isActive: true,
    availableAddOns: [],
    sortOrder: 99,
  }),
};

/**
 * @typedef {Object} ReviewSchema
 * @property {string} bookingId
 * @property {string} customerId
 * @property {string} workerId
 * @property {number} rating - 1-5
 * @property {string} [comment]
 * @property {Object} [categories]
 * @property {boolean} isAnonymous
 * @property {boolean} [wouldRecommend]
 * @property {boolean} isVisible
 * @property {string} [adminNote]
 * @property {FirebaseFirestore.Timestamp} createdAt
 */

const ReviewSchema = {
  collection: COLLECTIONS.REVIEWS,
  defaults: () => ({
    isAnonymous: false,
    isVisible: true,
  }),
};

/**
 * @typedef {Object} PaymentSchema
 * @property {string} bookingId
 * @property {string} customerId
 * @property {string} [workerId]
 * @property {number} amount - Naira
 * @property {number} amountKobo - For Paystack
 * @property {string} currency - 'NGN'
 * @property {string} status
 * @property {string} [paystackReference]
 * @property {string} [paystackTransactionId]
 * @property {string} [paystackAccessCode]
 * @property {string} [paystackAuthorizationUrl]
 * @property {Object} [paystackWebhookData] - Raw webhook payload
 * @property {number} commissionAmount - Naira
 * @property {number} workerPayout - Naira
 * @property {string} [escrowId]
 * @property {boolean} isEscrowed
 * @property {FirebaseFirestore.Timestamp} [escrowedAt]
 * @property {FirebaseFirestore.Timestamp} [releasedAt]
 * @property {string} [releasedBy] - Admin UID or 'auto'
 * @property {string} [paystackTransferCode] - For worker payout
 * @property {string} [refundReference]
 * @property {string} [failureReason]
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const PaymentSchema = {
  collection: COLLECTIONS.PAYMENTS,
  defaults: () => ({
    currency: 'NGN',
    isEscrowed: false,
  }),
};

/**
 * @typedef {Object} NotificationSchema
 * @property {string} userId - Recipient UID
 * @property {string} type
 * @property {string} title
 * @property {string} body
 * @property {Object} [data] - Additional key-value data
 * @property {boolean} isRead
 * @property {string[]} channels - ['push', 'sms', 'email']
 * @property {boolean} pushSent
 * @property {boolean} smsSent
 * @property {boolean} emailSent
 * @property {string} [relatedId] - bookingId, workerId, etc.
 * @property {string} [relatedType] - 'booking', 'payment', etc.
 * @property {FirebaseFirestore.Timestamp} createdAt
 */

const NotificationSchema = {
  collection: COLLECTIONS.NOTIFICATIONS,
  defaults: () => ({
    isRead: false,
    pushSent: false,
    smsSent: false,
    emailSent: false,
    channels: ['push'],
  }),
};

/**
 * @typedef {Object} ZoneSchema
 * @property {string} key - e.g. 'gra', 'barnawa'
 * @property {string} name - Display name
 * @property {string} [localName] - Hausa/local name
 * @property {{lat: number, lng: number}} center
 * @property {number} radiusKm - Coverage radius
 * @property {string[]} [subAreas] - Sub-neighbourhood names
 * @property {boolean} isActive
 * @property {boolean} isServiceable
 * @property {number} currentActiveWorkers
 * @property {string} senateDistrict - Kaduna district
 * @property {FirebaseFirestore.Timestamp} createdAt
 */

const ZoneSchema = {
  collection: COLLECTIONS.ZONES,
  defaults: () => ({
    isActive: true,
    isServiceable: true,
    currentActiveWorkers: 0,
    subAreas: [],
  }),
};

/**
 * @typedef {Object} ComplaintSchema
 * @property {string} bookingId
 * @property {string} complainantId - UID of person filing complaint
 * @property {string} complainantRole - 'customer' | 'worker'
 * @property {string} [accusedId] - UID of person being complained about
 * @property {string} category
 * @property {string} description
 * @property {string[]} evidenceUrls
 * @property {string} status - 'open' | 'under_investigation' | 'resolved' | 'dismissed'
 * @property {string} [resolution]
 * @property {string} [resolvedBy]
 * @property {FirebaseFirestore.Timestamp} [resolvedAt]
 * @property {Object[]} [auditTrail]
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const ComplaintSchema = {
  collection: COLLECTIONS.COMPLAINTS,
  defaults: () => ({
    status: 'open',
    evidenceUrls: [],
    auditTrail: [],
  }),
};

/**
 * @typedef {Object} AuditLogSchema
 * @property {string} actorId - UID of who performed the action
 * @property {string} actorRole
 * @property {string} action - e.g. 'booking.cancelled', 'worker.vetted'
 * @property {string} [targetId] - ID of the affected document
 * @property {string} [targetCollection]
 * @property {Object} [before] - State before change
 * @property {Object} [after] - State after change
 * @property {string} [ipAddress]
 * @property {string} [userAgent]
 * @property {string} [note]
 * @property {FirebaseFirestore.Timestamp} createdAt
 */

const AuditLogSchema = {
  collection: COLLECTIONS.AUDIT_LOGS,
};

/**
 * @typedef {Object} EscrowSchema
 * @property {string} bookingId
 * @property {string} paymentId
 * @property {string} customerId
 * @property {string} workerId
 * @property {number} amount - Naira
 * @property {number} commissionAmount - Naira
 * @property {number} workerPayout - Naira
 * @property {string} status - 'held' | 'released' | 'refunded' | 'disputed'
 * @property {FirebaseFirestore.Timestamp} heldAt
 * @property {FirebaseFirestore.Timestamp} [releaseAfter] - Auto-release timestamp
 * @property {FirebaseFirestore.Timestamp} [releasedAt]
 * @property {string} [releasedBy]
 * @property {string} [paystackTransferCode]
 * @property {FirebaseFirestore.Timestamp} createdAt
 * @property {FirebaseFirestore.Timestamp} updatedAt
 */

const EscrowSchema = {
  collection: COLLECTIONS.ESCROW,
  defaults: () => ({
    status: 'held',
  }),
};

module.exports = {
  COLLECTIONS,
  UserSchema,
  WorkerSchema,
  BookingSchema,
  ServiceSchema,
  ReviewSchema,
  PaymentSchema,
  NotificationSchema,
  ZoneSchema,
  ComplaintSchema,
  AuditLogSchema,
  EscrowSchema,
};
