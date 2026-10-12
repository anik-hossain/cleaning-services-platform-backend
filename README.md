# 🧹 Cleaning Services Platform

A secure and scalable cleaning service marketplace that connects **Homeowners** with verified and available **Maids**. Homeowners can book cleaning services based on service type, maid availability, reviews, and available time slots, while Maids can manage bookings, complete jobs, submit proof of work, and withdraw their earnings.

---
## 🔗 Live Application & Dashboard

* 📱 **Live Mobile Application:** [Google Play Store](https://play.google.com/store/apps/details?id=com.cleennconnect.app&hl=en)
* 🖥️ **Live Dashboard:** [Dashboard](https://dashboard.cleennconnect.com)

---

## 🎯 Platform Overview

The platform is designed around three primary roles:

* **Homeowner** – Browse services, find available maids, book cleaning slots, manage balance, and communicate with maids.
* **Maid** – Manage availability, receive booking requests, complete cleaning jobs, upload job proof, and withdraw earnings.
* **Admin** – Manage the entire platform, verify users, review completed jobs, approve payments, handle disputes, and monitor safety alerts.

---

## 🏠 Homeowner Features

### Service Selection

Homeowners can start the booking process by selecting a cleaning service from the available service categories.

Examples:

* Home Cleaning
* Deep Cleaning
* Kitchen Cleaning
* Bathroom Cleaning
* Bedroom Cleaning
* Office Cleaning
* Other Cleaning Services

### Maid Discovery

After selecting a service, homeowners can view available maids based on:

* Service availability
* Maid availability
* Customer reviews
* Rating
* Previous booking history
* Available dates
* Available time slots

Before sending a booking request, the homeowner can check:

* Maid's existing bookings
* Maid's available dates
* Number of already booked slots
* Remaining available slots
* Maid's reviews and ratings

---

## 📅 Booking & Time Slot System

Each day will contain **5 available booking slots**.

Each slot will have:

* **2 hours of cleaning/service time**
* **30 minutes gap** between slots

The system will automatically manage slot availability and prevent double booking.

Homeowners can see the maid's schedule before submitting a booking request.

---

## 📩 Booking Request Flow

The booking process will work as follows:

```text
Select Service
      ↓
View Available Maids
      ↓
Check Reviews & Availability
      ↓
Select Date & Time Slot
      ↓
Send Booking Request
      ↓
Maid Receives Notification
      ↓
30-Minute Response Window
      ↓
Accept / Reject
      ↓
Booking Confirmed
```

### ⏱️ 30-Minute Acceptance Rule

After a homeowner sends a booking request:

* Maid receives an instant notification.
* Maid has **30 minutes** to accept the request.
* If the maid accepts within 30 minutes → booking is confirmed.
* If the maid rejects → booking is rejected.
* If the maid does not respond within 30 minutes → booking is automatically rejected/expired.
* The homeowner receives the booking status notification.

---

# 👩‍🔧 Maid Features

## Availability Management

Maids can control their own availability.

They can:

* Set themselves as **Available / Unavailable**
* Select available dates
* Manage available time slots
* View upcoming bookings
* View completed bookings
* View booking history

Only available maids will appear in the homeowner's maid search results.

---

## 📍 Maid Job Start & Location Verification

Once a booking is confirmed, the maid will visit the homeowner's location at the scheduled time.

The platform will use **GPS / Latitude & Longitude** to confirm that the maid has reached the correct location.

### Job Start Flow

```text
Booking Confirmed
      ↓
Maid Travels to Homeowner Location
      ↓
GPS Location Verification
      ↓
Maid Arrives at Location
      ↓
Start Booking
      ↓
Cleaning Service Begins
```

The maid must be within the required location radius before the booking can be started.

---

# 📸 Before & After Job Verification

To provide transparency and protect both homeowners and maids, the platform will require photo evidence.

### Before Cleaning

Before starting the cleaning service:

* Maid must upload **3 images**
* Images should show the condition of the area before cleaning
* The maid then starts the booking

### After Cleaning

After completing the service:

* Maid uploads **3 final images**
* Images show the condition after cleaning
* Maid submits the completed booking

```text
Before Photos (3)
       ↓
Start Booking
       ↓
Cleaning Service
       ↓
Complete Booking
       ↓
After Photos (3)
       ↓
Submit Job
       ↓
Admin Review
```

---

# 🛡️ Admin Job Verification

After the maid submits a completed booking:

1. Admin receives the completed job.
2. Admin reviews the uploaded before/after images.
3. Admin verifies the booking.
4. Admin approves or rejects the completed job.
5. If approved, the maid's earnings are released.

This verification system helps prevent fraudulent claims and protects both parties.

---

# 💰 Wallet & Payment System

The platform will use **Stripe** for secure payment processing and wallet management.

## 🏠 Homeowner Wallet

Homeowners can add money to their platform wallet using a **credit/debit card through Stripe**.

```text
Add Balance
   ↓
Stripe Payment
   ↓
Homeowner Wallet
   ↓
Create Booking
   ↓
Payment Reserved
   ↓
Job Completed
   ↓
Admin Approval
   ↓
Maid Earnings Released
```

## 👩‍🔧 Maid Earnings & Withdrawal

After Admin approves a completed booking:

* Maid's earnings are added to their wallet.
* Platform automatically deducts the **5% commission**.
* Maid can view balance and transaction history.
* Maid can request withdrawal through the supported **Stripe payout system**.

### Example

```text
Booking Amount: $100
Platform Commission: 5%
Maid Earnings: $95
```

### Stripe Integration

* Stripe Payment Methods
* Secure Card Payments
* Wallet Balance Top-up
* Payment Tracking
* Refund Handling
* Transaction History
* Maid Payouts
* Commission Management


### Maid Subscription

* Monthly subscription: **Free**
* Platform commission: **5% per completed booking**

Example:

```text
Booking Amount: $100

Platform Commission: 5%
Maid Earnings: $95
```

The exact commission configuration can be controlled from the Admin Panel.

---

# 🚨 Emergency / Danger Button

Safety is one of the most important features of the platform.

Both **Maid and Homeowner** will have access to an emergency/danger button.

### Emergency Flow

```text
Emergency Situation
       ↓
Press Danger Button
       ↓
Emergency Alert Created
       ↓
Admin / Support Team Notified Immediately
       ↓
Location Information Shared
       ↓
Support Team Takes Action
```

The emergency alert can include:

* User information
* Current GPS location
* Booking information
* Contact information
* Emergency timestamp
* Current booking status

This feature is designed to provide rapid assistance when either a maid or homeowner faces a dangerous situation.

> **Important:** The platform should clearly define the emergency response process, escalation contacts, and service limitations. The app itself cannot guarantee physical safety or emergency response.

---

# 👤 User Registration & Verification

Both **Homeowners and Maids must complete registration and verification** before using the booking system.

### Registration Requirements

Users may be required to provide:

* Full Name
* Phone Number
* Email
* Profile Information
* Address
* Identification Documents
* Required verification documents
* Profile Photo
* Other required information

Users who have not completed the required verification will not be allowed to create or accept bookings.

---

# 🔐 Admin Verification

Admin will manage user verification.

```text
User Registration
       ↓
Document Upload
       ↓
Admin Review
       ↓
Approve / Reject
       ↓
Verified Account
       ↓
Booking Access
```

Admin can:

* Approve users
* Reject users
* Suspend users
* Reactivate users
* Review uploaded documents
* Manage user profiles
* Manage services
* Manage bookings
* Manage payments
* Manage commissions
* Manage withdrawals
* Review job images
* Manage emergency alerts
* Handle disputes
* Monitor platform activity

---

# 💬 Real-Time Chat System

The platform will include a real-time messaging system between:

* Homeowner ↔ Maid
* Homeowner ↔ Admin
* Maid ↔ Admin

Users can communicate regarding:

* Booking details
* Service requirements
* Location information
* Schedule
* Job-related communication
* Support issues

Admin will have the ability to monitor and manage conversations when required for support, safety, or dispute resolution, subject to the platform's privacy policy.

---

# 📊 Admin Dashboard

The Admin Dashboard will provide complete control over the platform.

### Dashboard Overview

Admin can monitor:

* Total Homeowners
* Total Maids
* Pending Verifications
* Active Bookings
* Completed Bookings
* Cancelled Bookings
* Pending Job Approvals
* Total Revenue
* Platform Commission
* Maid Earnings
* Pending Withdrawals
* Emergency Alerts
* Disputes
* User Activity

### Booking Management

Admin can:

* View all bookings
* Filter bookings
* View booking details
* View maid/homeowner information
* View booking status
* Review before/after images
* Approve completed bookings
* Reject completed bookings
* Handle disputes

---

# 🔄 Complete Booking Lifecycle

```text
Homeowner Registers
        ↓
Admin Verification
        ↓
Add Balance
        ↓
Select Cleaning Service
        ↓
Browse Available Maids
        ↓
Check Reviews & Schedule
        ↓
Select Date & Time Slot
        ↓
Send Booking Request
        ↓
Maid Notification
        ↓
30-Minute Acceptance Window
        ↓
Accept Booking
        ↓
Booking Confirmed
        ↓
Maid Travels to Location
        ↓
GPS Location Verification
        ↓
Upload 3 Before Images
        ↓
Start Cleaning
        ↓
Complete Cleaning
        ↓
Upload 3 After Images
        ↓
Submit Completed Booking
        ↓
Admin Reviews Images & Job
        ↓
Admin Approves
        ↓
Payment Released
        ↓
Maid Wallet Updated
        ↓
Maid Can Withdraw Earnings
```

---

# 🔒 Security & Trust

The platform will focus heavily on trust, verification, payment security, and user safety.

Key security features include:

* User verification
* Document verification
* Role-based access control
* Secure authentication
* Booking validation
* GPS location verification
* Before/after photo verification
* Payment protection
* Wallet transaction tracking
* Emergency/Danger system
* Admin moderation
* Dispute management
* Secure real-time chat
* Booking history and audit logs



---

# 📊 Workflow & Permissions Matrix

| Features & Permissions | Homeowner | Maid | Admin |
|---|:---:|:---:|:---:|
| Upload KYC & Registration Documents | ✅ | ✅ | 👁️ (Review & Verify) |
| Manage Availability & 5 Daily Slots | ❌ | ✅ | 👁️ (Monitor) |
| Search Maids & Send Slot Booking Request | ✅ | ❌ | 👁️ (Monitor) |
| Accept / Reject Booking (30-min Window) | ❌ | ✅ | ⚡ (Override/Cancel) |
| Top-up In-App Wallet via Card | ✅ | ❌ | 👁️ (Audit) |
| Live GPS Navigation to Location | ❌ | ✅ | 👁️ (Track) |
| Upload 3 'Before' & 3 'After' Work Photos | ❌ | ✅ | 👁️ (Review) |
| Audit Photos & Release Escrow Payment | ❌ | ❌ | ✅ |
| Trigger Emergency SOS / Danger Button | 🚨 (Active) | 🚨 (Active) | 🛠️ (Dispatch Support) |
| Request Earnings Withdrawal | ❌ | ✅ | ✅ (Approve & Payout) |
| Collect Monthly Subscription + 5% Fee | ❌ | ❌ | ✅ |
| Dispute Resolution & User Suspension | 🎫 (Report) | 🎫 (Report) | 🛠️ (Enforce) |

| Role          | Main Responsibilities                                                                         |
| ------------- | --------------------------------------------------------------------------------------------- |
| **Homeowner** | Book services, manage wallet, communicate with maid, track bookings                           |
| **Maid**      | Manage availability, accept bookings, perform services, upload proof, withdraw earnings       |
| **Admin**     | Verify users, manage bookings, approve jobs, manage payments, handle disputes and emergencies |

---

# 🚀 Main Goal

The goal of this platform is to build a **trusted, secure, transparent, and scalable cleaning-service marketplace** where homeowners can easily find reliable maids, while maids can receive legitimate cleaning jobs, manage their schedules, earn money, and safely communicate with homeowners.

The platform brings together verified users, reviews and ratings, maid availability, time-slot booking, GPS location verification, before/after photo verification, secure Stripe payments and wallet management, emergency support, real-time chat, and complete Admin control into one reliable and secure cleaning-service ecosystem.

---

# 🛠️ Recommended Tech Stack

* **Mobile App:** Flutter
* **Frontend Dashborad:**  Next.js (Web Portal)
* **Backend:** Node.js (NestJS )
* **Database:** PostgreSQL (Prisma ORM) 
* **Real-time Services:** Socket.io (Instant notifications & SOS), Firebase Cloud Messaging (FCM)
* **Maps & Tracking:** Google Maps API
* **Payments:** Stripe
* **Storage:** Minio

---


## ⚙️ Getting Started

Follow these steps to run the project locally:

**Clone the repository**
```
git clone https://github.com/Tanvir286/cleaning-services-platform-frontend.git       
cd cleaning-services-platform-frontend
```

## Installation

Install all dependencies

```
yarn install
```

## Config

**Stripe webhook:**
```
http://{domain_name}/api/payment/stripe/webhook
```

**for development run stripe cli:**
```
stripe listen --forward-to localhost:4000/api/payment/stripe/webhook
```
**trigger a event for testing:**
```
stripe trigger payment_intent.succeeded
```


## Setup

Copy .env.example to .env and config according to your needs.

### Firebase push notifications

The API uses Firebase Cloud Messaging (FCM) for Android/iOS and browser push. It stores a separate registration token for each device/browser, keeps notifications in the existing in-app inbox, and queues push delivery in BullMQ with exponential retries. Redis must be available for push retries.

1. In Firebase Console, enable Cloud Messaging and create a service account for the Firebase Admin SDK. Configure the credentials only in the backend environment:

   ```env
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-firebase-project-id.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   CLIENT_APP_URL=https://your-next-app.example.com
   ```

   Never put the service-account private key in a mobile app, Next.js client bundle, or source control. On Google Cloud environments, prefer Application Default Credentials instead of a downloaded key. Set all three Firebase variables or leave all three unset.

2. Apply the migration with the deployment's normal migration process (`npx prisma migrate deploy`) and regenerate Prisma Client if your deploy process does not already do so.

3. In the authenticated mobile app, request notification permission, retrieve the FCM registration token using the Firebase client SDK, then register it with the API:

   ```http
   POST /api/auth/fcm-token
   Authorization: Bearer <access_token>
   Content-Type: application/json

   {"fcm_token":"<current-device-fcm-token>","device_type":"android"}
   ```

   Use `ios` for iOS. Re-register whenever Firebase reports a refreshed token. Call `DELETE /api/auth/fcm-token` with the same JSON body when the user disables push or signs out of that device. The existing login `fcm_token` field and `POST /api/auth/save-fcm-token` endpoint remain supported.

4. For a Next.js web client, configure the Firebase Web SDK with the public Firebase app config and Web Push certificate (VAPID) key. Request permission in response to a user action, call `getToken(messaging, { vapidKey })`, and register the returned token at the same authenticated endpoint with `device_type: "web"`. Serve a Firebase messaging service worker from `/firebase-messaging-sw.js` (or configure the worker URL passed to `getToken`) and handle foreground messages with `onMessage`. Set the web app URL in `CLIENT_APP_URL`; notification clicks open its `/notifications` route. Browser push requires HTTPS (except localhost), notification permission, and a supported browser.

For mobile, handle foreground messages in the app and route notification taps using the `notification_id`, `entity_id`, and `type` data fields. On iOS, configure APNs credentials in Firebase; Android and iOS app permission/channel behavior remains the responsibility of the app.

See the [mobile push notification integration guide](./docs/mobile-push-notifications.md) for exact API requests, token lifecycle, payload shape, app-side handling, and a test checklist.

Push delivery is best-effort end-to-end: the API retries transient Firebase failures up to eight times and retains exhausted jobs for inspection, but cannot guarantee delivery when a device is offline, permissions are denied, tokens are revoked, or Firebase/APNs is unavailable. The in-app notification record remains available independently of push delivery.

**Migrate database:**
```bash
npx prisma migrate dev
```

**Seed dummy data to database**
```
yarn cmd seed
```

## Running:

```bash
# development
yarn start

# watch mode
yarn start:dev

# production mode
yarn start:prod

# watch mode with swc compiler (faster)
yarn start:dev-swc
```

**For docker:**
```
docker compose up
```

If you run the app directly on Windows and hit a bind permission error, set `HOST=127.0.0.1`.

## Api documentation

Swagger: http://{domain_name}/api/docs
