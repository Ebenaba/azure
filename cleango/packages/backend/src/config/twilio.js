'use strict';

const twilio = require('twilio');

let twilioClient;

function getTwilioClient() {
  if (twilioClient) return twilioClient;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn('[Twilio] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — SMS disabled');
    return null;
  }

  twilioClient = twilio(accountSid, authToken);
  console.log('[Twilio] Client initialised');
  return twilioClient;
}

const twilioConfig = {
  get client() {
    return getTwilioClient();
  },
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
  isEnabled: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
};

module.exports = twilioConfig;
