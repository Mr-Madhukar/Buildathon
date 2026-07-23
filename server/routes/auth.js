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
    
    const payload = { id: user.id, name: user.name, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'jwt_secret_fallback', { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
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
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, email: true, avatar: true }
    });
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
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
  } catch (error) {
    console.error('Query users error:', error);
    res.status(500).json({ message: 'Server error querying users' });
  }
});

module.exports = router;
