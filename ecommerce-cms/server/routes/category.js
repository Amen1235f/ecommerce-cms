const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// Public routes
router.get('/', getAllCategories);
router.get('/:id', getCategory);

// Protected routes - Admin only
router.post('/', verifyToken, verifyAdmin, createCategory);
router.put('/:id', verifyToken, verifyAdmin, updateCategory);
router.delete('/:id', verifyToken, verifyAdmin, deleteCategory);

module.exports = router;
