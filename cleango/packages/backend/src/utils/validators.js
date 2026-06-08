'use strict';

const Joi = require('joi');
const { SERVICE_TYPES, BOOKING_STATUS, USER_ROLES, COMPLAINT_CATEGORIES } = require('./constants');

// ─── Reusable Fields ──────────────────────────────────────────────────────────
const nigerianPhone = Joi.string()
  .pattern(/^(\+234|0)[789][01]\d{8}$/)
  .messages({ 'string.pattern.base': 'Invalid Nigerian phone number format' });

const mongoId = Joi.string().alphanum().min(20).max(28);

const pagination = {
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
};

// ─── Auth Validators ──────────────────────────────────────────────────────────
const verifyOTP = Joi.object({
  idToken: Joi.string().required().messages({ 'any.required': 'Firebase ID token is required' }),
});

const googleSignIn = Joi.object({
  idToken: Joi.string().required(),
});

const setupProfile = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  phone: nigerianPhone.required(),
  email: Joi.string().email().optional().allow(''),
  address: Joi.object({
    street: Joi.string().max(200).required(),
    zone: Joi.string().required(),
    city: Joi.string().default('Kaduna').optional(),
    state: Joi.string().default('Kaduna State').optional(),
    coordinates: Joi.object({
      lat: Joi.number().min(-90).max(90).optional(),
      lng: Joi.number().min(-180).max(180).optional(),
    }).optional(),
  }).required(),
  role: Joi.string()
    .valid(USER_ROLES.CUSTOMER, USER_ROLES.WORKER)
    .default(USER_ROLES.CUSTOMER),
  fcmToken: Joi.string().optional().allow(''),
});

// ─── Booking Validators ───────────────────────────────────────────────────────
const createBooking = Joi.object({
  serviceType: Joi.string()
    .valid(...Object.values(SERVICE_TYPES))
    .required(),
  scheduledDate: Joi.string()
    .isoDate()
    .required()
    .messages({ 'string.isoDate': 'scheduledDate must be a valid ISO date' }),
  scheduledTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required()
    .messages({ 'string.pattern.base': 'scheduledTime must be HH:MM format' }),
  address: Joi.object({
    street: Joi.string().max(300).required(),
    zone: Joi.string().required(),
    city: Joi.string().default('Kaduna').optional(),
    coordinates: Joi.object({
      lat: Joi.number().required(),
      lng: Joi.number().required(),
    }).optional(),
  }).required(),
  propertyType: Joi.string()
    .valid('apartment', 'house', 'office', 'duplex', 'bungalow', 'other')
    .required(),
  bedrooms: Joi.number().integer().min(0).max(20).optional(),
  bathrooms: Joi.number().integer().min(0).max(20).optional(),
  squareMeters: Joi.number().min(1).max(10000).optional(),
  specialInstructions: Joi.string().max(1000).optional().allow(''),
  preferredWorkerGender: Joi.string().valid('male', 'female', 'any').default('any'),
  addOns: Joi.array()
    .items(Joi.string().valid('laundry', 'ironing', 'fridge', 'oven', 'windows'))
    .default([]),
  promoCode: Joi.string().max(20).optional().allow(''),
  isRecurring: Joi.boolean().default(false),
  recurringFrequency: Joi.string()
    .valid('weekly', 'biweekly', 'monthly')
    .when('isRecurring', { is: true, then: Joi.required() }),
});

const updateBooking = Joi.object({
  status: Joi.string().valid(...Object.values(BOOKING_STATUS)).optional(),
  scheduledDate: Joi.string().isoDate().optional(),
  scheduledTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  specialInstructions: Joi.string().max(1000).optional().allow(''),
  cancellationReason: Joi.string().max(500).optional(),
}).min(1);

const cancelBooking = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
});

// ─── Worker Validators ────────────────────────────────────────────────────────
const workerApplication = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  phone: nigerianPhone.required(),
  email: Joi.string().email().optional().allow(''),
  dateOfBirth: Joi.string().isoDate().required(),
  gender: Joi.string().valid('male', 'female').required(),
  nin: Joi.string().length(11).pattern(/^\d+$/).required()
    .messages({ 'string.length': 'NIN must be exactly 11 digits' }),
  address: Joi.object({
    street: Joi.string().max(300).required(),
    zone: Joi.string().required(),
    city: Joi.string().default('Kaduna').optional(),
  }).required(),
  preferredZones: Joi.array().items(Joi.string()).min(1).max(5).required(),
  serviceTypes: Joi.array()
    .items(Joi.string().valid(...Object.values(SERVICE_TYPES)))
    .min(1)
    .required(),
  bankAccount: Joi.object({
    accountNumber: Joi.string().length(10).pattern(/^\d+$/).required(),
    bankCode: Joi.string().required(),
    accountName: Joi.string().required(),
  }).optional(),
  guarantor: Joi.object({
    name: Joi.string().required(),
    phone: nigerianPhone.required(),
    relationship: Joi.string().required(),
    address: Joi.string().required(),
  }).required(),
  emergencyContact: Joi.object({
    name: Joi.string().required(),
    phone: nigerianPhone.required(),
    relationship: Joi.string().required(),
  }).required(),
});

