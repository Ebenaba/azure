import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'cleango-storage' });

// ── Keys ──────────────────────────────────────────────────────────────────────
const KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  BOOKING_DRAFT: 'bookingDraft',
  LANGUAGE: 'language',
  THEME: 'theme',
  ONBOARDING_COMPLETE: 'onboardingComplete',
};

// ── Auth Token ────────────────────────────────────────────────────────────────
export const getAuthToken = () => storage.getString(KEYS.AUTH_TOKEN) ?? null;
export const setAuthToken = (token) => storage.set(KEYS.AUTH_TOKEN, token);
export const clearAuthToken = () => storage.delete(KEYS.AUTH_TOKEN);

// ── User ─────────────────────────────────────────────────────────────────────
export const getUser = () => {
  const raw = storage.getString(KEYS.USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
export const setUser = (user) => storage.set(KEYS.USER, JSON.stringify(user));
export const clearUser = () => storage.delete(KEYS.USER);

// ── Booking Draft ─────────────────────────────────────────────────────────────
export const getBookingDraft = () => {
  const raw = storage.getString(KEYS.BOOKING_DRAFT);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
export const setBookingDraft = (draft) =>
  storage.set(KEYS.BOOKING_DRAFT, JSON.stringify(draft));
export const clearBookingDraft = () => storage.delete(KEYS.BOOKING_DRAFT);

// ── Language ──────────────────────────────────────────────────────────────────
export const getLanguage = () => storage.getString(KEYS.LANGUAGE) ?? 'en';
export const setLanguage = (lang) => storage.set(KEYS.LANGUAGE, lang);

// ── Theme ─────────────────────────────────────────────────────────────────────
/** @returns {'light' | 'dark' | null} */
export const getTheme = () => storage.getString(KEYS.THEME) ?? null;
/** @param {'light' | 'dark'} theme */
export const setTheme = (theme) => storage.set(KEYS.THEME, theme);
export const clearTheme = () => storage.delete(KEYS.THEME);

// ── Onboarding ────────────────────────────────────────────────────────────────
export const getOnboardingComplete = () =>
  storage.getBoolean(KEYS.ONBOARDING_COMPLETE) ?? false;
export const setOnboardingComplete = (value = true) =>
  storage.set(KEYS.ONBOARDING_COMPLETE, value);

// ── Clear Everything (logout) ─────────────────────────────────────────────────
export const clearAll = () => {
  clearAuthToken();
  clearUser();
  clearBookingDraft();
  // Keep language and theme preferences between sessions
};

export { storage as mmkv };
export default storage;
