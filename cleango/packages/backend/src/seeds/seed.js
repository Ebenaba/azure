'use strict';

/**
 * Seed script: populates Firestore with Kaduna zones and service types.
 * Run: node src/seeds/seed.js
 * Options:
 *   --zones       seed zones only
 *   --services    seed services only
 *   --force       overwrite existing documents
 *   --dry-run     log what would be written without writing
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { db, FieldValue } = require('../config/firebase');
const { COLLECTIONS } = require('../models/schemas');
const KADUNA_ZONES = require('./kaduna-zones');
const SERVICE_TYPE_DOCS = require('./service-types');

const args = process.argv.slice(2);
const SEED_ZONES = args.includes('--zones') || (!args.includes('--services'));
const SEED_SERVICES = args.includes('--services') || (!args.includes('--zones'));
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

const log = {
  info: (msg) => console.log(`  [Seed] ${msg}`),
  ok: (msg) => console.log(`  ✓ ${msg}`),
  skip: (msg) => console.log(`  ~ ${msg}`),
  err: (msg) => console.error(`  ✗ ${msg}`),
};

async function seedZones() {
  console.log('\n── Seeding Kaduna Zones ──────────────────────────');
  let created = 0;
  let skipped = 0;

  for (const zone of KADUNA_ZONES) {
    const docRef = db.collection(COLLECTIONS.ZONES).doc(zone.key);

    if (!FORCE) {
      const existing = await docRef.get();
      if (existing.exists) {
        log.skip(`Zone '${zone.key}' already exists — skipping (use --force to overwrite)`);
        skipped++;
        continue;
      }
    }

    const zoneData = {
      ...zone,
      currentActiveWorkers: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (DRY_RUN) {
      log.info(`[DRY-RUN] Would write zone: ${zone.key} (${zone.name})`);
    } else {
      await docRef.set(zoneData);
      log.ok(`Zone '${zone.key}' (${zone.name}) seeded`);
    }
    created++;
  }

  console.log(`\n  Zones: ${created} written, ${skipped} skipped`);
}

async function seedServices() {
  console.log('\n── Seeding Service Types ─────────────────────────');
  let created = 0;
  let skipped = 0;

  for (const service of SERVICE_TYPE_DOCS) {
    const docRef = db.collection(COLLECTIONS.SERVICES).doc(service.key);

    if (!FORCE) {
      const existing = await docRef.get();
      if (existing.exists) {
        log.skip(`Service '${service.key}' already exists — skipping`);
        skipped++;
        continue;
      }
    }

    const serviceData = {
      ...service,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (DRY_RUN) {
      log.info(`[DRY-RUN] Would write service: ${service.key} (${service.label})`);
    } else {
      await docRef.set(serviceData);
      log.ok(`Service '${service.key}' (${service.label}) seeded`);
    }
    created++;
  }

  console.log(`\n  Services: ${created} written, ${skipped} skipped`);
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     CleanGo Firestore Seed Script        ║');
  console.log('╚══════════════════════════════════════════╝');

  if (DRY_RUN) {
    console.log('\n  ⚡ DRY-RUN mode — no writes will be made\n');
  }
  if (FORCE) {
    console.log('\n  ⚠  FORCE mode — existing documents will be overwritten\n');
  }

  try {
    if (SEED_ZONES) await seedZones();
    if (SEED_SERVICES) await seedServices();

    console.log('\n✅ Seed complete.\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
