'use strict';

const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const { SERVICE_PRICING, SERVICE_TYPES } = require('../utils/constants');
const prayerTimeService = require('../services/prayerTime');

/**
 * GET /services
 * Public: list all active service types.
 */
router.get('/', async (req, res, next) => {
  try {
    // Try Firestore first for live data, fall back to constants
    const snapshot = await db
      .collection(COLLECTIONS.SERVICES)
      .where('isActive', '==', true)
      .orderBy('sortOrder', 'asc')
      .get();

    let services;
    if (!snapshot.empty) {
      services = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } else {
      // Fallback: build from in-memory constants
      services = Object.entries(SERVICE_PRICING).map(([key, info], idx) => ({
        id: key,
        key,
        ...info,
        isActive: true,
        requiresQuote: info.requiresQuote || false,
        sortOrder: idx,
      }));
    }

    return res.json({
      success: true,
      data: { services, count: services.length },
      message: 'Services retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /services/slots/:date
 * Public: available booking time slots for a given date (YYYY-MM-DD).
 * Prayer times are blocked automatically.
 */
router.get('/slots/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    const parsedDate = new Date(date);

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use YYYY-MM-DD.',
      });
    }

    // Reject past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot retrieve slots for past dates.',
      });
    }

    const slots = prayerTimeService.getAvailableSlots(parsedDate, 60);
    const prayers = prayerTimeService.getKadunaPrayerTimes(parsedDate);

    return res.json({
      success: true,
      data: {
        date,
        slots,
        prayerTimes: prayers,
        totalSlots: slots.length,
        availableSlots: slots.filter((s) => s.available).length,
      },
      message: 'Available slots retrieved',
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /services/:key
 * Public: get a single service type by key.
 * Note: must be defined AFTER /slots/:date to avoid shadowing.
 */
router.get('/:key', async (req, res, next) => {
  try {
    const { key } = req.params;

    // Try Firestore first
    const snapshot = await db
      .collection(COLLECTIONS.SERVICES)
      .where('key', '==', key)
      .limit(1)
      .get();

    let service;
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      service = { id: doc.id, ...doc.data() };
    } else if (SERVICE_PRICING[key]) {
      // Fallback to constants
      service = {
        id: key,
        key,
        ...SERVICE_PRICING[key],
        isActive: true,
        requiresQuote: SERVICE_PRICING[key].requiresQuote || false,
      };
    } else {
      return res.status(404).json({ success: false, message: 'Service type not found.' });
    }

    return res.json({
      success: true,
      data: service,
      message: 'Service retrieved',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
