'use strict';

// ─── Service Types ────────────────────────────────────────────────────────────
const SERVICE_TYPES = {
  STANDARD_CLEAN: 'standard_clean',
  DEEP_CLEAN: 'deep_clean',
  HARMATTAN_PACKAGE: 'harmattan_package',
  POST_EVENT: 'post_event',
  MONTHLY_SUBSCRIPTION: 'monthly_subscription',
  CORPORATE: 'corporate',
  LAUNDRY: 'laundry',
  IRONING: 'ironing',
  WINDOW_CLEANING: 'window_cleaning',
  MOVE_IN_OUT: 'move_in_out',
};

const SERVICE_PRICING = {
  [SERVICE_TYPES.STANDARD_CLEAN]: {
    label: 'Standard Clean',
    description: 'Regular home cleaning — sweeping, mopping, surface wipe, bathroom, kitchen.',
    minPrice: 8000,
    maxPrice: 15000,
    estimatedHours: { min: 2, max: 4 },
    currency: 'NGN',
  },
  [SERVICE_TYPES.DEEP_CLEAN]: {
    label: 'Deep Clean',
    description: 'Thorough cleaning including inside cupboards, appliances, walls, and tiles.',
    minPrice: 18000,
    maxPrice: 35000,
    estimatedHours: { min: 4, max: 8 },
    currency: 'NGN',
  },
  [SERVICE_TYPES.HARMATTAN_PACKAGE]: {
    label: 'Harmattan Package',
    description: 'Seasonal deep dust removal — ceiling fans, curtains, furniture, floor scrubbing.',
    minPrice: 12000,
    maxPrice: 22000,
    estimatedHours: { min: 3, max: 6 },
    currency: 'NGN',
  },
  [SERVICE_TYPES.POST_EVENT]: {
    label: 'Post-Event Clean',
    description: 'Heavy-duty cleanup after parties, weddings, and celebrations.',
    minPrice: 20000,
    maxPrice: 40000,
    estimatedHours: { min: 4, max: 10 },
    currency: 'NGN',
  },
  [SERVICE_TYPES.MONTHLY_SUBSCRIPTION]: {
    label: 'Monthly Subscription',
    description: '4 standard cleans per month at a discounted rate.',
    minPrice: 25000,
    maxPrice: 45000,
    estimatedHours: { min: 2, max: 4 },
    billingCycle: 'monthly',
    currency: 'NGN',
  },
  [SERVICE_TYPES.CORPORATE]: {
    label: 'Corporate / Office Clean',
    description: 'Custom pricing for offices and commercial spaces. Contact for quote.',
    minPrice: 30000,
    maxPrice: null,
    estimatedHours: { min: 3, max: 16 },
    currency: 'NGN',
    requiresQuote: true,
  },
  [SERVICE_TYPES.LAUNDRY]: {
    label: 'Laundry',
    description: 'Wash, dry, and fold service. Priced per kg.',
    minPrice: 500,
    maxPrice: 5000,
    unit: 'per_kg',
    currency: 'NGN',
  },
  [SERVICE_TYPES.IRONING]: {
    label: 'Ironing',
    description: 'Professional ironing service. Priced per item.',
    minPrice: 200,
    maxPrice: 3000,
    unit: 'per_item',
    currency: 'NGN',
  },
  [SERVICE_TYPES.WINDOW_CLEANING]: {
    label: 'Window Cleaning',
    description: 'Interior and exterior window wash.',
    minPrice: 5000,
    maxPrice: 15000,
    currency: 'NGN',
  },
  [SERVICE_TYPES.MOVE_IN_OUT]: {
    label: 'Move-In / Move-Out Clean',
    description: 'Complete cleaning for vacated or newly occupied homes.',
    minPrice: 20000,
    maxPrice: 50000,
    estimatedHours: { min: 5, max: 12 },
    currency: 'NGN',
  },
};

// ─── Booking Statuses ─────────────────────────────────────────────────────────
const BOOKING_STATUS = {
  PENDING: 'pending',             // Created, awaiting payment
  CONFIRMED: 'confirmed',         // Payment successful, worker assigned
  WORKER_EN_ROUTE: 'en_route',    // Worker heading to location
  IN_PROGRESS: 'in_progress',     // Job started
  COMPLETED: 'completed',         // Job finished, awaiting review
  CANCELLED: 'cancelled',         // Cancelled by customer or worker
  DISPUTED: 'disputed',           // Customer raised a dispute
  REFUNDED: 'refunded',           // Refund processed
};

