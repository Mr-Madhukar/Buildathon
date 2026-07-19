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
  } catch {
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
        itinerary: { include: { activities: { include: { attachments: true } } } },
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
  } catch {
    res.status(500).json({ message: 'Error inviting collaborator' });
  }
});

module.exports = router;
