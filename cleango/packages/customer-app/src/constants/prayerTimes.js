// Static prayer time windows for Kaduna, Nigeria
// These are approximate times - in production use an API
// Based on Kaduna coordinates: 10.5222° N, 7.4383° E
// Method: Muslim World League

export const PRAYER_NAMES = {
  FAJR: 'Fajr',
  DHUHR: 'Dhuhr',
  ASR: 'Asr',
  MAGHRIB: 'Maghrib',
  ISHA: 'Isha',
};

// Monthly prayer windows (hour:minute) for Kaduna
// Format: [month_index_0] = { prayer: [start, end] }
export const KADUNA_PRAYER_SCHEDULE = {
  // January
  0: {
    fajr: { start: '05:30', end: '06:30' },
    dhuhr: { start: '13:00', end: '13:45' },
    asr: { start: '16:15', end: '17:00' },
    maghrib: { start: '18:30', end: '19:00' },
    isha: { start: '19:45', end: '20:30' },
  },
  // February
  1: {
    fajr: { start: '05:25', end: '06:25' },
    dhuhr: { start: '13:00', end: '13:45' },
    asr: { start: '16:20', end: '17:05' },
    maghrib: { start: '18:35', end: '19:05' },
    isha: { start: '19:50', end: '20:35' },
  },
  // March
  2: {
    fajr: { start: '05:15', end: '06:15' },
    dhuhr: { start: '12:55', end: '13:40' },
    asr: { start: '16:20', end: '17:05' },
    maghrib: { start: '18:35', end: '19:05' },
    isha: { start: '19:50', end: '20:35' },
  },
  // April
  3: {
    fajr: { start: '04:55', end: '05:55' },
    dhuhr: { start: '12:50', end: '13:35' },
    asr: { start: '16:15', end: '17:00' },
    maghrib: { start: '18:40', end: '19:10' },
    isha: { start: '19:55', end: '20:40' },
  },
  // May
  4: {
    fajr: { start: '04:45', end: '05:45' },
    dhuhr: { start: '12:50', end: '13:35' },
    asr: { start: '16:15', end: '17:00' },
    maghrib: { start: '18:45', end: '19:15' },
    isha: { start: '20:00', end: '20:45' },
  },
  // June
  5: {
    fajr: { start: '04:40', end: '05:40' },
    dhuhr: { start: '12:55', end: '13:40' },
    asr: { start: '16:20', end: '17:05' },
    maghrib: { start: '18:55', end: '19:25' },
    isha: { start: '20:10', end: '20:55' },
  },
  // July
  6: {
    fajr: { start: '04:45', end: '05:45' },
    dhuhr: { start: '13:00', end: '13:45' },
    asr: { start: '16:25', end: '17:10' },
    maghrib: { start: '18:55', end: '19:25' },
    isha: { start: '20:10', end: '20:55' },
  },
  // August
  7: {
    fajr: { start: '04:55', end: '05:55' },
    dhuhr: { start: '12:55', end: '13:40' },
    asr: { start: '16:20', end: '17:05' },
    maghrib: { start: '18:50', end: '19:20' },
    isha: { start: '20:05', end: '20:50' },
  },
  // September
  8: {
    fajr: { start: '05:05', end: '06:05' },
    dhuhr: { start: '12:50', end: '13:35' },
    asr: { start: '16:10', end: '16:55' },
    maghrib: { start: '18:40', end: '19:10' },
    isha: { start: '19:55', end: '20:40' },
  },
  // October
  9: {
    fajr: { start: '05:15', end: '06:15' },
    dhuhr: { start: '12:45', end: '13:30' },
    asr: { start: '16:00', end: '16:45' },
    maghrib: { start: '18:30', end: '19:00' },
    isha: { start: '19:45', end: '20:30' },
  },
  // November
  10: {
    fajr: { start: '05:20', end: '06:20' },
    dhuhr: { start: '12:45', end: '13:30' },
    asr: { start: '15:55', end: '16:40' },
    maghrib: { start: '18:25', end: '18:55' },
    isha: { start: '19:40', end: '20:25' },
  },
  // December
  11: {
    fajr: { start: '05:30', end: '06:30' },
    dhuhr: { start: '12:50', end: '13:35' },
    asr: { start: '15:55', end: '16:40' },
    maghrib: { start: '18:25', end: '18:55' },
    isha: { start: '19:40', end: '20:25' },
  },
};

// Jumu'ah (Friday prayer) window
export const JUMUAH_WINDOW = { start: '12:30', end: '14:00' };

/**
 * Check if a given time overlaps with any prayer window
 * @param {Date} date
 * @param {number} durationHours
 * @returns {{ overlaps: boolean, prayers: string[] }}
 */
export const checkPrayerOverlap = (date, durationHours = 1) => {
  const month = date.getMonth();
  const dayOfWeek = date.getDay(); // 5 = Friday
  const schedule = KADUNA_PRAYER_SCHEDULE[month];

  const startMinutes = date.getHours() * 60 + date.getMinutes();
  const endMinutes = startMinutes + durationHours * 60;

  const overlappingPrayers = [];

  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const windows = { ...schedule };
  if (dayOfWeek === 5) {
    windows.jumuah = JUMUAH_WINDOW;
  }

  for (const [prayer, window] of Object.entries(windows)) {
    const pStart = timeToMinutes(window.start);
    const pEnd = timeToMinutes(window.end);

    if (startMinutes < pEnd && endMinutes > pStart) {
      overlappingPrayers.push(prayer);
    }
  }

  return {
    overlaps: overlappingPrayers.length > 0,
    prayers: overlappingPrayers,
  };
};

/**
 * Get the next available slot after prayers
 */
export const getNextAvailableSlot = (date) => {
  const month = date.getMonth();
  const schedule = KADUNA_PRAYER_SCHEDULE[month];

  // Find the prayer window that contains or is after the given time
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  for (const window of Object.values(schedule)) {
    const pEnd = timeToMinutes(window.end);
    if (pEnd > currentMinutes) {
      const newDate = new Date(date);
      const [h, m] = window.end.split(':').map(Number);
      newDate.setHours(h, m + 15, 0, 0); // 15 min buffer after prayer
      return newDate;
    }
  }

  return date;
};

export default KADUNA_PRAYER_SCHEDULE;
