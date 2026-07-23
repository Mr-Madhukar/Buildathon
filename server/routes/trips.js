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
    }, {
      timeout: 20000
    });
    res.status(201).json(trip);
  } catch (error) {
    console.error('Error creating trip:', error);
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
  } catch {
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
        itinerary: { 
          include: { 
            activities: { 
              include: { attachments: true },
              orderBy: { position: 'asc' }
            } 
          } 
        },
        checklists: { include: { items: true } },
        expenses: { include: { paidBy: { select: { id: true, name: true } } } }
      }
    });
    res.json(trip);
  } catch {
    res.status(500).json({ message: 'Error fetching trip details' });
  }
});

// Add Member
router.post('/:id/members', auth, checkRole(['owner', 'editor']), async (req, res) => {
  const { email, role } = req.body;
  try {
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
  } catch {
    res.status(500).json({ message: 'Error inviting collaborator' });
  }
});

// Add Activity
router.post('/:id/itinerary/activities', auth, checkRole(['owner', 'editor']), async (req, res) => {
  const { dayId, title, description, time, location, notes, reservationCode } = req.body;
  try {
    const activity = await prisma.activity.create({
      data: { dayId, title, description, time, location, notes, reservationCode }
    });
    res.status(201).json(activity);
  } catch {
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
  } catch {
    res.status(500).json({ message: 'Error updating activity' });
  }
});

// Delete Activity
router.delete('/:id/itinerary/activities/:activityId', auth, checkRole(['owner', 'editor']), async (req, res) => {
  try {
    await prisma.activity.delete({
      where: { id: req.params.activityId }
    });
    res.json({ message: 'Activity deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Error deleting activity' });
  }
});

// Reorder
router.put('/:id/itinerary/reorder', auth, checkRole(['owner', 'editor']), async (req, res) => {
  const { activities } = req.body; // Array of { id, dayId, position }
  try {
    await prisma.$transaction(
      activities.map(a => prisma.activity.update({
        where: { id: a.id },
        data: { dayId: a.dayId, position: a.position ?? 0 }
      }))
    );
    res.json({ message: 'Itinerary reordered successfully' });
  } catch {
    res.status(500).json({ message: 'Error updating reordered items' });
  }
});

// Add Checklist
router.post('/:id/checklists', auth, checkRole(['owner', 'editor']), async (req, res) => {
  const { title } = req.body;
  try {
    const checklist = await prisma.checklist.create({
      data: { tripId: req.params.id, title },
      include: { items: true }
    });
    res.status(201).json(checklist);
  } catch {
    res.status(500).json({ message: 'Error adding checklist' });
  }
});

// Add Checklist Item
router.post('/:id/checklists/:checklistId/items', auth, checkRole(['owner', 'editor']), async (req, res) => {
  const { text } = req.body;
  try {
    const item = await prisma.checklistItem.create({
      data: { checklistId: req.params.checklistId, text }
    });
    res.status(201).json(item);
  } catch {
    res.status(500).json({ message: 'Error adding checklist item' });
  }
});

// Toggle Checklist Item
router.put('/:id/checklists/:checklistId/items/:itemId', auth, checkRole(['owner', 'editor', 'viewer']), async (req, res) => {
  const { completed } = req.body;
  try {
    const item = await prisma.checklistItem.update({
      where: { id: req.params.itemId },
      data: { completed, completedById: completed ? req.user.id : null },
      include: { completedBy: { select: { id: true, name: true } } }
    });
    res.json(item);
  } catch {
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
      },
      include: { paidBy: { select: { id: true, name: true } } }
    });
    res.status(201).json(expense);
  } catch {
    res.status(500).json({ message: 'Error adding expense' });
  }
});

// Get Comments
router.get('/:id/comments', auth, checkRole(['owner', 'editor', 'viewer']), async (req, res) => {
  const { dayNumber, activityId } = req.query;
  try {
    const whereClause = { tripId: req.params.id };
    if (dayNumber) {
      whereClause.dayNumber = parseInt(dayNumber);
    } else if (activityId) {
      whereClause.activityId = activityId;
    } else {
      whereClause.dayNumber = null;
      whereClause.activityId = null;
    }

    const comments = await prisma.comment.findMany({
      where: whereClause,
      include: { author: { select: { id: true, name: true, avatar: true } } },
      orderBy: { createdAt: 'asc' }
    });
    res.json(comments);
  } catch {
    res.status(500).json({ message: 'Error fetching comments' });
  }
});

// Post Comment
router.post('/:id/comments', auth, checkRole(['owner', 'editor', 'viewer']), async (req, res) => {
  const { text, dayNumber, activityId } = req.body;
  try {
    const comment = await prisma.comment.create({
      data: {
        tripId: req.params.id,
        authorId: req.user.id,
        text,
        dayNumber: dayNumber ? parseInt(dayNumber) : null,
        activityId: activityId || null
      },
      include: { author: { select: { id: true, name: true, avatar: true } } }
    });
    res.status(201).json(comment);
  } catch {
    res.status(500).json({ message: 'Error creating comment' });
  }
});

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
  } catch {
    res.status(500).json({ message: 'Error uploading attachment' });
  }
});

module.exports = router;