const vetWorker = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required(),
  notes: Joi.string().max(1000).optional().allow(''),
  assignedZones: Joi.array().items(Joi.string()).optional(),
  rejectionReason: Joi.string().max(500).when('status', {
    is: 'rejected',
    then: Joi.required(),
  }),
});

// ─── Payment Validators ───────────────────────────────────────────────────────
const initializePayment = Joi.object({
  bookingId: Joi.string().required(),
  callbackUrl: Joi.string().uri().optional(),
});

const requestPayout = Joi.object({
  bookingId: Joi.string().required(),
  amount: Joi.number().min(100).optional(), // Partial payout support
  reason: Joi.string().max(500).optional(),
});

// ─── Review Validators ────────────────────────────────────────────────────────
const submitReview = Joi.object({
  bookingId: Joi.string().required(),
  workerId: Joi.string().required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().min(5).max(1000).optional().allow(''),
  categories: Joi.object({
    punctuality: Joi.number().integer().min(1).max(5).optional(),
    quality: Joi.number().integer().min(1).max(5).optional(),
    communication: Joi.number().integer().min(1).max(5).optional(),
    professionalism: Joi.number().integer().min(1).max(5).optional(),
  }).optional(),
  isAnonymous: Joi.boolean().default(false),
  wouldRecommend: Joi.boolean().optional(),
});

// ─── Tracking Validators ──────────────────────────────────────────────────────
const updateLocation = Joi.object({
  bookingId: Joi.string().required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  accuracy: Joi.number().optional(),
  heading: Joi.number().min(0).max(360).optional(),
  speed: Joi.number().min(0).optional(),
});

const updateJobStatus = Joi.object({
  bookingId: Joi.string().required(),
  status: Joi.string()
    .valid(
      BOOKING_STATUS.WORKER_EN_ROUTE,
      BOOKING_STATUS.IN_PROGRESS,
      BOOKING_STATUS.COMPLETED
    )
    .required(),
  notes: Joi.string().max(500).optional().allow(''),
  completionPhotos: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

// ─── Chat Validators ───────────────────────────────────────────────────────────
const sendMessage = Joi.object({
  message: Joi.string().min(1).max(2000).required(),
  messageType: Joi.string().valid('text', 'image', 'location').default('text'),
  imageUrl: Joi.string().uri().when('messageType', { is: 'image', then: Joi.required() }),
  location: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    label: Joi.string().optional(),
  }).when('messageType', { is: 'location', then: Joi.required() }),
});

// ─── Admin Validators ─────────────────────────────────────────────────────────
const manualAssign = Joi.object({
  bookingId: Joi.string().required(),
  workerId: Joi.string().required(),
  reason: Joi.string().max(500).optional().allow(''),
});

const adminUpdateWorker = Joi.object({
  status: Joi.string()
    .valid('approved', 'suspended', 'inactive', 'rejected')
    .optional(),
  assignedZones: Joi.array().items(Joi.string()).optional(),
  notes: Joi.string().max(1000).optional().allow(''),
  commissionRate: Joi.number().min(0).max(50).optional(),
});

// ─── Complaint Validators ─────────────────────────────────────────────────────
const submitComplaint = Joi.object({
  bookingId: Joi.string().required(),
  category: Joi.string().valid(...Object.values(COMPLAINT_CATEGORIES)).required(),
  description: Joi.string().min(10).max(2000).required(),
  evidenceUrls: Joi.array().items(Joi.string().uri()).max(5).optional(),
});

// ─── Service Validators ───────────────────────────────────────────────────────
const queryServices = Joi.object({
  zone: Joi.string().optional(),
  serviceType: Joi.string().valid(...Object.values(SERVICE_TYPES)).optional(),
  ...pagination,
});

// ─── Notification Validators ─────────────────────────────────────────────────
const updateFcmToken = Joi.object({
  fcmToken: Joi.string().required(),
});

// ─── Validate helper ─────────────────────────────────────────────────────────
function validate(schema, data, options = { abortEarly: false, stripUnknown: true }) {
  const { error, value } = schema.validate(data, options);
  if (error) {
    const message = error.details.map((d) => d.message).join('; ');
    const err = new Error(message);
    err.statusCode = 422;
    err.isValidation = true;
    err.details = error.details;
    throw err;
  }
  return value;
}

module.exports = {
  schemas: {
    verifyOTP,
    googleSignIn,
    setupProfile,
    createBooking,
    updateBooking,
    cancelBooking,
    workerApplication,
    vetWorker,
    initializePayment,
    requestPayout,
    submitReview,
    updateLocation,
    updateJobStatus,
    sendMessage,
    manualAssign,
    adminUpdateWorker,
    submitComplaint,
    queryServices,
    updateFcmToken,
    pagination: Joi.object(pagination),
  },
  validate,
};
