import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  Constants.manifest?.extra?.apiBaseUrl ||
  'https://api.cleango.ng/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor: attach auth token ────────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {}
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor: handle 401 + network retries ───────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // ── Network / timeout → retry once ───────────────────────────────────────
    if (!error.response && !originalRequest._retried) {
      originalRequest._retried = true;
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          api(originalRequest).then(resolve).catch(reject);
        }, 1200);
      });
    }

    // ── 401 Unauthorized → clear token and broadcast ──────────────────────────
    if (error.response?.status === 401 && !originalRequest._401handled) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._401handled = true;
      isRefreshing = true;

      try {
        // Attempt token refresh via Firebase refresh token
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const newToken = await user.getIdToken(true);
          await SecureStore.setItemAsync('authToken', newToken);
          processQueue(null, newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        // Clear stored credentials on irrecoverable 401
        await SecureStore.deleteItemAsync('authToken').catch(() => {});
        // Emit event so AuthContext can sign the user out
        authEventEmitter.emit('unauthorized');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ── Minimal event emitter so components can react to auth expiry ──────────────
const listeners = [];
export const authEventEmitter = {
  emit: (event) => listeners.filter((l) => l.event === event).forEach((l) => l.cb()),
  on: (event, cb) => { listeners.push({ event, cb }); },
  off: (event, cb) => {
    const idx = listeners.findIndex((l) => l.event === event && l.cb === cb);
    if (idx !== -1) listeners.splice(idx, 1);
  },
};

// ── Typed API helpers ─────────────────────────────────────────────────────────
export const bookingsApi = {
  list: (params) => api.get('/bookings', { params }),
  get: (id) => api.get(`/bookings/${id}`),
  create: (data) => api.post('/bookings', data),
  cancel: (id, reason) => api.patch(`/bookings/${id}/cancel`, { reason }),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
};

export const paymentsApi = {
  initiate: (bookingId) => api.post('/payments/initiate', { bookingId }),
  verify: (reference) => api.post('/payments/verify', { reference }),
  history: (params) => api.get('/payments', { params }),
};

export const profileApi = {
  get: () => api.get('/profile'),
  update: (data) => api.patch('/profile', data),
  updateFCMToken: (token) => api.patch('/profile/fcm-token', { token }),
};

export const reviewsApi = {
  create: (bookingId, data) => api.post(`/bookings/${bookingId}/review`, data),
};

export const promosApi = {
  validate: (code) => api.post('/promos/validate', { code }),
};

export default api;
