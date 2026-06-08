'use strict';

/**
 * Prayer Time Calculation Service for Kaduna State, Nigeria
 * Uses astronomical algorithms (MWL method) to compute prayer times
 * based on latitude/longitude and date.
 *
 * Kaduna coordinates: lat 10.5264°N, lng 7.4381°E
 * Timezone: Africa/Lagos (UTC+1)
 */

const KADUNA_LAT = parseFloat(process.env.KADUNA_LAT) || 10.5264;
const KADUNA_LNG = parseFloat(process.env.KADUNA_LNG) || 7.4381;
const UTC_OFFSET = 1; // Africa/Lagos

// Calculation methods
const METHODS = {
  MWL: { fajrAngle: 18, ishaAngle: 17 },       // Muslim World League
  ISNA: { fajrAngle: 15, ishaAngle: 15 },       // Islamic Society of North America
  EGYPT: { fajrAngle: 19.5, ishaAngle: 17.5 },  // Egyptian General Authority
};

const DEFAULT_METHOD = METHODS.MWL;

// ─── Math Helpers ─────────────────────────────────────────────────────────────
function dtr(d) { return (d * Math.PI) / 180; }
function rtd(r) { return (r * 180) / Math.PI; }
function fixAngle(a) { return a - 360 * Math.floor(a / 360); }
function fixHour(a) { return a - 24 * Math.floor(a / 24); }

// Sun's declination and equation of time
function sunPosition(julianDay) {
  const D = julianDay - 2451545.0;
  const g = fixAngle(357.529 + 0.98560028 * D);
  const q = fixAngle(280.459 + 0.98564736 * D);
  const L = fixAngle(q + 1.915 * Math.sin(dtr(g)) + 0.02 * Math.sin(dtr(2 * g)));
  const e = 23.439 - 0.00000036 * D;
  const RA = rtd(Math.atan2(Math.cos(dtr(e)) * Math.sin(dtr(L)), Math.cos(dtr(L)))) / 15;
  const EqT = q / 15 - fixHour(RA);
  const decl = rtd(Math.asin(Math.sin(dtr(e)) * Math.sin(dtr(L))));
  return { decl, EqT };
}

function julianDay(year, month, day) {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
}

function midDay(date, EqT) {
  return fixHour(12 - EqT);
}

function sunAngleTime(date, angle, decl, EqT, lat, direction = 1) {
  const cosT = (Math.cos(dtr(angle)) - Math.sin(dtr(decl)) * Math.sin(dtr(lat))) /
               (Math.cos(dtr(decl)) * Math.cos(dtr(lat)));
  if (Math.abs(cosT) > 1) return null; // Sun never reaches angle
  const T = rtd(Math.acos(cosT)) / 15;
  const noon = midDay(date, EqT);
  return noon + direction * T;
}

function asrTime(factor, decl, EqT, lat) {
  const angle = -rtd(Math.atan(1 / (factor + Math.tan(dtr(Math.abs(lat - decl))))));
  return sunAngleTime(null, angle, decl, EqT, lat, 1);
}

