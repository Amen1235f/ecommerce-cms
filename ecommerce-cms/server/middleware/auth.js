const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. No token provided.',
        errors: { auth: 'Authorization token is required' }
      });
    }

    // Check if token starts with 'Bearer '
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Invalid token format.',
        errors: { auth: 'Token must be in Bearer format' }
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Token is empty.',
        errors: { auth: 'Token cannot be empty' }
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token has required fields
    if (!decoded.id) {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Invalid token payload.',
        errors: { auth: 'Token payload is invalid' }
      });
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. User not found.',
        errors: { auth: 'User associated with token no longer exists' }
      });
    }

    // Check if user account is active
    if (user.accountStatus !== 'active') {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Account is not active.',
        errors: { auth: 'Your account has been suspended or is pending activation' }
      });
    }

    // Add user info to request object
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      accountStatus: user.accountStatus
    };

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    // Handle different JWT errors
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Token has expired.',
        errors: { auth: 'Your session has expired. Please log in again.' }
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        msg: 'Access denied. Invalid token.',
        errors: { auth: 'Invalid authentication token' }
      });
    }

    return res.status(500).json({ 
      success: false,
      msg: 'Internal server error during authentication.',
      errors: { auth: 'Authentication service temporarily unavailable' }
    });
  }
};

// Middleware to check if user is admin
const verifyAdmin = (req, res, next) => {
  // This middleware should be used after verifyToken
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      msg: 'Access denied. Authentication required.',
      errors: { auth: 'Please authenticate first' }
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false,
      msg: 'Access denied. Admin privileges required.',
      errors: { auth: 'You do not have permission to access this resource' }
    });
  }

  next();
};

// Middleware to check if user owns the resource or is admin
const verifyOwnershipOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false,
      msg: 'Access denied. Authentication required.',
      errors: { auth: 'Please authenticate first' }
    });
  }

  // Allow if user is admin
  if (req.user.isAdmin) {
    return next();
  }

  // Allow if user owns the resource (check user ID in params)
  const resourceUserId = req.params.userId || req.params.id;
  if (resourceUserId && req.user.id.toString() === resourceUserId) {
    return next();
  }

  return res.status(403).json({ 
    success: false,
    msg: 'Access denied. You can only access your own resources.',
    errors: { auth: 'Insufficient permissions' }
  });
};

// Optional middleware - continues even if no token (for public routes that can be enhanced with user info)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user info
    }

    const token = authHeader.substring(7);
    if (!token) {
      return next(); // Continue without user info
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.accountStatus === 'active') {
      req.user = {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        accountStatus: user.accountStatus
      };
    }
    
    next();
  } catch (error) {
    // Don't block the request, just continue without user info
    next();
  }
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifyOwnershipOrAdmin,
  optionalAuth
};
