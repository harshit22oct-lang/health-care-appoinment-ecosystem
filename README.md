# HealthSync — Healthcare Appointment & Intelligent Follow-up Platform

## 🏗️ Architecture Overview

```
├── server/           # Node.js + Express backend
│   └── src/
│       ├── config/   # Database, environment config
│       ├── models/   # Mongoose schemas (5 models)
│       ├── services/ # Business logic layer
│       ├── controllers/ # Request handlers
│       ├── routes/   # Express routers
│       ├── middleware/  # Auth, RBAC, validation
│       ├── workers/  # 3 background cron workers
│       └── seed/     # Demo data seeder
└── client/           # React (Vite) frontend
    └── src/
        ├── pages/    # 10 full pages (Patient/Doctor/Admin)
        ├── components/ # Reusable components
        ├── context/  # Auth context
        └── services/ # API client
```

## 🚀 Quick Start

### 1. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
```
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/healthsync
JWT_SECRET=<32+ char random string>
```

### 2. Install Dependencies

```bash
# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 3. Seed Demo Data

```bash
cd server && npm run seed
```

### 4. Start Development Servers

Terminal 1 (Backend):
```bash
cd server && npm run dev
# Runs on http://localhost:5000
```

Terminal 2 (Frontend):
```bash
cd client && npm run dev
# Runs on http://localhost:5173
```

---

## 🔑 Demo Credentials

| Role    | Email                        | Password         |
|---------|------------------------------|------------------|
| Patient | `rohan@patient.demo`         | `Patient@123456` |
| Doctor  | `dr.priya@healthsync.demo`   | `Doctor@123456`  |
| Admin   | `admin@healthsync.demo`      | `Admin@123456`   |

---

## ⚙️ Optional Integrations

### Google Gemini AI (Pre/Post Visit Analysis)
```
GEMINI_API_KEY=your_key_from_aistudio.google.com
```

### SMTP Email
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_app_password
```

### Google Calendar Sync
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
```

---

## 📡 API Reference

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/register` | Public | Register patient |
| POST | `/api/v1/auth/login` | Public | Login |
| GET | `/api/v1/auth/me` | Bearer | Current user |
| GET | `/api/v1/doctors` | Public | Search doctors |
| GET | `/api/v1/doctors/:id/slots?date=` | Patient | Available slots |
| POST | `/api/v1/slots/:slotId/hold` | Patient | Hold slot (2-phase) |
| DELETE | `/api/v1/slots/:slotId/hold` | Patient | Release hold |
| POST | `/api/v1/appointments` | Patient | Book appointment |
| GET | `/api/v1/appointments` | Auth | List appointments |
| PUT | `/api/v1/appointments/:id/notes` | Doctor | Submit clinical notes |
| PUT | `/api/v1/appointments/:id/cancel` | Auth | Cancel appointment |
| POST | `/api/v1/doctors/:id/leave` | Doctor/Admin | Apply leave |
| POST | `/api/v1/doctors/:id/leave/preview` | Doctor/Admin | Preview conflicts |
| GET | `/api/v1/admin/stats` | Admin | Platform metrics |
| GET | `/api/v1/admin/notification-queue` | Admin | Email queue |

---

## 🏗️ Key Engineering Patterns

### Two-Phase Slot Locking
```
Patient 1          MongoDB             Patient 2
    |                 |                    |
    |--- holdSlot --> |                    |
    |<-- holdToken -- |                    |
    |                 | <-- holdSlot ------|
    |                 | findOneAndUpdate   |
    |                 | (status=AVAILABLE) |
    |                 |--> null (HELD) --->|
    |                 |                 409|
    |--- book(token)->|                    |
    |<-- confirmed ---|                    |
```

### Circuit Breaker States
```
CLOSED → (failure threshold) → OPEN
OPEN   → (timeout) → HALF_OPEN → (success) → CLOSED
```

### Notification Retry Backoff
```
QUEUED → attempt 1 → FAILED (retry in 1m)
       → attempt 2 → FAILED (retry in 5m)
       → attempt 3 → FAILED (retry in 15m)
       → attempt 4 → DEAD_LETTER
```
