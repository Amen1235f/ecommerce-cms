const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Order = require('../models/Order');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const [userCount, productCount, categoryCount, orderCount] = await Promise.all([
      User.countDocuments(),
      Product.countDocuments(),
      Category.countDocuments(),
      Order.countDocuments()
    ]);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get top products (most ordered)
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          price: '$product.price',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Calculate revenue
    const revenueData = await Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          averageOrder: { $avg: '$total' }
        }
      }
    ]);

    // Monthly sales data
    const monthlySales = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: {
            $gte: new Date(new Date().setMonth(new Date().getMonth() - 6))
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          users: userCount,
          products: productCount,
          categories: categoryCount,
          orders: orderCount,
          totalRevenue: revenueData[0]?.totalRevenue || 0,
          averageOrder: revenueData[0]?.averageOrder || 0
        },
        recentOrders,
        topProducts,
        monthlySales
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
};

// Get all users for admin management
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isAdmin } = req.query;

    let query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isAdmin !== undefined) {
      query.isAdmin = isAdmin === 'true';
    }

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error fetching users',
      error: error.message
    });
  }
};

// Update user role
exports.updateUserRole = async (req, res) => {
  try {
    const { isAdmin, accountStatus } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: 'User not found'
      });
    }

    // Prevent admin from changing their own role
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        msg: 'Cannot modify your own role'
      });
    }

    if (isAdmin !== undefined) user.isAdmin = isAdmin;
    if (accountStatus !== undefined) user.accountStatus = accountStatus;

    await user.save();

    res.json({
      success: true,
      msg: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      msg: 'Error updating user',
      error: error.message
    });
  }
};
