# 📐 HealthSync System Design & Architecture Write-Up (800 Words)

---

## 1. Double-Booking Prevention & Concurrency Control
In high-traffic healthcare platforms, simultaneous booking attempts on the same calendar slot represent a classic race condition. HealthSync eliminates double-booking through **atomic database-level conditional mutations** and **distributed uniqueness constraints**, avoiding distributed lock bottlenecks.

Every doctor consultation slot has a unique composite index (`doctorId + startTime`) and a deterministic status lifecycle (`AVAILABLE ➔ HELD ➔ BOOKED ➔ BLOCKED_LEAVE`). When two or more patients attempt to reserve the same slot concurrently, the system uses MongoDB’s atomic `findOneAndUpdate` with a query filter condition (`{ _id: slotId, status: 'AVAILABLE' }`). Because MongoDB document-level write locks execute sequentially at the storage engine level (WiredTiger), only the first transaction succeeds in transitioning the slot to `HELD`. Subsequent concurrent queries find zero matching documents and are immediately rejected with an `HTTP 409 Conflict` response, guaranteeing zero double-bookings without database deadlocks.

```
Patient A ──[ POST /slots/:id/hold ]──► [ Atomic findOneAndUpdate ] ──► ✅ HELD (5-Min Token)
Patient B ──[ POST /slots/:id/hold ]──► [ Status != 'AVAILABLE'   ] ──► ❌ HTTP 409 Conflict
```

---

## 2. Two-Phase Slot Hold Mechanism (5-Minute TTL)
A common failure mode in appointment systems is slot abandonment during intake form completion. HealthSync implements a **Two-Phase Slot Hold Protocol**:

1. **Phase 1 (Atomic Reservation Hold)**: When a patient selects an available slot, the system generates a cryptographically secure UUID `holdToken` and sets `holdExpiresAt = now + 5 minutes`. The slot status transitions to `HELD`. During this 5-minute window, the patient completes medical symptom intake and pre-visit disclosures without fear of losing their slot.
2. **Phase 2 (Atomic Confirmation & Intake Commitment)**: Upon form submission, the booking request passes the `holdToken`. The transaction atomically verifies that `holdExpiresAt > now` and `holdToken === slot.holdToken`, updating the slot to `BOOKED` and persisting the appointment with Gemini AI triage analysis in an atomic session.
3. **Automated Expiration Cleanup**: A background cron worker (`holdCleanupWorker`) executes every 30 seconds, finding expired held slots (`status: 'HELD', holdExpiresAt < now`) and atomically resetting them back to `AVAILABLE`. Patients are visually notified via a real-time countdown timer.

---

## 3. Doctor Leave Conflict Handling & Cascade Resolution
When a doctor declares unplanned emergency or scheduled leave, existing confirmed appointments in that date range must be resolved safely without data corruption or orphan records. HealthSync implements a **5-Step Transactional Cascade**:

1. **Leave Registration**: Doctor inputs start/end timestamps and reason; recorded in `DoctorProfile.leaveCalendar`.
2. **Slot Invalidation**: All `AVAILABLE` and `HELD` slots within the leave window are atomically updated to `BLOCKED_LEAVE`.
3. **Confirmed Appointment Cancellation**: Conflicting confirmed appointments transition to `CANCELLED_DOCTOR_LEAVE`.
4. **Priority Reschedule Token Generation**: For each displaced patient, the system signs an encrypted JWT `rescheduleToken` valid for 7 days, granting the patient priority access to rebook with the same doctor without repayment.
5. **Multi-Channel Notification & Calendar Sync**: Affected patients receive immediate priority notification emails containing the direct 1-click reschedule link, and corresponding Google Calendar events are deleted via Google Calendar API OAuth 2.0.

---

## 4. Notification Failure Handling & Idempotent Retry Queues
External messaging providers (SMTP email, calendar APIs) suffer from transient network outages and rate limits. HealthSync decouples notification delivery from the HTTP request-response cycle using an **Asynchronous Persistent Outbox Queue**:

* **Transactional Job Enqueueing**: When an appointment is confirmed, rescheduled, or cancelled, a `NotificationJob` document is written to MongoDB (`status: 'PENDING', attempts: 0, maxAttempts: 5, backoffMultiplier: 2`).
* **Exponential Backoff Delivery Worker**: A background worker polls pending and retryable jobs every 15 seconds. Failed deliveries calculate next attempt timestamp via exponential jitter:
  $$\text{NextRetry} = \text{now} + 2^{\text{attempts}} \times 10\text{s}$$
* **Dead-Letter Handling (DLQ)**: Jobs exceeding 5 failed attempts transition to `DEAD_LETTER` status. The Admin Control Panel provides real-time visibility into the DLQ with manual one-click retry capabilities.
* **Idempotency Guarantees**: Every notification job carries an `idempotencyKey` (`appointmentId + jobType + recipientId`) preventing duplicate emails if workers restart.

---

## 5. Gemini AI Clinical Triage & Heuristic Circuit Breaker
Patient symptoms are triaged via Google Gemini AI before doctor consultation:
* **Pre-Visit Prompt**: Extracts urgency (`Low`, `Medium`, `High`, `Critical`), chief complaint brief, and 3 clinical doctor questions.
* **Post-Visit Prompt**: Transforms complex physician clinical notes and Rx frequencies (`twice_daily`, `before_food`) into structured patient medication timetables (`08:00 AM`, `08:00 PM`).
* **Circuit-Breaker Pattern**: If the external Gemini API experiences latency or timeouts (>10s), an automated circuit breaker trips and falls back to deterministic rule-based heuristic symptom classification and Jan Aushadhi generic drug lookup, ensuring **100% platform availability with zero downtime**.
