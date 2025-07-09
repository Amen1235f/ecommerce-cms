const Category = require('../models/Category');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;

    let query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const categories = await Category.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Category.countDocuments(query);

    res.json({
      success: true,
      data: categories,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get single category
exports.getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id)
      .populate('createdBy', 'name email');

    if (!category) {
      return res.status(404).json({
        success: false,
        msg: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching category',
      error: error.message
    });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        msg: 'Category name is required'
      });
    }

    const category = new Category({
      name,
      description,
      createdBy: req.user.id
    });

    await category.save();

    res.status(201).json({
      success: true,
      msg: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: 'Category name already exists'
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Error creating category',
      error: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        msg: 'Category not found'
      });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      msg: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        msg: 'Category name already exists'
      });
    }

    res.status(500).json({
      success: false,
      msg: 'Error updating category',
      error: error.message
    });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        msg: 'Category not found'
      });
    }

    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      msg: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error deleting category',
      error: error.message
    });
  }
};
