'use strict';

const crypto = require('crypto');
const paystackConfig = require('../config/paystack');
const { nairaToKobo, koboToNaira, generateTransactionRef, calculateCommission } = require('../utils/helpers');

const { client: paystackClient } = paystackConfig;

// ─── Transaction Initialization ───────────────────────────────────────────────

/**
 * Initialize a Paystack transaction (charge card)
 * @param {Object} params
 * @param {string} params.email - Customer email
 * @param {number} params.amount - Amount in Naira
 * @param {string} params.reference - Unique transaction reference
 * @param {string} [params.callbackUrl]
 * @param {Object} [params.metadata]
 * @returns {Promise<{ authorizationUrl: string, accessCode: string, reference: string }>}
 */
async function initializeTransaction({ email, amount, reference, callbackUrl, metadata = {} }) {
  const amountKobo = nairaToKobo(amount);
  const ref = reference || generateTransactionRef();

  const payload = {
    email,
    amount: amountKobo,
    reference: ref,
    currency: 'NGN',
    callback_url: callbackUrl || process.env.PAYSTACK_CALLBACK_URL,
    metadata: {
      ...metadata,
      platform: 'CleanGo',
      environment: process.env.NODE_ENV,
    },
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
  };

  const response = await paystackClient.post('/transaction/initialize', payload);
  const { data } = response.data;

  return {
    authorizationUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference,
    amountKobo,
    amountNaira: amount,
  };
}

// ─── Transaction Verification ─────────────────────────────────────────────────

/**
 * Verify a Paystack transaction by reference
 * @param {string} reference
 * @returns {Promise<Object>} Paystack transaction object
 */
async function verifyTransaction(reference) {
  const response = await paystackClient.get(`/transaction/verify/${encodeURIComponent(reference)}`);
  const txn = response.data.data;

  if (txn.status !== 'success') {
    const err = new Error(`Transaction ${reference} is not successful. Status: ${txn.status}`);
    err.statusCode = 402;
    err.code = 'PAYMENT_NOT_SUCCESSFUL';
    err.paystackData = txn;
    throw err;
  }

  return txn;
}

// ─── Webhook Verification ─────────────────────────────────────────────────────

/**
 * Verify Paystack webhook signature
 * @param {string} rawBody - Raw request body as string
 * @param {string} signature - x-paystack-signature header
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signature) {
  const hash = crypto
    .createHmac('sha512', paystackConfig.webhookSecret)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
}

// ─── Transfer (Payout to Worker) ─────────────────────────────────────────────

/**
 * Create a transfer recipient (worker's bank account)
 * @param {Object} params
 * @param {string} params.name
 * @param {string} params.accountNumber
 * @param {string} params.bankCode
 * @returns {Promise<{ recipientCode: string }>}
 */
async function createTransferRecipient({ name, accountNumber, bankCode }) {
  const response = await paystackClient.post('/transferrecipient', {
    type: 'nuban',
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  });

  const { recipient_code } = response.data.data;
  return { recipientCode: recipient_code };
}

/**
 * Initiate a bank transfer to a worker
 * @param {Object} params
 * @param {string} params.recipientCode - Paystack recipient code
 * @param {number} params.amount - Amount in Naira
 * @param {string} params.reference
 * @param {string} [params.reason]
 * @returns {Promise<{ transferCode: string, status: string }>}
 */
async function initiateTransfer({ recipientCode, amount, reference, reason = 'Job payout' }) {
  const amountKobo = nairaToKobo(amount);
  const ref = reference || generateTransactionRef('PAY');

  const response = await paystackClient.post('/transfer', {
    source: 'balance',
    amount: amountKobo,
    recipient: recipientCode,
    reason,
    reference: ref,
    currency: 'NGN',
  });

  const { data } = response.data;
  return {
    transferCode: data.transfer_code,
    status: data.status,
    reference: data.reference,
    amountNaira: amount,
  };
}

/**
 * Verify a transfer status
 * @param {string} reference
 * @returns {Promise<Object>}
 */
async function verifyTransfer(reference) {
  const response = await paystackClient.get(`/transfer/verify/${encodeURIComponent(reference)}`);
  return response.data.data;
}

// ─── Refund ───────────────────────────────────────────────────────────────────

/**
 * Create a refund for a transaction
 * @param {Object} params
 * @param {string} params.transactionId - Paystack transaction ID
 * @param {number} [params.amount] - Partial refund amount in Naira. Omit for full refund.
 * @param {string} [params.reason]
 * @returns {Promise<Object>}
 */
async function createRefund({ transactionId, amount, reason = 'Customer requested refund' }) {
  const payload = {
    transaction: transactionId,
    ...(amount && { amount: nairaToKobo(amount) }),
    merchant_note: reason,
    customer_note: reason,
  };

  const response = await paystackClient.post('/refund', payload);
  return response.data.data;
}

// ─── Bank List ────────────────────────────────────────────────────────────────

/**
 * Fetch list of Nigerian banks supported by Paystack
 * @returns {Promise<Array>}
 */
async function getBankList() {
  const response = await paystackClient.get('/bank?country=nigeria&per_page=100');
  return response.data.data;
}

/**
 * Resolve a bank account number to get account name
 * @param {string} accountNumber
 * @param {string} bankCode
 * @returns {Promise<{ accountName: string, accountNumber: string }>}
 */
async function resolveAccountNumber(accountNumber, bankCode) {
  const response = await paystackClient.get(
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
  const { data } = response.data;
  return {
    accountName: data.account_name,
    accountNumber: data.account_number,
  };
}

// ─── Balance ──────────────────────────────────────────────────────────────────

/**
 * Get Paystack balance
 * @returns {Promise<{ currency: string, balance: number }>}
 */
async function getBalance() {
  const response = await paystackClient.get('/balance');
  const balances = response.data.data;
  const ngn = balances.find((b) => b.currency === 'NGN');
  return {
    currency: 'NGN',
    balanceKobo: ngn?.balance || 0,
    balanceNaira: (ngn?.balance || 0) / 100,
  };
}

// ─── Commission Calculation ───────────────────────────────────────────────────

/**
 * Calculate commission split for a booking payment
 * @param {number} amount - Total booking amount in Naira
 * @param {number} [commissionPercent] - Override platform commission
 */
function calculatePaymentSplit(amount, commissionPercent) {
  return calculateCommission(amount, commissionPercent || paystackConfig.commissionPercent);
}

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
  createTransferRecipient,
  initiateTransfer,
  verifyTransfer,
  createRefund,
  getBankList,
  resolveAccountNumber,
  getBalance,
  calculatePaymentSplit,
};
