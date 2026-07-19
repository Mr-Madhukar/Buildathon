# Collaborative Trip Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fully collaborative trip planning dashboard featuring real-time presence indicators, drag-and-drop itineraries, shared checklists, budget tracking with split logs, inline commenting, and Cloudinary attachments.

**Architecture:** A monorepo hosting a Node/Express backend on port 5000 and a Vite/React frontend on port 5173. The server communicates with a PostgreSQL database via Prisma ORM and uses Socket.io to manage active client rooms and event invalidation broadcasts.

**Tech Stack:** React (Vite), Express, PostgreSQL (Prisma ORM), Socket.io, Tailwind CSS, Cloudinary, JWT, ESLint, Prettier, Jest.

## Global Constraints
- Node.js environment
- Monorepo folder setup (`client/` and `server/`)
- PostgreSQL + Prisma ORM stack
- Prettier + ESLint checks enabled
- GitHub Actions CI workflow config
- Dark-mode HSL design tokens for frosted glass visual style
- Fallback mock for Cloudinary storage to prevent startup failure if API keys are missing

---

### Task 1: Monorepo Scaffolding & Linter Configuration

**Files:**
- Create: `package.json` (Root)
- Create: `eslint.config.mjs` (Root)
- Create: `.prettierrc` (Root)
- Create: `server/package.json`
- Create: `client/package.json` (Vite)
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: None
- Produces: Base workspaces command executor, lint setups, and CI runner.

- [ ] **Step 1: Create root package.json**
  Write root configuration to spin up client and server concurrently:
  ```json
  {
    "name": "collaborative-trip-planner",
    "version": "1.0.0",
    "scripts": {
      "install-all": "npm install && npm install --prefix client && npm install --prefix server",
      "server": "npm start --prefix server",
      "client": "npm run dev --prefix client",
      "dev": "concurrently \"npm run server\" \"npm run client\"",
      "lint": "eslint .",
      "format": "prettier --write ."
    },
    "dependencies": {
      "concurrently": "^8.2.2"
    },
    "devDependencies": {
      "eslint": "^9.5.0",
      "prettier": "^3.3.2"
    }
  }
  ```

- [ ] **Step 2: Create linter configuration (.prettierrc)**
  Write `.prettierrc` to root:
  ```json
  {
    "semi": true,
    "tabWidth": 2,
    "singleQuote": true,
    "printWidth": 120,
    "trailingComma": "es5"
  }
  ```

- [ ] **Step 3: Create eslint.config.mjs**
  Write `eslint.config.mjs` to root:
  ```javascript
  import js from "@eslint/js";
  import globals from "globals";

  export default [
    js.configs.recommended,
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        globals: {
          ...globals.node,
          ...globals.browser
        }
      },
      rules: {
        "no-unused-vars": "warn",
        "no-console": "off"
      }
    }
  ];
  ```

- [ ] **Step 4: Scaffold Server package.json**
  Write `server/package.json`:
  ```json
  {
    "name": "trip-planner-server",
    "version": "1.0.0",
    "main": "server.js",
    "scripts": {
      "start": "nodemon server.js",
      "db:generate": "prisma generate",
      "db:migrate": "prisma migrate dev"
    },
    "dependencies": {
      "@prisma/client": "^5.15.0",
      "bcryptjs": "^2.4.3",
      "cloudinary": "^2.2.0",
      "cors": "^2.8.5",
      "dotenv": "^16.4.5",
      "express": "^4.19.2",
      "jsonwebtoken": "^9.0.2",
      "multer": "^1.4.5-lts.1",
      "socket.io": "^4.7.5"
    },
    "devDependencies": {
      "nodemon": "^3.1.2",
      "prisma": "^5.15.0"
    }
  }
  ```

- [ ] **Step 5: Setup CI workflow**
  Write `.github/workflows/ci.yml` for automated lint and type check assertions:
  ```yaml
  name: CI Pipeline

  on:
    push:
      branches: [ main, master ]
    pull_request:
      branches: [ main, master ]

  jobs:
    build-and-test:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout Code
          uses: actions/checkout@v4

        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: 18
            cache: 'npm'

        - name: Install Root Dependencies
          run: npm install

        - name: Install Client Dependencies
          run: npm install --prefix client

        - name: Install Server Dependencies
          run: npm install --prefix server

        - name: Run Linter Checks
          run: npm run lint
  ```

- [ ] **Step 6: Run install verify**
  Run `npm install` and verify node_modules folder is created successfully.

- [ ] **Step 7: Commit**
  ```bash
  git add package.json eslint.config.mjs .prettierrc server/package.json .github/workflows/ci.yml
  git commit -m "chore: setup project folders, linter parameters, and CI configuration"
  ```

