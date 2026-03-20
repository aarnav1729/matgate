const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authMiddleware, roleMiddleware, SECRET } = require('../middleware/auth');
const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user._id, username: user.username, name: user.name, role: user.role },
      SECRET, { expiresIn: '12h' }
    );
    res.json({ token, user: { username: user.username, name: user.name, role: user.role } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get current user
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// Create default users (run once)
router.post('/setup', async (req, res) => {
  try {
    const count = await User.countDocuments();
    if (count > 0) return res.json({ message: 'Users already exist', count });
    await User.create([
      { username: 'stores', password: 'stores123', name: 'Stores Team', role: 'stores' },
      { username: 'production', password: 'prod123', name: 'Production Team', role: 'production' },
      { username: 'admin', password: 'admin123', name: 'Administrator', role: 'admin' }
    ]);
    res.json({ message: 'Default users created', users: ['stores/stores123', 'production/prod123', 'admin/admin123'] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
