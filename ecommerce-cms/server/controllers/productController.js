const Product = require('../models/Product');
const fs = require('fs');
const path = require('path');

// Helper function to delete uploaded files
const deleteUploadedFiles = (files) => {
  if (files && files.length > 0) {
    files.forEach(file => {
      const filePath = path.join(__dirname, '..', file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

// Helper function to format file info
const formatFileInfo = (file) => ({
  filename: file.filename,
  originalName: file.originalname,
  path: file.path,
  size: file.size,
  mimetype: file.mimetype,
  uploadedAt: new Date()
});

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching products',
      error: error.message
    });
  }
};

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        msg: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching product',
      error: error.message
    });
  }
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    
    const { name, description, price, category, stock } = req.body || {};
    const uploadedFiles = req.files || [];

    // Validation
    if (!name || !description || !price || !category) {
      // Delete uploaded files if validation fails
      deleteUploadedFiles(uploadedFiles);
      
      return res.status(400).json({
        success: false,
        msg: 'All required fields must be provided',
        errors: {
          name: !name ? 'Name is required' : null,
          description: !description ? 'Description is required' : null,
          price: !price ? 'Price is required' : null,
          category: !category ? 'Category is required' : null
        }
      });
    }

    // Format uploaded files
    const images = uploadedFiles.map(file => formatFileInfo(file));

    const product = new Product({
      name,
      description,
      price: parseFloat(price),
      category,
      stock: stock ? parseInt(stock) : 0,
      images,
      createdBy: req.user.id
    });

    await product.save();

    res.status(201).json({
      success: true,
      msg: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    // Delete uploaded files if product creation fails
    deleteUploadedFiles(req.files || []);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        msg: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Error creating product',
      error: error.message
    });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive } = req.body;
    const uploadedFiles = req.files || [];

    const product = await Product.findById(req.params.id);

    if (!product) {
      // Delete uploaded files if product not found
      deleteUploadedFiles(uploadedFiles);
      
      return res.status(404).json({
        success: false,
        msg: 'Product not found'
      });
    }

    // Check if user owns the product or is admin
    if (product.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      // Delete uploaded files if not authorized
      deleteUploadedFiles(uploadedFiles);
      
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to update this product'
      });
    }

    // Update fields
    if (name) product.name = name;
    if (description) product.description = description;
    if (price) product.price = price;
    if (category) product.category = category;
    if (stock !== undefined) product.stock = stock;
    if (isActive !== undefined) product.isActive = isActive;

    // Handle new images
    if (uploadedFiles.length > 0) {
      // Delete old images from filesystem
      product.images.forEach(image => {
        const oldImagePath = path.join(__dirname, '..', image.path);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      });
      
      // Add new images
      product.images = uploadedFiles.map(file => formatFileInfo(file));
    }

    await product.save();

    res.json({
      success: true,
      msg: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    // Delete uploaded files if update fails
    deleteUploadedFiles(req.files || []);
    
    if (error.name === 'ValidationError') {
      const errors = {};
      Object.keys(error.errors).forEach(key => {
        errors[key] = error.errors[key].message;
      });
      
      return res.status(400).json({
        success: false,
        msg: 'Validation error',
        errors
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Error updating product',
      error: error.message
    });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        msg: 'Product not found'
      });
    }

    // Check if user owns the product or is admin
    if (product.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to delete this product'
      });
    }

    // Delete associated images from filesystem
    product.images.forEach(image => {
      const imagePath = path.join(__dirname, '..', image.path);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    });

    await Product.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      msg: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error deleting product',
      error: error.message
    });
  }
};