---

### Task 2: PostgreSQL Database Scaffolding & Auth Module (Prisma)

**Files:**
- Create: `server/prisma/schema.prisma`
- Create: `server/config/db.js`
- Create: `server/middleware/auth.js`
- Create: `server/routes/auth.js`
- Create: `server/server.js`

**Interfaces:**
- Consumes: PostgreSQL connection
- Produces: Live Prisma client, JWT authentication checker, and User profile APIs.

- [ ] **Step 1: Setup Prisma Schema File**
  Write complete schema mapping as detailed in Specification Section 3.1 to `server/prisma/schema.prisma`.

- [ ] **Step 2: Setup Database Client Connection**
  Write client builder to `server/config/db.js`:
  ```javascript
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  module.exports = prisma;
  ```

- [ ] **Step 3: Create Server Entrypoint server.js**
  Write base Express API routing logic to `server/server.js`:
  ```javascript
  const express = require('express');
  const http = require('http');
  const cors = require('cors');
  const { Server } = require('socket.io');
  require('dotenv').config();

  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);

  app.get('/health', (req, res) => res.send({ status: 'healthy' }));

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  ```

- [ ] **Step 4: Create User authentication JWT middleware**
  Write JWT validation filter to `server/middleware/auth.js`:
  ```javascript
  const jwt = require('jsonwebtoken');
  module.exports = (req, res, next) => {
    const authHeader = req.header('Authorization');
    if (!authHeader) return res.status(401).json({ message: 'No token, authorization denied' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Invalid token format' });
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'jwt_secret_fallback');
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ message: 'Token is not valid' });
    }
  };
  ```

- [ ] **Step 5: Create User Auth APIs**
  Write register/login controllers inside `server/routes/auth.js` query checking using Prisma client methods:
  ```javascript
  const express = require('express');
  const router = express.Router();
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');
  const prisma = require('../config/db');
  const auth = require('../middleware/auth');

  router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const userExists = await prisma.user.findUnique({ where: { email } });
      if (userExists) return res.status(400).json({ message: 'User already exists' });
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      const user = await prisma.user.create({
        data: { name, email, password: hashedPassword }
      });
      
      const payload = { id: user.id, name: user.name, email: user.email };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret_fallback', { expiresIn: '7d' });
      res.json({ token, user: payload });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return res.status(400).json({ message: 'Invalid credentials' });
      
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });
      
      const payload = { id: user.id, name: user.name, email: user.email };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret_fallback', { expiresIn: '7d' });
      res.json({ token, user: payload });
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/me', auth, async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, avatar: true }
      });
      res.json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  router.get('/users', auth, async (req, res) => {
    const { email } = req.query;
    try {
      const users = await prisma.user.findMany({
        where: { email: { contains: email, mode: 'insensitive' } },
        select: { id: true, name: true, email: true, avatar: true },
        take: 10
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error' });
    }
  });

  module.exports = router;
  ```

- [ ] **Step 6: Generate Prisma client**
  Run: `npx prisma generate --schema=server/prisma/schema.prisma`

- [ ] **Step 7: Commit**
  ```bash
  git add server/prisma/schema.prisma server/config/db.js server/middleware/auth.js server/routes/auth.js server/server.js
  git commit -m "feat: complete prisma models and backend authentication endpoints"
  ```

---

### Task 3: Trips Lifecycle & Collaboration Permissions (Prisma)

**Files:**
- Create: `server/middleware/role.js`
- Create: `server/routes/trips.js`
- Modify: `server/server.js`

**Interfaces:**
- Consumes: Prisma db connection, verified user payload
- Produces: Trip CRUD actions and membership access controls.

- [ ] **Step 1: Trip access control middleware**
  Write role checker middleware `server/middleware/role.js` fetching trip relations via Prisma:
  ```javascript
  const prisma = require('../config/db');
  module.exports = (requiredRoles) => {
    return async (req, res, next) => {
      try {
        const trip = await prisma.trip.findUnique({
          where: { id: req.params.id },
          include: { members: { include: { user: true } } }
        });
        if (!trip) return res.status(404).json({ message: 'Trip not found' });
        
        if (trip.ownerId === req.user.id) {
          req.trip = trip;
          req.userRole = 'owner';
          return next();
        }
        
        const member = trip.members.find(m => m.userId === req.user.id);
        if (!member || !requiredRoles.includes(member.role)) {
          return res.status(403).json({ message: 'Access denied: Insufficient permissions for this trip' });
        }
        
        req.trip = trip;
        req.userRole = member.role;
        next();
      } catch (err) {
        res.status(500).json({ message: 'Server error checking roles' });
      }
    };
  };
  ```

