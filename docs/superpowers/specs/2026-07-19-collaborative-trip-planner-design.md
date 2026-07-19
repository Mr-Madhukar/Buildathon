# Collaborative Trip Planner - Specification Document

## 1. Project Overview & Goal
Build a premium, collaborative trip itinerary planning application that enables multiple users to manage a shared itinerary in real-time. This application features role-based access control (Owner, Editor, Viewer), activity planning (with drag-and-drop support), checklist collaboration, expense tracking/split visualization, and an inline comment system. 

The application utilizes the **PERN Stack** (Vite + React frontend, Node.js + Express backend, PostgreSQL database with **Prisma ORM**) and implements real-time synchronization using **Socket.io** along with cloud storage for file attachments using **Cloudinary**.

---

## 2. Directory Structure (Monorepo)
The project will be organized as a monorepo with `client` and `server` folders, managed by a root `package.json` utilizing `concurrently` to run both services simultaneously.

```
buildathon/
├── package.json               # Root dependencies (concurrently, eslint, prettier)
├── README.md                  # Project overview, setup instructions, and deployment details
├── .github/
│   └── workflows/
│       └── ci.yml             # Github Actions continuous integration config
├── client/                    # Vite + React + Tailwind CSS
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css          # Styling tokens, custom glassmorphism styles, fonts
│   │   ├── components/        # Reusable UI elements (Buttons, Inputs, GlassCard)
│   │   │   ├── TripCard.jsx
│   │   │   ├── ItineraryDay.jsx
│   │   │   ├── ActivityCard.jsx
│   │   │   ├── ChecklistSection.jsx
│   │   │   ├── ExpenseTracker.jsx
│   │   │   ├── CommentDrawer.jsx
│   │   │   └── ActiveUsers.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Global user auth state
│   │   └── utils/
│   │       └── socket.js      # Socket.io client configuration
└── server/                    # Node.js + Express + PostgreSQL (Prisma)
    ├── package.json
    ├── server.js              # Entrypoint (Express app setup & Socket.io server)
    ├── prisma/
    │   ├── schema.prisma      # Prisma schema for PostgreSQL database models
    │   └── migrations/        # Automated migrations
    ├── config/
    │   ├── db.js              # Prisma Client instance builder
    │   └── cloudinary.js      # Cloudinary storage helper
    ├── middleware/
    │   ├── auth.js            # JWT Validation middleware
    │   └── role.js            # Check trip membership & role permissions
    └── routes/
        ├── auth.js
        ├── trips.js
        └── comments.js
```

---

## 3. Database Schema Design (Prisma / PostgreSQL)

### 3.1. Prisma Schema (`server/prisma/schema.prisma`)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id         String       @id @default(uuid())
  name       String
  email      String       @unique
  password   String
  avatar     String?
  trips      Member[]
  comments   Comment[]
  expenses   Expense[]
  attachments Attachment[]
  checklistItems ChecklistItem[]
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
}

model Trip {
  id          String         @id @default(uuid())
  title       String
  description String?
  startDate   DateTime
  endDate     DateTime
  ownerId     String
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  members     Member[]
  itinerary   ItineraryDay[]
  checklists  Checklist[]
  expenses    Expense[]
  comments    Comment[]
}

model Member {
  id     String @id @default(uuid())
  tripId String
  userId String
  role   String // "owner" | "editor" | "viewer"
  trip   Trip   @relation(fields: [tripId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tripId, userId])
}

model ItineraryDay {
  id         String     @id @default(uuid())
  tripId     String
  dayNumber  Int
  date       DateTime?
  trip       Trip       @relation(fields: [tripId], references: [id], onDelete: Cascade)
  activities Activity[]
}

model Activity {
  id              String       @id @default(uuid())
  dayId           String
  title           String
  description     String?
  time            String?
  location        String?
  notes           String?
  reservationCode String?
  day             ItineraryDay @relation(fields: [dayId], references: [id], onDelete: Cascade)
  attachments     Attachment[]
}

model Attachment {
  id           String   @id @default(uuid())
  activityId   String
  name         String
  url          String
  fileType     String   // "image" | "pdf" | "other"
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  activity     Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
}

