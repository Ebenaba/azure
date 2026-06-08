'use strict';

const axios = require('axios');

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

/**
 * Paystack HTTP client pre-configured with secret key and base URL.
 */
const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor — log in development
paystackClient.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Paystack] ${config.method.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalise errors
paystackClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.message ||
      error.message ||
      'Paystack request failed';
    const paystackError = new Error(msg);
    paystackError.statusCode = error.response?.status || 500;
    paystackError.paystackData = error.response?.data;
    return Promise.reject(paystackError);
  }
);

const paystackConfig = {
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  publicKey: process.env.PAYSTACK_PUBLIC_KEY,
  webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET,
  commissionPercent: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT) || 15,
  baseUrl: PAYSTACK_BASE_URL,
  client: paystackClient,
};

module.exports = paystackConfig;