function decimalToTime(decimal) {
  if (decimal == null) return null;
  const d = fixHour(decimal + UTC_OFFSET);
  const h = Math.floor(d);
  const m = Math.floor((d - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculate prayer times for a given date and location
 * @param {Date} date
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} method - Calculation method
 * @returns {Object} Prayer times as HH:MM strings
 */
function calculatePrayerTimes(date, lat = KADUNA_LAT, lng = KADUNA_LNG, method = DEFAULT_METHOD) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  const jd = julianDay(year, month, day);
  const { decl, EqT } = sunPosition(jd);

  const noon = midDay(date, EqT);

  // Fajr: angle below horizon before sunrise
  const fajrDecimal = sunAngleTime(date, method.fajrAngle, decl, EqT, lat, -1);
  // Sunrise: 0.833 is standard refraction angle
  const sunriseDecimal = sunAngleTime(date, 0.833, decl, EqT, lat, -1);
  // Dhuhr: solar noon
  const dhuhrDecimal = noon + (lng / 15 - UTC_OFFSET) + UTC_OFFSET - lng / 15;
  // Re-derive properly:
  const dhuhr = fixHour(noon) + UTC_OFFSET - UTC_OFFSET; // = noon decimal → convert below
  // Asr: Shafi (factor=1) / Hanafi (factor=2)
  const asrDecimal = asrTime(1, decl, EqT, lat); // Shafi method
  // Sunset
  const sunsetDecimal = sunAngleTime(date, 0.833, decl, EqT, lat, 1);
  // Maghrib: just after sunset
  const maghribDecimal = sunsetDecimal;
  // Isha: angle below horizon after sunset
  const ishaDecimal = sunAngleTime(date, method.ishaAngle, decl, EqT, lat, 1);

  return {
    Fajr: decimalToTime(fajrDecimal),
    Sunrise: decimalToTime(sunriseDecimal),
    Dhuhr: decimalToTime(fixHour(noon)),
    Asr: decimalToTime(asrDecimal),
    Maghrib: decimalToTime(maghribDecimal),
    Isha: decimalToTime(ishaDecimal),
  };
}

/**
 * Get prayer times for Kaduna for a specific date
 * @param {Date|string} date
 * @returns {{ name: string, time: string }[]}
 */
function getKadunaPrayerTimes(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const times = calculatePrayerTimes(d, KADUNA_LAT, KADUNA_LNG);
  return [
    { name: 'Fajr', time: times.Fajr },
    { name: 'Dhuhr', time: times.Dhuhr },
    { name: 'Asr', time: times.Asr },
    { name: 'Maghrib', time: times.Maghrib },
    { name: 'Isha', time: times.Isha },
  ].filter((p) => p.time !== null);
}

/**
 * Get prayer times for the next N days
 * @param {number} days
 * @returns {Object[]}
 */
function getPrayerTimesForDays(days = 7) {
  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    result.push({
      date: d.toISOString().slice(0, 10),
      prayers: getKadunaPrayerTimes(d),
    });
  }
  return result;
}

/**
 * Check if a given time (HH:MM) conflicts with a prayer window.
 * Prayer windows: 15min before, 30min after each prayer.
 * @param {string} timeStr - HH:MM
 * @param {Date} date
 * @param {{ beforeMins?: number, afterMins?: number }} options
 * @returns {{ blocked: boolean, prayerName?: string, prayerTime?: string }}
 */
function checkPrayerConflict(timeStr, date = new Date(), options = {}) {
  const { beforeMins = 15, afterMins = 30 } = options;
  const prayers = getKadunaPrayerTimes(date);

  const [jobHours, jobMinutes] = timeStr.split(':').map(Number);
  const jobTotal = jobHours * 60 + jobMinutes;

  for (const prayer of prayers) {
    if (!prayer.time) continue;
    const [ph, pm] = prayer.time.split(':').map(Number);
    const prayerTotal = ph * 60 + pm;

    if (jobTotal >= prayerTotal - beforeMins && jobTotal <= prayerTotal + afterMins) {
      return { blocked: true, prayerName: prayer.name, prayerTime: prayer.time };
    }
  }

  return { blocked: false };
}

/**
 * Get available time slots for a day, excluding prayer windows and outside working hours.
 * Working hours: 07:00 - 19:00
 * @param {Date} date
 * @param {number} slotDurationMinutes - Slot size in minutes (default 60)
 * @returns {{ time: string, available: boolean, blockedBy?: string }[]}
 */
function getAvailableSlots(date = new Date(), slotDurationMinutes = 60) {
  const startHour = 7;
  const endHour = 19;
  const slots = [];

  let current = startHour * 60;
  while (current + slotDurationMinutes <= endHour * 60) {
    const hours = Math.floor(current / 60);
    const minutes = current % 60;
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    const conflict = checkPrayerConflict(timeStr, date);

    slots.push({
      time: timeStr,
      available: !conflict.blocked,
      ...(conflict.blocked && { blockedBy: `${conflict.prayerName} prayer (${conflict.prayerTime})` }),
    });

    current += slotDurationMinutes;
  }

  return slots;
}

module.exports = {
  calculatePrayerTimes,
  getKadunaPrayerTimes,
  getPrayerTimesForDays,
  checkPrayerConflict,
  getAvailableSlots,
};