- [ ] **Step 2: Create Trip routes**
  Write standard routes to `server/routes/trips.js` for base creation, retrieval, updates, and collaborator invitation:
  ```javascript
  const express = require('express');
  const router = express.Router();
  const prisma = require('../config/db');
  const auth = require('../middleware/auth');
  const checkRole = require('../middleware/role');

  // Create Trip
  router.post('/', auth, async (req, res) => {
    const { title, description, startDate, endDate } = req.body;
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
      const trip = await prisma.$transaction(async (tx) => {
        const createdTrip = await tx.trip.create({
          data: {
            title,
            description,
            startDate: start,
            endDate: end,
            ownerId: req.user.id,
            members: {
              create: { userId: req.user.id, role: 'owner' }
            }
          }
        });
        
        for (let i = 1; i <= diffDays; i++) {
          const date = new Date(start);
          date.setDate(start.getDate() + (i - 1));
          await tx.itineraryDay.create({
            data: { tripId: createdTrip.id, dayNumber: i, date }
          });
        }
        return createdTrip;
      });
      res.status(201).json(trip);
    } catch (err) {
      res.status(500).json({ message: 'Error creating trip' });
    }
  });

  // Get User's Trips
  router.get('/', auth, async (req, res) => {
    try {
      const trips = await prisma.trip.findMany({
        where: {
          OR: [
            { ownerId: req.user.id },
            { members: { some: { userId: req.user.id } } }
          ]
        },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true } } } }
        }
      });
      res.json(trips);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching trips' });
    }
  });

  // Get Trip Details
  router.get('/:id', auth, checkRole(['owner', 'editor', 'viewer']), async (req, res) => {
    try {
      const trip = await prisma.trip.findUnique({
        where: { id: req.params.id },
        include: {
          members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } },
          itinerary: { include: { activities: { include: { attachments: true } } } },
          checklists: { include: { items: true } },
          expenses: { include: { paidBy: { select: { id: true, name: true } } } }
        }
      });
      res.json(trip);
    } catch (err) {
      res.status(500).json({ message: 'Error fetching trip details' });
    }
  });

  // Add Member
  router.post('/:id/members', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { email, role } = req.body;
    try {
      const invitee = await prisma.user.findUnique({ where: { email } });
      if (!invitee) return res.status(404).json({ message: 'User not found' });
      
      const trip = req.trip;
      const alreadyMember = trip.members.some(m => m.userId === invitee.id);
      if (alreadyMember) return res.status(400).json({ message: 'User already added' });
      
      await prisma.member.create({
        data: { tripId: trip.id, userId: invitee.id, role: role || 'viewer' }
      });
      
      const updatedMembers = await prisma.member.findMany({
        where: { tripId: trip.id },
        include: { user: { select: { id: true, name: true, email: true } } }
      });
      res.json(updatedMembers);
    } catch (err) {
      res.status(500).json({ message: 'Error inviting collaborator' });
    }
  });

  module.exports = router;
  ```

- [ ] **Step 3: Register Trip Router in Main Entrypoint**
  Add trips endpoint routing in `server/server.js`:
  ```javascript
  const tripRoutes = require('./routes/trips');
  app.use('/api/trips', tripRoutes);
  ```

- [ ] **Step 4: Commit**
  ```bash
  git add server/middleware/role.js server/routes/trips.js server/server.js
  git commit -m "feat: implement trip CRUD, nested days mapping, and invites checker"
  ```

---

### Task 4: React Client Scaffolding & CSS Tokens

**Files:**
- Create: `client/tailwind.config.js`
- Modify: `client/src/index.css`
- Create: `client/src/context/AuthContext.jsx`
- Create: `client/src/App.jsx`
- Create: `client/src/utils/socket.js`

**Interfaces:**
- Consumes: Express APIs
- Produces: CSS glassmorphism styles, route containers, and user register/login dashboards.

- [ ] **Step 1: Setup Tailwind config**
  Write `client/tailwind.config.js`:
  ```javascript
  /** @type {import('tailwindcss').Config} */
  export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          outfit: ['Outfit', 'sans-serif'],
        }
      },
    },
    plugins: [],
  }
  ```

- [ ] **Step 2: Paste custom glass CSS styles**
  Implement CSS tokens from design spec Section 6.1 into `client/src/index.css`.

- [ ] **Step 3: Setup Client AuthContext**
  Write React context inside `client/src/context/AuthContext.jsx` mapping local token caching and API defaults as detailed in Plan Task 4.