model Checklist {
  id     String          @id @default(uuid())
  tripId String
  title  String
  trip   Trip            @relation(fields: [tripId], references: [id], onDelete: Cascade)
  items  ChecklistItem[]
}

model ChecklistItem {
  id            String    @id @default(uuid())
  checklistId   String
  text          String
  completed     Boolean   @default(false)
  completedById String?
  completedBy   User?     @relation(fields: [completedById], references: [id])
  checklist     Checklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)
}

model Expense {
  id          String   @id @default(uuid())
  tripId      String
  description String
  amount      Float
  category    String   // "Transport" | "Accommodation" | "Food" | "Activities" | "Shopping" | "Other"
  paidById    String
  paidBy      User     @relation(fields: [paidById], references: [id])
  trip        Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  date        DateTime @default(now())
}

model Comment {
  id         String   @id @default(uuid())
  tripId     String
  dayNumber  Int?
  activityId String?
  authorId   String
  text       String
  author     User     @relation(fields: [authorId], references: [id])
  trip       Trip     @relation(fields: [tripId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

---

## 4. API Endpoints

All endpoints beneath `/api/trips` require verification middleware.
*   **Role Middleware (`server/middleware/role.js`)**: Resolves the trip, inspects the `members` relations for the current user's JWT payload ID, and validates permissions (`owner` / `editor` / `viewer`) before passing control.

| Method | Endpoint | Description | Permitted Roles |
|--------|----------|-------------|-----------------|
| **POST** | `/api/auth/register` | Register user account | Public |
| **POST** | `/api/auth/login` | Log in user, return JWT token | Public |
| **GET** | `/api/auth/me` | Fetch active user's profile | Authenticated |
| **GET** | `/api/auth/users` | Query users by email prefix | Authenticated |
| **GET** | `/api/trips` | Get all trips user is part of | Authenticated |
| **POST** | `/api/trips` | Create new trip | Authenticated |
| **GET** | `/api/trips/:id` | Fetch trip detail payload | Owner, Editor, Viewer |
| **PUT** | `/api/trips/:id` | Update trip general settings | Owner, Editor |
| **DELETE** | `/api/trips/:id` | Delete trip | Owner |
| **POST** | `/api/trips/:id/members` | Invite new user by email | Owner |
| **PUT** | `/api/trips/:id/members/:userId` | Update member's access role | Owner |
| **DELETE** | `/api/trips/:id/members/:userId` | Remove collaborator | Owner |
| **POST** | `/api/trips/:id/itinerary/activities` | Append activity to a day | Owner, Editor |
| **PUT** | `/api/trips/:id/itinerary/activities/:activityId` | Edit details of activity | Owner, Editor |
| **DELETE** | `/api/trips/:id/itinerary/activities/:activityId` | Remove activity | Owner, Editor |
| **PUT** | `/api/trips/:id/itinerary/reorder` | Update day numbers or activity positions | Owner, Editor |
| **POST** | `/api/trips/:id/checklists` | Create empty checklist category | Owner, Editor |
| **POST** | `/api/trips/:id/checklists/:checklistId/items` | Add item to a checklist | Owner, Editor |
| **PUT** | `/api/trips/:id/checklists/:checklistId/items/:itemId` | Toggle item completion status | Owner, Editor |
| **DELETE** | `/api/trips/:id/checklists/:checklistId/items/:itemId` | Delete item | Owner, Editor |
| **POST** | `/api/trips/:id/expenses` | Post a new expense | Owner, Editor |
| **DELETE** | `/api/trips/:id/expenses/:expenseId` | Delete logged expense | Owner, Editor |
| **GET** | `/api/trips/:id/comments` | Fetch comments for trip thread | Owner, Editor, Viewer |
| **POST** | `/api/trips/:id/comments` | Post a new thread comment | Owner, Editor, Viewer |
| **POST** | `/api/trips/:id/attachments` | Upload image/pdf to Cloudinary | Owner, Editor |

---

## 5. WebSockets Real-Time Sync Spec

We use Socket.io to manage instantaneous page updates and display presence tracking.

```
                    ┌────────────────────────┐
                    │     Express Server     │
                    │   (Socket.io Engine)   │
                    └────────┬──────┬────────┘
                             │      │
          "presence-update"  │      │  "trip-updated"
         (list of active users)     │  (triggers db fetch)
                             ▼      ▼
                    ┌────────────────────────┐
                    │      React Client      │
                    │   (Socket.io Listener) │
                    └────────────────────────┘
```

### 5.1. Server Connection Handling
```javascript
const activeRooms = {}; // { tripId: { socketId: userDetails } }

io.on('connection', (socket) => {
  socket.on('join-trip', ({ tripId, user }) => {
    socket.join(`trip:${tripId}`);
    
    if (!activeRooms[tripId]) activeRooms[tripId] = {};
    activeRooms[tripId][socket.id] = user;
    
    // Broadcast updated list of active users to the room
    io.to(`trip:${tripId}`).emit('presence-update', Object.values(activeRooms[tripId]));
  });

  socket.on('editing-activity', ({ tripId, activityId, userName }) => {
    socket.to(`trip:${tripId}`).emit('user-editing', { activityId, userName });
  });

  socket.on('stop-editing-activity', ({ tripId, activityId }) => {
    socket.to(`trip:${tripId}`).emit('user-stop-editing', { activityId });
  });

  socket.on('disconnect', () => {
    // Look up what rooms this socket was in, remove, and broadcast presence update
    for (const tripId in activeRooms) {
      if (activeRooms[tripId][socket.id]) {
        const user = activeRooms[tripId][socket.id];
        delete activeRooms[tripId][socket.id];
        io.to(`trip:${tripId}`).emit('presence-update', Object.values(activeRooms[tripId]));
        break;
      }
    }
  });
});
```

---

## 6. Frontend Visual Architecture & Theme

### 6.1. HSL Design System Tokens (`client/src/index.css`)
```css
:root {
  --bg-main: 224 71% 4%;        /* Dark Navy #030712 */
  --bg-card: 224 47% 9%;        /* Slate #0B0F19 */
  --border-glass: 217.9 10.6% 64.9% / 0.08; /* Glass frosted border */
  
  --primary: 262.1 83.3% 57.8%; /* Indigo #6366F1 */
  --primary-glow: 262.1 83.3% 57.8% / 0.3;
  --accent-violet: 271.5 81.3% 55.9%; /* Violet #8B5CF6 */
  
  --success: 162.2 76.2% 41.2%; /* Emerald #10B981 */
  --danger: 346.8 91.2% 56.5%;  /* Rose #F43F5E */
  
  --text-main: 210 40% 98%;     /* Off-white */
  --text-muted: 215.4 16.3% 66.9%; /* Muted gray */
}

body {
  background-color: hsl(var(--bg-main));
  color: hsl(var(--text-main));
  font-family: 'Outfit', sans-serif;
  overflow-x: hidden;
}

/* Glassmorphism Frosted Class */
.glass-panel {
  background: rgba(11, 15, 25, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glass);
  border-radius: 16px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-panel-hover:hover {
  border-color: rgba(99, 102, 241, 0.4);
  box-shadow: 0 0 25px var(--primary-glow);
  transform: translateY(-2px);
}
```

### 6.2. UI layout Structure
*   **Presence Indicator (`ActiveUsers.jsx`)**: Floats at the top right of the trip workspace, displaying small avatar bubbles with tooltips for user names. A pulsing green dot signals WebSocket connectivity.
*   **Itinerary Builder**: Days are presented vertically. Within each day, activity cards are sorted by execution time. Drag-and-drop handles enable shifting cards between days or changing schedules inline.
*   **Collaboration Indicators**: Displays "✏️ [Name] is typing..." directly on an activity card when another user edits it.

---

## 7. Verification & Mockup Plan

### 7.1. Cloudinary Fail-Safe Mechanism
To prevent crashes if Cloudinary credentials are not set during staging/local testing, the system will feature a fallback file storage mock. If environment variables are missing, the backend will return a default file URL and log a warning, rather than throwing a setup error.

### 7.2. Automated Testing Scripts
*   **Backend unit tests**: We will write standard Jest API validation checks.
*   **E2E multi-user testing**: Simulate multi-browser editing states using Puppeteer or manual browser split test verification.
