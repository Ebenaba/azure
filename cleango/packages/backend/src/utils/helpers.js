'use strict';

const { PLATFORM, KADUNA_ZONE_KEYS } = require('./constants');

/**
 * Format a raw phone number to Nigerian international format (+234...)
 * Accepts: 08012345678 / 8012345678 / +2348012345678 / 2348012345678
 */
function formatNigerianPhone(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');

  if (digits.startsWith('234') && digits.length === 13) {
    return `+${digits}`;
  }
  if (digits.startsWith('0') && digits.length === 11) {
    return `+234${digits.slice(1)}`;
  }
  if (digits.length === 10 && !digits.startsWith('0')) {
    return `+234${digits}`;
  }
  if (digits.startsWith('234') && digits.length >= 13) {
    return `+${digits.slice(0, 13)}`;
  }
  return null;
}

/**
 * Validate Nigerian phone number format
 */
function isValidNigerianPhone(phone) {
  if (!phone) return false;
  const formatted = formatNigerianPhone(phone);
  if (!formatted) return false;
  // Nigerian mobile prefixes: 070, 080, 081, 090, 091
  return /^\+234[789][01]\d{8}$/.test(formatted);
}

/**
 * Format an amount in Kobo (Paystack) to Naira string
 */
function koboToNaira(kobo) {
  return (kobo / 100).toLocaleString('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  });
}

/**
 * Convert Naira to Kobo for Paystack
 */
function nairaToKobo(naira) {
  return Math.round(naira * 100);
}

/**
 * Calculate distance between two lat/lng points using Haversine formula (km)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

/**
 * Detect which Kaduna zone a coordinate falls into.
 * Zones is an array of { key, center: { lat, lng }, radiusKm }
 */
function detectZone(lat, lng, zones) {
  if (!zones || zones.length === 0) return null;
  let closest = null;
  let closestDist = Infinity;

  for (const zone of zones) {
    const dist = haversineDistance(lat, lng, zone.center.lat, zone.center.lng);
    if (dist <= (zone.radiusKm || 3) && dist < closestDist) {
      closest = zone;
      closestDist = dist;
    }
  }

  // If none within radius, return nearest zone
  if (!closest) {
    for (const zone of zones) {
      const dist = haversineDistance(lat, lng, zone.center.lat, zone.center.lng);
      if (dist < closestDist) {
        closest = zone;
        closestDist = dist;
      }
    }
  }

  return closest || null;
}

/**
 * Generate a 6-digit numeric OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generate a unique booking reference: CG-YYYYMMDD-XXXXXX
 */
function generateBookingRef() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 8);
  return `CG-${date}-${rand}`;
}

/**
 * Generate a transaction reference for Paystack
 */
function generateTransactionRef(prefix = 'CG') {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Sanitise a string (strip HTML tags, trim)
 */
function sanitiseString(str, maxLength = 1000) {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Slugify a string for IDs/keys
 */
function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Add hours to a Date object
 */
function addHours(date, hours) {
  const d = new Date(date);
  d.setHours(d.getHours() + hours);
  return d;
}

/**
 * Add days to a Date object
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Get the start and end of today in Africa/Lagos timezone
 */
function getTodayRange() {
  const now = new Date();
  // Nigeria is UTC+1
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Check if a time string (HH:MM) falls within a prayer window
 * Returns the prayer name if blocked, null otherwise
 */
function getPrayerConflict(timeStr, prayerTimes) {
  if (!prayerTimes || !timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const jobMinutes = hours * 60 + minutes;

  for (const prayer of prayerTimes) {
    const [ph, pm] = prayer.time.split(':').map(Number);
    const prayerMinutes = ph * 60 + pm;
    // Block 15 minutes before and 30 minutes after each prayer
    if (jobMinutes >= prayerMinutes - 15 && jobMinutes <= prayerMinutes + 30) {
      return prayer.name;
    }
  }
  return null;
}

/**
 * Paginate an array
 */
function paginate(array, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const data = array.slice(offset, offset + limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total: array.length,
      totalPages: Math.ceil(array.length / limit),
      hasNext: offset + limit < array.length,
      hasPrev: page > 1,
    },
  };
}

/**
 * Build a success response object
 */
function successResponse(data, message = 'Success', meta = {}) {
  return { success: true, message, data, ...meta };
}

/**
 * Build an error response object
 */
function errorResponse(message = 'An error occurred', code = null) {
  return { success: false, message, ...(code && { code }) };
}

/**
 * Calculate platform commission
 */
function calculateCommission(amount, commissionPercent = PLATFORM.COMMISSION_PERCENT) {
  const commission = Math.round((amount * commissionPercent) / 100);
  const workerPayout = amount - commission;
  return { amount, commission, workerPayout, commissionPercent };
}

/**
 * Mask sensitive data for logs
 */
function maskPhone(phone) {
  if (!phone) return '';
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}

function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return user.slice(0, 2) + '***@' + domain;
}

/**
 * Deep merge two objects
 */
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

/**
 * Sleep for ms milliseconds
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a date is in the future
 */
function isFuture(date) {
  return new Date(date) > new Date();
}

/**
 * Format Naira amount for display
 */
function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
}

module.exports = {
  formatNigerianPhone,
  isValidNigerianPhone,
  koboToNaira,
  nairaToKobo,
  haversineDistance,
  detectZone,
  generateOTP,
  generateBookingRef,
  generateTransactionRef,
  sanitiseString,
  slugify,
  addHours,
  addDays,
  getTodayRange,
  getPrayerConflict,
  paginate,
  successResponse,
  errorResponse,
  calculateCommission,
  maskPhone,
  maskEmail,
  deepMerge,
  sleep,
  isFuture,
  formatNaira,
};