- [ ] **Step 4: Create Login, Register UI, and Router**
  Implement forms in `client/src/App.jsx` showing the premium obsidian frosted-glass visual theme and fields for Name, Email, Password.

- [ ] **Step 5: Setup Socket Client link**
  Write `client/src/utils/socket.js`:
  ```javascript
  import { io } from 'socket.io-client';
  const socket = io('http://localhost:5000', { autoConnect: false });
  export default socket;
  ```

- [ ] **Step 6: Commit**
  ```bash
  git add client/tailwind.config.js client/src/index.css client/src/context/AuthContext.jsx client/src/App.jsx client/src/utils/socket.js
  git commit -m "feat: complete client UI framework, Auth context, and glass styling tokens"
  ```

---

### Task 5: Live Day-Wise Itinerary & Drag-and-Drop Activities

**Files:**
- Modify: `server/routes/trips.js`
- Create: `client/src/components/TripCard.jsx`
- Create: `client/src/components/ItineraryDay.jsx`
- Create: `client/src/components/ActivityCard.jsx`

**Interfaces:**
- Consumes: Sockets events, Prisma client db updates
- Produces: Day lists builder, activity cards grid, drag indicators, and real-time cursor editing highlights.

- [ ] **Step 1: Define Activities schema API endpoints**
  Extend `server/routes/trips.js` to manage activity additions and edits:
  ```javascript
  // Add Activity
  router.post('/:id/itinerary/activities', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { dayId, title, description, time, location, notes, reservationCode } = req.body;
    try {
      const activity = await prisma.activity.create({
        data: { dayId, title, description, time, location, notes, reservationCode }
      });
      res.status(201).json(activity);
    } catch (err) {
      res.status(500).json({ message: 'Error adding activity' });
    }
  });

  // Edit Activity
  router.put('/:id/itinerary/activities/:activityId', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { title, description, time, location, notes, reservationCode } = req.body;
    try {
      const activity = await prisma.activity.update({
        where: { id: req.params.activityId },
        data: { title, description, time, location, notes, reservationCode }
      });
      res.json(activity);
    } catch (err) {
      res.status(500).json({ message: 'Error updating activity' });
    }
  });

  // Reorder
  router.put('/:id/itinerary/reorder', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { activities } = req.body; // Array of { id, dayId } values
    try {
      await prisma.$transaction(
        activities.map(a => prisma.activity.update({
          where: { id: a.id },
          data: { dayId: a.dayId }
        }))
      );
      res.json({ message: 'Itinerary reordered successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Error updating reordered items' });
    }
  });
  ```

- [ ] **Step 2: Build Trip Cards and Dashboard UI**
  Create `client/src/components/TripCard.jsx` displaying trip title, date durations, and animated border effects.

- [ ] **Step 3: Create Itinerary Days lists container**
  Build `client/src/components/ItineraryDay.jsx` mapping collapsible accordions for day blocks.

- [ ] **Step 4: Design Activity cards with live indicators**
  Build `client/src/components/ActivityCard.jsx` integrating click-to-edit fields, and displaying a glowing purple indicator when another client broadcasts typing events:
  ```javascript
  socket.on('user-editing', ({ activityId, userName }) => {
    if (activityId === activity.id) setEditingUser(userName);
  });
  socket.on('user-stop-editing', ({ activityId }) => {
    if (activityId === activity.id) setEditingUser(null);
  });
  ```

- [ ] **Step 5: Commit**
  ```bash
  git add server/routes/trips.js client/src/components/TripCard.jsx client/src/components/ItineraryDay.jsx client/src/components/ActivityCard.jsx
  git commit -m "feat: complete itinerary manager, drag reordering API, and card editing indicator sockets"
  ```

---

### Task 6: Checklist items, Budget logs & WebSocket Presence

**Files:**
- Create: `client/src/components/ChecklistSection.jsx`
- Create: `client/src/components/ExpenseTracker.jsx`
- Create: `client/src/components/CommentDrawer.jsx`
- Create: `client/src/components/ActiveUsers.jsx`
- Modify: `server/server.js` (WebSockets)

**Interfaces:**
- Consumes: Socket connections
- Produces: Shared checklist logs, budget spent cards, active online user rows, and live comments sidebar drawer.

