const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllUsers,
  updateUserRole
} = require('../controllers/adminController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin privileges
router.use(verifyToken, verifyAdmin);

// Dashboard
router.get('/dashboard', getDashboardStats);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUserRole);

module.exports = router;
