# Invite Unregistered Users Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to invite any email address (registered or unregistered) to collaborate on a trip.

**Architecture:** 
1. If the invited email does not exist in the database, we create a placeholder user in the `User` table with name matching the email prefix and password set to `'PENDING_INVITATION'`.
2. When a user tries to register, if a placeholder user with their email already exists (indicated by `password: 'PENDING_INVITATION'`), we update their name and password using Prisma's `upsert` instead of blocking them with "User already exists".
This operates cleanly within the existing database schema without requiring schema changes or database migrations.

**Tech Stack:** Express, Prisma, PostgreSQL

## Global Constraints
- Do not modify or add fields to the database schema.
- Maintain existing routes and behavior for already-registered users.

---

### Task 1: Update Server Trips Routing to Auto-Create Placeholder Users

**Files:**
- Modify: `server/routes/trips.js`

**Interfaces:**
- Consumes: User invitation endpoint `POST /api/trips/:id/members`
- Produces: Successful member creation for unregistered emails with temporary user records

- [ ] **Step 1: Edit the invitation handler in `server/routes/trips.js`**
Replace lines 94-95 in `server/routes/trips.js` with the logic to find or create the user:
```javascript
    let invitee = await prisma.user.findUnique({ where: { email } });
    if (!invitee) {
      invitee = await prisma.user.create({
        data: {
          name: email.split('@')[0],
          email,
          password: 'PENDING_INVITATION',
        }
      });
    }
```

- [ ] **Step 2: Commit**
```bash
git add server/routes/trips.js
git commit -m "feat: auto-create placeholder user on inviting unregistered email"
```

---

### Task 2: Update Server Registration to Upsert Placeholder Users

**Files:**
- Modify: `server/routes/auth.js`

**Interfaces:**
- Consumes: User registration endpoint `POST /api/auth/register`
- Produces: Successful update of placeholder user accounts upon signup

- [ ] **Step 1: Edit the signup handler in `server/routes/auth.js`**
Replace the userExists check and user creation logic in `server/routes/auth.js` to allow upserting when user exists with `'PENDING_INVITATION'` password:
```javascript
    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists && userExists.password !== 'PENDING_INVITATION') {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, password: hashedPassword },
      create: { name, email, password: hashedPassword }
    });
```

- [ ] **Step 2: Commit**
```bash
git add server/routes/auth.js
git commit -m "feat: support registration for placeholder invited users via upsert"
```

---

### Task 3: Verification and testing

**Files:**
- Create: `server/scratch/test_invite_flow.js`

- [ ] **Step 1: Write integration verification script in `server/scratch/test_invite_flow.js`**
Write a script that fires API requests to test the invitation and subsequent signup of a new email:
```javascript
const axios = require('axios');

async function runTest() {
  const email = `test_invite_${Date.now()}@example.com`;
  console.log(`Testing with email: ${email}`);
  
  // 1. Sign up a host user
  const hostRes = await axios.post('http://localhost:5000/api/auth/register', {
    name: 'Host User',
    email: `host_${Date.now()}@example.com`,
    password: 'password123'
  });
  const token = hostRes.data.token;
  
  // 2. Create a trip
  const tripRes = await axios.post('http://localhost:5000/api/trips', {
    title: 'Test Trip',
    startDate: '2026-08-01',
    endDate: '2026-08-05'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const tripId = tripRes.data.id;
  console.log(`Created Trip ID: ${tripId}`);
  
  // 3. Invite unregistered user
  const inviteRes = await axios.post(`http://localhost:5000/api/trips/${tripId}/members`, {
    email,
    role: 'editor'
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Invite unregistered user succeeded!');
  
  // 4. Sign up the invited user
  const registerRes = await axios.post('http://localhost:5000/api/auth/register', {
    name: 'Registered Friend',
    email,
    password: 'password456'
  });
  console.log('Signup of invited user succeeded! Token:', registerRes.data.token ? 'OK' : 'FAIL');
}

runTest().catch(console.error);
```

- [ ] **Step 2: Run the verification test script**
Run the script using node:
```bash
node server/scratch/test_invite_flow.js
```
Expected: All steps complete successfully without error.

- [ ] **Step 3: Cleanup scratch script**
```bash
rm server/scratch/test_invite_flow.js
```
