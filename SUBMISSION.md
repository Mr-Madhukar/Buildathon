# 🏆 Buildathon Submission Details

Use the ready-to-submit sections below for your hackathon project submission form.

---

## 1. Repository Link
```text
https://github.com/Mr-Madhukar/Buildathon
```

---

## 2. Deployed Link
```text
Frontend: https://collaborative-trip.vercel.app/
Backend API: https://collaborative-trip-planner-api.onrender.com
```

---

## 3. Documentation

### ✈️ Collaborative Trip Planner Overview
A full-stack, real-time collaborative itinerary planning platform engineered for group travel organization. It enables users to create trip itineraries, organize daily schedules with interactive activity cards, manage shared packing/todo checklists, track budget and expenses with category breakdowns, attach travel documents/vouchers, and collaborate live with co-travelers via WebSockets.

### 🔑 Key Features
* **Day-by-Day Itinerary Builder**: Auto-generates trip days with customizable activity cards (time, location, notes, booking codes).
* **Real-Time Collaboration**: Active user presence indicators (who's currently viewing) and live activity card edit locks to prevent conflicting edits.
* **Role-Based Access Control (RBAC)**: Strict permission tiers per trip:
  * **Owner**: Full administrative control, member management, and trip deletion.
  * **Editor**: Can modify itineraries, log expenses, complete checklists, and post comments.
  * **Viewer**: Read-only access to view trip details and itinerary.
* **Interactive Checklists**: Categorized task & packing lists with real-time checkbox sync and tracking of who completed each task.
* **Expense & Budget Tracker**: Real-time logging of expenses with visual category badges (**Transport**, **Accommodation**, **Food**, **Activities**, **Shopping**, **Other**), total group expenditure, and average spending calculations.
* **Cloud File Attachments**: Attach vouchers, tickets, or images to specific activities powered by Cloudinary.
* **Threaded Comments**: Real-time discussions linked to specific days or activity cards.

### 🔌 API Routes & WebSockets Summary
* `POST /api/auth/register` & `POST /api/auth/login`: JWT Authentication.
* `GET /api/trips`, `POST /api/trips`, `GET /api/trips/:id`, `DELETE /api/trips/:id`: Trip Management.
* `POST /api/trips/:id/itinerary/activities`, `PUT /.../activities/:actId`, `DELETE /.../activities/:actId`: Itinerary Activity CRUD.
* `POST /api/trips/:id/expenses`: Budget logging.
* `POST /api/trips/:id/checklists`: Checklist & item updates.
* **WebSocket Channels**: `join-trip`, `presence-update`, `editing-activity`, `stop-editing-activity`, `trip-updated`, `new-comment`.

---

## 4. Project Approach

### 🏗️ Architecture & System Design
The application follows a modern decoupled architecture:
1. **Frontend SPA**: React (Vite) styled with Tailwind CSS for glassmorphic UI aesthetics and fluid micro-animations.
2. **Backend Gateway**: Express Node.js server paired with Socket.io for real-time WebSocket room broadcasting.
3. **Database Layer**: PostgreSQL hosted on Neon, managed via Prisma ORM for type-safe queries and data migrations.

### 🗄️ Relational Data Modeling
Designed a relational schema with Prisma ORM featuring 9 interconnected models:
`User`, `Trip`, `Member`, `ItineraryDay`, `Activity`, `Attachment`, `Checklist`, `ChecklistItem`, `Expense`, and `Comment`. Relational constraints utilize cascading deletes (`onDelete: Cascade`) to maintain strict database consistency when trips or days are removed.

### 🔄 Real-Time State Synchronization Strategy
Implemented a room-based WebSocket strategy (`trip:<tripId>`):
* When a user enters a trip, they join a socket room broadcasting their online status.
* When editing an activity card, an `editing-activity` signal locks the card for other users to avoid edit collisions.
* All data mutations broadcast a lightweight `trip-updated` payload, triggering active clients to synchronize state seamlessly without full page refreshes.

---

## 5. Project Learnings

* **PostgreSQL & Prisma in a MERN Stack Environment**: Gained hands-on experience using Prisma ORM instead of MongoDB for complex relational data structures (nested trip days, activity cards, and member roles).
* **Real-Time Conflict Prevention**: Learned how to handle concurrent state mutations over WebSockets using optimistic UI locking signals to prevent data overwrites.
* **Production Deployment Architecture**: Resolved real-world CORS and WebSocket handshake configurations across cross-origin deployments (Vercel SPA frontend connecting to Render HTTPS/WSS backend).
* **Granular RBAC Implementation**: Mastered multi-level permission checks enforced both on client component rendering and Express API middleware authorization layers.

---

## 6. Tech Stack

* **Frontend**: React.js (Vite), Tailwind CSS, Lucide React Icons, Socket.io-client, Axios, React Context API
* **Backend**: Node.js, Express.js, Socket.io Server, Prisma ORM (v5.15.0), JWT Authentication, Bcryptjs, Multer
* **Database**: PostgreSQL (Neon Cloud Database)
* **Storage**: Cloudinary API & SDK
* **Deployment & CI**: Vercel (Frontend), Render (Backend), GitHub Actions CI