- [ ] **Step 1: Write backend endpoints for checklists and expenses**
  Extend `server/routes/trips.js` to log and modify checklists and expense items using Prisma:
  ```javascript
  // Add Checklist
  router.post('/:id/checklists', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { title } = req.body;
    try {
      const checklist = await prisma.checklist.create({
        data: { tripId: req.params.id, title }
      });
      res.status(201).json(checklist);
    } catch (err) {
      res.status(500).json({ message: 'Error adding checklist' });
    }
  });

  // Add Item
  router.post('/:id/checklists/:checklistId/items', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { text } = req.body;
    try {
      const item = await prisma.checklistItem.create({
        data: { checklistId: req.params.checklistId, text }
      });
      res.status(201).json(item);
    } catch (err) {
      res.status(500).json({ message: 'Error adding checklist item' });
    }
  });

  // Toggle Item
  router.put('/:id/checklists/:checklistId/items/:itemId', auth, checkRole(['owner', 'editor', 'viewer']), async (req, res) => {
    const { completed } = req.body;
    try {
      const item = await prisma.checklistItem.update({
        where: { id: req.params.itemId },
        data: { completed, completedById: completed ? req.user.id : null }
      });
      res.json(item);
    } catch (err) {
      res.status(500).json({ message: 'Error toggling checklist item' });
    }
  });

  // Add Expense
  router.post('/:id/expenses', auth, checkRole(['owner', 'editor']), async (req, res) => {
    const { description, amount, category } = req.body;
    try {
      const expense = await prisma.expense.create({
        data: {
          tripId: req.params.id,
          description,
          amount: parseFloat(amount),
          category,
          paidById: req.user.id
        }
      });
      res.status(201).json(expense);
    } catch (err) {
      res.status(500).json({ message: 'Error adding expense' });
    }
  });
  ```

- [ ] **Step 2: Update Server Socket listener config**
  Update Express socket server callbacks in `server/server.js` mapping user collections, room notifications, and active member joins.

- [ ] **Step 3: Create Active Users bubble list**
  Build `ActiveUsers.jsx` display. Listen for `presence-update` and render user name overlays in top navigation.

- [ ] **Step 4: Create checklists list card view**
  Build `ChecklistSection.jsx` showing progress indicator meters.

- [ ] **Step 5: Create Expense splits component**
  Build `ExpenseTracker.jsx` calculating user debts and showing neat category badges.

- [ ] **Step 6: Implement Comments list panel**
  Build `CommentDrawer.jsx` mapping real-time broadcasts on post entry.

- [ ] **Step 7: Commit**
  ```bash
  git add client/src/components/ChecklistSection.jsx client/src/components/ExpenseTracker.jsx client/src/components/CommentDrawer.jsx client/src/components/ActiveUsers.jsx server/server.js
  git commit -m "feat: complete active users navigation drawer, collaborative checklists, expense panel, and chat threads"
  ```

---

### Task 7: File Attachments & Cloudinary Fail-Safe Integration

**Files:**
- Create: `server/config/cloudinary.js`
- Modify: `server/routes/trips.js`
- Modify: `client/src/components/ActivityCard.jsx`

**Interfaces:**
- Consumes: Multer upload stream, Cloudinary API
- Produces: Cloud upload pipelines and PDF/image attachment cards in itineraries.

- [ ] **Step 1: Write Cloudinary configuration with local fallback mock**
  Build `server/config/cloudinary.js` configuration using the fail-safe framework from Spec Section 7.1.

- [ ] **Step 2: Write attachment post router handler**
  Extend `server/routes/trips.js` to create database attachment record link after upload completes:
  ```javascript
  const { upload, uploadToCloudinary } = require('../config/cloudinary');

  router.post('/:id/attachments', auth, checkRole(['owner', 'editor']), upload.single('file'), async (req, res) => {
    const { activityId } = req.body;
    try {
      if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
      
      const uploadResult = await uploadToCloudinary(req.file.buffer, `trip_${req.params.id}_activity_${activityId}_${Date.now()}`);
      
      const fileType = req.file.mimetype.includes('pdf') ? 'pdf' : 'image';
      
      const attachment = await prisma.attachment.create({
        data: {
          activityId,
          name: req.file.originalname,
          url: uploadResult.secure_url,
          fileType,
          uploadedById: req.user.id
        }
      });
      res.status(201).json(attachment);
    } catch (err) {
      res.status(500).json({ message: 'Error uploading attachment' });
    }
  });
  ```

- [ ] **Step 3: Setup frontend file picker UI**
  Integrate file uploads and attachment list renders in `client/src/components/ActivityCard.jsx`.

- [ ] **Step 4: Commit**
  ```bash
  git add server/config/cloudinary.js server/routes/trips.js client/src/components/ActivityCard.jsx
  git commit -m "feat: implement Cloudinary upload endpoints and attachment previews on cards"
  ```
