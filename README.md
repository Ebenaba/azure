# CleanGo — Nigerian Home Services Marketplace

CleanGo is a full-stack home services marketplace built for Kaduna State, Nigeria. It connects customers with vetted domestic cleaners, laundry workers, and other home service professionals.

## Features

- **Phone OTP & Google Sign-In** via Firebase Auth
- **Zone-aware worker assignment** across Kaduna neighborhoods
- **Paystack payment integration** with escrow hold/release
- **Prayer-time scheduling** respecting Islamic prayer windows
- **Worker vetting workflow** with document upload/review
- **In-app chat** between customer and worker
- **FCM push + Twilio SMS + WhatsApp** notifications
- **Admin dashboard** with analytics and manual assignment
- **Subscription plans** with auto-renewal via cron jobs

---

## Monorepo Structure

```
cleango/
├── packages/
│   └── backend/          # Node.js + Express + Firebase backend
├── firebase/             # Firestore rules, indexes, storage rules
├── package.json          # Yarn workspaces root
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | >= 18.0.0 |
| Yarn | >= 1.22.0 |
| Firebase CLI | >= 13.0.0 |
| A Firebase project | Blaze plan (required for Cloud Functions & external APIs) |

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/cleango.git
cd cleango
yarn install
```

### 2. Firebase Setup

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your Firebase project
```

### 3. Backend Environment Variables

```bash
cp packages/backend/.env.example packages/backend/.env
```

Edit `packages/backend/.env` with your real credentials:

- **Firebase**: Download a service account key from Firebase Console → Project Settings → Service Accounts → Generate new private key. Save it as `packages/backend/serviceAccountKey.json` and set `FIREBASE_SERVICE_ACCOUNT_PATH`.
- **Paystack**: Get your secret key from [dashboard.paystack.com](https://dashboard.paystack.com).
- **Twilio**: Get Account SID, Auth Token, and a phone number from [console.twilio.com](https://console.twilio.com).
- **SendGrid**: Get an API key from [sendgrid.com](https://sendgrid.com).

### 4. Deploy Firestore Rules and Indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 5. Seed the Database

```bash
yarn backend:seed
```

This seeds Kaduna zones, service types, and sample admin user.

### 6. Run the Backend in Development

```bash
yarn backend:dev
```

The server starts on `http://localhost:5000`.

---

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/verify-otp` | Verify Firebase phone OTP |
| POST | `/api/auth/google` | Google sign-in |
| POST | `/api/auth/profile` | Set up user profile |
| GET | `/api/bookings` | Customer booking history |
| POST | `/api/bookings` | Create new booking |
| PATCH | `/api/bookings/:id` | Update booking status |
| DELETE | `/api/bookings/:id` | Cancel booking |
| GET | `/api/workers` | List workers (admin) |
| POST | `/api/workers/vet` | Submit worker for vetting |
| GET | `/api/services` | List all service types |
| POST | `/api/payments/initialize` | Initialize Paystack payment |
| POST | `/api/payments/webhook` | Paystack webhook receiver |
| POST | `/api/payments/payout` | Release escrow to worker |
| GET | `/api/tracking/:bookingId` | Get live job tracking |
| POST | `/api/tracking/update` | Worker updates location/status |
| POST | `/api/reviews` | Submit a review |
| GET | `/api/reviews/:workerId` | Get worker reviews |
| GET | `/api/admin/stats` | Dashboard analytics |
| POST | `/api/admin/assign` | Manually assign worker |
| GET | `/api/chat/:bookingId` | Get chat messages |
| POST | `/api/chat/:bookingId` | Send chat message |

---

## Environment Variables Reference

See `packages/backend/.env.example` for the full list.

---

## Kaduna Zones Supported

GRA, Barnawa, Malali, Tudun Wada, Narayi, Kabala West, Kabala East, Ungwan Rimi, Ungwan Sarki, Kaura, Chikun, Rigachikun, Sabon Tasha, Tudun Nupawa, Gonin Gora, Kakuri, Badiko, Unguwan Dosa, Makera, Romi, Sabo Gari, Nasarawa, Ungwan Mu'azu.

---

## Payment Flow

```
Customer pays → Paystack charge → Funds held in escrow
                                         ↓
                           Job completed + reviewed
                                         ↓
                     Admin/auto releases → Worker payout (Paystack Transfer)
```

CleanGo takes a **15% platform commission** on each booking. The remaining 85% is transferred to the worker's registered Paystack recipient account.

---

## Prayer Time Scheduling

The booking system automatically blocks scheduling during prayer windows calculated for Kaduna State (lat: 10.5264, lng: 7.4381) using astronomical algorithms. Customers are shown available slots with prayer times clearly indicated.

---

## Worker Vetting Workflow

1. Worker submits application with NIN, guarantor info, and photo.
2. Background check document uploaded to Firebase Storage.
3. Admin reviews in the admin dashboard (`/api/admin/workers/pending`).
4. Admin approves or rejects — worker receives SMS notification.
5. Approved workers are onboarded, assigned a zone, and become bookable.

---

## Deployment

### Backend (Cloud Run / Railway / Render)

```bash
cd packages/backend
yarn build   # if using TypeScript transpile step
node src/server.js
```

Recommended: Deploy to **Google Cloud Run** for seamless Firebase integration.

```bash
gcloud run deploy cleango-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. Push: `git push origin feat/my-feature`
5. Open a pull request

---

## License

MIT © CleanGo Team
