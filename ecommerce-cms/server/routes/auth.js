const express = require('express');
const router = express.Router();
const { register, login, logout } = require('../controllers/authController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Public routes - NO authentication required
router.post('/register', register);
router.post('/login', login);

// Protected routes - authentication required
router.post('/logout', verifyToken, logout);

router.get('/profile', verifyToken, (req, res) => {
  res.json({
    success: true,
    msg: 'Profile retrieved successfully',
    user: req.user
  });
});

router.get('/verify', verifyToken, (req, res) => {
  res.json({
    success: true,
    msg: 'Token is valid',
    user: req.user
  });
});

// Admin only routes
router.get('/admin/users', verifyToken, verifyAdmin, (req, res) => {
  res.json({
    success: true,
    msg: 'Admin access granted',
    user: req.user
  });
});

module.exports = router;
