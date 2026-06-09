import { useMemo } from 'react';
import {
  checkPrayerOverlap,
  getNextAvailableSlot,
  KADUNA_PRAYER_SCHEDULE,
} from '../constants/prayerTimes';

/**
 * Check whether a given date/time overlaps with a prayer window in Kaduna.
 *
 * @param {Date|null} date         - The booking start time
 * @param {number} durationHours   - Expected service duration in hours
 * @returns {{
 *   isBlocked: boolean,
 *   prayers: string[],
 *   prayerName: string|null,
 *   suggestedTime: Date|null,
 *   message: string|null,
 * }}
 */
const usePrayerTimes = (date, durationHours = 1) => {
  const result = useMemo(() => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return {
        isBlocked: false,
        prayers: [],
        prayerName: null,
        suggestedTime: null,
        message: null,
      };
    }

    const { overlaps, prayers } = checkPrayerOverlap(date, durationHours);

    if (!overlaps) {
      return {
        isBlocked: false,
        prayers: [],
        prayerName: null,
        suggestedTime: null,
        message: null,
      };
    }

    // Human-readable prayer names
    const PRAYER_DISPLAY = {
      fajr: 'Fajr',
      dhuhr: 'Dhuhr',
      asr: 'Asr',
      maghrib: 'Maghrib',
      isha: 'Isha',
      jumuah: "Jumu'ah",
    };

    const prayerName = prayers.map((p) => PRAYER_DISPLAY[p] || p).join(', ');
    const suggestedTime = getNextAvailableSlot(date);

    const suggestedFormatted = suggestedTime
      ? suggestedTime.toLocaleTimeString('en-NG', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : null;

    return {
      isBlocked: true,
      prayers,
      prayerName,
      suggestedTime,
      suggestedFormatted,
      message: `Your booking overlaps with ${prayerName} prayer. Suggested: ${suggestedFormatted}`,
    };
  }, [date, durationHours]);

  return result;
};

export default usePrayerTimes;