// ─── Payment Statuses ─────────────────────────────────────────────────────────
const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  ESCROWED: 'escrowed',
  RELEASED: 'released',
};

// ─── User Roles ───────────────────────────────────────────────────────────────
const USER_ROLES = {
  CUSTOMER: 'customer',
  WORKER: 'worker',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

// ─── Worker Statuses ─────────────────────────────────────────────────────────
const WORKER_STATUS = {
  PENDING_VETTING: 'pending_vetting',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
  INACTIVE: 'inactive',
};

// ─── Worker Availability ─────────────────────────────────────────────────────
const WORKER_AVAILABILITY = {
  AVAILABLE: 'available',
  BUSY: 'busy',
  OFFLINE: 'offline',
  ON_BREAK: 'on_break',
};

// ─── Notification Types ───────────────────────────────────────────────────────
const NOTIFICATION_TYPES = {
  BOOKING_CREATED: 'booking_created',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_CANCELLED: 'booking_cancelled',
  WORKER_ASSIGNED: 'worker_assigned',
  WORKER_EN_ROUTE: 'worker_en_route',
  JOB_STARTED: 'job_started',
  JOB_COMPLETED: 'job_completed',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  ESCROW_RELEASED: 'escrow_released',
  NEW_REVIEW: 'new_review',
  VETTING_APPROVED: 'vetting_approved',
  VETTING_REJECTED: 'vetting_rejected',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  SUBSCRIPTION_EXPIRING: 'subscription_expiring',
  DOCUMENT_EXPIRING: 'document_expiring',
  CHAT_MESSAGE: 'chat_message',
};

// ─── Kaduna Zones ─────────────────────────────────────────────────────────────
const KADUNA_ZONE_KEYS = [
  'gra',
  'barnawa',
  'malali',
  'tudun_wada',
  'narayi',
  'kabala_west',
  'kabala_east',
  'ungwan_rimi',
  'ungwan_sarki',
  'kaura',
  'chikun',
  'rigachikun',
  'sabon_tasha',
  'tudun_nupawa',
  'gonin_gora',
  'kakuri',
  'badiko',
  'ungwan_dosa',
  'makera',
  'romi',
  'sabo_gari',
  'nasarawa',
  'ungwan_muazu',
  'television',
  'abakpa',
  'kudenda',
];

// ─── Platform Settings ────────────────────────────────────────────────────────
const PLATFORM = {
  COMMISSION_PERCENT: 15,
  ESCROW_AUTO_RELEASE_HOURS: 48,
  MAX_RADIUS_KM: 15,
  MIN_BOOKING_HOURS_ADVANCE: 2,
  MAX_BOOKING_DAYS_ADVANCE: 30,
  CURRENCY: 'NGN',
  CURRENCY_SYMBOL: '₦',
  COUNTRY_CODE: 'NG',
  PHONE_PREFIX: '+234',
  KADUNA_CENTER: { lat: 10.5264, lng: 7.4381 },
  TIMEZONE: 'Africa/Lagos',
  MAX_WORKERS_PER_ZONE: 20,
  MIN_RATING_TO_STAY_ACTIVE: 3.0,
  REVIEW_WINDOW_HOURS: 48,
};

// ─── Complaint Categories ─────────────────────────────────────────────────────
const COMPLAINT_CATEGORIES = {
  POOR_QUALITY: 'poor_quality',
  LATE_ARRIVAL: 'late_arrival',
  NO_SHOW: 'no_show',
  THEFT: 'theft',
  RUDE_BEHAVIOUR: 'rude_behaviour',
  SAFETY_CONCERN: 'safety_concern',
  PAYMENT_DISPUTE: 'payment_dispute',
  OTHER: 'other',
};

const COMPLAINT_STATUS = {
  OPEN: 'open',
  UNDER_INVESTIGATION: 'under_investigation',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed',
};

// ─── Days of Week ─────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// ─── Prayer Names ─────────────────────────────────────────────────────────────
const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

module.exports = {
  SERVICE_TYPES,
  SERVICE_PRICING,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  USER_ROLES,
  WORKER_STATUS,
  WORKER_AVAILABILITY,
  NOTIFICATION_TYPES,
  KADUNA_ZONE_KEYS,
  PLATFORM,
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS,
  DAYS_OF_WEEK,
  PRAYER_NAMES,
};
