const express = require('express');
const router = express.Router();
const { 
  getAllProducts, 
  getProduct, 
  createProduct, 
  updateProduct, 
  deleteProduct 
} = require('../controllers/productController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { handleMulterUpload } = require('../middleware/upload');

// Test route to debug form-data
router.post('/test', verifyToken, handleMulterUpload, (req, res) => {
  console.log('Test route - Body:', req.body);
  console.log('Test route - Files:', req.files);
  res.json({
    success: true,
    body: req.body,
    files: req.files ? req.files.map(f => ({
      filename: f.filename,
      originalname: f.originalname,
      size: f.size,
      mimetype: f.mimetype
    })) : []
  });
});

// Public routes - no authentication required
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// Protected routes - authentication required
router.post('/', verifyToken, handleMulterUpload, createProduct);
router.put('/:id', verifyToken, handleMulterUpload, updateProduct);
router.delete('/:id', verifyToken, deleteProduct);

module.exports = router;
